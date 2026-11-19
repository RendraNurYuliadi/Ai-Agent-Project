import "server-only";
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import type { Db } from "mongodb";
import type {
  ProviderConnectionSummary,
  ProviderId,
  ProviderModelDetails,
  ProviderSummary,
  StoredProviderConnection,
} from "@/types/providers";

export const MAX_PROVIDER_API_KEYS = 10;

const providerCatalog: ProviderSummary[] = [
  { id: "nvidia", name: "NVIDIA NIM", description: "Inference NVIDIA NIM dengan daftar Free Endpoint dari katalog NVIDIA.", category: "Free Tier", connectionType: "api-key", supported: true, baseUrl: "https://integrate.api.nvidia.com/v1" },
];

export const PROVIDERS = providerCatalog;
export const CONNECTABLE_PROVIDER_IDS: ProviderId[] = providerCatalog.filter((provider) => provider.supported).map((provider) => provider.id);

export function getProviderSummary(providerId: string): ProviderSummary | undefined {
  return providerCatalog.find((provider) => provider.id === providerId);
}

function getEncryptionKey(): Buffer {
  const secret = process.env.PROVIDER_CREDENTIALS_ENCRYPTION_KEY;
  if (!secret || secret.length < 32 || secret.startsWith("replace-with-")) {
    throw new Error("Atur PROVIDER_CREDENTIALS_ENCRYPTION_KEY (minimal 32 karakter) sebelum menyimpan kredensial provider.");
  }
  return createHash("sha256").update(secret, "utf8").digest();
}

export function encryptProviderSecret(secret: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", getEncryptionKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(secret, "utf8"), cipher.final()]);
  return ["v1", iv.toString("base64"), cipher.getAuthTag().toString("base64"), ciphertext.toString("base64")].join(".");
}

export function decryptProviderSecret(encrypted: string): string {
  const [version, ivText, tagText, ciphertextText] = encrypted.split(".");
  if (version !== "v1" || !ivText || !tagText || !ciphertextText) {
    throw new Error("Format kredensial provider tersimpan tidak valid.");
  }
  const decipher = createDecipheriv("aes-256-gcm", getEncryptionKey(), Buffer.from(ivText, "base64"));
  decipher.setAuthTag(Buffer.from(tagText, "base64"));
  return Buffer.concat([decipher.update(Buffer.from(ciphertextText, "base64")), decipher.final()]).toString("utf8");
}

export function normalizeProviderBaseUrl(providerId: ProviderId, candidate?: string): string {
  const definition = getProviderSummary(providerId);
  if (!definition?.supported) throw new Error("Provider ini belum memiliki integrasi API yang tersedia.");
  const value = candidate?.trim() || definition.baseUrl;
  if (!value) throw new Error("Base URL provider belum tersedia.");
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error("Base URL provider tidak valid.");
  }
  if (!["http:", "https:"].includes(url.protocol) || url.username || url.password || url.search || url.hash) {
    throw new Error("Base URL provider harus berupa URL HTTP(S) yang valid tanpa kredensial.");
  }
  if (value.replace(/\/+$/, "") !== definition.baseUrl) {
    throw new Error("Base URL provider ini dikelola oleh integrasi dan tidak dapat diubah.");
  }
  return value.replace(/\/+$/, "");
}

function providerHeaders(providerId: ProviderId, apiKey: string): HeadersInit {
  const headers: Record<string, string> = { Accept: "application/json" };
  if (apiKey) headers.Authorization = `Bearer ${apiKey}`;
  return headers;
}

