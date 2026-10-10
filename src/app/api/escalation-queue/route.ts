import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getDatabase } from "@/lib/mongodb";
import { getSessionFromRequest } from "@/lib/auth";
import { initializeBotConversation } from "@/lib/bot-runtime";

async function isHumanUser(db: Awaited<ReturnType<typeof getDatabase>>, userId: string): Promise<boolean> {
  if (!ObjectId.isValid(userId)) return false;
  return Boolean(await db.collection("users").findOne(
    { _id: new ObjectId(userId), userType: { $ne: "bot" } },
    { projection: { _id: 1 } }
  ));
}

export async function GET(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const db = await getDatabase();
    if (!await isHumanUser(db, session.id)) return NextResponse.json({ error: "Queue hanya tersedia untuk user human." }, { status: 403 });
    const [conversations, skills, activeSetting] = await Promise.all([
      db.collection("conversations")
        .find({
        escalationHumanUserId: session.id,
        escalationStatus: { $in: ["pending", "accepted"] },
      })
      .sort({ updatedAt: -1 })
      .project({ messages: 1, title: 1, userId: 1, createdAt: 1, updatedAt: 1, escalationStatus: 1, assignedHumanUserId: 1 })
        .toArray(),
      db.collection("skills").find({}).project({ name: 1, botUserId: 1, botId: 1 }).sort({ name: 1 }).toArray(),
      db.collection("botSettings").findOne({ key: "active" }, { projection: { botId: 1 } }),
    ]);

    const humanIds = [...new Set(skills.map((skill) => String(skill.botUserId || "")).filter(ObjectId.isValid))]
      .map((userId) => new ObjectId(userId));
    const humanUsers = humanIds.length
      ? await db.collection("users").find({ _id: { $in: humanIds }, userType: { $ne: "bot" } }, { projection: { _id: 1 } }).toArray()
      : [];
    const validHumanIds = new Set(humanUsers.map((user) => user._id.toString()));
    const botUserIds = [...new Set(skills.map((skill) => String(skill.botUserId || "")).filter(ObjectId.isValid))]
      .map((userId) => new ObjectId(userId));
    const botUsers = botUserIds.length
      ? await db.collection("users").find({ _id: { $in: botUserIds }, userType: "bot" }, { projection: { _id: 1 } }).toArray()
      : [];
    const validBotUserIds = new Set(botUsers.map((user) => user._id.toString()));
    const botIds = [...new Set(skills.map((skill) => String(skill.botId || "")).filter(ObjectId.isValid))]
      .map((botId) => new ObjectId(botId));
    const bots = botIds.length
      ? await db.collection("bots").find({ _id: { $in: botIds } }, { projection: { isActive: 1 } }).toArray()
      : [];
    const botById = new Map(bots.map((bot) => [bot._id.toString(), bot]));
    type TransferSkill = { id: string; name: string; recipientType: "human" | "bot"; recipientId: string; botId: string | null };
    const transferSkills = skills.map((skill): TransferSkill | null => {
      const userId = String(skill.botUserId || "");
      const botId = String(skill.botId || "");
      if (validHumanIds.has(userId)) {
        return { id: skill._id.toString(), name: skill.name || "Skill", recipientType: "human", recipientId: userId, botId: null };
      }
      if (!validBotUserIds.has(userId) || !ObjectId.isValid(botId)) return null;
      const bot = botById.get(botId);
      const isActive = bot && (typeof bot.isActive === "boolean" ? bot.isActive : activeSetting?.botId === botId);
      return isActive
        ? { id: skill._id.toString(), name: skill.name || "Skill", recipientType: "bot", recipientId: userId, botId }
        : null;
    }).filter((skill): skill is TransferSkill => skill !== null);

    const requesterIds = [...new Set(conversations.map((item) => String(item.userId || "")).filter(ObjectId.isValid))]
      .map((userId) => new ObjectId(userId));
    const requesters = requesterIds.length
      ? await db.collection("users").find({ _id: { $in: requesterIds } }, { projection: { name: 1, fullName: 1, email: 1 } }).toArray()
      : [];
    const requesterById = new Map(requesters.map((user) => [user._id.toString(), user]));

    return NextResponse.json({
      conversations: conversations.map((conversation) => {
        const requester = requesterById.get(String(conversation.userId || ""));
        const messages = Array.isArray(conversation.messages) ? conversation.messages : [];
        const latestMessage = messages.at(-1);
        return {
          id: conversation._id.toString(),
          title: conversation.title || "Percakapan baru",
          status: conversation.escalationStatus,
          assignedHumanUserId: conversation.assignedHumanUserId || null,
          requester: requester ? {
            name: requester.fullName || requester.name || "User",
            email: requester.email || "",
          } : { name: "User", email: "" },
          latestMessage: latestMessage ? {
            role: latestMessage.role,
            content: typeof latestMessage.content === "string" ? latestMessage.content : "",
            timestamp: latestMessage.timestamp || null,
          } : null,
          createdAt: conversation.createdAt || null,
          updatedAt: conversation.updatedAt || null,
        };
      }),
      transferSkills,
    });
  } catch (error) {
    console.error("GET escalation queue error:", error);
    return NextResponse.json({ error: "Gagal memuat queue escalation." }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const conversationId = typeof body.conversationId === "string" ? body.conversationId : "";
    const action = body.action === "transfer" || body.action === "close" ? body.action : "accept";
    if (!ObjectId.isValid(conversationId)) return NextResponse.json({ error: "ID percakapan tidak valid." }, { status: 400 });

    const db = await getDatabase();
    if (!await isHumanUser(db, session.id)) return NextResponse.json({ error: "Queue hanya tersedia untuk user human." }, { status: 403 });
    if (action === "accept") {
    const result = await db.collection("conversations").updateOne(
      {
        _id: new ObjectId(conversationId),
        escalationHumanUserId: session.id,
        escalationStatus: "pending",
      },
      {
        $set: {
          escalationStatus: "accepted",
          assignedHumanUserId: session.id,
          escalationAcceptedAt: new Date(),
          updatedAt: new Date(),
        },
      }
    );
    if (!result.modifiedCount) {
      const alreadyAccepted = await db.collection("conversations").findOne({
        _id: new ObjectId(conversationId),
        escalationHumanUserId: session.id,
        escalationStatus: "accepted",
        assignedHumanUserId: session.id,
      }, { projection: { _id: 1 } });
      if (!alreadyAccepted) return NextResponse.json({ error: "Percakapan sudah diambil atau tidak tersedia." }, { status: 409 });
    }

      return NextResponse.json({ success: true, conversationId, status: "accepted" });
    }

    const assignedFilter = {
      _id: new ObjectId(conversationId),
      escalationHumanUserId: session.id,
      escalationStatus: "accepted",
      assignedHumanUserId: session.id,
    };
    if (action === "close") {
      const result = await db.collection("conversations").updateOne(assignedFilter, {
        $set: {
          escalationStatus: "closed",
          botStatus: "closed",
          escalationClosedAt: new Date(),
          updatedAt: new Date(),
        },
      });
      if (!result.modifiedCount) return NextResponse.json({ error: "Percakapan tidak lagi ditangani oleh Anda." }, { status: 409 });
      return NextResponse.json({ success: true, conversationId, status: "closed" });
    }

    const targetSkillId = typeof body.skillId === "string" ? body.skillId : "";
    if (!ObjectId.isValid(targetSkillId)) return NextResponse.json({ error: "Pilih skill tujuan yang valid." }, { status: 400 });
    const targetSkill = await db.collection("skills").findOne({ _id: new ObjectId(targetSkillId) }, { projection: { botUserId: 1, botId: 1 } });
    const targetUserId = typeof targetSkill?.botUserId === "string" ? targetSkill.botUserId : "";
    if (!targetSkill || !ObjectId.isValid(targetUserId)) return NextResponse.json({ error: "Skill tujuan tidak memiliki user yang valid." }, { status: 400 });
    const targetUser = await db.collection("users").findOne({ _id: new ObjectId(targetUserId) }, { projection: { userType: 1 } });
    if (!targetUser) return NextResponse.json({ error: "User tujuan tidak ditemukan." }, { status: 400 });

    if (targetUser.userType !== "bot") {
      if (targetUserId === session.id) return NextResponse.json({ error: "Pilih skill yang terhubung ke human lain." }, { status: 400 });
      const transferResult = await db.collection("conversations").updateOne(assignedFilter, {
        $set: {
          escalationSkillId: targetSkillId,
          escalationHumanUserId: targetUserId,
          escalationStatus: "pending",
          assignedHumanUserId: null,
          escalationTransferredAt: new Date(),
          updatedAt: new Date(),
        },
      });
      if (!transferResult.modifiedCount) return NextResponse.json({ error: "Percakapan tidak lagi ditangani oleh Anda." }, { status: 409 });
      return NextResponse.json({ success: true, conversationId, status: "pending", recipientType: "human" });
    }

    const targetBotId = typeof targetSkill.botId === "string" ? targetSkill.botId : "";
    if (!ObjectId.isValid(targetBotId)) return NextResponse.json({ error: "Skill bot tujuan tidak memiliki flow yang valid." }, { status: 400 });
    const [targetBot, activeSetting, conversation] = await Promise.all([
      db.collection("bots").findOne({ _id: new ObjectId(targetBotId) }),
      db.collection("botSettings").findOne({ key: "active" }, { projection: { botId: 1 } }),
      db.collection("conversations").findOne(assignedFilter, { projection: { userId: 1, messages: 1 } }),
    ]);
    const targetBotActive = targetBot && (typeof targetBot.isActive === "boolean" ? targetBot.isActive : activeSetting?.botId === targetBotId);
    if (!targetBot || !targetBotActive) return NextResponse.json({ error: "Bot tujuan tidak aktif atau tidak tersedia." }, { status: 409 });
    if (!conversation) return NextResponse.json({ error: "Percakapan tidak lagi ditangani oleh Anda." }, { status: 409 });

    const requesterId = String(conversation.userId || "");
    const requester = ObjectId.isValid(requesterId)
      ? await db.collection("users").findOne({ _id: new ObjectId(requesterId) }, { projection: { name: 1, fullName: 1, email: 1, role: 1 } })
      : null;
    const flowState = await initializeBotConversation(db, {
      entryInteractionId: targetBot.entryInteractionId,
      interactions: targetBot.interactions || [],
      variables: targetBot.variables || [],
    }, {
      name: requester?.name || "User",
      fullName: requester?.fullName || requester?.name || "User",
      email: requester?.email || "",
      role: requester?.role || "public_user",
    });
    const transferMessages = flowState.messages;
    const botTransferUpdate: Record<string, unknown> = {
      $set: {
        botId: targetBotId,
        botUserId: targetUserId,
        skillId: targetSkillId,
        currentInteractionId: flowState.currentInteractionId,
        botStatus: flowState.botStatus,
        dataCollectionState: flowState.dataCollectionState,
        escalationSkillId: targetSkillId,
        escalationStatus: "bot",
        assignedHumanUserId: null,
        escalationTransferredAt: new Date(),
        updatedAt: new Date(),
      },
      $push: { messages: { $each: transferMessages } },
      $inc: { messageCount: transferMessages.length },
      $unset: { escalationHumanUserId: "", escalationAcceptedAt: "", escalationClosedAt: "" },
    };
    const botTransferResult = await db.collection("conversations").updateOne(assignedFilter, botTransferUpdate);
    if (!botTransferResult.modifiedCount) return NextResponse.json({ error: "Percakapan tidak lagi ditangani oleh Anda." }, { status: 409 });
    return NextResponse.json({ success: true, conversationId, status: "bot", recipientType: "bot" });
  } catch (error) {
    console.error("PATCH escalation queue error:", error);
    return NextResponse.json({ error: "Gagal menerima percakapan." }, { status: 500 });
  }
}