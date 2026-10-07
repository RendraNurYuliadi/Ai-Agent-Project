import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getDatabase } from "@/lib/mongodb";
import { getSessionFromRequest } from "@/lib/auth";
import { generateUniqueName } from "@/lib/duplicate-name";

// GET /api/prompts?type=faq|small_talk|route|guided_routing|rag
export async function GET(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const type = new URL(req.url).searchParams.get("type");

  try {
    const db = await getDatabase();
    const query = type ? { type } : {};
    const prompts = await db.collection("prompts").find(query).sort({ type: 1, createdAt: -1 }).toArray();

    return NextResponse.json({
      prompts: prompts.map((p) => ({
        id: p._id.toString(),
        type: p.type,
        name: p.name,
        content: p.content,
        isActive: p.isActive,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
      })),
    });
  } catch (err) {
    console.error("GET prompts error:", err);
    return NextResponse.json({ error: "Failed to fetch prompts" }, { status: 500 });
  }
}

// POST /api/prompts — create a new prompt
export async function POST(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.role === "public_user") return NextResponse.json({ error: "Akses ditolak" }, { status: 403 });

  try {
    const body = await req.json();
    const duplicateFromId = typeof body.duplicateFromId === "string" ? body.duplicateFromId.trim() : "";
    const db = await getDatabase();

    if (duplicateFromId) {
      const source = await db.collection("prompts").findOne({ _id: new ObjectId(duplicateFromId) });
      if (!source) return NextResponse.json({ error: "Prompt sumber tidak ditemukan." }, { status: 404 });

      const existing = await db.collection("prompts").find({}, { projection: { name: 1 } }).toArray();
      const newName = generateUniqueName(source.name, existing.map((item) => item.name));
      const now = new Date();
      const { _id, createdAt, updatedAt, createdBy, ...rest } = source;
      const inserted = await db.collection("prompts").insertOne({
        ...rest,
        name: newName,
        isActive: Boolean(source.isActive),
        createdBy: { id: session.id, name: session.name },
        createdAt: now,
        updatedAt: now,
      });
      return NextResponse.json({ success: true, id: inserted.insertedId.toString(), name: newName }, { status: 201 });
    }

    const { type, name, content, isActive } = body;
    if (!type || !name || !content) {
      return NextResponse.json({ error: "Type, nama, dan konten prompt wajib diisi" }, { status: 400 });
    }
    const validTypes = ["faq", "small_talk", "route", "guided_routing", "rag"];
    if (!validTypes.includes(type)) {
      return NextResponse.json({ error: "Type tidak valid." }, { status: 400 });
    }

    if (isActive) {
      await db.collection("prompts").updateMany({ type }, { $set: { isActive: false } });
    }

    const result = await db.collection("prompts").insertOne({
      type, name, content,
      isActive: isActive ?? false,
      createdBy: { id: session.id, name: session.name },
      createdAt: new Date(), updatedAt: new Date(),
    });

    return NextResponse.json({ success: true, id: result.insertedId.toString() });
  } catch (err) {
    console.error("POST prompts error:", err);
    return NextResponse.json({ error: "Failed to create prompt" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.role !== "admin") return NextResponse.json({ error: "Admin only" }, { status: 403 });

  try {
    const db = await getDatabase();
    const result = await db.collection("prompts").deleteMany({});
    return NextResponse.json({ success: true, deletedCount: result.deletedCount });
  } catch (error) {
    console.error("DELETE all prompts error:", error);
    return NextResponse.json({ error: "Gagal menghapus semua prompt." }, { status: 500 });
  }
}
