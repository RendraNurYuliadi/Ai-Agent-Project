export type ProviderId =
  | "opencode"
  | "gemini-cli"
  | "kiro"
  | "openrouter"
  | "nvidia"
  | "ollama"
  | "vertex"
  | "gemini"
  | "cloudflare-ai"
  | "poolside"
  | "nous"
  | "byteplus"
  | "kimchi"
  | "agnes"
  | "api-airforce"
  | "bazaarlink"
  | "kilo-gateway"
  | "lmstudio";

export interface ProviderSummary {
  id: ProviderId;
  name: string;
  description: string;
  category: "Free Tier" | "Local";
  connectionType: "api-key" | "oauth" | "cli" | "service-account" | "local";
  supported: boolean;
  baseUrl?: string;
  setupNote?: string;
}

export interface ProviderConnectionSummary extends ProviderSummary {
  configured: boolean;
  connected: boolean;
  ready: boolean;
  hasApiKey: boolean;
  availableModels: string[];
  selectedModels: string[];
  baseUrl: string;
  lastTestAt?: string;
}

export interface StoredProviderConnection {
  providerId: ProviderId;
  encryptedApiKey?: string;
  baseUrl: string;
  availableModels: string[];
  selectedModels: string[];
  connected: boolean;
  lastTestAt?: Date;
  updatedAt: Date;
}