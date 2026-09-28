import { Db } from "mongodb";

export type AIProvider = "lmstudio" | "openrouter";

export interface AIConfig {
  provider: AIProvider;
  // LM Studio Config (Local)
  lmStudioUrl: string;
  lmStudioModel: string;
  // OpenRouter Config (Public / Cloud)
  openRouterApiKey: string;
  openRouterModel: string;
  // Common Settings
  temperature: number;
  maxTokens: number;
}

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

// Daftar model OpenRouter gratis yang populer dan stabil
export const OPENROUTER_FREE_MODELS = [
  { id: "openrouter/auto", label: "Auto (Pilih Terbaik)", desc: "OpenRouter pilih otomatis" },
  { id: "meta-llama/llama-3.3-70b-instruct:free", label: "Llama 3.3 70B Instruct", desc: "Meta · Gratis" },
  { id: "meta-llama/llama-3.1-8b-instruct:free", label: "Llama 3.1 8B Instruct", desc: "Meta · Gratis · Cepat" },
  { id: "google/gemini-2.0-flash-exp:free", label: "Gemini 2.0 Flash", desc: "Google · Gratis" },
  { id: "google/gemma-3-27b-it:free", label: "Gemma 3 27B IT", desc: "Google · Gratis" },
  { id: "google/gemma-3-12b-it:free", label: "Gemma 3 12B IT", desc: "Google · Gratis" },
  { id: "microsoft/phi-4:free", label: "Phi-4", desc: "Microsoft · Gratis" },
  { id: "mistralai/mistral-7b-instruct:free", label: "Mistral 7B Instruct", desc: "Mistral · Gratis · Cepat" },
  { id: "qwen/qwen3-8b:free", label: "Qwen3 8B", desc: "Alibaba · Gratis" },
  { id: "deepseek/deepseek-r1:free", label: "DeepSeek R1", desc: "DeepSeek · Gratis · Reasoning" },
  { id: "nvidia/llama-3.1-nemotron-70b-instruct:free", label: "Nemotron 70B", desc: "NVIDIA · Gratis" },
];

/**
 * Retrieve active AI configuration, merging DB preferences with Environment Variables.
 */
export async function getAIConfig(db?: Db | null): Promise<AIConfig> {
  let doc: any = null;
  if (db) {
    try {
      doc = (await db.collection("genaiConfig").findOne({ key: "active_config" })) ||
            (await db.collection("genaiConfig").findOne({ key: "lmstudio" }));
    } catch {
      doc = null;
    }
  }

  const defaultProvider: AIProvider =
    (process.env.AI_PROVIDER as AIProvider) === "openrouter" ? "openrouter" : "lmstudio";
  const provider: AIProvider =
    doc?.provider === "openrouter" || doc?.provider === "lmstudio"
      ? doc.provider
      : defaultProvider;

  return {
    provider,
    lmStudioUrl: doc?.baseUrl || process.env.LM_STUDIO_URL || "http://localhost:1234/v1",
    lmStudioModel: doc?.model || process.env.LM_STUDIO_MODEL || "local-model",
    openRouterApiKey: doc?.openRouterApiKey || process.env.OPENROUTER_API_KEY || "",
    openRouterModel:
      doc?.openRouterModel ||
      process.env.OPENROUTER_MODEL ||
      "meta-llama/llama-3.3-70b-instruct:free",
    temperature: doc?.temperature ?? 0.7,
    maxTokens: doc?.maxTokens ?? 1024,
  };
}

/**
 * Call LM Studio (OpenAI-compatible local server)
 */
