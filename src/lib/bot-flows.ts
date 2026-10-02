export const BOT_INTERACTION_TYPES = [
  "welcome_message",
  "guided_routing",
  "small_talk",
  "rag",
  "text",
  "text_start",
  "text_question",
] as const;

export type BotInteractionType = (typeof BOT_INTERACTION_TYPES)[number];

export const BOT_INTERACTION_LABELS: Record<BotInteractionType, string> = {
  welcome_message: "Welcome Message",
  guided_routing: "Guided Routing",
  small_talk: "Small Talk",
  rag: "RAG",
  text: "Text Interaction",
  text_start: "Text Start Interaction",
  text_question: "Text Question Interaction",
};

export interface BotPosition {
  x: number;
  y: number;
}

export type BotNextAction =
  | { type: "interaction"; interactionId: string }
  | { type: "end" }
  | { type: "close" };

export interface BotQuickButton {
  label: string;
  action: "reply" | "link";
  value: string;
}

export interface GuidedRouteOption {
  label: string;
  variable: string;
  prompt: string;
  targetInteractionId: string;
}

export interface BotInteractionConfig {
  name?: string;
  title?: string;
  subtitle?: string;
  icon?: string;
  footerText?: string;
  quickButtons?: BotQuickButton[];
  options?: GuidedRouteOption[];
  text?: string;
  question?: string;
  systemPrompt?: string;
  promptId?: string;
  provider?: "global" | "lmstudio" | "openrouter";
  model?: string;
  lmStudioUrl?: string;
  temperature?: number;
  maxTokens?: number;
  knowledgeBases?: string[];
}

export interface BotInteraction {
  id: string;
  type: BotInteractionType;
  position: BotPosition;
  config: BotInteractionConfig;
  nextAction: BotNextAction;
}

export interface BotDefinitionInput {
  name: string;
  description: string;
  entryInteractionId: string;
  interactions: BotInteraction[];
}

export interface BotDefinition extends BotDefinitionInput {
  id: string;
  createdAt: string;
  updatedAt: string;
}

