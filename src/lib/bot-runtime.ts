import { ObjectId, type Db } from "mongodb";
import { generateAICompletion, getAIConfig } from "@/lib/ai";
import { smartSearchKB, type ScoredArticle } from "@/lib/smart-search";
import type { BotDefinitionInput, BotInteraction } from "@/lib/bot-flows";

export interface BotRuntimeMessage {
  id: string;
  role: "assistant";
  content: string;
  messageType: string;
  botInteraction?: {
    type: "welcome_message" | "guided_routing";
    title?: string;
    subtitle?: string;
    icon?: string;
    footerText?: string;
    buttons: Array<{ label: string; action: "reply" | "link"; value: string }>;
  };
  topArticles: Array<Pick<ScoredArticle, "id" | "collectionName" | "title" | "category" | "score" | "matchedKeywords">>;
  timestamp: Date;
}

export interface BotRuntimeResult {
  assistantMessage: BotRuntimeMessage;
  currentInteractionId: string | null;
  botStatus: "active" | "ended" | "closed";
  contextSent: string;
}

function applyUserValues(template: string, profile: { name?: string; fullName?: string; email?: string }): string {
  return template
    .replace(/\{fullName\}/g, profile.fullName || profile.name || "User")
    .replace(/\{name\}/g, profile.name || "User")
    .replace(/\{email\}/g, profile.email || "");
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
  const quickButtons = entry.config.quickButtons || [];
  return {
    messages: welcome ? [{
      id: new ObjectId().toString(),
      role: "assistant",
      content: "",
      messageType: "WELCOME_MESSAGE",
      botInteraction: {
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
    const selected = interaction.config.options?.find((option) => option.label.toLocaleLowerCase() === message.trim().toLocaleLowerCase());
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
    content = interaction.config.text || "Pilih salah satu opsi berikut.";
    interactionCard = {
      type: "guided_routing",
      buttons: (interaction.config.options || []).map((option) => ({
        label: option.label,
        action: "reply",
        value: option.label,
      })),
    };
  } else if (interaction.type === "text" || interaction.type === "text_start") {
    content = interaction.config.text || "";
  } else if (interaction.type === "text_question") {
    content = interaction.config.question || "";
  } else if (interaction.type === "small_talk") {
    const config = await getAIConfig(db);
    try {
      content = await generateAICompletion({
        config,
        messages: [{ role: "user", content: message.trim() }],
        systemInstruction: applyUserValues(interaction.config.systemPrompt || "Kamu adalah asisten yang ramah dan ringkas.", user),
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
    if (activeCollections.length === 0) {
      content = "Belum ada Knowledge Base aktif yang dipilih untuk interaction ini.";
    } else {
      const config = await getAIConfig(db);
      if (interaction.config.provider === "lmstudio") config.provider = "lmstudio";
      if (interaction.config.provider === "openrouter") config.provider = "openrouter";
      if (interaction.config.model) {
        if (config.provider === "lmstudio") config.lmStudioModel = interaction.config.model;
        else config.openRouterModel = interaction.config.model;
      }
      const systemTemplate = interaction.config.systemPrompt || "Jawab berdasarkan knowledge context berikut. Jika informasi tidak tersedia, katakan dengan jujur.\n\n{context}";
      const systemInstruction = applyUserValues(systemTemplate, user).replace(/\{context\}/g, contextSent || "Tidak ada artikel relevan ditemukan.");
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

  return {
    assistantMessage: {
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
      timestamp: new Date(),
    },
    ...state,
    contextSent,
  };
}
