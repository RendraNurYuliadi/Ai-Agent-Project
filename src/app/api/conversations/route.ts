import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/mongodb";
import { getSessionFromRequest } from "@/lib/auth";
import { ObjectId } from "mongodb";

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
    const { title } = await req.json();
    const db = await getDatabase();

    const newConversation = {
      userId: session.id,
      title: title || "Percakapan Baru",
      messages: [],
      messageCount: 0,
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