async function callLMStudio(
  config: AIConfig,
  messages: ChatMessage[],
  systemInstruction?: string,
  temperature?: number,
  maxTokens?: number,
  timeoutMs: number = 30000
): Promise<string> {
  const formattedMessages: ChatMessage[] = [];
  if (systemInstruction) {
    formattedMessages.push({ role: "system", content: systemInstruction });
  }
  formattedMessages.push(...messages);

  const res = await fetch(`${config.lmStudioUrl}/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: config.lmStudioModel,
      messages: formattedMessages,
      temperature: temperature ?? config.temperature,
      max_tokens: maxTokens ?? config.maxTokens,
      stream: false,
    }),
    signal: AbortSignal.timeout(timeoutMs),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`LM Studio error (${res.status}): ${errorText || res.statusText}`);
  }

  const data = await res.json();
  const answer = data.choices?.[0]?.message?.content;
  if (typeof answer !== "string") {
    throw new Error("Format respons LM Studio tidak valid");
  }
  return answer;
}

/**
 * Call OpenRouter (OpenAI-compatible cloud API with free models)
 * Docs: https://openrouter.ai/docs
 */
async function callOpenRouter(
  config: AIConfig,
  messages: ChatMessage[],
  systemInstruction?: string,
  temperature?: number,
  maxTokens?: number,
  timeoutMs: number = 30000
): Promise<string> {
  if (!config.openRouterApiKey) {
    throw new Error(
      "OPENROUTER_API_KEY belum dikonfigurasi. Dapatkan API key gratis di https://openrouter.ai/keys"
    );
  }

  const formattedMessages: ChatMessage[] = [];
  if (systemInstruction) {
    formattedMessages.push({ role: "system", content: systemInstruction });
  }
  formattedMessages.push(...messages);

  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.openRouterApiKey}`,
      "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
      "X-Title": process.env.NEXT_PUBLIC_APP_NAME || "GenAI Chatbot",
    },
    body: JSON.stringify({
      model: config.openRouterModel,
      messages: formattedMessages,
      temperature: temperature ?? config.temperature,
      max_tokens: maxTokens ?? config.maxTokens,
    }),
    signal: AbortSignal.timeout(timeoutMs),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => null);
    const message =
      errorData?.error?.message || `HTTP ${res.status} (${res.statusText})`;
    throw new Error(`OpenRouter error: ${message}`);
  }

  const data = await res.json();
  const answer = data.choices?.[0]?.message?.content;
  if (typeof answer !== "string") {
    throw new Error("Format respons OpenRouter tidak valid");
  }
  return answer;
}

/**
 * Main completion function: automatically dispatches to LM Studio or OpenRouter
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

  if (config.provider === "openrouter") {
    return await callOpenRouter(config, messages, systemInstruction, temperature, maxTokens, timeoutMs);
  } else {
    return await callLMStudio(config, messages, systemInstruction, temperature, maxTokens, timeoutMs);
  }
}

/**
 * Test connectivity to LM Studio
 */
export async function testLMStudioConnection(baseUrl: string) {
  const testUrl = baseUrl || "http://localhost:1234/v1";
  const res = await fetch(`${testUrl}/models`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
    signal: AbortSignal.timeout(5000),
  });

  if (!res.ok) {
    throw new Error(
      `LM Studio tidak merespons (Status: ${res.status}). Pastikan server sudah berjalan di ${testUrl}`
    );
  }

  const data = await res.json();
  const models = data.data?.map((m: { id: string }) => m.id) || [];
  return {
    success: true,
    message: `LM Studio terhubung di ${testUrl}!`,
    models,
  };
}

/**
 * Test connectivity to OpenRouter and return available free models
 */
export async function testOpenRouterConnection(apiKey: string, model: string) {
  if (!apiKey || !apiKey.trim()) {
    throw new Error(
      "API Key OpenRouter tidak boleh kosong. Dapatkan gratis di https://openrouter.ai/keys"
    );
  }

  const targetModel = model?.trim() || "meta-llama/llama-3.3-70b-instruct:free";

  // Quick ping test with minimal tokens
  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey.trim()}`,
      "HTTP-Referer": "http://localhost:3000",
      "X-Title": "GenAI Chatbot",
    },
    body: JSON.stringify({
      model: targetModel,
      messages: [{ role: "user", content: "Hi" }],
      max_tokens: 5,
    }),
    signal: AbortSignal.timeout(15000),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => null);
    const msg =
      errorData?.error?.message || `HTTP ${res.status} (${res.statusText})`;
    throw new Error(`Koneksi OpenRouter gagal: ${msg}`);
  }

  // Fetch list of free models from OpenRouter
  let availableModels: string[] = OPENROUTER_FREE_MODELS.map((m) => m.id);
  try {
    const modelsRes = await fetch("https://openrouter.ai/api/v1/models", {
      headers: { Authorization: `Bearer ${apiKey.trim()}` },
      signal: AbortSignal.timeout(8000),
    });
    if (modelsRes.ok) {
      const modelsData = await modelsRes.json();
      const freeFetched = (modelsData.data as Array<{ id: string; pricing?: { prompt: string } }>)
        ?.filter((m) => m.id.endsWith(":free") || m.pricing?.prompt === "0")
        ?.map((m) => m.id)
        ?.slice(0, 20);
      if (freeFetched && freeFetched.length > 0) {
        availableModels = freeFetched;
      }
    }
  } catch {
    // Ignore models list error — fallback to curated list
  }

  return {
    success: true,
    message: `OpenRouter terhubung! Model '${targetModel}' siap digunakan.`,
    models: availableModels,
  };
}
