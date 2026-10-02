import { NextRequest, NextResponse } from "next/server";
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

export async function GET(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canManage(session.role)) return NextResponse.json({ error: "Akses ditolak" }, { status: 403 });

  try {
    const db = await getDatabase();
    const [bots, activeSetting, skills] = await Promise.all([
      db.collection("bots").find({}).sort({ updatedAt: -1 }).toArray(),
      db.collection("botSettings").findOne({ key: "active" }),
      db.collection("skills").find({}, { projection: { botId: 1 } }).toArray(),
    ]);
    const activeId = activeSetting?.botId || "";
    const skillCounts = new Map<string, number>();
    for (const skill of skills) {
      if (typeof skill.botId === "string") skillCounts.set(skill.botId, (skillCounts.get(skill.botId) || 0) + 1);
    }
    return NextResponse.json({
      activeBotId: activeId,
      bots: bots.map(({ _id, ...bot }) => {
        const id = _id.toString();
        return {
          id,
          ...bot,
          isActive: typeof bot.isActive === "boolean" ? bot.isActive : id === activeId,
          skillCount: skillCounts.get(id) || 0,
        };
      }),
    });
  } catch (error) {
    console.error("GET bots error:", error);
    return NextResponse.json({ error: "Gagal memuat bot." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canManage(session.role)) return NextResponse.json({ error: "Akses ditolak" }, { status: 403 });

  try {
    const validation = validateBotDefinition(await req.json());
    if (!validation.success) return NextResponse.json({ error: validation.error }, { status: 400 });
    const db = await getDatabase();
    if (!await hasOnlyActiveKnowledgeBases(db, validation.data.interactions)) {
      return NextResponse.json({ error: "RAG hanya dapat menggunakan Knowledge Base yang aktif." }, { status: 400 });
    }

    const now = new Date();
    const result = await db.collection("bots").insertOne({
      ...validation.data,
      isActive: true,
      createdBy: { id: session.id, name: session.name },
      createdAt: now,
      updatedAt: now,
    });
    const activeSetting = await db.collection("botSettings").findOne({ key: "active" });
    if (!activeSetting) {
      await db.collection("botSettings").updateOne(
        { key: "active" },
        { $set: { botId: result.insertedId.toString(), updatedAt: now } },
        { upsert: true }
      );
    }
    return NextResponse.json({ success: true, id: result.insertedId.toString() }, { status: 201 });
  } catch (error) {
    console.error("POST bot error:", error);
    return NextResponse.json({ error: "Gagal menyimpan bot." }, { status: 500 });
  }
}
