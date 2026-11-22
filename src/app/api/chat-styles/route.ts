import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/mongodb";
import { getSessionFromRequest } from "@/lib/auth";
import {
  ENGAGEMENT_GLOBAL_STYLE_COMPONENT_IDS,
  GLOBAL_CHAT_STYLE_COMPONENT_IDS,
  mergeGlobalChatStylesWithEngagement,
} from "@/lib/engagement-theme";

const GLOBAL_CHAT_STYLES_KEY = "globalChatStyles";

export async function GET(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const db = await getDatabase();
    const [sharedSetting, latestUserSetting, mostRecentEngagement] = await Promise.all([
      db.collection("botSettings").findOne(
        { key: GLOBAL_CHAT_STYLES_KEY, userId: { $exists: false } },
        { projection: { componentStyles: 1 } }
      ),
      db.collection("botSettings").findOne(
        { key: GLOBAL_CHAT_STYLES_KEY, userId: { $exists: true } },
        { sort: { updatedAt: -1 }, projection: { componentStyles: 1 } }
      ),
      db.collection("engagements").findOne(
        { windows: { $exists: true, $ne: [] } },
        { sort: { updatedAt: -1 }, projection: { windows: 1 } }
      ),
    ]);
    const previewWindow = Array.isArray(mostRecentEngagement?.windows)
      ? mostRecentEngagement.windows[0]
      : undefined;
    return NextResponse.json({
      componentStyles: mergeGlobalChatStylesWithEngagement(
        (sharedSetting || latestUserSetting)?.componentStyles,
        previewWindow
      ),
      previewWindow: previewWindow && typeof previewWindow === "object"
        ? {
            title: typeof previewWindow.title === "string" ? previewWindow.title : "",
            subtitle: typeof previewWindow.subtitle === "string" ? previewWindow.subtitle : "",
            headerIconUrl: typeof previewWindow.headerIconUrl === "string" ? previewWindow.headerIconUrl : "",
          }
        : null,
    });
  } catch (error) {
    console.error("GET global chat styles error:", error);
    return NextResponse.json({ error: "Gagal memuat style global." }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const incoming = body?.componentStyles;
    if (!incoming || typeof incoming !== "object" || Array.isArray(incoming)) {
      return NextResponse.json({ error: "Style global tidak valid." }, { status: 400 });
    }
    if (body.applyToAllEngagements !== undefined && typeof body.applyToAllEngagements !== "boolean") {
      return NextResponse.json({ error: "Pilihan penerapan style tidak valid." }, { status: 400 });
    }

    for (const id of GLOBAL_CHAT_STYLE_COMPONENT_IDS) {
      if (incoming[id] !== undefined && (typeof incoming[id] !== "string" || incoming[id].length > 10000)) {
        return NextResponse.json({ error: `CSS ${id} tidak valid.` }, { status: 400 });
      }
    }

    const db = await getDatabase();
    const [sharedSetting, latestUserSetting, mostRecentEngagement] = await Promise.all([
      db.collection("botSettings").findOne(
        { key: GLOBAL_CHAT_STYLES_KEY, userId: { $exists: false } },
        { projection: { componentStyles: 1 } }
      ),
      db.collection("botSettings").findOne(
        { key: GLOBAL_CHAT_STYLES_KEY, userId: { $exists: true } },
        { sort: { updatedAt: -1 }, projection: { componentStyles: 1 } }
      ),
      db.collection("engagements").findOne(
        { windows: { $exists: true, $ne: [] } },
        { sort: { updatedAt: -1 }, projection: { windows: 1 } }
      ),
    ]);
    const current = sharedSetting || latestUserSetting;
    const componentStyles = mergeGlobalChatStylesWithEngagement(
      current?.componentStyles,
      Array.isArray(mostRecentEngagement?.windows) ? mostRecentEngagement.windows[0] : undefined
    );
    let updated = false;
    for (const id of GLOBAL_CHAT_STYLE_COMPONENT_IDS) {
      if (typeof incoming[id] !== "string") continue;
      componentStyles[id] = incoming[id];
      updated = true;
    }
    if (!updated) return NextResponse.json({ error: "Tidak ada style untuk disimpan." }, { status: 400 });

    await db.collection("botSettings").updateOne(
      { key: GLOBAL_CHAT_STYLES_KEY, userId: { $exists: false } },
      { $set: { componentStyles, updatedAt: new Date(), updatedBy: { id: session.id, name: session.name } } },
      { upsert: true }
    );

    let updatedEngagements = 0;
    if (body.applyToAllEngagements === true) {
      const engagementStyles = Object.fromEntries(
        ENGAGEMENT_GLOBAL_STYLE_COMPONENT_IDS.map((id) => [id, componentStyles[id]])
      );
      const applyResult = await db.collection("engagements").updateMany(
        { windows: { $type: "array", $ne: [] } },
        [{
          $set: {
            windows: {
              $map: {
                input: "$windows",
                as: "window",
                in: {
                  $mergeObjects: [
                    "$$window",
                    {
                      componentStyles: {
                        $mergeObjects: [
                          { $ifNull: ["$$window.componentStyles", {}] },
                          { $literal: engagementStyles },
                        ],
                      },
                      componentStylesMode: "specific",
                    },
                  ],
                },
              },
            },
            updatedAt: new Date(),
          },
        }]
      );
      updatedEngagements = applyResult.matchedCount;
    }

    return NextResponse.json({ success: true, componentStyles, updatedEngagements });
  } catch (error) {
    console.error("PUT global chat styles error:", error);
    return NextResponse.json({ error: "Gagal menyimpan style global." }, { status: 500 });
  }
}
