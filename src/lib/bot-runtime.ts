import { ObjectId, type Db } from "mongodb";
import { generateAICompletion, getAIConfig } from "@/lib/ai";
import { smartSearchKB, type ScoredArticle } from "@/lib/smart-search";
import type { ComponentTemplateInput } from "@/lib/component-templates";
import { BOT_INTERACTION_LABELS, type BotDefinitionInput, type BotInteraction } from "@/lib/bot-flows";

type BotRuntimeComponent = Pick<ComponentTemplateInput, "name" | "title" | "subtitle" | "type" | "buttons" | "card" | "cards"> & {
  id: string;
  triggeredBy: Array<{ collectionName: string; articleId: string; title: string; score: number }>;
};

export interface BotRuntimeMessage {
  id: string;
  role: "assistant";
  content: string;
  messageType: string;
  botInteraction?: {
    type: "welcome_message" | "guided_routing" | "text_question";
    title?: string;
    subtitle?: string;
    icon?: string;
    footerText?: string;
    buttons: Array<{ label: string; action: "reply" | "link"; value: string }>;
  };
  topArticles: Array<Pick<ScoredArticle, "id" | "collectionName" | "title" | "category" | "score" | "matchedKeywords">>;
  uiComponents?: BotRuntimeComponent[];
  timestamp: Date;
}

export interface BotRuntimeResult {
  assistantMessage: BotRuntimeMessage | null;
  silent: boolean;
  currentInteractionId: string | null;
  botStatus: "active" | "ended" | "closed";
  contextSent: string;
}

function applyPromptVariables(
  template: string,
  message: string,
  profile: { name?: string; fullName?: string; email?: string },
  context = ""
): string {
  return template
    .replace(/\{context\}/g, () => context)
    .replace(/\{question\}/g, () => message)
    .replace(/\{message\}/g, () => message)
    .replace(/\{fullName\}/g, () => profile.fullName || profile.name || "User")
    .replace(/\{name\}/g, () => profile.name || "User")
    .replace(/\{email\}/g, () => profile.email || "");
}

async function getPromptTemplate(
  db: Db,
  promptId: string | undefined,
  type: "guided_routing" | "small_talk" | "rag"
): Promise<string | undefined> {
  if (!promptId || !ObjectId.isValid(promptId)) return undefined;
  const prompt = await db.collection("prompts").findOne({ _id: new ObjectId(promptId), type });
  return typeof prompt?.content === "string" ? prompt.content : undefined;
}

function normalizeRouteLabel(value: string): string {
  return value.toLocaleLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
}

function routeVariable(option: { label: string; variable?: string }, index: number): string {
  return option.variable || option.label.toUpperCase().replace(/[^\p{L}\p{N}]+/gu, "_").replace(/^_+|_+$/g, "") || `ROUTE_${index + 1}`;
}

function stateForAction(interaction: BotInteraction): Pick<BotRuntimeResult, "currentInteractionId" | "botStatus"> {
  if (interaction.nextAction.type === "interaction") {
    return { currentInteractionId: interaction.nextAction.interactionId, botStatus: "active" };
  }
  if (interaction.nextAction.type === "close") {
    return { currentInteractionId: null, botStatus: "closed" };
  }
  return { currentInteractionId: null, botStatus: "ended" };
}

export function initializeBotConversation(bot: Pick<BotDefinitionInput, "entryInteractionId" | "interactions">): {
  messages: BotRuntimeMessage[];
  currentInteractionId: string | null;
  botStatus: "active" | "ended" | "closed";
} {
  const entry = bot.interactions.find((item) => item.id === bot.entryInteractionId);
  if (!entry) return { messages: [], currentInteractionId: null, botStatus: "ended" };
  const state = stateForAction(entry);
  const welcome = entry.type === "welcome_message";
  const textQuestion = entry.type === "text_question";
  const quickButtons = entry.config.quickButtons || [];
  return {
    messages: welcome || textQuestion ? [{
      id: new ObjectId().toString(),
      role: "assistant",
      content: textQuestion ? (entry.config.question || "") : "",
      messageType: textQuestion ? "TEXT_QUESTION" : "WELCOME_MESSAGE",
      botInteraction: textQuestion ? {
        type: "text_question",
        title: "Pertanyaan",
        subtitle: entry.config.question || "",
        buttons: quickButtons,
      } : {
        type: "welcome_message",
        title: entry.config.title || "",
        subtitle: entry.config.subtitle || "",
        icon: entry.config.icon || "sparkles",
        footerText: entry.config.footerText || "",
        buttons: quickButtons,
      },
      topArticles: [],
      timestamp: new Date(),
    }] : [],
    currentInteractionId: welcome ? state.currentInteractionId : entry.id,
    botStatus: welcome ? state.botStatus : "active",
  };
}