export type BotValidationResult =
  | { success: true; data: BotDefinitionInput }
  | { success: false; error: string };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function validLink(value: string): boolean {
  if (value.startsWith("/") && !value.startsWith("//")) return true;
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function parseNextAction(value: unknown): BotNextAction | null {
  if (!isRecord(value)) return null;
  if (value.type === "end" || value.type === "close") return { type: value.type };
  if (value.type === "interaction" && typeof value.interactionId === "string") {
    return { type: "interaction", interactionId: value.interactionId };
  }
  return null;
}

function parseConfig(value: unknown): BotInteractionConfig | null {
  if (!isRecord(value)) return null;
  const provider = value.provider === "lmstudio" || value.provider === "openrouter"
    ? value.provider
    : value.provider === "global" ? "global" : undefined;
  const quickButtons = Array.isArray(value.quickButtons)
    ? value.quickButtons.slice(0, 8).flatMap((item) => {
      if (!isRecord(item)) return [];
      const label = typeof item.label === "string" ? item.label.trim().slice(0, 60) : "";
      const buttonValue = typeof item.value === "string" ? item.value.trim().slice(0, 500) : "";
      if (!label || !buttonValue || (item.action !== "reply" && item.action !== "link")) return [];
      if (item.action === "link" && !validLink(buttonValue)) return [];
      return [{ label, value: buttonValue, action: item.action as "reply" | "link" }];
    })
    : undefined;
  const options = Array.isArray(value.options)
    ? value.options.slice(0, 10).flatMap((item, index) => {
      if (!isRecord(item)) return [];
      const label = typeof item.label === "string" ? item.label.trim().slice(0, 80) : "";
      const targetInteractionId = typeof item.targetInteractionId === "string" ? item.targetInteractionId : "";
      const generatedVariable = label.toUpperCase().replace(/[^\p{L}\p{N}]+/gu, "_").replace(/^_+|_+$/g, "") || `ROUTE_${index + 1}`;
      const variable = typeof item.variable === "string" && item.variable.trim()
        ? item.variable.trim().toUpperCase().replace(/[^\p{L}\p{N}_]+/gu, "_").slice(0, 80)
        : generatedVariable;
      const prompt = typeof item.prompt === "string" && item.prompt.trim()
        ? item.prompt.trim().slice(0, 1000)
        : `Pilih route ini jika maksud pengguna sesuai dengan "${label}".`;
      return label && targetInteractionId ? [{ label, variable, prompt, targetInteractionId }] : [];
    })
    : undefined;

  return {
    name: typeof value.name === "string" ? value.name.trim().slice(0, 120) : undefined,
    title: typeof value.title === "string" ? value.title.trim().slice(0, 120) : undefined,
    subtitle: typeof value.subtitle === "string" ? value.subtitle.trim().slice(0, 500) : undefined,
    icon: typeof value.icon === "string" ? value.icon.slice(0, 40) : undefined,
    footerText: typeof value.footerText === "string" ? value.footerText.trim().slice(0, 200) : undefined,
    quickButtons,
    options,
    text: typeof value.text === "string" ? value.text.trim().slice(0, 4000) : undefined,
    question: typeof value.question === "string" ? value.question.trim().slice(0, 1000) : undefined,
    systemPrompt: typeof value.systemPrompt === "string" ? value.systemPrompt.trim().slice(0, 4000) : undefined,
    promptId: typeof value.promptId === "string" ? value.promptId.trim().slice(0, 100) : undefined,
    provider,
    model: typeof value.model === "string" ? value.model.trim().slice(0, 200) : undefined,
    lmStudioUrl: typeof value.lmStudioUrl === "string" ? value.lmStudioUrl.trim().slice(0, 500) : undefined,
    temperature: typeof value.temperature === "number" && Number.isFinite(value.temperature)
      ? Math.max(0, Math.min(2, value.temperature))
      : undefined,
    maxTokens: typeof value.maxTokens === "number" && Number.isFinite(value.maxTokens)
      ? Math.max(64, Math.min(8192, Math.round(value.maxTokens)))
      : undefined,
    knowledgeBases: Array.isArray(value.knowledgeBases)
      ? value.knowledgeBases.filter((item): item is string => typeof item === "string").slice(0, 20)
      : undefined,
  };
}

export function validateBotDefinition(value: unknown): BotValidationResult {
  if (!isRecord(value)) return { success: false, error: "Format bot tidak valid." };
  const name = typeof value.name === "string" ? value.name.trim() : "";
  const description = typeof value.description === "string" ? value.description.trim() : "";
  const entryInteractionId = typeof value.entryInteractionId === "string" ? value.entryInteractionId : "";
  if (!name || name.length > 100) return { success: false, error: "Nama bot wajib diisi (maksimal 100 karakter)." };
  if (description.length > 500) return { success: false, error: "Deskripsi maksimal 500 karakter." };
  if (!Array.isArray(value.interactions) || value.interactions.length < 1 || value.interactions.length > 100) {
    return { success: false, error: "Bot harus memiliki 1 sampai 100 interaction." };
  }

  const interactions: BotInteraction[] = [];
  const ids = new Set<string>();
  for (const item of value.interactions) {
    if (!isRecord(item) || typeof item.id !== "string" || !item.id || ids.has(item.id)) {
      return { success: false, error: "ID interaction tidak valid atau duplikat." };
    }
    if (!BOT_INTERACTION_TYPES.includes(item.type as BotInteractionType)) {
      return { success: false, error: "Tipe interaction tidak valid." };
    }
    if (!isRecord(item.position) || typeof item.position.x !== "number" || typeof item.position.y !== "number") {
      return { success: false, error: "Posisi interaction tidak valid." };
    }
    const config = parseConfig(item.config);
    const nextAction = parseNextAction(item.nextAction);
    if (!config || !nextAction) return { success: false, error: "Konfigurasi atau next action interaction tidak valid." };
    ids.add(item.id);
    interactions.push({
      id: item.id,
      type: item.type as BotInteractionType,
      position: { x: item.position.x, y: item.position.y },
      config,
      nextAction,
    });
  }

  if (!ids.has(entryInteractionId)) return { success: false, error: "Entry interaction harus dipilih." };
  for (const interaction of interactions) {
    if (interaction.type === "guided_routing") {
      const options = interaction.config.options || [];
      if (options.length === 0) return { success: false, error: "Guided Routing harus memiliki minimal satu pilihan route." };
      const variables = options.map((option) => option.variable.toLocaleUpperCase());
      if (new Set(variables).size !== variables.length) {
        return { success: false, error: "Variable route dalam Guided Routing harus unik." };
      }
    }
    if (interaction.nextAction.type === "interaction" && !ids.has(interaction.nextAction.interactionId)) {
      return { success: false, error: "Next interaction tidak ditemukan." };
    }
    if (interaction.config.options?.some((option) => !ids.has(option.targetInteractionId))) {
      return { success: false, error: "Target guided routing tidak ditemukan." };
    }
  }

  return {
    success: true,
    data: { name, description, entryInteractionId, interactions },
  };
}

export function createStarterBot(name = "Bot Baru"): BotDefinitionInput {
  const welcomeId = crypto.randomUUID();
  const startId = crypto.randomUUID();
  return {
    name,
    description: "",
    entryInteractionId: welcomeId,
    interactions: [
      {
        id: welcomeId,
        type: "welcome_message",
        position: { x: 80, y: 100 },
        config: {
          title: "Selamat datang",
          subtitle: "Ada yang bisa kami bantu?",
          icon: "sparkles",
          footerText: "Pilih opsi atau kirim pesan untuk memulai.",
          quickButtons: [],
        },
        nextAction: { type: "interaction", interactionId: startId },
      },
      {
        id: startId,
        type: "text_start",
        position: { x: 430, y: 100 },
        config: { text: "Halo! Ada yang bisa saya bantu?" },
        nextAction: { type: "end" },
      },
    ],
  };
}
