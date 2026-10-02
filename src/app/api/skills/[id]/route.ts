import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getDatabase } from "@/lib/mongodb";
import { getSessionFromRequest } from "@/lib/auth";

function canManage(role: string): boolean {
  return role === "admin" || role === "manager";
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canManage(session.role)) return NextResponse.json({ error: "Akses ditolak" }, { status: 403 });

  const { id } = await params;
  if (!ObjectId.isValid(id)) return NextResponse.json({ error: "ID skill tidak valid." }, { status: 400 });

  try {
    const { name, description, botUserId, botId } = await req.json();
    const cleanName = typeof name === "string" ? name.trim() : "";
    if (!cleanName || cleanName.length > 100) {
      return NextResponse.json({ error: "Nama skill wajib diisi (maksimal 100 karakter)." }, { status: 400 });
    }
    if (typeof description === "string" && description.length > 500) {
      return NextResponse.json({ error: "Deskripsi maksimal 500 karakter." }, { status: 400 });
    }

    const db = await getDatabase();
    const [exists, duplicate, botUser, bot] = await Promise.all([
      db.collection("skills").findOne({ _id: new ObjectId(id) }, { projection: { _id: 1 } }),
      db.collection("skills").findOne({ name: cleanName, _id: { $ne: new ObjectId(id) } }, { projection: { _id: 1 } }),
      ObjectId.isValid(botUserId) ? db.collection("users").findOne({ _id: new ObjectId(botUserId), userType: "bot" }, { projection: { _id: 1 } }) : null,
      ObjectId.isValid(botId) ? db.collection("bots").findOne({ _id: new ObjectId(botId) }, { projection: { _id: 1 } }) : null,
    ]);
    if (!exists) return NextResponse.json({ error: "Skill tidak ditemukan." }, { status: 404 });
    if (duplicate) return NextResponse.json({ error: "Nama skill sudah digunakan." }, { status: 409 });
    if (!botUser || !bot) return NextResponse.json({ error: "Pilih user bertipe bot dan bot flow yang valid." }, { status: 400 });

    await db.collection("skills").updateOne(
      { _id: new ObjectId(id) },
      { $set: {
        name: cleanName,
        description: typeof description === "string" ? description.trim() : "",
        botUserId,
        botId,
        updatedBy: { id: session.id, name: session.name },
        updatedAt: new Date(),
      } }
    );
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("PUT skill error:", error);
    return NextResponse.json({ error: "Gagal memperbarui skill." }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canManage(session.role)) return NextResponse.json({ error: "Akses ditolak" }, { status: 403 });

  const { id } = await params;
  if (!ObjectId.isValid(id)) return NextResponse.json({ error: "ID skill tidak valid." }, { status: 400 });

  try {
    const db = await getDatabase();
    const result = await db.collection("skills").deleteOne({ _id: new ObjectId(id) });
    if (!result.deletedCount) return NextResponse.json({ error: "Skill tidak ditemukan." }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE skill error:", error);
    return NextResponse.json({ error: "Gagal menghapus skill." }, { status: 500 });
  }
}