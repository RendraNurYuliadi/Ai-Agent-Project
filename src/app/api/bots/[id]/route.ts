import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getDatabase } from "@/lib/mongodb";
import { getSessionFromRequest } from "@/lib/auth";
import { validateBotDefinition } from "@/lib/bot-flows";

function canManage(role: string): boolean {
  return role === "admin" || role === "manager";
}

async function hasOnlyActiveKnowledgeBases(
  db: Awaited<ReturnType<typeof getDatabase>>,
  interactions: Array<{ config: { knowledgeBases?: string[] } }>
): Promise<boolean> {
  const requested = [...new Set(interactions.flatMap((item) => item.config.knowledgeBases || []))];
  if (requested.length === 0) return true;
  const active = await db.collection("knowledgeBases")
    .find({ collectionName: { $in: requested }, isActive: { $ne: false } }, { projection: { collectionName: 1 } })
    .toArray();
  return new Set(active.map((item) => item.collectionName)).size === requested.length;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canManage(session.role)) return NextResponse.json({ error: "Akses ditolak" }, { status: 403 });
  const { id } = await params;
  if (!ObjectId.isValid(id)) return NextResponse.json({ error: "Invalid ID" }, { status: 400 });

  try {
    const db = await getDatabase();
    const [bot, activeSetting, skillCount] = await Promise.all([
      db.collection("bots").findOne({ _id: new ObjectId(id) }),
      db.collection("botSettings").findOne({ key: "active" }),
      db.collection("skills").countDocuments({ botId: id }),
    ]);
    if (!bot) return NextResponse.json({ error: "Bot tidak ditemukan." }, { status: 404 });
    const { _id, ...data } = bot;
    const botId = _id.toString();
    return NextResponse.json({ bot: {
      id: botId,
      ...data,
      isActive: typeof bot.isActive === "boolean" ? bot.isActive : activeSetting?.botId === botId,
      skillCount,
    } });
  } catch (error) {
    console.error("GET bot error:", error);
    return NextResponse.json({ error: "Gagal memuat bot." }, { status: 500 });
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
  if (!ObjectId.isValid(id)) return NextResponse.json({ error: "Invalid ID" }, { status: 400 });

  try {
    const validation = validateBotDefinition(await req.json());
    if (!validation.success) return NextResponse.json({ error: validation.error }, { status: 400 });
    const db = await getDatabase();
    if (!await hasOnlyActiveKnowledgeBases(db, validation.data.interactions)) {
      return NextResponse.json({ error: "RAG hanya dapat menggunakan Knowledge Base yang aktif." }, { status: 400 });
    }
    const result = await db.collection("bots").updateOne(
      { _id: new ObjectId(id) },
      { $set: { ...validation.data, updatedBy: { id: session.id, name: session.name }, updatedAt: new Date() } }
    );
    if (!result.matchedCount) return NextResponse.json({ error: "Bot tidak ditemukan." }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("PUT bot error:", error);
    return NextResponse.json({ error: "Gagal memperbarui bot." }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canManage(session.role)) return NextResponse.json({ error: "Akses ditolak" }, { status: 403 });
  const { id } = await params;
  if (!ObjectId.isValid(id)) return NextResponse.json({ error: "Invalid ID" }, { status: 400 });

  try {
    const db = await getDatabase();
    const body = await req.json().catch(() => ({}));
    const isActive = typeof body.isActive === "boolean" ? body.isActive : true;
    if (!isActive && await db.collection("skills").findOne({ botId: id }, { projection: { _id: 1 } })) {
      return NextResponse.json({ error: "Bot masih dipakai skill. Pindahkan atau hapus skill terlebih dahulu." }, { status: 409 });
    }
    const now = new Date();
    const result = await db.collection("bots").updateOne(
      { _id: new ObjectId(id) },
      { $set: { isActive, updatedAt: now } }
    );
    if (!result.matchedCount) return NextResponse.json({ error: "Bot tidak ditemukan." }, { status: 404 });

    const activeSetting = await db.collection("botSettings").findOne({ key: "active" });
    if (isActive && !activeSetting) {
      await db.collection("botSettings").updateOne(
        { key: "active" },
        { $set: { botId: id, updatedAt: now } },
        { upsert: true }
      );
    } else if (!isActive && activeSetting?.botId === id) {
      const fallback = await db.collection("bots").findOne(
        { _id: { $ne: new ObjectId(id) }, isActive: true },
        { sort: { updatedAt: -1 }, projection: { _id: 1 } }
      );
      if (fallback) {
        await db.collection("botSettings").updateOne(
          { key: "active" },
          { $set: { botId: fallback._id.toString(), updatedAt: now } }
        );
      } else {
        await db.collection("botSettings").deleteOne({ key: "active" });
      }
    }
    return NextResponse.json({ success: true, isActive });
  } catch (error) {
    console.error("PATCH active bot error:", error);
    return NextResponse.json({ error: "Gagal mengaktifkan bot." }, { status: 500 });
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
  if (!ObjectId.isValid(id)) return NextResponse.json({ error: "Invalid ID" }, { status: 400 });

  try {
    const db = await getDatabase();
    if (await db.collection("skills").findOne({ botId: id }, { projection: { _id: 1 } })) {
      return NextResponse.json({ error: "Bot masih terhubung ke skill. Hapus atau ubah skill terlebih dahulu." }, { status: 409 });
    }
    const activeSetting = await db.collection("botSettings").findOne({ key: "active" });
    let activeBotId = activeSetting?.botId || null;
    if (activeSetting?.botId === id) {
      const fallback = await db.collection("bots").findOne(
        { _id: { $ne: new ObjectId(id) }, isActive: true },
        { sort: { updatedAt: -1 }, projection: { _id: 1 } }
      );
      activeBotId = fallback?._id.toString() || null;
      if (fallback) {
        await db.collection("botSettings").updateOne(
          { key: "active" },
          { $set: { botId: fallback._id.toString(), updatedAt: new Date() } }
        );
      } else {
        await db.collection("botSettings").deleteOne({ key: "active" });
      }
    }
    const result = await db.collection("bots").deleteOne({ _id: new ObjectId(id) });
    if (!result.deletedCount) return NextResponse.json({ error: "Bot tidak ditemukan." }, { status: 404 });
    return NextResponse.json({ success: true, activeBotId });
  } catch (error) {
    console.error("DELETE bot error:", error);
    return NextResponse.json({ error: "Gagal menghapus bot." }, { status: 500 });
  }
}
