import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth";
import { getDatabase } from "@/lib/mongodb";
import {
  isChatScrollAnimationStyle,
  type ChatScrollAnimationStyle,
} from "@/lib/chat-ui-preferences";

const CHAT_PREFERENCES_KEY = "chatUiPreferences";

interface ChatUiPreferences {
  animationEnabled: boolean;
  animationStyle: ChatScrollAnimationStyle;
}

function normalizePreferences(value: unknown): ChatUiPreferences {
  const candidate = value && typeof value === "object"
    ? value as Record<string, unknown>
    : {};
  return {
    animationEnabled: candidate.animationEnabled === true,
    animationStyle: isChatScrollAnimationStyle(candidate.animationStyle)
      ? candidate.animationStyle
      : "fade",
  };
}

export async function GET(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const db = await getDatabase();
    const setting = await db.collection("botSettings").findOne(
      { key: CHAT_PREFERENCES_KEY, userId: session.id },
      { projection: { preferences: 1 } }
    );
    return NextResponse.json({ preferences: normalizePreferences(setting?.preferences) });
  } catch (error) {
    console.error("GET chat UI preferences error:", error);
    return NextResponse.json({ error: "Gagal memuat pengaturan animasi." }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const updates: Partial<ChatUiPreferences> = {};
    if (body?.animationEnabled !== undefined) {
      if (typeof body.animationEnabled !== "boolean") {
        return NextResponse.json({ error: "Status animasi tidak valid." }, { status: 400 });
      }
      updates.animationEnabled = body.animationEnabled;
    }
    if (body?.animationStyle !== undefined) {
      if (!isChatScrollAnimationStyle(body.animationStyle)) {
        return NextResponse.json({ error: "Pilihan animasi tidak valid." }, { status: 400 });
      }
      updates.animationStyle = body.animationStyle;
    }
    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "Tidak ada pengaturan untuk disimpan." }, { status: 400 });
    }

    const db = await getDatabase();
    await db.collection("botSettings").updateOne(
      { key: CHAT_PREFERENCES_KEY, userId: session.id },
      {
        $set: {
          ...(updates.animationEnabled !== undefined
            ? { "preferences.animationEnabled": updates.animationEnabled }
            : {}),
          ...(updates.animationStyle !== undefined
            ? { "preferences.animationStyle": updates.animationStyle }
            : {}),
          key: CHAT_PREFERENCES_KEY,
          userId: session.id,
          updatedAt: new Date(),
        },
      },
      { upsert: true }
    );
    const setting = await db.collection("botSettings").findOne(
      { key: CHAT_PREFERENCES_KEY, userId: session.id },
      { projection: { preferences: 1 } }
    );
    return NextResponse.json({ preferences: normalizePreferences(setting?.preferences) });
  } catch (error) {
    console.error("PUT chat UI preferences error:", error);
    return NextResponse.json({ error: "Gagal menyimpan pengaturan animasi." }, { status: 500 });
  }
}
