import { Db } from "mongodb";

export type AIProvider = "lmstudio" | "gemini";

export interface AIConfig {
  provider: AIProvider;
  // LM Studio Config
  lmStudioUrl: string;
  lmStudioModel: string;
  // Google AI Studio (Gemini) Config
  geminiApiKey: string;
  geminiModel: string;
  // Common Settings
  temperature: number;
  maxTokens: number;
}

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

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

  const defaultProvider: AIProvider = (process.env.AI_PROVIDER as AIProvider) === "gemini" ? "gemini" : "lmstudio";
  const provider: AIProvider = (doc?.provider === "gemini" || doc?.provider === "lmstudio")
    ? doc.provider
    : defaultProvider;

  return {
    provider,
    lmStudioUrl: doc?.baseUrl || process.env.LM_STUDIO_URL || "http://localhost:1234/v1",
    lmStudioModel: doc?.model || process.env.LM_STUDIO_MODEL || "local-model",
    geminiApiKey: doc?.geminiApiKey || process.env.GEMINI_API_KEY || "",
    geminiModel: doc?.geminiModel || process.env.GEMINI_MODEL || "gemini-1.5-flash",
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
 * Call Google AI Studio (Gemini REST API)
 */
async function callGoogleGemini(
  config: AIConfig,
  messages: ChatMessage[],
  systemInstruction?: string,
  temperature?: number,
  maxTokens?: number,
  timeoutMs: number = 30000
): Promise<string> {
  if (!config.geminiApiKey) {
    throw new Error("GEMINI_API_KEY belum dikonfigurasi. Silakan isi di .env atau pengaturan GenAI Route.");
  }

  const model = config.geminiModel || "gemini-1.5-flash";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${config.geminiApiKey}`;

  // Format messages into Gemini contents format
  const contents = messages
    .filter((m) => m.role !== "system")
    .map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));

  const payload: any = {
    contents,
    generationConfig: {
      temperature: temperature ?? config.temperature,
      maxOutputTokens: maxTokens ?? config.maxTokens,
    },
  };

  if (systemInstruction) {
    payload.systemInstruction = {
      parts: [{ text: systemInstruction }],
    };
  }

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(timeoutMs),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => null);
    const message = errorData?.error?.message || `HTTP ${res.status} (${res.statusText})`;
    throw new Error(`Google AI Studio error: ${message}`);
  }

  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    throw new Error("Google AI Studio tidak mengembalikan teks jawaban.");
  }
  return text;
}

/**
 * Main completion function: automatically dispatches to LM Studio or Google Gemini
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

  if (config.provider === "gemini") {
    return await callGoogleGemini(config, messages, systemInstruction, temperature, maxTokens, timeoutMs);
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
    throw new Error(`LM Studio tidak merespons (Status: ${res.status}). Pastikan server sudah berjalan di ${testUrl}`);
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
 * Test connectivity to Google AI Studio (Gemini)
 */
export async function testGeminiConnection(apiKey: string, model: string = "gemini-1.5-flash") {
  if (!apiKey || !apiKey.trim()) {
    throw new Error("API Key Google AI Studio tidak boleh kosong.");
  }

  const targetModel = model.trim() || "gemini-1.5-flash";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(targetModel)}:generateContent?key=${apiKey.trim()}`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: "Ping test" }] }],
      generationConfig: { maxOutputTokens: 5 },
    }),
    signal: AbortSignal.timeout(8000),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => null);
    const msg = errorData?.error?.message || `HTTP ${res.status} (${res.statusText})`;
    throw new Error(`Koneksi Google AI Studio gagal: ${msg}`);
  }

  // Also fetch available models list if possible
  let availableModels: string[] = ["gemini-1.5-flash", "gemini-1.5-pro", "gemini-2.0-flash"];
  try {
    const modelsRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey.trim()}`, {
      signal: AbortSignal.timeout(5000),
    });
    if (modelsRes.ok) {
      const modelsData = await modelsRes.json();
      const fetched = modelsData.models
        ?.filter((m: any) => m.supportedGenerationMethods?.includes("generateContent"))
        ?.map((m: any) => m.name.replace("models/", ""));
      if (fetched && fetched.length > 0) {
        availableModels = fetched;
      }
    }
  } catch {
    // Ignore models list error and fallback to default list
  }

  return {
    success: true,
    message: `Google AI Studio terhubung! Model '${targetModel}' siap digunakan.`,
    models: availableModels,
  };
}
