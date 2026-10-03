import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/mongodb";
import { getSessionFromRequest } from "@/lib/auth";
import { ObjectId } from "mongodb";
import { initializeBotConversation } from "@/lib/bot-runtime";
import { getConversationRelations } from "@/lib/conversation-details";

// GET /api/conversations — list conversations for current user
export async function GET(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const isStaff = session.role === "admin" || session.role === "manager";
  const wantsAll = req.nextUrl.searchParams.get("scope") === "all";
  if (wantsAll && !isStaff) return NextResponse.json({ error: "Akses ditolak" }, { status: 403 });

  try {
    const db = await getDatabase();
    let filter: Record<string, unknown> = wantsAll ? {} : { userId: session.id };
    let page = 1;
    const pageSize = 20;
    let total = 0;
    let totalPages = 1;
    let botOptions: Array<{ id: string; name: string }> = [];
    let skillOptions: Array<{ id: string; name: string }> = [];

    if (wantsAll) {
      const params = req.nextUrl.searchParams;
      const requestedPage = Math.max(1, Number.parseInt(params.get("page") || "1", 10) || 1);
      const search = (params.get("search") || "").trim().slice(0, 120);
      const botId = (params.get("botId") || "").trim();
      const skillId = (params.get("skillId") || "").trim();
      const dateFrom = params.get("dateFrom") || "";
      const dateTo = params.get("dateTo") || "";
      const conditions: Record<string, unknown>[] = [];

      if (search) {
        const expression = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
        const matchingUsers = await db.collection("users")
          .find({ $or: [{ name: expression }, { fullName: expression }, { email: expression }] }, { projection: { _id: 1 } })
          .toArray();
        const userIds = matchingUsers.flatMap((user) => [user._id.toString(), user._id]);
        conditions.push({
          $or: [
            { title: expression },
            ...(userIds.length ? [{ userId: { $in: userIds } }] : []),
          ],
        });
      }

      if (botId) {
        if (!ObjectId.isValid(botId)) return NextResponse.json({ error: "Filter bot tidak valid." }, { status: 400 });
        const botSkills = await db.collection("skills").find({ botId }, { projection: { _id: 1 } }).toArray();
        conditions.push({
          $or: [
            { botId },
            ...(botSkills.length ? [{ skillId: { $in: botSkills.flatMap((skill) => [skill._id.toString(), skill._id]) } }] : []),
          ],
        });
      }

      if (skillId) {
        if (!ObjectId.isValid(skillId)) return NextResponse.json({ error: "Filter skill tidak valid." }, { status: 400 });
        conditions.push({ skillId: { $in: [skillId, new ObjectId(skillId)] } });
      }

      if (dateFrom || dateTo) {
        const dateFilter: { $gte?: Date; $lt?: Date } = {};
        if (dateFrom) {
          const start = new Date(`${dateFrom}T00:00:00.000Z`);
          if (Number.isNaN(start.getTime())) return NextResponse.json({ error: "Tanggal mulai tidak valid." }, { status: 400 });
          dateFilter.$gte = start;
        }
        if (dateTo) {
          const end = new Date(`${dateTo}T00:00:00.000Z`);
          if (Number.isNaN(end.getTime())) return NextResponse.json({ error: "Tanggal akhir tidak valid." }, { status: 400 });
          end.setUTCDate(end.getUTCDate() + 1);
          dateFilter.$lt = end;
        }
        conditions.push({ createdAt: dateFilter });
      }

      if (conditions.length) filter = { $and: conditions };
      const [count, bots, skills] = await Promise.all([
        db.collection("conversations").countDocuments(filter),
        db.collection("bots").find({}, { projection: { name: 1 } }).sort({ name: 1 }).toArray(),
        db.collection("skills").find({}, { projection: { name: 1 } }).sort({ name: 1 }).toArray(),
      ]);
      total = count;
      totalPages = Math.max(1, Math.ceil(total / pageSize));
      page = Math.min(requestedPage, totalPages);
      botOptions = bots.map((bot) => ({ id: bot._id.toString(), name: bot.name || "Bot tanpa nama" }));
      skillOptions = skills.map((skill) => ({ id: skill._id.toString(), name: skill.name || "Skill tanpa nama" }));
    }

    const conversations = await db.collection("conversations")
      .find(filter)
      .sort({ updatedAt: -1 })
      .skip(wantsAll ? (page - 1) * pageSize : 0)
      .limit(wantsAll ? pageSize : 0)
      .project({ messages: 0 })
      .toArray();

    const relations = wantsAll
      ? await Promise.all(conversations.map((conversation) => getConversationRelations(db, conversation)))
      : [];
    return NextResponse.json({
      conversations: conversations.map((c, index) => ({
        id: c._id.toString(),
        title: c.title || "Percakapan Baru",
        skillId: c.skillId || null,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
        messageCount: c.messageCount || 0,
        ...(wantsAll ? relations[index] : {}),
      })),
      ...(wantsAll ? { pagination: { page, pageSize, total, totalPages }, filters: { bots: botOptions, skills: skillOptions } } : {}),
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
      ? await initializeBotConversation(db, {
        entryInteractionId: activeBot.entryInteractionId,
        interactions: activeBot.interactions,
        variables: activeBot.variables || [],
      }, session)
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
        dataCollectionState: flowState.dataCollectionState,
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

export async function DELETE(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const allConversations = req.nextUrl.searchParams.get("scope") === "all";
  const isStaff = session.role === "admin" || session.role === "manager";
  if (allConversations && !isStaff) return NextResponse.json({ error: "Akses ditolak" }, { status: 403 });

  try {
    const db = await getDatabase();
    const result = await db.collection("conversations").deleteMany(allConversations ? {} : { userId: session.id });
    return NextResponse.json({ success: true, deletedCount: result.deletedCount });
  } catch (error) {
    console.error("DELETE conversations error:", error);
    return NextResponse.json({ error: "Gagal menghapus percakapan." }, { status: 500 });
  }
}