export async function fetchProviderModels(
  providerId: ProviderId,
  apiKey: string,
  baseUrl?: string
): Promise<{ models: string[]; modelDetails: Record<string, ProviderModelDetails> }> {
  const url = normalizeProviderBaseUrl(providerId, baseUrl);
  if (!apiKey.trim()) throw new Error("API key provider wajib diisi.");
  const response = await fetch(`${url}/models`, {
    headers: providerHeaders(providerId, apiKey.trim()),
    signal: AbortSignal.timeout(15000),
    cache: "no-store",
  });
  if (!response.ok) {
    const body = await response.text();
    const safeBody = apiKey ? body.split(apiKey).join("[redacted]") : body;
    throw new Error(`${getProviderSummary(providerId)?.name} gagal memuat model (HTTP ${response.status}): ${safeBody.slice(0, 300) || response.statusText}`);
  }
  const data: unknown = await response.json();
  if (!data || typeof data !== "object" || !("data" in data) || !Array.isArray(data.data)) {
    throw new Error(`${getProviderSummary(providerId)?.name} mengembalikan format daftar model yang tidak valid.`);
  }
  const models = data.data.flatMap((item: unknown) =>
    item && typeof item === "object" && "id" in item && typeof item.id === "string" ? [item.id] : []
  );
  if (models.length === 0) throw new Error(`${getProviderSummary(providerId)?.name} tidak mengembalikan model yang tersedia.`);
  const uniqueModels = [...new Set(models)];
  const modelDetails: Record<string, ProviderModelDetails> = {};
  for (let index = 0; index < uniqueModels.length; index += 8) {
    const batch = uniqueModels.slice(index, index + 8);
    await Promise.all(batch.map(async (model) => {
      const metadata = await fetchNvidiaEndpointMetadata(model);
      if (!isNvidiaFreeEndpointArtifact(metadata)) return;
      modelDetails[model] = getNvidiaModelDetails(metadata);
    }));
  }
  const filteredModels = Object.keys(modelDetails);
  if (filteredModels.length === 0) {
    throw new Error("NVIDIA NIM tidak memiliki model yang terverifikasi sebagai Free Endpoint dari katalog NVIDIA.");
  }
  const sortedModels = filteredModels.sort((left, right) => left.localeCompare(right));
  return { models: sortedModels, modelDetails };
}

interface NvidiaEndpointMetadata {
  labels?: unknown;
  attributes?: unknown;
}

async function fetchNvidiaEndpointMetadata(model: string): Promise<NvidiaEndpointMetadata> {
  const endpointName = model.split("/").pop();
  if (!endpointName) throw new Error(`ID model NVIDIA tidak valid: ${model}`);
  const response = await fetch(
    `https://api.ngc.nvidia.com/v2/endpoints/qc69jvmznzxy/${encodeURIComponent(endpointName)}`,
    { signal: AbortSignal.timeout(15000), cache: "no-store" }
  );
  if (response.status === 404) return {};
  if (!response.ok) {
    throw new Error(`Gagal memverifikasi metadata Free Endpoint NVIDIA untuk ${model} (HTTP ${response.status}).`);
  }
  const data: unknown = await response.json();
  if (!data || typeof data !== "object" || !("artifact" in data) || !data.artifact || typeof data.artifact !== "object") {
    throw new Error(`Metadata NVIDIA untuk ${model} tidak valid.`);
  }
  return data.artifact as NvidiaEndpointMetadata;
}

function isNvidiaFreeEndpointArtifact(metadata: NvidiaEndpointMetadata): boolean {
  const labels = Array.isArray(metadata.labels) ? metadata.labels : [];
  if (labels.some((label) => typeof label === "string" && label.toLocaleLowerCase() === "nim_type_preview")) {
    return true;
  }
  if (Array.isArray(metadata.attributes)) {
    return metadata.attributes.some((attribute) =>
      attribute &&
      typeof attribute === "object" &&
      "key" in attribute &&
      attribute.key === "PREVIEW" &&
      "value" in attribute &&
      attribute.value === "true"
    );
  }
  if (!metadata.attributes || typeof metadata.attributes !== "object") return false;
  const attributes = metadata.attributes as { PREVIEW?: unknown };
  return typeof attributes.PREVIEW === "string" && attributes.PREVIEW.toLocaleLowerCase() === "true";
}

function getNvidiaModelDetails(metadata: NvidiaEndpointMetadata): ProviderModelDetails {
  if (!metadata.attributes || typeof metadata.attributes !== "object" || Array.isArray(metadata.attributes)) {
    return { inputModalities: [], outputModalities: [] };
  }
  const attributes = metadata.attributes as {
    specifications?: { inputModalities?: unknown; outputModalities?: unknown };
  };
  const toModalities = (value: unknown): string[] =>
    Array.isArray(value)
      ? [...new Set(value.filter((item): item is string => typeof item === "string").map((item) => item.trim()).filter(Boolean))]
      : [];
  return {
    inputModalities: toModalities(attributes.specifications?.inputModalities),
    outputModalities: toModalities(attributes.specifications?.outputModalities),
  };
}

