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

async function hasValidEscalationSkills(
  db: Awaited<ReturnType<typeof getDatabase>>,
  interactions: Array<{ type: string; config: { escalationSkillId?: string } }>
): Promise<boolean> {
  const skillIds = [...new Set(interactions
    .filter((item) => item.type === "skill_escalation")
    .map((item) => item.config.escalationSkillId || ""))];
  if (skillIds.length === 0) return true;
  if (skillIds.some((skillId) => !ObjectId.isValid(skillId))) return false;

  const skills = await db.collection("skills")
    .find({ _id: { $in: skillIds.map((skillId) => new ObjectId(skillId)) } }, { projection: { botUserId: 1, botId: 1 } })
    .toArray();
  if (skills.length !== skillIds.length) return false;
  const userIds = [...new Set(skills.map((skill) => skill.botUserId).filter((id): id is string => typeof id === "string" && ObjectId.isValid(id)))];
  if (skills.some((skill) => typeof skill.botUserId !== "string" || !ObjectId.isValid(skill.botUserId))) return false;
  const users = await db.collection("users")
    .find({ _id: { $in: userIds.map((userId) => new ObjectId(userId)) } }, { projection: { userType: 1 } })
    .toArray();
  if (users.length !== userIds.length) return false;
  const userById = new Map(users.map((user) => [user._id.toString(), user]));
  const botIds: string[] = [];
  for (const skill of skills) {
    const user = userById.get(String(skill.botUserId));
    if (user?.userType !== "bot") continue;
    if (typeof skill.botId !== "string" || !ObjectId.isValid(skill.botId)) return false;
    botIds.push(skill.botId);
  }
  if (botIds.length === 0) return true;
  const [bots, activeSetting] = await Promise.all([
    db.collection("bots").find({ _id: { $in: botIds.map((botId) => new ObjectId(botId)) } }, { projection: { isActive: 1 } }).toArray(),
    db.collection("botSettings").findOne({ key: "active" }, { projection: { botId: 1 } }),
  ]);
  const botById = new Map(bots.map((bot) => [bot._id.toString(), bot]));
  return botIds.every((botId) => {
    const bot = botById.get(botId);
    return Boolean(bot && (typeof bot.isActive === "boolean" ? bot.isActive : activeSetting?.botId === botId));
  });
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
    if (!await hasValidEscalationSkills(db, validation.data.interactions)) {
      return NextResponse.json({ error: "Skill Escalation harus memilih skill human yang valid atau skill bot dengan bot flow aktif." }, { status: 400 });
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
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json({ error: "Data perubahan bot tidak valid." }, { status: 400 });
    }

    if (Object.keys(body).length === 1 && typeof body.name === "string") {
      const name = body.name.trim();
      if (!name || name.length > 100) {
        return NextResponse.json({ error: "Nama bot wajib diisi (maksimal 100 karakter)." }, { status: 400 });
      }
      const duplicate = await db.collection("bots").findOne(
        { name, _id: { $ne: new ObjectId(id) } },
        { projection: { _id: 1 } }
      );
      if (duplicate) return NextResponse.json({ error: "Nama bot sudah digunakan." }, { status: 409 });

      const result = await db.collection("bots").updateOne(
        { _id: new ObjectId(id) },
        { $set: { name, updatedBy: { id: session.id, name: session.name }, updatedAt: new Date() } }
      );
      if (!result.matchedCount) return NextResponse.json({ error: "Bot tidak ditemukan." }, { status: 404 });
      return NextResponse.json({ success: true, name });
    }

    if (Object.keys(body).length !== 1 || typeof body.isActive !== "boolean") {
      return NextResponse.json({ error: "Perubahan bot hanya boleh berupa nama atau status." }, { status: 400 });
    }
    const isActive = body.isActive;
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
