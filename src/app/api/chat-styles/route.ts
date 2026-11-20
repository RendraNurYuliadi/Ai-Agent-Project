import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/mongodb";
import { getSessionFromRequest } from "@/lib/auth";
import {
  GLOBAL_CHAT_STYLE_COMPONENT_IDS,
  normalizeGlobalChatStyles,
} from "@/lib/engagement-theme";

const GLOBAL_CHAT_STYLES_KEY = "globalChatStyles";

export async function GET(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const db = await getDatabase();
    const setting = await db.collection("botSettings").findOne(
      { key: GLOBAL_CHAT_STYLES_KEY },
      { projection: { componentStyles: 1 } }
    );
    return NextResponse.json({
      componentStyles: normalizeGlobalChatStyles(setting?.componentStyles),
    });
  } catch (error) {
    console.error("GET global chat styles error:", error);
    return NextResponse.json({ error: "Gagal memuat style global." }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.role !== "admin" && session.role !== "manager") {
    return NextResponse.json({ error: "Akses ditolak" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const incoming = body?.componentStyles;
    if (!incoming || typeof incoming !== "object" || Array.isArray(incoming)) {
      return NextResponse.json({ error: "Style global tidak valid." }, { status: 400 });
    }

    for (const id of GLOBAL_CHAT_STYLE_COMPONENT_IDS) {
      if (incoming[id] !== undefined && (typeof incoming[id] !== "string" || incoming[id].length > 10000)) {
        return NextResponse.json({ error: `CSS ${id} tidak valid.` }, { status: 400 });
      }
    }

    const db = await getDatabase();
    const current = await db.collection("botSettings").findOne(
      { key: GLOBAL_CHAT_STYLES_KEY },
      { projection: { componentStyles: 1 } }
    );
    const componentStyles = normalizeGlobalChatStyles(current?.componentStyles);
    let updated = false;
    for (const id of GLOBAL_CHAT_STYLE_COMPONENT_IDS) {
      if (typeof incoming[id] !== "string") continue;
      componentStyles[id] = incoming[id];
      updated = true;
    }
    if (!updated) return NextResponse.json({ error: "Tidak ada style untuk disimpan." }, { status: 400 });

    await db.collection("botSettings").updateOne(
      { key: GLOBAL_CHAT_STYLES_KEY },
      { $set: { componentStyles, updatedAt: new Date(), updatedBy: { id: session.id, name: session.name } } },
      { upsert: true }
    );

    return NextResponse.json({ success: true, componentStyles });
  } catch (error) {
    console.error("PUT global chat styles error:", error);
    return NextResponse.json({ error: "Gagal menyimpan style global." }, { status: 500 });
  }
}
