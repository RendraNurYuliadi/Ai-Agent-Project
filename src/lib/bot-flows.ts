export const BOT_INTERACTION_TYPES = [
  "welcome_message",
  "guided_routing",
  "small_talk",
  "rag",
  "web_search",
  "data_collection",
  "data_collection_submitted",
  "text",
  "text_question",
] as const;

export type BotInteractionType = (typeof BOT_INTERACTION_TYPES)[number] | "text_start";

export const BOT_INTERACTION_LABELS: Record<BotInteractionType, string> = {
  welcome_message: "Welcome Message",
  guided_routing: "Guided Routing",
  small_talk: "Small Talk",
  rag: "RAG",
  web_search: "Web Search",
  data_collection: "Data Collection",
  data_collection_submitted: "Data Collection Submitted",
  text: "Text Interaction",
  text_start: "Text Interaction",
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

export interface DataCollectionQuestion {
  name: string;
  question: string;
  variable: string;
  components?: DataCollectionComponent[];
}

export interface DataCollectionComponentCard {
  imageUrl: string;
  imageHeight: number;
  title: string;
  subtitle: string;
  buttons: BotQuickButton[];
}

export interface DataCollectionComponent {
  name: string;
  type: "reply_buttons" | "link_buttons" | "card" | "carousel";
  title: string;
  subtitle: string;
  buttons: BotQuickButton[];
  card: DataCollectionComponentCard | null;
  cards: DataCollectionComponentCard[];
}

export interface DataCollectionValidator {
  confirmationQuestion: string;
  confirmationButtons: DataCollectionValidatorButton[];
  reviewQuestion: string;
}

export interface DataCollectionValidatorButton extends BotQuickButton {
  type: "true" | "false";
}

export interface DataCollectionSubmittedField {
  name: string;
  variable: string;
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
  fallbackMessage?: string;
  promptId?: string;
  provider?: "global" | "lmstudio" | "openrouter";
  model?: string;
  lmStudioUrl?: string;
  temperature?: number;
  maxTokens?: number;
  webSearchMaxResults?: number;
  dataCollectionQuestions?: DataCollectionQuestion[];
  dataCollectionValidator?: DataCollectionValidator;
  dataCollectionSubmittedFields?: DataCollectionSubmittedField[];
  knowledgeBases?: string[];
}

export interface BotInteraction {
  id: string;
  type: BotInteractionType;
  position: BotPosition;
  config: BotInteractionConfig;
  nextAction: BotNextAction;
}

export interface BotCustomVariable {
  id: string;
  name: string;
  value: string;
}

export interface BotDefinitionInput {
  name: string;
  description: string;
  entryInteractionId: string;
  interactions: BotInteraction[];
  variables?: BotCustomVariable[];
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
  const dataCollectionQuestions = Array.isArray(value.dataCollectionQuestions)
    ? value.dataCollectionQuestions.slice(0, 30).flatMap((item) => {
      if (!isRecord(item)) return [];
      const name = typeof item.name === "string" ? item.name.trim().slice(0, 80) : "";
      const question = typeof item.question === "string" && item.question.trim()
        ? item.question.trim().slice(0, 500)
        : typeof item.prompt === "string" && item.prompt.trim()
          ? item.prompt.trim().slice(0, 500)
          : "";
      const variable = typeof item.variable === "string" && item.variable.trim()
        ? item.variable.trim().slice(0, 80)
        : typeof item.name === "string" && item.name.trim()
          ? item.name.trim()
          : "";
      if (!name || /[.$]/.test(name) || ["__proto__", "prototype", "constructor"].includes(name.toLocaleLowerCase()) || !question || !variable) return [];
      const components = Array.isArray(item.components)
        ? item.components.slice(0, 5).flatMap((component, index) => {
          if (!isRecord(component) || !["reply_buttons", "link_buttons", "card", "carousel"].includes(String(component.type))) return [];
          const type = component.type as DataCollectionComponent["type"];
          const parseComponentButtons = (buttons: unknown, max: number): BotQuickButton[] => Array.isArray(buttons)
            ? buttons.slice(0, max).flatMap((button) => {
              if (!isRecord(button)) return [];
              const label = typeof button.label === "string" ? button.label.trim().slice(0, 60) : "";
              const buttonValue = typeof button.value === "string" ? button.value.trim().slice(0, 500) : "";
              const action = button.action === "link" ? "link" : button.action === "reply" ? "reply" : null;
              return label && buttonValue && action && (action !== "link" || validLink(buttonValue)) ? [{ label, value: buttonValue, action }] : [];
            })
            : [];
          const parseComponentCard = (cardValue: unknown): DataCollectionComponentCard | null => {
            if (!isRecord(cardValue)) return null;
            const title = typeof cardValue.title === "string" ? cardValue.title.trim().slice(0, 120) : "";
            const subtitle = typeof cardValue.subtitle === "string" ? cardValue.subtitle.trim().slice(0, 300) : "";
            const imageUrl = typeof cardValue.imageUrl === "string" ? cardValue.imageUrl.trim().slice(0, 1000) : "";
            const imageHeight = typeof cardValue.imageHeight === "number" ? Math.round(cardValue.imageHeight) : 128;
            if (!title || !subtitle || !Number.isFinite(imageHeight) || imageHeight < 64 || imageHeight > 500 || (imageUrl && !validLink(imageUrl))) return null;
            return { title, subtitle, imageUrl, imageHeight, buttons: parseComponentButtons(cardValue.buttons, 3) };
          };
          const card = type === "card" ? parseComponentCard(component.card) : null;
          const cards = type === "carousel" && Array.isArray(component.cards)
            ? component.cards.slice(0, 10).flatMap((cardValue) => {
              const parsedCard = parseComponentCard(cardValue);
              return parsedCard ? [parsedCard] : [];
            })
            : [];
          const buttons = type === "reply_buttons" || type === "link_buttons"
            ? parseComponentButtons(component.buttons, 10).map((button) => ({
              ...button,
              action: type === "link_buttons" ? "link" as const : "reply" as const,
            }))
            : [];
          if (type === "card" && !card) return [];
          if (type === "carousel" && cards.length === 0) return [];
          if ((type === "reply_buttons" || type === "link_buttons") && buttons.length === 0) return [];
          return [{
            name: typeof component.name === "string" && component.name.trim() ? component.name.trim().slice(0, 100) : `Komponen ${index + 1}`,
            type,
            title: typeof component.title === "string" ? component.title.trim().slice(0, 120) : "",
            subtitle: typeof component.subtitle === "string" ? component.subtitle.trim().slice(0, 300) : "",
            buttons,
            card,
            cards,
          }];
        })
        : [];
      return [{ name, question, variable, components }];
    })
    : undefined;
  const dataCollectionValidator = isRecord(value.dataCollectionValidator)
    ? {
      confirmationQuestion: typeof value.dataCollectionValidator.confirmationQuestion === "string"
        ? value.dataCollectionValidator.confirmationQuestion.trim().slice(0, 1000)
        : "",
      confirmationButtons: Array.isArray(value.dataCollectionValidator.confirmationButtons)
        ? value.dataCollectionValidator.confirmationButtons.slice(0, 8).flatMap((button) => {
          if (!isRecord(button)) return [];
          const label = typeof button.label === "string" ? button.label.trim().slice(0, 60) : "";
          const buttonValue = typeof button.value === "string" ? button.value.trim().slice(0, 500) : "";
          const type: DataCollectionValidatorButton["type"] = button.type === "true" || button.type === "false"
            ? button.type
            : buttonValue.toLocaleLowerCase() === "true" ? "true" : "false";
          return label && buttonValue && button.action === "reply" ? [{ label, value: buttonValue, action: "reply" as const, type }] : [];
        })
        : [],
      reviewQuestion: typeof value.dataCollectionValidator.reviewQuestion === "string"
        ? value.dataCollectionValidator.reviewQuestion.trim().slice(0, 1000)
        : "",
    }
    : undefined;
  const dataCollectionSubmittedFields = Array.isArray(value.dataCollectionSubmittedFields)
    ? value.dataCollectionSubmittedFields.slice(0, 30).flatMap((item) => {
      if (!isRecord(item)) return [];
      const name = typeof item.name === "string" ? item.name.trim().slice(0, 80) : "";
      const variable = typeof item.variable === "string" ? item.variable.trim().slice(0, 100) : "";
      return name && variable ? [{ name, variable }] : [];
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
    fallbackMessage: typeof value.fallbackMessage === "string" ? value.fallbackMessage.trim().slice(0, 1000) : undefined,
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
    webSearchMaxResults: typeof value.webSearchMaxResults === "number" && Number.isFinite(value.webSearchMaxResults)
      ? Math.max(1, Math.min(10, Math.round(value.webSearchMaxResults)))
      : undefined,
    dataCollectionQuestions,
    dataCollectionValidator,
    dataCollectionSubmittedFields,
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

  const variables = Array.isArray(value.variables)
    ? value.variables.flatMap((item) => {
        if (!isRecord(item)) return [];
        const nameValue = typeof item.name === "string" ? item.name.trim() : "";
        const valueText = typeof item.value === "string" ? item.value : "";
        if (!nameValue || !/^\w+$/.test(nameValue) || nameValue.length > 40) return [];
        return [{ id: typeof item.id === "string" ? item.id : crypto.randomUUID(), name: nameValue, value: valueText.slice(0, 2000) }];
      })
    : [];
  const variableNames = variables.map((item) => item.name.toLocaleLowerCase());
  if (new Set(variableNames).size !== variableNames.length) {
    return { success: false, error: "Nama variabel custom harus unik." };
  }

  const interactions: BotInteraction[] = [];
  const ids = new Set<string>();
  for (const item of value.interactions) {
    if (!isRecord(item) || typeof item.id !== "string" || !item.id || ids.has(item.id)) {
      return { success: false, error: "ID interaction tidak valid atau duplikat." };
    }
    const interactionType = item.type === "text_start" ? "text" : item.type;
    if (!BOT_INTERACTION_TYPES.includes(interactionType as (typeof BOT_INTERACTION_TYPES)[number])) {
      return { success: false, error: "Tipe interaction tidak valid." };
    }
    if (!isRecord(item.position) || typeof item.position.x !== "number" || typeof item.position.y !== "number") {
      return { success: false, error: "Posisi interaction tidak valid." };
    }
    const config = parseConfig(item.config);
    const nextAction = parseNextAction(item.nextAction);
    if (!config || !nextAction) return { success: false, error: "Konfigurasi atau next action interaction tidak valid." };
    if (item.type === "data_collection" && isRecord(item.config) && Array.isArray(item.config.dataCollectionQuestions) && config.dataCollectionQuestions?.length !== item.config.dataCollectionQuestions.length) {
      return { success: false, error: "Semua pertanyaan Data Collection harus memiliki nama, tipe, dan prompt yang valid." };
    }
    if (item.type === "data_collection_submitted" && isRecord(item.config) && Array.isArray(item.config.dataCollectionSubmittedFields) && config.dataCollectionSubmittedFields?.length !== item.config.dataCollectionSubmittedFields.length) {
      return { success: false, error: "Semua field Data Collection Submitted harus memiliki nama dan variabel." };
    }
    ids.add(item.id);
    interactions.push({
      id: item.id,
      type: interactionType as BotInteractionType,
      position: { x: item.position.x, y: item.position.y },
      config,
      nextAction,
    });
  }

  if (!ids.has(entryInteractionId)) return { success: false, error: "Entry interaction harus dipilih." };
  for (const interaction of interactions) {
    if (interaction.type === "data_collection") {
      const questions = interaction.config.dataCollectionQuestions || [];
      if (questions.length === 0) return { success: false, error: "Data Collection harus memiliki minimal satu pertanyaan." };
      if (questions.length > 30) return { success: false, error: "Data Collection maksimal memiliki 30 pertanyaan." };
      const names = questions.map((question) => question.name.toLocaleLowerCase());
      if (new Set(names).size !== names.length) return { success: false, error: "Nama pertanyaan Data Collection harus unik." };
    }
    if (interaction.type === "guided_routing") {
      const options = interaction.config.options || [];
      if (options.length === 0) return { success: false, error: "Guided Routing harus memiliki minimal satu pilihan route." };
      const variables = options.map((option) => option.variable.toLocaleUpperCase());
      if (new Set(variables).size !== variables.length) {
        return { success: false, error: "Variable route dalam Guided Routing harus unik." };
      }
    }
    if (interaction.type === "data_collection_submitted") {
      const fields = interaction.config.dataCollectionSubmittedFields || [];
      if (fields.length === 0 || fields.length > 30) {
        return { success: false, error: "Data Collection Submitted harus memiliki 1 sampai 30 field." };
      }
      const fieldNames = fields.map((field) => field.name.toLocaleLowerCase());
      if (fields.some((field) => !field.name || field.name.length > 80 || /[.$]/.test(field.name) || !/^\{[^{}]{1,80}\}$/.test(field.variable)) || new Set(fieldNames).size !== fieldNames.length) {
        return { success: false, error: "Nama field harus unik dan setiap field harus memilih variabel yang valid." };
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
    data: { name, description, entryInteractionId, interactions, variables },
  };
}

export function createStarterBot(name = "Bot Baru"): BotDefinitionInput {
  const welcomeId = crypto.randomUUID();
  const textId = crypto.randomUUID();
  return {
    name,
    description: "",
    entryInteractionId: welcomeId,
    variables: [],
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
        nextAction: { type: "interaction", interactionId: textId },
      },
      {
        id: textId,
        type: "text",
        position: { x: 430, y: 100 },
        config: { text: "Halo! Ada yang bisa saya bantu?" },
        nextAction: { type: "end" },
      },
    ],
  };
}
