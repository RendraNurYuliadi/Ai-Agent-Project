import { createHash, timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getDatabase } from "@/lib/mongodb";
import { verifyEngagementWidgetToken } from "@/lib/engagement-auth";
import { isActiveBotSkill } from "@/lib/engagement-data";
import { DataCollectionAIError, initializeBotConversation, processBotTurn } from "@/lib/bot-runtime";

type PublicMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date | string;
  [key: string]: unknown;
};

function getBearerToken(req: NextRequest): string {
  const authorization = req.headers.get("authorization") || "";
  return authorization.startsWith("Bearer ") ? authorization.slice(7).trim() : "";
}

function visitorTokenMatches(token: string, storedHash: unknown): boolean {
  if (!token || typeof storedHash !== "string") return false;
  const submittedHash = createHash("sha256").update(token).digest();
  const expectedHash = Buffer.from(storedHash, "hex");
  return expectedHash.length === submittedHash.length && timingSafeEqual(expectedHash, submittedHash);
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const claims = await verifyEngagementWidgetToken(getBearerToken(req));
  if (!claims) return NextResponse.json({ error: "Widget token tidak valid atau kedaluwarsa." }, { status: 401 });

  const { id } = await params;
  if (!ObjectId.isValid(id)) return NextResponse.json({ error: "ID percakapan tidak valid." }, { status: 400 });
  const visitorToken = req.headers.get("x-engagement-visitor-token") || "";

  try {
    const db = await getDatabase();
    const conversation = await db.collection("conversations").findOne({
      _id: new ObjectId(id),
      source: "engagement",
      engagementId: claims.engagementId,
      engagementWindowId: claims.windowId,
      engagementEntryPointId: claims.entryPointId,
    });
    if (!conversation || !visitorTokenMatches(visitorToken, conversation.visitorTokenHash)) {
      return NextResponse.json({ error: "Percakapan tidak ditemukan." }, { status: 404 });
    }

    return NextResponse.json({
      messages: conversation.messages || [],
      botStatus: conversation.botStatus || "active",
      escalationStatus: conversation.escalationStatus || "bot",
    });
  } catch (error) {
    console.error("GET public engagement messages error:", error);
    return NextResponse.json({ error: "Gagal memuat pesan." }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const claims = await verifyEngagementWidgetToken(getBearerToken(req));
  if (!claims) return NextResponse.json({ error: "Widget token tidak valid atau kedaluwarsa." }, { status: 401 });

  const { id } = await params;
  if (!ObjectId.isValid(id)) return NextResponse.json({ error: "ID percakapan tidak valid." }, { status: 400 });

  const visitorToken = req.headers.get("x-engagement-visitor-token") || "";
  let message = "";
  let closeConversation = false;
  try {
    const body = await req.json();
    message = typeof body.message === "string" ? body.message.trim() : "";
    closeConversation = body.close === true;
  } catch {
    return NextResponse.json({ error: "Format pesan tidak valid." }, { status: 400 });
  }
  if (!closeConversation && (!message || message.length > 4000)) {
    return NextResponse.json({ error: "Pesan wajib diisi dan maksimal 4000 karakter." }, { status: 400 });
  }

  try {
    const db = await getDatabase();
    const engagement = await db.collection("engagements").findOne({
      _id: new ObjectId(claims.engagementId),
      isActive: true,
    });
    const entryPoint = engagement?.entryPoints?.find(
      (item: { id: string; origin: string }) =>
        item.id === claims.entryPointId && item.origin === claims.origin
    );
    const windowConfig = engagement?.windows?.find(
      (item: { id: string }) => item.id === claims.windowId
    );
    if (!engagement || !entryPoint || !windowConfig) {
      return NextResponse.json({ error: "Engagement ini tidak lagi tersedia." }, { status: 404 });
    }

    const conversation = await db.collection("conversations").findOne({
      _id: new ObjectId(id),
      source: "engagement",
      engagementId: claims.engagementId,
      engagementWindowId: claims.windowId,
      engagementEntryPointId: claims.entryPointId,
    });
    if (!conversation || !visitorTokenMatches(visitorToken, conversation.visitorTokenHash)) {
      return NextResponse.json({ error: "Percakapan tidak ditemukan." }, { status: 404 });
    }
    if (closeConversation) {
      if (windowConfig.allowClose === false) {
        return NextResponse.json({ error: "Tutup percakapan tidak diizinkan untuk chat window ini." }, { status: 403 });
      }
      await db.collection("conversations").updateOne(
        { _id: new ObjectId(id), visitorTokenHash: conversation.visitorTokenHash },
        {
          $set: {
            botStatus: "closed",
            escalationStatus: "closed",
            closedAt: new Date(),
            updatedAt: new Date(),
          },
        }
      );
      return NextResponse.json({
        success: true,
        closed: true,
        botStatus: "closed",
        escalationStatus: "closed",
      });
    }
    if (conversation.botStatus === "closed") {
      return NextResponse.json({ error: "Percakapan ini sudah ditutup." }, { status: 409 });
    }

    const existingMessages: PublicMessage[] = Array.isArray(conversation.messages)
      ? conversation.messages
      : [];
    const now = new Date();
    const userMessage: PublicMessage = {
      id: new ObjectId().toString(),
      role: "user",
      content: message,
      timestamp: now,
    };

    if (conversation.escalationStatus === "pending" || conversation.escalationStatus === "accepted") {
      const pendingUserUpdate: Record<string, unknown> = {
        $push: { messages: userMessage },
        $set: { updatedAt: now },
        $inc: { messageCount: 1 },
      };
      await db.collection("conversations").updateOne(
        { _id: new ObjectId(id), visitorTokenHash: conversation.visitorTokenHash },
        pendingUserUpdate
      );
      return NextResponse.json({
        success: true,
        userMessage,
        assistantMessages: [],
        botStatus: conversation.botStatus,
        escalationStatus: conversation.escalationStatus,
      });
    }

    const activeConversationSkillId = typeof conversation.skillId === "string" ? conversation.skillId : "";
    if (!(await isActiveBotSkill(db, activeConversationSkillId))) {
      return NextResponse.json({ error: "Bot untuk chat ini sedang tidak tersedia." }, { status: 409 });
    }
    const botId = typeof conversation.botId === "string" ? conversation.botId : "";
    if (!ObjectId.isValid(botId)) {
      return NextResponse.json({ error: "Bot percakapan tidak valid." }, { status: 409 });
    }
    const botDocument = await db.collection("bots").findOne({ _id: new ObjectId(botId) });
    if (!botDocument) return NextResponse.json({ error: "Bot percakapan tidak ditemukan." }, { status: 409 });

    const botTurnStartedAt = Date.now();
    const turn = await processBotTurn(
      db,
      {
        id: botDocument._id.toString(),
        name: botDocument.name || "Bot",
        entryInteractionId: botDocument.entryInteractionId,
        interactions: botDocument.interactions || [],
        variables: botDocument.variables || [],
      },
      {
        currentInteractionId: conversation.currentInteractionId,
        botStatus: conversation.botStatus,
        dataCollectionState: conversation.dataCollectionState,
        conversationId: id,
        skillId: typeof conversation.skillId === "string" ? conversation.skillId : null,
        historyMessages: existingMessages,
      },
      message,
      {
        id: conversation.userId,
        name: conversation.userName || "Website Visitor",
        fullName: conversation.userName || "Website Visitor",
        email: "",
        role: "public_user",
      }
    );
    if (turn.assistantMessage) {
      turn.assistantMessage.generationDurationMs = Date.now() - botTurnStartedAt;
    }

    const assistantMessages = turn.assistantMessage ? [turn.assistantMessage] : [];
    const setFields: Record<string, unknown> = {
      currentInteractionId: turn.currentInteractionId,
      botStatus: turn.botStatus,
      dataCollectionState: turn.dataCollectionState,
      updatedAt: new Date(),
    };

    if (turn.botTransfer) {
      if (!(await isActiveBotSkill(db, turn.botTransfer.skillId))) {
        return NextResponse.json({ error: "Skill bot tujuan tidak lagi tersedia." }, { status: 409 });
      }
      const [targetSkill, targetBot] = await Promise.all([
        db.collection("skills").findOne({
          _id: new ObjectId(turn.botTransfer.skillId),
          botUserId: turn.botTransfer.botUserId,
          botId: turn.botTransfer.botId,
        }),
        db.collection("bots").findOne({ _id: new ObjectId(turn.botTransfer.botId) }),
      ]);
      if (!targetSkill || !targetBot) {
        return NextResponse.json({ error: "Skill bot tujuan tidak lagi tersedia." }, { status: 409 });
      }
      const flowState = await initializeBotConversation(
        db,
        {
          entryInteractionId: targetBot.entryInteractionId,
          interactions: targetBot.interactions || [],
          variables: targetBot.variables || [],
        },
        {
          name: conversation.userName || "Website Visitor",
          fullName: conversation.userName || "Website Visitor",
          email: "",
          role: "public_user",
        }
      );
      assistantMessages.push(...flowState.messages);
      Object.assign(setFields, {
        botId: targetBot._id.toString(),
        botUserId: targetSkill.botUserId,
        skillId: targetSkill._id.toString(),
        currentInteractionId: flowState.currentInteractionId,
        botStatus: flowState.botStatus,
        dataCollectionState: flowState.dataCollectionState,
        escalationStatus: "bot",
        assignedHumanUserId: null,
      });
    } else if (turn.escalation) {
      Object.assign(setFields, {
        escalationStatus: "pending",
        escalationSkillId: turn.escalation.skillId,
        escalationHumanUserId: turn.escalation.humanUserId,
        assignedHumanUserId: null,
      });
    }

    const botUpdate: Record<string, unknown> = {
      $push: { messages: { $each: [userMessage, ...assistantMessages] } },
      $set: setFields,
      $inc: { messageCount: 1 + assistantMessages.length },
    };
    await db.collection("conversations").updateOne(
      { _id: new ObjectId(id), visitorTokenHash: conversation.visitorTokenHash },
      botUpdate
    );
    return NextResponse.json({
      success: true,
      userMessage,
      assistantMessages,
      botStatus: setFields.botStatus,
      escalationStatus: turn.escalation ? "pending" : turn.botTransfer ? "bot" : conversation.escalationStatus || "bot",
    });
  } catch (error) {
    console.error("POST public engagement message error:", error);
    if (error instanceof DataCollectionAIError) {
      return NextResponse.json({ error: error.message }, { status: 503 });
    }
    return NextResponse.json({ error: "Gagal memproses pesan." }, { status: 500 });
  }
}
