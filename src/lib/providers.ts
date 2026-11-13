import "server-only";
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import type { Db } from "mongodb";
import type {
  ProviderConnectionSummary,
  ProviderId,
  ProviderSummary,
  StoredProviderConnection,
} from "@/types/providers";

const providerCatalog: ProviderSummary[] = [
  { id: "opencode", name: "OpenCode Free", description: "Model gratis melalui autentikasi OpenCode.", category: "Free Tier", connectionType: "cli", supported: false, setupNote: "Memerlukan autentikasi CLI OpenCode." },
  { id: "gemini-cli", name: "Gemini CLI", description: "Akses Gemini menggunakan login CLI Google.", category: "Free Tier", connectionType: "oauth", supported: false, setupNote: "Memerlukan OAuth Gemini CLI." },
  { id: "kiro", name: "Kiro AI", description: "Akses model Kiro melalui autentikasi AWS.", category: "Free Tier", connectionType: "oauth", supported: false, setupNote: "Memerlukan alur login OAuth Kiro." },
  { id: "openrouter", name: "OpenRouter", description: "Berbagai model melalui OpenRouter API.", category: "Free Tier", connectionType: "api-key", supported: true, baseUrl: "https://openrouter.ai/api/v1" },
  { id: "nvidia", name: "NVIDIA NIM", description: "Inference model NVIDIA melalui API NIM.", category: "Free Tier", connectionType: "api-key", supported: true, baseUrl: "https://integrate.api.nvidia.com/v1" },
  { id: "ollama", name: "Ollama Cloud", description: "Model cloud Ollama melalui API kompatibel OpenAI.", category: "Free Tier", connectionType: "api-key", supported: true, baseUrl: "https://ollama.com/v1" },
  { id: "vertex", name: "Vertex AI", description: "Google Cloud Vertex AI.", category: "Free Tier", connectionType: "service-account", supported: false, setupNote: "Memerlukan autentikasi Google Cloud service account." },
  { id: "gemini", name: "Gemini", description: "Gemini API dengan kompatibilitas OpenAI resmi.", category: "Free Tier", connectionType: "api-key", supported: true, baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai" },
  { id: "cloudflare-ai", name: "Cloudflare", description: "Cloudflare Workers AI.", category: "Free Tier", connectionType: "api-key", supported: false, setupNote: "Memerlukan Account ID dan endpoint model Cloudflare khusus." },
  { id: "poolside", name: "Poolside", description: "Model Poolside.", category: "Free Tier", connectionType: "api-key", supported: false, setupNote: "Integrasi API provider belum dikonfigurasi." },
  { id: "nous", name: "Nous Research", description: "Model Nous Research.", category: "Free Tier", connectionType: "api-key", supported: false, setupNote: "Integrasi API provider belum dikonfigurasi." },
  { id: "byteplus", name: "BytePlus ModelArk", description: "Model melalui BytePlus ModelArk.", category: "Free Tier", connectionType: "api-key", supported: false, setupNote: "Memerlukan endpoint dan konfigurasi deployment ModelArk." },
  { id: "kimchi", name: "Kimchi", description: "Provider Kimchi.", category: "Free Tier", connectionType: "api-key", supported: false, setupNote: "Integrasi API provider belum dikonfigurasi." },
  { id: "agnes", name: "Agnes AI", description: "Provider Agnes AI.", category: "Free Tier", connectionType: "api-key", supported: false, setupNote: "Integrasi API provider belum dikonfigurasi." },
  { id: "api-airforce", name: "API.airforce", description: "Model API.airforce.", category: "Free Tier", connectionType: "api-key", supported: false, setupNote: "Integrasi API provider belum dikonfigurasi." },
  { id: "bazaarlink", name: "Bazaarlink", description: "Provider Bazaarlink.", category: "Free Tier", connectionType: "api-key", supported: false, setupNote: "Integrasi API provider belum dikonfigurasi." },
  { id: "kilo-gateway", name: "Kilo Gateway", description: "Model melalui Kilo Gateway.", category: "Free Tier", connectionType: "api-key", supported: false, setupNote: "Integrasi API provider belum dikonfigurasi." },
  { id: "lmstudio", name: "LM Studio", description: "Model lokal melalui server LM Studio.", category: "Local", connectionType: "local", supported: true, baseUrl: "http://localhost:1234/v1" },
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
  if (providerId === "lmstudio" && !["localhost", "127.0.0.1", "::1", "[::1]", "host.docker.internal", "host.containers.internal"].includes(url.hostname.toLocaleLowerCase())) {
    throw new Error("LM Studio hanya dapat dihubungkan melalui localhost atau host container lokal.");
  }
  if (providerId !== "lmstudio" && value.replace(/\/+$/, "") !== definition.baseUrl) {
    throw new Error("Base URL provider ini dikelola oleh integrasi dan tidak dapat diubah.");
  }
  return value.replace(/\/+$/, "");
}

function providerHeaders(providerId: ProviderId, apiKey: string): HeadersInit {
  const headers: Record<string, string> = { Accept: "application/json" };
  if (apiKey) headers.Authorization = `Bearer ${apiKey}`;
  if (providerId === "openrouter") {
    headers["HTTP-Referer"] = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    headers["X-Title"] = process.env.NEXT_PUBLIC_APP_NAME || "GenAI Chatbot";
  }
  return headers;
}

export async function fetchProviderModels(
  providerId: ProviderId,
  apiKey: string,
  baseUrl?: string
): Promise<string[]> {
  const url = normalizeProviderBaseUrl(providerId, baseUrl);
  if (providerId !== "lmstudio" && !apiKey.trim()) throw new Error("API key provider wajib diisi.");
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
  return [...new Set(models)].sort((left, right) => left.localeCompare(right));
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
  if (!connection) throw new Error(`${getProviderSummary(providerId)?.name} belum dikonfigurasi.`);
  if (providerId === "lmstudio") return "";
  if (!connection.encryptedApiKey) throw new Error(`API key ${getProviderSummary(providerId)?.name} belum tersimpan.`);
  return decryptProviderSecret(connection.encryptedApiKey);
}

export function toProviderConnectionSummary(
  provider: ProviderSummary,
  connection: StoredProviderConnection | null
): ProviderConnectionSummary {
  const selectedModels = connection?.selectedModels || [];
  const connected = Boolean(connection?.connected);
  return {
    ...provider,
    configured: Boolean(connection && (provider.id === "lmstudio" || connection.encryptedApiKey)),
    connected,
    ready: provider.supported && connected && selectedModels.length > 0,
    hasApiKey: Boolean(connection?.encryptedApiKey),
    availableModels: connection?.availableModels || [],
    selectedModels,
    baseUrl: connection?.baseUrl || provider.baseUrl || "",
    lastTestAt: connection?.lastTestAt?.toISOString(),
  };
}