export async function processBotTurn(
  db: Db,
  bot: Pick<BotDefinitionInput, "entryInteractionId" | "interactions">,
  conversation: { currentInteractionId?: string | null; botStatus?: string },
  message: string,
  user: { name?: string; fullName?: string; email?: string }
): Promise<BotRuntimeResult> {
  const entry = bot.interactions.find((item) => item.id === bot.entryInteractionId);
  const start = bot.interactions.find((item) => item.type === "text_start") || entry;
  let interaction = conversation.botStatus === "ended"
    ? start
    : bot.interactions.find((item) => item.id === conversation.currentInteractionId) || start;
  if (!interaction) throw new Error("Bot tidak memiliki entry interaction.");

  let guidedTargetSelected = false;
  if (interaction.type === "guided_routing") {
    const options = interaction.config.options || [];
    let selected: typeof options[number] | undefined;
    if (options.length > 0) {
      try {
        const template = await getPromptTemplate(db, interaction.config.promptId, "guided_routing") ||
          interaction.config.systemPrompt ||
          "Klasifikasikan pesan pengguna ke salah satu pilihan route yang tersedia. Jika ragu, pilih route yang paling sesuai. Jawab hanya dengan label route.\n\nPesan pengguna: {question}";
        const routeChoices = options.map((option, index) => {
          const target = bot.interactions.find((item) => item.id === option.targetInteractionId);
          const targetName = target ? (target.config.name?.trim() || target.config.title?.trim() || target.config.question?.trim() || BOT_INTERACTION_LABELS[target.type]) : "target tidak valid";
          const condition = option.prompt || `Pilih route ini jika maksud pengguna sesuai dengan "${option.label}".`;
          return `- Nama route: ${option.label}\n  Variable route: ${routeVariable(option, index)}\n  Kondisi: ${condition}\n  Target interaction: ${targetName}`;
        }).join("\n");
        const config = await getAIConfig(db);
        const routeResult = await generateAICompletion({
          config,
          messages: [{ role: "user", content: message.trim() }],
          systemInstruction: `${applyPromptVariables(template, message, user)}\n\nDaftar route yang valid:\n${routeChoices}\n\nTentukan route yang paling cocok dengan pesan pengguna. Jawab hanya dengan satu variable route dari daftar di atas.`,
          temperature: 0,
          maxTokens: 60,
          timeoutMs: 10000,
        });
        const normalizedResult = normalizeRouteLabel(routeResult);
        selected = options.find((option, index) => {
          const variable = normalizeRouteLabel(routeVariable(option, index));
          return normalizedResult === variable || normalizedResult.includes(variable);
        }) || options
          .filter((option) => normalizedResult === normalizeRouteLabel(option.label))
          .sort((left, right) => right.label.length - left.label.length)[0];
      } catch {
        selected = undefined;
      }
    }
    if (selected) {
      const target = bot.interactions.find((item) => item.id === selected.targetInteractionId);
      if (target) {
        interaction = target;
        guidedTargetSelected = true;
      }
    }
  }

  let content = "";
  let contextSent = "";
  let topArticles: ScoredArticle[] = [];
  let uiComponents: BotRuntimeComponent[] = [];
  let interactionCard: BotRuntimeMessage["botInteraction"];
  const messageType = interaction.type.toUpperCase();

  if (interaction.type === "welcome_message") {
    interactionCard = {
      type: "welcome_message",
      title: interaction.config.title || "",
      subtitle: interaction.config.subtitle || "",
      icon: interaction.config.icon || "sparkles",
      footerText: interaction.config.footerText || "",
      buttons: interaction.config.quickButtons || [],
    };
  } else if (interaction.type === "guided_routing") {
    content = "";
  } else if (interaction.type === "text" || interaction.type === "text_start") {
    content = interaction.config.text || "";
  } else if (interaction.type === "text_question") {
    content = interaction.config.question || "";
    interactionCard = {
      type: "text_question",
      title: "Pertanyaan",
      subtitle: interaction.config.question || "",
      buttons: interaction.config.quickButtons || [],
    };
  } else if (interaction.type === "small_talk") {
    const config = await getAIConfig(db);
    try {
      const template = await getPromptTemplate(db, interaction.config.promptId, "small_talk") ||
        interaction.config.systemPrompt || "Kamu adalah asisten yang ramah dan ringkas.";
      content = await generateAICompletion({
        config,
        messages: [{ role: "user", content: message.trim() }],
        systemInstruction: applyPromptVariables(template, message, user),
        temperature: 0.8,
        maxTokens: 400,
      });
    } catch {
      content = "Maaf, saya belum bisa menjawab saat ini. Silakan coba lagi.";
    }
  } else if (interaction.type === "rag") {
    const requestedCollections = interaction.config.knowledgeBases || [];
    const activeKbs = requestedCollections.length
      ? await db.collection("knowledgeBases")
        .find({ collectionName: { $in: requestedCollections }, isActive: { $ne: false } }, { projection: { collectionName: 1 } })
        .toArray()
      : [];
    const activeCollections = activeKbs.map((kb) => kb.collectionName);
    const searchResult = await smartSearchKB(db, message.trim(), activeCollections, 5);
    topArticles = searchResult.articles;
    contextSent = searchResult.formattedContext;
    const triggerArticle = topArticles[0];
    if (triggerArticle) {
      const activeComponents = await db.collection("components")
        .find({ isActive: true })
        .sort({ updatedAt: -1 })
        .toArray();
      const matchingComponent = activeComponents.find((component) =>
        Array.isArray(component.articleRefs) && component.articleRefs.some((reference: {
          collectionName: string;
          articleId: string;
        }) => reference.collectionName === triggerArticle.collectionName && reference.articleId === triggerArticle.id)
      );
      if (matchingComponent) {
        uiComponents = [{
          id: matchingComponent._id.toString(),
          name: matchingComponent.name,
          type: matchingComponent.type,
          title: matchingComponent.title || "",
          subtitle: matchingComponent.subtitle || "",
          buttons: matchingComponent.buttons || [],
          card: matchingComponent.card || null,
          cards: matchingComponent.cards || [],
          triggeredBy: [{
            collectionName: triggerArticle.collectionName,
            articleId: triggerArticle.id,
            title: triggerArticle.title,
            score: triggerArticle.score,
          }],
        }];
      }
    }
    if (activeCollections.length === 0) {
      content = "Belum ada Knowledge Base aktif yang dipilih untuk interaction ini.";
    } else {
      const config = await getAIConfig(db);
      if (interaction.config.provider === "lmstudio" || interaction.config.provider === "openrouter") {
        config.provider = interaction.config.provider;
      }
      if (config.provider === "lmstudio") {
        config.lmStudioUrl = interaction.config.lmStudioUrl || process.env.LM_STUDIO_URL || "http://localhost:1234/v1";
        config.lmStudioModel = interaction.config.model || config.lmStudioModel;
      } else {
        config.openRouterModel = interaction.config.model || config.openRouterModel;
      }
      config.temperature = interaction.config.temperature ?? config.temperature;
      config.maxTokens = interaction.config.maxTokens ?? config.maxTokens;
      const systemTemplate = await getPromptTemplate(db, interaction.config.promptId, "rag") ||
        interaction.config.systemPrompt || "Jawab berdasarkan knowledge context berikut. Jika informasi tidak tersedia, katakan dengan jujur.\n\n{context}";
      const renderedTemplate = applyPromptVariables(systemTemplate, message, user, contextSent || "Tidak ada artikel relevan ditemukan.");
      const systemInstruction = systemTemplate.includes("{context}")
        ? renderedTemplate
        : `${renderedTemplate}\n\nKNOWLEDGE CONTEXT:\n${contextSent || "Tidak ada artikel relevan ditemukan."}`;
      try {
        content = await generateAICompletion({
          config,
          messages: [{ role: "user", content: message.trim() }],
          systemInstruction,
          temperature: config.temperature,
          maxTokens: config.maxTokens,
        });
      } catch {
        content = topArticles.length
          ? topArticles.map((article) => `**${article.title}**\n${article.summary || article.content}`).join("\n\n")
          : "Informasi tidak ditemukan dalam Knowledge Base.";
      }
    }
  }

  const state = interaction.type === "guided_routing" && !guidedTargetSelected
    ? { currentInteractionId: interaction.id, botStatus: "active" as const }
    : stateForAction(interaction);
  const silent = interaction.type === "guided_routing" && !guidedTargetSelected;

  return {
    assistantMessage: silent ? null : {
      id: new ObjectId().toString(),
      role: "assistant",
      content,
      messageType,
      botInteraction: interactionCard,
      topArticles: topArticles.map((article) => ({
        id: article.id,
        collectionName: article.collectionName,
        title: article.title,
        category: article.category,
        score: article.score,
        matchedKeywords: article.matchedKeywords,
      })),
      uiComponents,
      timestamp: new Date(),
    },
    silent,
    ...state,
    contextSent,
  };
}
