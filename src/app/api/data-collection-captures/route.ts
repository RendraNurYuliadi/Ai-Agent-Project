import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
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
    const botId = req.nextUrl.searchParams.get("botId");
    const captureCollection = db.collection("dataCollectionCaptures");

    if (!botId) {
      const [bots, groupedCounts] = await Promise.all([
        db.collection("bots")
          .find({ "interactions.type": "data_collection_submitted" }, { projection: { name: 1 } })
          .sort({ name: 1 })
          .toArray(),
        captureCollection.aggregate([{ $group: { _id: "$botId", count: { $sum: 1 } } }]).toArray(),
      ]);
      const counts = new Map(groupedCounts.map((item) => [String(item._id), Number(item.count) || 0]));
      return NextResponse.json({
        bots: bots.map((bot) => ({ id: bot._id.toString(), name: bot.name || "Bot", captureCount: counts.get(bot._id.toString()) || 0 })),
      });
    }

    if (!ObjectId.isValid(botId)) return NextResponse.json({ error: "ID bot tidak valid." }, { status: 400 });
    const bot = await db.collection("bots").findOne({ _id: new ObjectId(botId) });
    if (!bot) return NextResponse.json({ error: "Bot tidak ditemukan." }, { status: 404 });

    const page = Math.max(1, Number.parseInt(req.nextUrl.searchParams.get("page") || "1", 10) || 1);
    const pageSize = 100;
    const filter = { botId };
    const [records, totalCount] = await Promise.all([
      captureCollection.find(filter).sort({ submittedAt: -1 }).skip((page - 1) * pageSize).limit(pageSize).toArray(),
      captureCollection.countDocuments(filter),
    ]);
    const configuredFields = (Array.isArray(bot.interactions) ? bot.interactions : [])
      .filter((interaction) => interaction.type === "data_collection_submitted")
      .flatMap((interaction) => Array.isArray(interaction.config?.dataCollectionSubmittedFields) ? interaction.config.dataCollectionSubmittedFields : [])
      .map((field) => typeof field.name === "string" ? field.name : "")
      .filter(Boolean);
    const fieldNames = [...new Set([
      ...configuredFields,
      ...records.flatMap((record) => Array.isArray(record.values) ? record.values.map((value: { name?: unknown }) => typeof value.name === "string" ? value.name : "") : []),
    ].filter(Boolean))];

    return NextResponse.json({
      bot: { id: bot._id.toString(), name: bot.name || "Bot" },
      fieldNames,
      captures: records.map((record) => ({
        id: record._id.toString(),
        values: Array.isArray(record.values) ? record.values : [],
        userId: record.userId || "",
        conversationId: record.conversationId || "",
        submittedAt: record.submittedAt instanceof Date ? record.submittedAt.toISOString() : record.submittedAt || null,
      })),
      totalCount,
      page,
      pageSize,
    });
  } catch (error) {
    console.error("GET data collection captures error:", error);
    return NextResponse.json({ error: "Gagal memuat data capture." }, { status: 500 });
  }
}