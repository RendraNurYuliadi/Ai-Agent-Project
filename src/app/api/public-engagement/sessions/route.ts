import { createHash, randomBytes } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getDatabase } from "@/lib/mongodb";
import { verifyEngagementWidgetToken } from "@/lib/engagement-auth";
import { isActiveBotSkill } from "@/lib/engagement-data";
import { DataCollectionAIError, initializeBotConversation } from "@/lib/bot-runtime";

function getBearerToken(req: NextRequest): string {
  const authorization = req.headers.get("authorization") || "";
  return authorization.startsWith("Bearer ") ? authorization.slice(7).trim() : "";
}

export async function POST(req: NextRequest) {
  const claims = await verifyEngagementWidgetToken(getBearerToken(req));
  if (!claims) return NextResponse.json({ error: "Widget token tidak valid atau kedaluwarsa." }, { status: 401 });

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

    if (!(await isActiveBotSkill(db, windowConfig.skillId))) {
      return NextResponse.json({ error: "Bot untuk chat ini sedang tidak tersedia." }, { status: 409 });
    }

    const skill = await db.collection("skills").findOne({
      _id: new ObjectId(windowConfig.skillId),
    });
    if (!skill || !ObjectId.isValid(skill.botId) || !ObjectId.isValid(skill.botUserId)) {
      return NextResponse.json({ error: "Skill bot tidak lagi tersedia." }, { status: 409 });
    }
    const bot = await db.collection("bots").findOne({ _id: new ObjectId(skill.botId) });
    if (!bot) return NextResponse.json({ error: "Bot untuk skill ini tidak ditemukan." }, { status: 409 });

    const visitorId = new ObjectId().toString();
    const visitorToken = randomBytes(32).toString("hex");
    const user = {
      id: visitorId,
      name: "Website Visitor",
      fullName: "Website Visitor",
      email: "",
      role: "public_user",
    };
    const flowState = await initializeBotConversation(
      db,
      {
        entryInteractionId: bot.entryInteractionId,
        interactions: bot.interactions || [],
        variables: bot.variables || [],
      },
      user
    );
    const now = new Date();
    const conversation = {
      userId: user.id,
      userName: user.name,
      userEmail: "",
      title: windowConfig.title || engagement.name,
      messages: flowState.messages,
      messageCount: flowState.messages.length,
      currentInteractionId: flowState.currentInteractionId,
      botStatus: flowState.botStatus,
      dataCollectionState: flowState.dataCollectionState,
      botId: skill.botId,
      botUserId: skill.botUserId,
      skillId: skill._id.toString(),
      source: "engagement",
      engagementId: engagement._id.toString(),
      engagementWindowId: windowConfig.id,
      engagementEntryPointId: entryPoint.id,
      visitorTokenHash: createHash("sha256").update(visitorToken).digest("hex"),
      escalationStatus: "bot",
      createdAt: now,
      updatedAt: now,
    };
    const result = await db.collection("conversations").insertOne(conversation);
    return NextResponse.json({
      conversationId: result.insertedId.toString(),
      visitorToken,
      messages: flowState.messages,
      botStatus: flowState.botStatus,
      escalationStatus: "bot",
    });
  } catch (error) {
    console.error("POST public engagement session error:", error);
    if (error instanceof DataCollectionAIError) {
      return NextResponse.json({ error: error.message }, { status: 503 });
    }
    return NextResponse.json({ error: "Gagal memulai percakapan." }, { status: 500 });
  }
}
