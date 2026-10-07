import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/mongodb";
import { getSessionFromRequest } from "@/lib/auth";
import { ObjectId } from "mongodb";

// DELETE /api/knowledge-bases/[id] — delete a KB registration + its collection
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.role !== "admin") return NextResponse.json({ error: "Admin only" }, { status: 403 });

  const { id } = await params;
  if (!ObjectId.isValid(id)) return NextResponse.json({ error: "Invalid ID" }, { status: 400 });

  try {
    const db = await getDatabase();
    const kb = await db.collection("knowledgeBases").findOne({ _id: new ObjectId(id) });
    if (!kb) return NextResponse.json({ error: "Knowledge Base tidak ditemukan" }, { status: 404 });

    // Drop the data collection
    try {
      await db.collection(kb.collectionName).drop();
    } catch {
      // collection may not exist, ignore
    }

    // Delete the registration
    await db.collection("knowledgeBases").deleteOne({ _id: new ObjectId(id) });

    return NextResponse.json({ success: true, message: `Knowledge Base "${kb.displayName}" berhasil dihapus.` });
  } catch (err) {
    console.error("DELETE knowledge-base error:", err);
    return NextResponse.json({ error: "Failed to delete knowledge base" }, { status: 500 });
  }
}

// PATCH /api/knowledge-bases/[id] — update KB metadata
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.role === "public_user") return NextResponse.json({ error: "Akses ditolak" }, { status: 403 });

  const { id } = await params;
  if (!ObjectId.isValid(id)) return NextResponse.json({ error: "Invalid ID" }, { status: 400 });

  try {
    const body = await req.json();
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json({ error: "Data Knowledge Base tidak valid" }, { status: 400 });
    }
    const db = await getDatabase();
    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (Object.prototype.hasOwnProperty.call(body, "displayName")) {
      const displayName = typeof body.displayName === "string" ? body.displayName.trim() : "";
      if (!displayName || displayName.length > 100) {
        return NextResponse.json({ error: "Nama Knowledge Base wajib diisi (maksimal 100 karakter)" }, { status: 400 });
      }
      const duplicate = await db.collection("knowledgeBases").findOne(
        { displayName, _id: { $ne: new ObjectId(id) } },
        { projection: { _id: 1 } }
      );
      if (duplicate) return NextResponse.json({ error: "Nama Knowledge Base sudah digunakan" }, { status: 409 });
      updates.displayName = displayName;
    }
    if (typeof body.description === "string") updates.description = body.description.trim();
    if (typeof body.isActive === "boolean") updates.isActive = body.isActive;
    if (Object.keys(updates).length === 1) {
      return NextResponse.json({ error: "Tidak ada perubahan Knowledge Base yang valid" }, { status: 400 });
    }

    const result = await db.collection("knowledgeBases").updateOne(
      { _id: new ObjectId(id) },
      { $set: updates }
    );
    if (!result.matchedCount) {
      return NextResponse.json({ error: "Knowledge Base tidak ditemukan" }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("PATCH knowledge-base error:", err);
    return NextResponse.json({ error: "Failed to update knowledge base" }, { status: 500 });
  }
}
