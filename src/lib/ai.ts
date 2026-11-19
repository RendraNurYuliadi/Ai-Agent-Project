import "server-only";
import { Db } from "mongodb";
import { getDatabase } from "@/lib/mongodb";
import { buildChatCompletionPayload } from "@/lib/chat-completion-payload";
import type { ProviderId } from "@/types/providers";
import {
  getProviderSummary,
  getStoredProviderConnection,
  getStoredProviderApiKeys,
  getActiveProviderApiKeyIndex,
  setActiveProviderApiKeyIndex,
} from "@/lib/providers";

export type AIProvider = ProviderId;

export interface AIConfig {
  provider: AIProvider;
  providerId?: ProviderId;
  providerBaseUrl?: string;
  providerApiKey?: string;
  providerApiKeys?: string[];
  providerApiKeyIndex?: number;
  providerModel?: string;
  // Common Settings
  temperature: number;
  maxTokens: number;
}

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface StoredAIConfig {
  temperature?: number;
  maxTokens?: number;
}

/**
 * Retrieve active AI configuration, merging DB preferences with Environment Variables.
 */
export async function getAIConfig(db?: Db | null): Promise<AIConfig> {
  let doc: StoredAIConfig | null = null;
  if (db) {
    try {
      doc = (await db.collection("genaiConfig").findOne({ key: "active_config" })) as StoredAIConfig | null;
    } catch {
      doc = null;
    }
  }

  const provider: AIProvider = "nvidia";
  let providerBaseUrl: string | undefined;
  let providerApiKey: string | undefined;
  let providerApiKeys: string[] | undefined;
  let providerApiKeyIndex: number | undefined;
  let providerModel: string | undefined;
  if (db) {
    try {
      const connection = await getStoredProviderConnection(db, "nvidia");
      if (
        connection?.connected &&
        connection.freeEndpointCatalogVerified &&
        connection.selectedModels.some((model) => connection.availableModels.includes(model))
      ) {
        providerBaseUrl = connection.baseUrl;
        providerApiKeys = await getStoredProviderApiKeys(db, "nvidia", connection);
        providerApiKeyIndex = getActiveProviderApiKeyIndex(connection, providerApiKeys.length);
        providerApiKey = providerApiKeys[providerApiKeyIndex];
        providerModel = connection.selectedModels.find((model) => connection.availableModels.includes(model));
      }
    } catch {
      providerBaseUrl = undefined;
      providerApiKey = undefined;
      providerApiKeys = undefined;
      providerApiKeyIndex = undefined;
      providerModel = undefined;
    }
  }

  return {
    provider,
    providerId: "nvidia",
    providerBaseUrl,
    providerApiKey,
    providerApiKeys,
    providerApiKeyIndex,
    providerModel,
    temperature: doc?.temperature ?? 0.7,
    maxTokens: doc?.maxTokens ?? 1024,
  };
}

function extractTextFromProviderContent(value: unknown): string | null {
  if (typeof value === "string") return value.trim() || null;
  if (Array.isArray(value)) {
    const textParts: string[] = [];
    for (const item of value) {
      const extracted = extractTextFromProviderContent(item);
      if (extracted) textParts.push(extracted);
    }
    return textParts.join("\n").trim() || null;
  }
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    const preferredKeys = ["text", "content", "value", "message", "output", "answer", "reasoning"];
    for (const key of preferredKeys) {
      const candidate = record[key];
      const extracted = extractTextFromProviderContent(candidate);
      if (extracted) return extracted;
    }

    const nestedValues = Object.values(record);
    for (const nested of nestedValues) {
      if (nested && typeof nested === "object") {
        const extracted = extractTextFromProviderContent(nested);
        if (extracted) return extracted;
      }
    }
  }
  return null;
}

