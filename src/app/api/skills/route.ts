import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getDatabase } from "@/lib/mongodb";
import { getSessionFromRequest } from "@/lib/auth";

function canManage(role: string): boolean {
  return role === "admin" || role === "manager";
}

async function resolveSkillRelations(db: Awaited<ReturnType<typeof getDatabase>>, botUserId: string, botId: string, legacyActiveBotId: string) {
  if (!ObjectId.isValid(botUserId) || !ObjectId.isValid(botId)) return null;
  const [botUser, bot] = await Promise.all([
    db.collection("users").findOne({ _id: new ObjectId(botUserId) }, { projection: { password: 0 } }),
    db.collection("bots").findOne({ _id: new ObjectId(botId) }),
  ]);
  if (!botUser || botUser.userType !== "bot" || !bot) return null;
  const isActive = typeof bot.isActive === "boolean" ? bot.isActive : bot._id.toString() === legacyActiveBotId;
  return { botUser, bot, isActive };
}

async function resolveOptionalSkillUser(db: Awaited<ReturnType<typeof getDatabase>>, botUserId: string) {
  if (!ObjectId.isValid(botUserId)) return null;
  return db.collection("users").findOne({ _id: new ObjectId(botUserId) }, { projection: { password: 0 } });
}

export async function GET(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const db = await getDatabase();
    const skills = await db.collection("skills").find({}).sort({ name: 1 }).toArray();
    const userIds = [...new Set(skills.map((skill) => skill.botUserId).filter((id) => ObjectId.isValid(id)))].map((id) => new ObjectId(id));
    const botIds = [...new Set(skills.map((skill) => skill.botId).filter((id) => ObjectId.isValid(id)))].map((id) => new ObjectId(id));
    const [users, bots, activeSetting] = await Promise.all([
      userIds.length ? db.collection("users").find({ _id: { $in: userIds } }, { projection: { password: 0 } }).toArray() : [],
      botIds.length ? db.collection("bots").find({ _id: { $in: botIds } }).toArray() : [],
      db.collection("botSettings").findOne({ key: "active" }),
    ]);
    const legacyActiveBotId = activeSetting?.botId || "";
    const userById = new Map(users.map((user) => [user._id.toString(), user]));
    const botById = new Map(bots.map((bot) => [bot._id.toString(), bot]));

    return NextResponse.json({
      skills: skills.map((skill) => {
        const botUser = skill.botUserId ? userById.get(skill.botUserId) : null;
        const bot = skill.botId && botById.get(skill.botId) ? botById.get(skill.botId) : null;
        const botActive = bot && (typeof bot.isActive === "boolean" ? bot.isActive : bot._id.toString() === legacyActiveBotId);
        const isBotLinked = Boolean(skill.botUserId && skill.botId);
        return {
          id: skill._id.toString(),
          name: skill.name,
          description: skill.description || "",
          botUserId: skill.botUserId || "",
          botId: skill.botId || "",
          botUser: botUser ? {
            id: botUser._id.toString(),
            name: botUser.name || "User",
            fullName: botUser.fullName || botUser.name || "User",
            email: botUser.email || "",
            userType: botUser.userType === "bot" ? "bot" : "human",
          } : null,
          bot: bot ? {
            id: bot._id.toString(),
            name: bot.name,
            description: bot.description || "",
            isActive: Boolean(botActive),
            entryInteractionId: bot.entryInteractionId,
            interactions: bot.interactions || [],
          } : null,
          isAvailable: !isBotLinked ? true : botUser?.userType === "bot" && Boolean(botActive),
          createdAt: skill.createdAt || null,
          updatedAt: skill.updatedAt || null,
        };
      }),
    });
  } catch (error) {
    console.error("GET skills error:", error);
    return NextResponse.json({ error: "Gagal memuat skills." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canManage(session.role)) return NextResponse.json({ error: "Akses ditolak" }, { status: 403 });

  try {
    const { name, description, botUserId, botId } = await req.json();
    const cleanName = typeof name === "string" ? name.trim() : "";
    const normalizedBotUserId = typeof botUserId === "string" ? botUserId.trim() : "";
    const normalizedBotId = typeof botId === "string" ? botId.trim() : "";
    if (!cleanName || cleanName.length > 100) {
      return NextResponse.json({ error: "Nama skill wajib diisi (maksimal 100 karakter)." }, { status: 400 });
    }
    if (typeof description === "string" && description.length > 500) {
      return NextResponse.json({ error: "Deskripsi maksimal 500 karakter." }, { status: 400 });
    }
    if (!normalizedBotUserId) {
      return NextResponse.json({ error: "Pilih user yang valid untuk skill." }, { status: 400 });
    }
    const db = await getDatabase();
    const user = await resolveOptionalSkillUser(db, normalizedBotUserId);
    if (!user) return NextResponse.json({ error: "User yang dipilih tidak valid." }, { status: 400 });

    const activeSetting = await db.collection("botSettings").findOne({ key: "active" });
    const botLinked = Boolean(normalizedBotUserId && normalizedBotId);
    if (botLinked) {
      const relations = await resolveSkillRelations(db, normalizedBotUserId, normalizedBotId, activeSetting?.botId || "");
      if (!relations) return NextResponse.json({ error: "Pilih user bertipe bot dan bot flow yang valid." }, { status: 400 });
      if (!relations.isActive) return NextResponse.json({ error: "Skill hanya dapat dihubungkan ke bot yang aktif." }, { status: 409 });
    } else if (normalizedBotId) {
      return NextResponse.json({ error: "Jika ingin menghubungkan ke bot, user harus bertipe bot dan bot flow harus dipilih." }, { status: 400 });
    }
    if (await db.collection("skills").findOne({ name: cleanName })) {
      return NextResponse.json({ error: "Nama skill sudah digunakan." }, { status: 409 });
    }

    const now = new Date();
    const result = await db.collection("skills").insertOne({
      name: cleanName,
      description: typeof description === "string" ? description.trim() : "",
      botUserId: normalizedBotUserId,
      botId: normalizedBotId,
      createdBy: { id: session.id, name: session.name },
      createdAt: now,
      updatedAt: now,
    });
    return NextResponse.json({ success: true, id: result.insertedId.toString() }, { status: 201 });
  } catch (error) {
    console.error("POST skill error:", error);
    return NextResponse.json({ error: "Gagal membuat skill." }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canManage(session.role)) return NextResponse.json({ error: "Akses ditolak" }, { status: 403 });

  try {
    const db = await getDatabase();
    const result = await db.collection("skills").deleteMany({});
    return NextResponse.json({ success: true, deletedCount: result.deletedCount });
  } catch (error) {
    console.error("DELETE all skills error:", error);
    return NextResponse.json({ error: "Gagal menghapus semua skill." }, { status: 500 });
  }
}