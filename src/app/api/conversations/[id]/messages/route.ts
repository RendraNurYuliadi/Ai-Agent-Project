import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/mongodb";
import { getSessionFromRequest } from "@/lib/auth";
import { ObjectId } from "mongodb";
import { smartSearchKB, ScoredArticle } from "@/lib/smart-search";

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
    const { message, kbCollections } = await req.json();
    if (!message?.trim()) return NextResponse.json({ error: "Message is required" }, { status: 400 });

    const db = await getDatabase();

    // Verify conversation belongs to user
    const conversation = await db.collection("conversations").findOne({
      _id: new ObjectId(id),
      userId: session.id,
    });
    if (!conversation) return NextResponse.json({ error: "Conversation not found" }, { status: 404 });

    const userMessage = {
      id: new ObjectId().toString(),
      role: "user" as const,
      content: message.trim(),
      timestamp: new Date(),
    };

    // 1. Classify the user message via GenAI Route
    let messageType: "SMALL_TALK" | "FAQ" = "SMALL_TALK";
    let assistantContent = "";

    // Resolve fullName: from session (JWT) or fallback to name
    const userFullName = session.fullName || session.name || "User";

    // Helper: replace all supported placeholders in a prompt template
    const applyPlaceholders = (template: string): string =>
      template
        .replace(/\{fullName\}/g, userFullName)
        .replace(/\{name\}/g, session.name || "User")
        .replace(/\{email\}/g, session.email || "");

    // Load dynamic LM Studio config from DB if available
    const genaiDoc = await db.collection("genaiConfig").findOne({ key: "lmstudio" });
    const lmStudioUrl = genaiDoc?.baseUrl || process.env.LM_STUDIO_URL || "http://localhost:1234/v1";
    const lmStudioModel = genaiDoc?.model || process.env.LM_STUDIO_MODEL || "local-model";
    const configTemperature = genaiDoc?.temperature ?? 0.7;
    const configMaxTokens = genaiDoc?.maxTokens ?? 1024;

    // Get the route prompt
    const routePromptDoc = await db.collection("prompts").findOne({ type: "route", isActive: true });
    const routePromptTemplate = routePromptDoc?.content ||
      `Klasifikasikan pertanyaan user berikut ke dalam salah satu kategori:\n- SMALL_TALK: sapaan, basa-basi\n- FAQ: pertanyaan tentang sistem\n\nPertanyaan: "{question}"\n\nJawab HANYA dengan satu kata: SMALL_TALK atau FAQ`;

    let lmStudioAvailable = true;

    try {
      const routeRes = await fetch(`${lmStudioUrl}/chat/completions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: lmStudioModel,
          messages: [
            {
              role: "user",
              content: applyPlaceholders(routePromptTemplate)
                .replace("{question}", message.trim()),
            },
          ],
          temperature: 0.1,
          max_tokens: 20,
          stream: false,
        }),
        signal: AbortSignal.timeout(8000),
      });

      if (routeRes.ok) {
        const routeData = await routeRes.json();
        const routeText: string = routeData.choices?.[0]?.message?.content || "";
        if (routeText.toUpperCase().includes("FAQ")) {
          messageType = "FAQ";
        }
      } else {
        lmStudioAvailable = false;
      }
    } catch {
      lmStudioAvailable = false;
    }

    if (!lmStudioAvailable) {
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

    const searchResult = await smartSearchKB(db, message.trim(), kbCollections, 5);
    topArticles = searchResult.articles;
    formattedContext = searchResult.formattedContext;

    // Jika terdapat kecocokan artikel dengan skor tinggi, pastikan dialihkan ke mode FAQ/Knowledge
    if (topArticles.length > 0 && topArticles[0].score >= 8) {
      messageType = "FAQ";
    }

    if (messageType === "FAQ") {
      // Format prompt sesuai instruksi:
      // SYSTEM:
      // Jawab berdasarkan knowledge context yang diberikan.
      // Jika informasi tidak terdapat dalam context, katakan informasi tidak ditemukan.
      // Jangan mengarang informasi.
      //
      // KNOWLEDGE CONTEXT:
      // [Artikel 1]
      // ...
      // USER:
      // query
      // Get FAQ system prompt from DB (with {fullName} support)
      const faqPromptDoc = await db.collection("prompts").findOne({ type: "faq", isActive: true });
      const defaultFaqSystemPrompt = `Jawab berdasarkan knowledge context yang diberikan.
Jika informasi tidak terdapat dalam context, katakan informasi tidak ditemukan.
Jangan mengarang informasi.

KAMU SEDANG BERBICARA DENGAN: {fullName}

KNOWLEDGE CONTEXT:
{context}`;
      const faqPromptTemplate = faqPromptDoc?.content || defaultFaqSystemPrompt;
      const systemPrompt = applyPlaceholders(
        faqPromptTemplate.replace("{context}", formattedContext)
      );

      if (lmStudioAvailable) {
        try {
          const faqRes = await fetch(`${lmStudioUrl}/chat/completions`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              model: lmStudioModel,
              messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: message.trim() },
              ],
              temperature: configTemperature,
              max_tokens: configMaxTokens,
              stream: false,
            }),
            signal: AbortSignal.timeout(30000),
          });

          if (faqRes.ok) {
            const faqData = await faqRes.json();
            assistantContent = faqData.choices?.[0]?.message?.content || "Informasi tidak ditemukan.";
          } else {
            assistantContent = topArticles.length > 0
              ? `📚 *Hasil Knowledge Base (Top ${topArticles.length}):*\n\n` +
                topArticles.map((a, i) => `**${i + 1}. ${a.title}** (Skor: ${a.score})\n${a.summary || a.content}`).join("\n\n")
              : "Informasi tidak ditemukan dalam Knowledge Base.";
          }
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

      const smallTalkPrompt = applyPlaceholders(smallTalkTemplate)
        .replace("{message}", message.trim());

      if (lmStudioAvailable) {
        try {
          const stRes = await fetch(`${lmStudioUrl}/chat/completions`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              model: lmStudioModel,
              messages: [{ role: "user", content: smallTalkPrompt }],
              temperature: 0.9,
              max_tokens: 256,
              stream: false,
            }),
            signal: AbortSignal.timeout(30000),
          });

          if (stRes.ok) {
            const stData = await stRes.json();
            assistantContent = stData.choices?.[0]?.message?.content || "Halo! Ada yang bisa saya bantu?";
          } else {
            assistantContent = "Halo! Ada yang bisa saya bantu? 😊";
          }
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
      id: new ObjectId().toString(),
      role: "assistant" as const,
      content: assistantContent,
      messageType,
      lmStudioAvailable,
      topArticles: topArticles.map((a) => ({
        id: a.id,
        title: a.title,
        category: a.category,
        score: a.score,
        matchedKeywords: a.matchedKeywords,
      })),
      timestamp: new Date(),
    };

    // 3. Update conversation in MongoDB
    const isFirstMessage = (conversation.messageCount || 0) === 0;
    const updateOps: Record<string, unknown> = {
      $push: { messages: { $each: [userMessage, assistantMessage] } },
      $set: { updatedAt: new Date() },
      $inc: { messageCount: 2 },
    };

    if (isFirstMessage) {
      // Auto-title from first message
      const autoTitle = message.trim().slice(0, 60) + (message.trim().length > 60 ? "..." : "");
      (updateOps.$set as Record<string, unknown>).title = autoTitle;
    }

    await db.collection("conversations").updateOne(
      { _id: new ObjectId(id) },
      updateOps
    );

    return NextResponse.json({
      success: true,
      userMessage,
      assistantMessage,
      messageType,
      lmStudioAvailable,
      topArticles: topArticles.map((a) => ({
        id: a.id,
        title: a.title,
        category: a.category,
        score: a.score,
        matchedKeywords: a.matchedKeywords,
      })),
      contextSent: formattedContext,
    });
  } catch (err) {
    console.error("POST messages error:", err);
    return NextResponse.json({ error: "Failed to process message" }, { status: 500 });
  }
}
