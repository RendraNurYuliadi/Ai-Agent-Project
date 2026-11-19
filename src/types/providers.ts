export type ProviderId = "nvidia";

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
  apiKeyCount: number;
  availableModels: string[];
  modelDetails?: Record<string, ProviderModelDetails>;
  selectedModels: string[];
  baseUrl: string;
  lastTestAt?: string;
}

export interface ProviderModelDetails {
  inputModalities: string[];
  outputModalities: string[];
}

export interface StoredProviderConnection {
  providerId: ProviderId;
  encryptedApiKey?: string;
  encryptedApiKeys?: string[];
  activeApiKeyIndex?: number;
  baseUrl: string;
  availableModels: string[];
  modelDetails?: Record<string, ProviderModelDetails>;
  selectedModels: string[];
  freeEndpointCatalogVerified?: boolean;
  connected: boolean;
  lastTestAt?: Date;
  updatedAt: Date;
}