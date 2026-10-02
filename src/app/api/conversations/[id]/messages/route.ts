import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/mongodb";
import { getSessionFromRequest } from "@/lib/auth";
import { ObjectId } from "mongodb";
import { smartSearchKB, ScoredArticle } from "@/lib/smart-search";
import { getAIConfig, generateAICompletion, isOpenRouterFreeModel } from "@/lib/ai";
import { processBotTurn } from "@/lib/bot-runtime";

// POST /api/conversations/[id]/messages — add message & get AI reply
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  if (!ObjectId.isValid(id)) return NextResponse.json({ error: "Invalid ID" }, { status: 400 });

  try {
    const body = await req.json();
    const { editUserMessageId, regenerateAssistantId } = body;
    let message = typeof body.message === "string" ? body.message : "";
    if (editUserMessageId && regenerateAssistantId) {
      return NextResponse.json({ error: "Choose edit or regenerate, not both" }, { status: 400 });
    }
    if (!regenerateAssistantId && !message.trim()) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }

    const db = await getDatabase();

    // Verify conversation belongs to user
    const conversation = await db.collection("conversations").findOne({
      _id: new ObjectId(id),
      userId: session.id,
    });
    if (!conversation) return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
    if (conversation.botStatus === "closed") {
      return NextResponse.json({ error: "Percakapan ini sudah ditutup. Mulai percakapan baru." }, { status: 409 });
    }

    type ConversationMessage = {
      id: string;
      role: "user" | "assistant";
      content: string;
      timestamp: Date | string;
      [key: string]: unknown;
    };
    const existingMessages: ConversationMessage[] = Array.isArray(conversation.messages)
      ? conversation.messages
      : [];
    let userMessage: ConversationMessage;
    let replacementAssistantId: string | null = null;
    let editedUserMessageIndex = -1;

    if (regenerateAssistantId) {
      const assistantIndex = existingMessages.findIndex(
        (item) => item.id === regenerateAssistantId && item.role === "assistant"
      );
      if (assistantIndex < 0) {
        return NextResponse.json({ error: "Assistant message not found" }, { status: 404 });
      }
      let userMessageIndex = assistantIndex - 1;
      while (userMessageIndex >= 0 && existingMessages[userMessageIndex].role !== "user") {
        userMessageIndex -= 1;
      }
      if (userMessageIndex < 0) {
        return NextResponse.json({ error: "Original user message not found" }, { status: 400 });
      }
      userMessage = existingMessages[userMessageIndex];
      message = userMessage.content;
      replacementAssistantId = existingMessages[assistantIndex].id;
    } else if (editUserMessageId) {
      const userMessageIndex = existingMessages.findIndex(
        (item) => item.id === editUserMessageId && item.role === "user"
      );
      if (userMessageIndex < 0) {
        return NextResponse.json({ error: "User message not found" }, { status: 404 });
      }
      let assistantIndex = userMessageIndex + 1;
      while (
        assistantIndex < existingMessages.length &&
        existingMessages[assistantIndex].role !== "assistant" &&
        existingMessages[assistantIndex].role !== "user"
      ) {
        assistantIndex += 1;
      }
      if (assistantIndex >= existingMessages.length || existingMessages[assistantIndex].role !== "assistant") {
        return NextResponse.json({ error: "Assistant response not found" }, { status: 404 });
      }
      userMessage = {
        ...existingMessages[userMessageIndex],
        content: message.trim(),
        timestamp: new Date(),
      };
      editedUserMessageIndex = userMessageIndex;
      replacementAssistantId = existingMessages[assistantIndex].id;
    } else {
      userMessage = {
        id: new ObjectId().toString(),
        role: "user",
        content: message.trim(),
        timestamp: new Date(),
      };
    }

    if (!editUserMessageId && !regenerateAssistantId) {
      const activeSetting = await db.collection("botSettings").findOne({ key: "active" });
      const botId = conversation.botId || activeSetting?.botId;
      const botDocument = botId && ObjectId.isValid(botId)
        ? await db.collection("bots").findOne({ _id: new ObjectId(botId) })
        : null;
      if (botDocument) {
        const turn = await processBotTurn(
          db,
          {
            entryInteractionId: botDocument.entryInteractionId,
            interactions: botDocument.interactions,
          },
          {
            currentInteractionId: conversation.currentInteractionId,
            botStatus: conversation.botStatus,
          },
          message.trim(),
          session
        );
        const updatedAt = new Date();
        const isFirstMessage = !existingMessages.some((item) => item.role === "user");
        const setFields: Record<string, unknown> = {
          botId: botDocument._id.toString(),
          currentInteractionId: turn.currentInteractionId,
          botStatus: turn.botStatus,
          updatedAt,
        };
        if (isFirstMessage) {
          setFields.title = message.trim().slice(0, 60) + (message.trim().length > 60 ? "..." : "");
        }
        const botUpdate: Record<string, unknown> = {
          $push: { messages: { $each: turn.assistantMessage ? [userMessage, turn.assistantMessage] : [userMessage] } },
          $set: setFields,
          $inc: { messageCount: turn.assistantMessage ? 2 : 1 },
        };
        await db.collection("conversations").updateOne({ _id: new ObjectId(id) }, botUpdate);
        return NextResponse.json({
          success: true,
          userMessage,
          assistantMessage: turn.assistantMessage,
          messageType: turn.assistantMessage?.messageType,
          topArticles: turn.assistantMessage?.topArticles || [],
          contextSent: turn.contextSent,
          botStatus: turn.botStatus,
          silent: turn.silent,
        });
      }
    }
    const generationStartedAt = Date.now();

    // 1. Classify the user message via GenAI Route
    let messageType: "SMALL_TALK" | "FAQ" = "SMALL_TALK";
    let assistantContent = "";

    // Resolve fullName: from session (JWT) or fallback to name
    const userFullName = session.fullName || session.name || "User";

    // Helper: replace all supported placeholders in a prompt template
    const applyPlaceholders = (template: string, values: { message?: string; context?: string } = {}): string =>
      template
        .replace(/\{context\}/g, () => values.context || "")
        .replace(/\{question\}/g, () => values.message || "")
        .replace(/\{message\}/g, () => values.message || "")
        .replace(/\{fullName\}/g, () => userFullName)
        .replace(/\{name\}/g, () => session.name || "User")
        .replace(/\{email\}/g, () => session.email || "");

    // Load AI config (LM Studio local or Google AI Studio Gemini)
    const aiConfig = await getAIConfig(db);
    const requestedModel = typeof body.model === "string" ? body.model.trim() : "";
    if (requestedModel && aiConfig.provider === "lmstudio") {
      aiConfig.lmStudioModel = requestedModel;
    } else if (requestedModel && isOpenRouterFreeModel(requestedModel)) {
      aiConfig.openRouterModel = requestedModel;
    }

    // Get the route prompt
    const routePromptDoc = await db.collection("prompts").findOne({ type: "route", isActive: true });
    const routePromptTemplate = routePromptDoc?.content ||
      `Klasifikasikan pertanyaan user berikut ke dalam salah satu kategori:\n- SMALL_TALK: sapaan, basa-basi\n- FAQ: pertanyaan tentang sistem\n\nPertanyaan: "{question}"\n\nJawab HANYA dengan satu kata: SMALL_TALK atau FAQ`;

    const aiAvailable = true;
    let routeAvailable = true;

    try {
      const routeText = await generateAICompletion({
        config: aiConfig,
        messages: [
          {
            role: "user",
            content: applyPlaceholders(routePromptTemplate, { message: message.trim() }),
          },
        ],
        temperature: 0.1,
        maxTokens: 20,
        timeoutMs: 10000,
      });

      if (routeText.toUpperCase().includes("FAQ")) {
        messageType = "FAQ";
      }
    } catch {
      routeAvailable = false;
    }

    if (!routeAvailable) {
      // Fallback: Simple keyword detection
      const lower = message.toLowerCase();
      const faqKeywords = ["bagaimana", "apa", "cara", "jelaskan", "kenapa", "mengapa", "fungsi", "gunakan", "help", "tolong", "info", "sebutkan", "berapa"];
      if (faqKeywords.some((k) => lower.includes(k))) {
        messageType = "FAQ";
      }
    }

    // 2. Smart Search — Ranking Artikel — Ambil Top 5
    let topArticles: ScoredArticle[] = [];
    let formattedContext = "";

    const activeKnowledgeBases = await db.collection("knowledgeBases")
      .find({ isActive: { $ne: false } }, { projection: { collectionName: 1 } })
      .toArray();
    const activeCollections = activeKnowledgeBases.map((kb) => kb.collectionName);
    const searchResult = await smartSearchKB(db, message.trim(), activeCollections, 5);
    topArticles = searchResult.articles;
    formattedContext = searchResult.formattedContext;

    // Jika terdapat kecocokan artikel dengan skor tinggi, pastikan dialihkan ke mode FAQ/Knowledge
    if (topArticles.length > 0 && topArticles[0].score >= 8) {
      messageType = "FAQ";
    }

    let uiComponents: Array<Record<string, unknown>> = [];
    const triggerArticle = topArticles[0];
    if (messageType === "FAQ" && triggerArticle) {
        const activeComponents = await db.collection("components")
          .find({ isActive: true })
          .sort({ updatedAt: -1 })
          .toArray();
        const matchingComponents = activeComponents
          .map((template) => {
            const matchesTopArticle = Array.isArray(template.articleRefs) && template.articleRefs.some((reference: {
                collectionName: string;
                articleId: string;
              }) => reference.collectionName === triggerArticle.collectionName && reference.articleId === triggerArticle.id);
            return matchesTopArticle ? template : null;
          })
          .filter((template) => template !== null);

        const selectedComponent = matchingComponents[0];
        if (selectedComponent) {
          uiComponents = [{
            id: selectedComponent._id.toString(),
            name: selectedComponent.name,
            type: selectedComponent.type,
            title: selectedComponent.title || "",
            subtitle: selectedComponent.subtitle || "",
            buttons: selectedComponent.buttons || [],
            card: selectedComponent.card || null,
            cards: selectedComponent.cards || [],
            triggeredBy: [{
              collectionName: triggerArticle.collectionName,
              articleId: triggerArticle.id,
              title: triggerArticle.title,
              score: triggerArticle.score,
            }],
          }];
        }
    }

    if (messageType === "FAQ") {
      const faqPromptDoc = await db.collection("prompts").findOne({ type: "faq", isActive: true });
      const defaultFaqSystemPrompt = `Jawab berdasarkan knowledge context yang diberikan.
Jika informasi tidak terdapat dalam context, katakan informasi tidak ditemukan.
Jangan mengarang informasi.

KAMU SEDANG BERBICARA DENGAN: {fullName}

KNOWLEDGE CONTEXT:
{context}`;
      const faqPromptTemplate = faqPromptDoc?.content || defaultFaqSystemPrompt;
      const systemPrompt = applyPlaceholders(faqPromptTemplate, {
        context: formattedContext,
        message: message.trim(),
      });

      if (aiAvailable) {
        try {
          assistantContent = await generateAICompletion({
            config: aiConfig,
            messages: [{ role: "user", content: message.trim() }],
            systemInstruction: systemPrompt,
            temperature: aiConfig.temperature,
            maxTokens: aiConfig.maxTokens,
            timeoutMs: 30000,
          });
        } catch {
          assistantContent = topArticles.length > 0
            ? `📚 *Hasil Knowledge Base (Top ${topArticles.length}):*\n\n` +
              topArticles.map((a, i) => `**${i + 1}. ${a.title}** (Skor: ${a.score})\n${a.summary || a.content}`).join("\n\n")
            : "Informasi tidak ditemukan dalam Knowledge Base.";
        }
      } else {
        // Offline fallback
        assistantContent = topArticles.length > 0
          ? `📚 *Berdasarkan Knowledge Base (Top ${topArticles.length} Hasil Pencarian):*\n\n` +
            topArticles.map((a, i) => `**${i + 1}. ${a.title}** (Skor: ${a.score})\n${a.summary || a.content}`).join("\n\n")
          : "Informasi tidak ditemukan dalam Knowledge Base.";
      }
    } else {
      // SMALL_TALK
      const smallTalkPromptDoc = await db.collection("prompts").findOne({ type: "small_talk", isActive: true });
      const smallTalkTemplate = smallTalkPromptDoc?.content ||
        "Kamu adalah asisten virtual yang ramah. Balas pesan berikut dengan menyapa {fullName}:\n\nUser: {message}\nAssistant:";

      const smallTalkPrompt = applyPlaceholders(smallTalkTemplate, { message: message.trim() });

      if (aiAvailable) {
        try {
          assistantContent = await generateAICompletion({
            config: aiConfig,
            messages: [{ role: "user", content: smallTalkPrompt }],
            temperature: 0.9,
            maxTokens: 256,
            timeoutMs: 30000,
          });
        } catch {
          assistantContent = "Halo! Ada yang bisa saya bantu? 😊";
        }
      } else {
        const smallTalkResponses = [
          "Halo! Ada yang bisa saya bantu? 😊",
          "Hai! Silakan tanya apa saja, saya siap membantu! 🤖",
          "Selamat datang! Ada yang bisa saya bantu hari ini?",
        ];
        assistantContent = smallTalkResponses[Math.floor(Math.random() * smallTalkResponses.length)];
      }
    }

    // Sanitize literal \n to actual newlines
    assistantContent = assistantContent
      .replace(/\\r\\n/g, "\n")
      .replace(/\\n/g, "\n")
      .replace(/\\r/g, "\n")
      .trim();

    const assistantMessage = {
      id: replacementAssistantId || new ObjectId().toString(),
      role: "assistant" as const,
      content: assistantContent,
      messageType,
      lmStudioAvailable: aiAvailable,
      aiProvider: aiConfig.provider,
      aiModel: aiConfig.provider === "openrouter" ? aiConfig.openRouterModel : aiConfig.lmStudioModel,
      generationDurationMs: Date.now() - generationStartedAt,
      uiComponents,
      topArticles: topArticles.map((a) => ({
        id: a.id,
        collectionName: a.collectionName,
        title: a.title,
        category: a.category,
        score: a.score,
        matchedKeywords: a.matchedKeywords,
      })),
      timestamp: new Date(),
    };

    // 3. Update conversation in MongoDB
    const isFirstMessage = (conversation.messageCount || 0) === 0;
    const updatedAt = new Date();
    if (editUserMessageId && replacementAssistantId) {
      const setFields: Record<string, unknown> = {
        "messages.$[user].content": message.trim(),
        "messages.$[user].timestamp": userMessage.timestamp,
        "messages.$[assistant]": assistantMessage,
        updatedAt,
      };
      if (editedUserMessageIndex === 0) {
        setFields.title = message.trim().slice(0, 60) + (message.trim().length > 60 ? "..." : "");
      }
      await db.collection("conversations").updateOne(
        { _id: new ObjectId(id) },
        { $set: setFields },
        {
          arrayFilters: [
            { "user.id": editUserMessageId },
            { "assistant.id": replacementAssistantId },
          ],
        }
      );
    } else if (regenerateAssistantId && replacementAssistantId) {
      await db.collection("conversations").updateOne(
        { _id: new ObjectId(id) },
        {
          $set: {
            "messages.$[assistant]": assistantMessage,
            updatedAt,
          },
        },
        { arrayFilters: [{ "assistant.id": replacementAssistantId }] }
      );
    } else {
      const updateOps: Record<string, unknown> = {
        $push: { messages: { $each: [userMessage, assistantMessage] } },
        $set: { updatedAt },
        $inc: { messageCount: 2 },
      };

      if (isFirstMessage) {
        const autoTitle = message.trim().slice(0, 60) + (message.trim().length > 60 ? "..." : "");
        (updateOps.$set as Record<string, unknown>).title = autoTitle;
      }

      await db.collection("conversations").updateOne(
        { _id: new ObjectId(id) },
        updateOps
      );
    }

    return NextResponse.json({
      success: true,
      userMessage,
      assistantMessage,
      messageType,
      lmStudioAvailable: aiAvailable,
      aiProvider: aiConfig.provider,
      topArticles: topArticles.map((a) => ({
        id: a.id,
        collectionName: a.collectionName,
        title: a.title,
        category: a.category,
        score: a.score,
        matchedKeywords: a.matchedKeywords,
      })),
      contextSent: formattedContext,
      uiComponents,
    });
  } catch (err) {
    console.error("POST messages error:", err);
    return NextResponse.json({ error: "Failed to process message" }, { status: 500 });
  }
}
