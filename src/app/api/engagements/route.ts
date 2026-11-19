import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/mongodb";
import { getSessionFromRequest } from "@/lib/auth";

function canManage(role: string): boolean {
  return role === "admin" || role === "manager";
}

export async function GET(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canManage(session.role)) return NextResponse.json({ error: "Akses ditolak" }, { status: 403 });

  try {
    const db = await getDatabase();
    const engagements = await db.collection("engagements").find({ createdBy: session.id }).sort({ updatedAt: -1 }).toArray();
    return NextResponse.json({
      engagements: engagements.map((item) => ({
        id: item._id.toString(),
        name: item.name,
        isActive: item.isActive === true,
        entryPoints: item.entryPoints || [],
        windows: item.windows || [],
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
      })),
    });
  } catch (error) {
    console.error("GET engagements error:", error);
    return NextResponse.json({ error: "Gagal memuat engagements." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canManage(session.role)) return NextResponse.json({ error: "Akses ditolak" }, { status: 403 });

  try {
    const body = await req.json();
    const name = typeof body.name === "string" ? body.name.trim() : "";
    if (!name || name.length > 100) {
      return NextResponse.json({ error: "Nama Engagement wajib diisi (maksimal 100 karakter)." }, { status: 400 });
    }

    const db = await getDatabase();
    const now = new Date();
    const result = await db.collection("engagements").insertOne({
      name,
      isActive: false,
      entryPoints: [],
      windows: [],
      createdBy: session.id,
      createdAt: now,
      updatedAt: now,
    });
    return NextResponse.json({ success: true, id: result.insertedId.toString() }, { status: 201 });
  } catch (error) {
    console.error("POST engagement error:", error);
    return NextResponse.json({ error: "Gagal membuat Engagement." }, { status: 500 });
  }
}