export function getNvidiaPublisher(model: string): string {
  const id = model.toLocaleLowerCase();
  if (id.startsWith("nvidia/")) return "NVIDIA";
  if (id.startsWith("google/")) return "Google";
  if (id.startsWith("meta/")) return "Meta";
  if (id.startsWith("mistralai/") || id.startsWith("mistral")) return "Mistral";
  if (id.startsWith("microsoft/")) return "Microsoft";
  if (id.startsWith("deepseek/")) return "DeepSeek";
  if (id.startsWith("qwen/")) return "Qwen";
  if (id.startsWith("moonshotai/")) return "Moonshot";
  return model.split("/")[0] || "Publisher lain";
}

export async function getStoredProviderConnection(
  db: Db,
  providerId: ProviderId
): Promise<StoredProviderConnection | null> {
  return await db.collection<StoredProviderConnection>("aiProviderConnections").findOne({ providerId });
}

export async function getStoredProviderApiKey(
  db: Db,
  providerId: ProviderId
): Promise<string> {
  const connection = await getStoredProviderConnection(db, providerId);
  const keys = await getStoredProviderApiKeys(db, providerId, connection);
  if (!keys.length) throw new Error(`API key ${getProviderSummary(providerId)?.name} belum tersimpan.`);
  const activeIndex = getActiveProviderApiKeyIndex(connection, keys.length);
  return keys[activeIndex];
}

export async function getStoredProviderApiKeys(
  db: Db,
  providerId: ProviderId,
  connection?: StoredProviderConnection | null
): Promise<string[]> {
  const storedConnection = connection === undefined
    ? await getStoredProviderConnection(db, providerId)
    : connection;
  const encryptedKeys = getEncryptedProviderApiKeys(storedConnection);
  if (encryptedKeys.length) return encryptedKeys.map(decryptProviderSecret);
  if (providerId === "nvidia") {
    const environmentKey = process.env.NVIDIA_API_KEY || process.env.NVCF_API_KEY || "";
    if (environmentKey.trim()) return [environmentKey.trim()];
  }
  return [];
}

export function getEncryptedProviderApiKeys(connection: StoredProviderConnection | null | undefined): string[] {
  if (connection?.encryptedApiKeys?.length) return connection.encryptedApiKeys;
  return connection?.encryptedApiKey ? [connection.encryptedApiKey] : [];
}

export function getActiveProviderApiKeyIndex(
  connection: StoredProviderConnection | null | undefined,
  keyCount: number
): number {
  if (keyCount <= 0) return 0;
  const index = connection?.activeApiKeyIndex ?? 0;
  return Number.isInteger(index) && index >= 0 && index < keyCount ? index : 0;
}

export async function setActiveProviderApiKeyIndex(
  db: Db,
  providerId: ProviderId,
  index: number
): Promise<void> {
  const connection = await getStoredProviderConnection(db, providerId);
  if (!getEncryptedProviderApiKeys(connection).length) return;
  const result = await db.collection<StoredProviderConnection>("aiProviderConnections").updateOne(
    { providerId },
    { $set: { activeApiKeyIndex: index, updatedAt: new Date() } }
  );
  if (!result.matchedCount) throw new Error(`${getProviderSummary(providerId)?.name} tidak lagi tersambung.`);
}

export function toProviderConnectionSummary(
  provider: ProviderSummary,
  connection: StoredProviderConnection | null
): ProviderConnectionSummary {
  const catalogVerified = connection?.freeEndpointCatalogVerified === true;
  const availableModels = catalogVerified ? connection?.availableModels || [] : [];
  const selectedModels = catalogVerified ? (connection?.selectedModels || []).filter((model) => availableModels.includes(model)) : [];
  const modelDetails = catalogVerified
    ? Object.fromEntries(availableModels.flatMap((model) => connection?.modelDetails?.[model] ? [[model, connection.modelDetails[model]]] : []))
    : {};
  const connected = Boolean(connection?.connected);
  const apiKeyCount = getEncryptedProviderApiKeys(connection).length;
  const hasEnvironmentApiKey = provider.id === "nvidia" && Boolean(
    (process.env.NVIDIA_API_KEY || process.env.NVCF_API_KEY || "").trim()
  );
  const hasApiKey = apiKeyCount > 0 || hasEnvironmentApiKey;
  return {
    ...provider,
    configured: apiKeyCount > 0,
    connected,
    ready: provider.supported && connected && selectedModels.length > 0,
    hasApiKey,
    apiKeyCount,
    availableModels,
    modelDetails,
    selectedModels,
    baseUrl: connection?.baseUrl || provider.baseUrl || "",
    lastTestAt: connection?.lastTestAt?.toISOString(),
  };
}