async function callManagedProvider(
  config: AIConfig,
  messages: ChatMessage[],
  systemInstruction?: string,
  temperature?: number,
  maxTokens?: number,
  timeoutMs: number = 30000
): Promise<string> {
  const providerId = config.providerId;
  const provider = providerId ? getProviderSummary(providerId) : undefined;
  if (!providerId || !provider?.supported || !config.providerBaseUrl || !config.providerModel) {
    throw new Error("Konfigurasi provider atau model yang dipilih tidak lengkap.");
  }
  if (!config.providerApiKey) {
    throw new Error(`API key ${provider.name} belum tersedia.`);
  }
  const formattedMessages: ChatMessage[] = [];
  if (systemInstruction) formattedMessages.push({ role: "system", content: systemInstruction });
  formattedMessages.push(...messages);
  const apiKeys = config.providerApiKeys?.length ? config.providerApiKeys : [config.providerApiKey];
  const configuredIndex = config.providerApiKeyIndex;
  const startIndex = configuredIndex !== undefined &&
    Number.isInteger(configuredIndex) &&
    configuredIndex >= 0 &&
    configuredIndex < apiKeys.length
    ? configuredIndex
    : 0;
  const failures: string[] = [];

  for (let attempt = 0; attempt < apiKeys.length; attempt += 1) {
    const index = (startIndex + attempt) % apiKeys.length;
    const apiKey = apiKeys[index];
    try {
      const response = await fetch(`${config.providerBaseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(buildChatCompletionPayload(
          config.providerModel,
          formattedMessages,
          temperature ?? config.temperature,
          maxTokens ?? config.maxTokens
        )),
        signal: AbortSignal.timeout(timeoutMs),
      });
      if (!response.ok) {
        const body = await response.text();
        const safeBody = body.split(apiKey).join("[redacted]");
        throw new Error(`${provider.name} error (${response.status}): ${safeBody.slice(0, 1000) || response.statusText}`);
      }
      const data = await response.json();
      const answer = extractTextFromProviderContent(data.choices?.[0]?.message?.content);
      if (!answer) throw new Error(`${provider.name} mengembalikan respons tanpa teks.`);
      return answer;
    } catch (error) {
      failures.push(`API key ${index + 1}: ${error instanceof Error ? error.message : "Permintaan gagal."}`);
      const nextIndex = (index + 1) % apiKeys.length;
      try {
        const db = await getDatabase();
        await setActiveProviderApiKeyIndex(db, providerId, nextIndex);
        config.providerApiKeyIndex = nextIndex;
      } catch (rotationError) {
        throw new Error(
          `${failures[failures.length - 1]} Gagal menyimpan posisi failover: ${
            rotationError instanceof Error ? rotationError.message : "Kesalahan database."
          }`
        );
      }
    }
  }

  try {
    const db = await getDatabase();
    await setActiveProviderApiKeyIndex(db, providerId, 0);
    config.providerApiKeyIndex = 0;
  } catch (rotationError) {
    throw new Error(`Semua API key gagal dan posisi key tidak dapat diatur ulang: ${rotationError instanceof Error ? rotationError.message : "Kesalahan database."}`);
  }
  throw new Error(`Semua ${apiKeys.length} API key gagal. Posisi diatur kembali ke API key 1. ${failures.join(" | ")}`);
}

export async function getManagedProviderAIConfig(
  db: Db,
  providerId: ProviderId,
  model: string,
  settings: { temperature?: number; maxTokens?: number } = {}
): Promise<AIConfig> {
  const provider = getProviderSummary(providerId);
  if (!provider?.supported) throw new Error("Provider ini belum memiliki integrasi API yang tersedia.");
  const connection = await getStoredProviderConnection(db, providerId);
  if (!connection?.connected) throw new Error(`${provider.name} belum tersambung.`);
  if (providerId === "nvidia" && !connection.freeEndpointCatalogVerified) {
    throw new Error("Uji koneksi ulang NVIDIA NIM untuk memverifikasi Free Endpoint sebelum menggunakan model.");
  }
  if (providerId === "nvidia" && !connection.availableModels.includes(model)) {
    throw new Error(`Model ${model} belum terverifikasi sebagai Free Endpoint dari katalog NVIDIA.`);
  }
  if (!model || !connection.selectedModels.includes(model)) {
    throw new Error(`Model belum dipilih pada daftar model yang digunakan untuk ${provider.name}.`);
  }
  const apiKeys = await getStoredProviderApiKeys(db, providerId, connection);
  if (!apiKeys.length) throw new Error(`API key ${provider.name} belum tersedia.`);
  const apiKeyIndex = getActiveProviderApiKeyIndex(connection, apiKeys.length);
  return {
    provider: providerId,
    providerId,
    providerBaseUrl: connection.baseUrl,
    providerApiKey: apiKeys[apiKeyIndex],
    providerApiKeys: apiKeys,
    providerApiKeyIndex: apiKeyIndex,
    providerModel: model,
    temperature: settings.temperature ?? 0.7,
    maxTokens: settings.maxTokens ?? 1024,
  };
}

/**
 * Main completion function for the configured NVIDIA NIM model.
 */
export async function generateAICompletion(options: {
  config: AIConfig;
  messages: ChatMessage[];
  systemInstruction?: string;
  temperature?: number;
  maxTokens?: number;
  timeoutMs?: number;
}): Promise<string> {
  const { config, messages, systemInstruction, temperature, maxTokens, timeoutMs } = options;

  if (config.providerId) {
    return await callManagedProvider(config, messages, systemInstruction, temperature, maxTokens, timeoutMs);
  }
  throw new Error("Konfigurasi NVIDIA NIM belum dipilih pada provider dan model bot.");
}
