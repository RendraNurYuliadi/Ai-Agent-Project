import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getDatabase } from "@/lib/mongodb";
import { getSessionFromRequest } from "@/lib/auth";
import {
  isActiveBotSkill,
  parseEngagementEntryPoints,
  parseEngagementWindows,
} from "@/lib/engagement-data";

function canManage(role: string): boolean {
  return role === "admin" || role === "manager";
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canManage(session.role)) return NextResponse.json({ error: "Akses ditolak" }, { status: 403 });

  const { id } = await params;
  if (!ObjectId.isValid(id)) return NextResponse.json({ error: "ID tidak valid." }, { status: 400 });

  try {
    const db = await getDatabase();
    const item = await db.collection("engagements").findOne({ _id: new ObjectId(id), createdBy: session.id });
    if (!item) return NextResponse.json({ error: "Engagement tidak ditemukan." }, { status: 404 });
    return NextResponse.json({
      engagement: {
        id: item._id.toString(),
        name: item.name,
        isActive: item.isActive === true,
        entryPoints: item.entryPoints || [],
        windows: item.windows || [],
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
      },
    });
  } catch (error) {
    console.error("GET engagement error:", error);
    return NextResponse.json({ error: "Gagal memuat Engagement." }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canManage(session.role)) return NextResponse.json({ error: "Akses ditolak" }, { status: 403 });

  const { id } = await params;
  if (!ObjectId.isValid(id)) return NextResponse.json({ error: "ID tidak valid." }, { status: 400 });

  try {
    const body = await req.json();
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const entryPoints = parseEngagementEntryPoints(body.entryPoints);
    const windows = parseEngagementWindows(body.windows);
    const isActive = body.isActive === true;
    if (!name || name.length > 100) {
      return NextResponse.json({ error: "Nama Engagement wajib diisi (maksimal 100 karakter)." }, { status: 400 });
    }
    if (!entryPoints || !windows) {
      return NextResponse.json({ error: "Periksa kembali entry point dan chat window." }, { status: 400 });
    }
    if (isActive && (!entryPoints.length || !windows.length)) {
      return NextResponse.json({ error: "Tambahkan minimal satu entry point dan chat window sebelum mengaktifkan Engagement." }, { status: 400 });
    }

    const db = await getDatabase();
    for (const window of windows) {
      if (!(await isActiveBotSkill(db, window.skillId))) {
        return NextResponse.json({ error: `Skill pada window "${window.name}" harus terhubung dengan bot aktif.` }, { status: 409 });
      }
    }

    const now = new Date();
    const result = await db.collection("engagements").updateOne(
      { _id: new ObjectId(id), createdBy: session.id },
      { $set: { name, entryPoints, windows, isActive, updatedAt: now } }
    );
    if (!result.matchedCount) return NextResponse.json({ error: "Engagement tidak ditemukan." }, { status: 404 });
    return NextResponse.json({ success: true, updatedAt: now });
  } catch (error) {
    console.error("PUT engagement error:", error);
    return NextResponse.json({ error: "Gagal menyimpan Engagement." }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canManage(session.role)) return NextResponse.json({ error: "Akses ditolak" }, { status: 403 });

  const { id } = await params;
  if (!ObjectId.isValid(id)) return NextResponse.json({ error: "ID tidak valid." }, { status: 400 });

  try {
    const db = await getDatabase();
    const result = await db.collection("engagements").deleteOne({
      _id: new ObjectId(id),
      createdBy: session.id,
    });
    if (!result.deletedCount) return NextResponse.json({ error: "Engagement tidak ditemukan." }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE engagement error:", error);
    return NextResponse.json({ error: "Gagal menghapus Engagement." }, { status: 500 });
  }
}
