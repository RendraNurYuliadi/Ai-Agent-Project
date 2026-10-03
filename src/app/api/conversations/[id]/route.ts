import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/mongodb";
import { getSessionFromRequest } from "@/lib/auth";
import { ObjectId } from "mongodb";
import { getConversationRelations } from "@/lib/conversation-details";

// GET /api/conversations/[id] — get full conversation with messages
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  if (!ObjectId.isValid(id)) return NextResponse.json({ error: "Invalid ID" }, { status: 400 });

  try {
    const db = await getDatabase();
    const isStaff = session.role === "admin" || session.role === "manager";
    const conversation = await db.collection("conversations").findOne({
      _id: new ObjectId(id),
      ...(isStaff ? {} : { userId: session.id }),
    });

    if (!conversation) return NextResponse.json({ error: "Conversation not found" }, { status: 404 });

    const messages = (conversation.messages || []).map((message: Record<string, unknown>) => ({
      ...message,
      content: typeof message.content === "string"
        ? message.content.replace(/\\r\\n/g, "\n").replace(/\\n/g, "\n").replace(/\\r/g, "\n")
        : message.content,
    }));

    const relations = isStaff ? await getConversationRelations(db, conversation) : {};
    return NextResponse.json({
      conversation: {
        id: conversation._id.toString(),
        title: conversation.title,
        skillId: conversation.skillId || null,
        messages,
        botStatus: conversation.botStatus || "active",
        createdAt: conversation.createdAt,
        updatedAt: conversation.updatedAt,
        ...relations,
      },
    });
  } catch (err) {
    console.error("GET conversation error:", err);
    return NextResponse.json({ error: "Failed to fetch conversation" }, { status: 500 });
  }
}

// DELETE /api/conversations/[id] — delete conversation
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  if (!ObjectId.isValid(id)) return NextResponse.json({ error: "Invalid ID" }, { status: 400 });

  try {
    const db = await getDatabase();
    const result = await db.collection("conversations").deleteOne({
      _id: new ObjectId(id),
      userId: session.id,
    });

    if (result.deletedCount === 0) {
      return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: "Conversation deleted" });
  } catch (err) {
    console.error("DELETE conversation error:", err);
    return NextResponse.json({ error: "Failed to delete conversation" }, { status: 500 });
  }
}

// PATCH /api/conversations/[id] — update conversation title
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  if (!ObjectId.isValid(id)) return NextResponse.json({ error: "Invalid ID" }, { status: 400 });

  try {
    const { title } = await req.json();
    const db = await getDatabase();
    await db.collection("conversations").updateOne(
      { _id: new ObjectId(id), userId: session.id },
      { $set: { title, updatedAt: new Date() } }
    );
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("PATCH conversation error:", err);
    return NextResponse.json({ error: "Failed to update conversation" }, { status: 500 });
  }
}
