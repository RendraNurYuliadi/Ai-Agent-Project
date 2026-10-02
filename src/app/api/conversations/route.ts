import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/mongodb";
import { getSessionFromRequest } from "@/lib/auth";
import { ObjectId } from "mongodb";
import { initializeBotConversation } from "@/lib/bot-runtime";

// GET /api/conversations — list conversations for current user
export async function GET(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const db = await getDatabase();
    const conversations = await db
      .collection("conversations")
      .find({ userId: session.id })
      .sort({ updatedAt: -1 })
      .project({ messages: 0 })
      .toArray();

    return NextResponse.json({
      conversations: conversations.map((c) => ({
        id: c._id.toString(),
        title: c.title || "Percakapan Baru",
        skillId: c.skillId || null,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
        messageCount: c.messageCount || 0,
      })),
    });
  } catch (err) {
    console.error("GET conversations error:", err);
    return NextResponse.json({ error: "Failed to fetch conversations" }, { status: 500 });
  }
}

// POST /api/conversations — create a new conversation
export async function POST(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { title, skillId } = await req.json();
    const db = await getDatabase();

    let selectedSkill: { _id: ObjectId; name: string; botUserId?: string; botId?: string } | null = null;
    let botUserId: string | null = null;
    let activeBot = null;
    if (typeof skillId === "string" && skillId) {
      if (!ObjectId.isValid(skillId)) return NextResponse.json({ error: "Skill tidak valid." }, { status: 400 });
      selectedSkill = await db.collection("skills").findOne<{ _id: ObjectId; name: string; botUserId?: string; botId?: string }>({ _id: new ObjectId(skillId) });
      if (!selectedSkill) return NextResponse.json({ error: "Skill tidak ditemukan." }, { status: 400 });
      if (selectedSkill.botUserId && ObjectId.isValid(selectedSkill.botUserId) && selectedSkill.botId && ObjectId.isValid(selectedSkill.botId)) {
        const [botUser, skillBot] = await Promise.all([
          db.collection("users").findOne({ _id: new ObjectId(selectedSkill.botUserId), userType: "bot" }, { projection: { _id: 1 } }),
          db.collection("bots").findOne({ _id: new ObjectId(selectedSkill.botId) }),
        ]);
        if (!botUser || !skillBot) return NextResponse.json({ error: "User bot atau bot flow pada skill sudah tidak tersedia." }, { status: 409 });
        activeBot = skillBot;
        botUserId = selectedSkill.botUserId;
      } else {
        const activeSetting = await db.collection("botSettings").findOne({ key: "active" });
        activeBot = activeSetting?.botId && ObjectId.isValid(activeSetting.botId)
          ? await db.collection("bots").findOne({ _id: new ObjectId(activeSetting.botId) })
          : null;
      }
    } else {
      const activeSetting = await db.collection("botSettings").findOne({ key: "active" });
      activeBot = activeSetting?.botId && ObjectId.isValid(activeSetting.botId)
        ? await db.collection("bots").findOne({ _id: new ObjectId(activeSetting.botId) })
        : null;
    }
    const flowState = activeBot
      ? initializeBotConversation({
        entryInteractionId: activeBot.entryInteractionId,
        interactions: activeBot.interactions,
      })
      : null;

    const newConversation = {
      userId: session.id,
      title: title || "Percakapan Baru",
      messages: flowState?.messages || [],
      messageCount: flowState?.messages.length || 0,
      ...(activeBot && flowState ? {
        botId: activeBot._id.toString(),
        ...(selectedSkill ? { skillId: selectedSkill._id.toString(), botUserId } : {}),
        currentInteractionId: flowState.currentInteractionId,
        botStatus: flowState.botStatus,
      } : {}),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await db.collection("conversations").insertOne(newConversation);

    return NextResponse.json({
      success: true,
      conversation: {
        id: result.insertedId.toString(),
        ...newConversation,
      },
    });
  } catch (err) {
    console.error("POST conversations error:", err);
    return NextResponse.json({ error: "Failed to create conversation" }, { status: 500 });
  }
}
