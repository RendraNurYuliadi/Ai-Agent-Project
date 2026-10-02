import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getDatabase } from "@/lib/mongodb";
import { getSessionFromRequest } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const db = await getDatabase();
    const setting = await db.collection("botSettings").findOne({ key: "active" });
    const bot = setting?.botId && ObjectId.isValid(setting.botId)
      ? await db.collection("bots").findOne({ _id: new ObjectId(setting.botId) })
      : null;
    if (!bot) return NextResponse.json({ bot: null });
    const { _id, ...data } = bot;
    return NextResponse.json({ bot: { id: _id.toString(), ...data } });
  } catch (error) {
    console.error("GET active bot error:", error);
    return NextResponse.json({ error: "Gagal memuat bot aktif." }, { status: 500 });
  }
}
