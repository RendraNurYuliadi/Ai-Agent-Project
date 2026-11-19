import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/mongodb";
import { getSessionFromRequest } from "@/lib/auth";
import { getAIConfig } from "@/lib/ai";

// GET /api/genai-route/config
export async function GET(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const db = await getDatabase();
    const config = await getAIConfig(db);

    return NextResponse.json({
      config: {
        provider: config.provider,
        model: config.providerModel || "",
        temperature: config.temperature,
        maxTokens: config.maxTokens,
      },
    });
  } catch {
    return NextResponse.json({ error: "Failed to fetch config" }, { status: 500 });
  }
}

// PUT /api/genai-route/config
export async function PUT(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.role !== "admin") return NextResponse.json({ error: "Admin only" }, { status: 403 });

  try {
    const { temperature, maxTokens } = await req.json();

    const db = await getDatabase();
    const updatePayload = {
      provider: "nvidia",
      temperature: typeof temperature === "number" ? temperature : 0.7,
      maxTokens: typeof maxTokens === "number" ? maxTokens : 1024,
      updatedAt: new Date(),
    };

    await db.collection("genaiConfig").updateOne(
      { key: "active_config" },
      { $set: updatePayload, $unset: { openRouterApiKey: "", baseUrl: "", model: "", openRouterModel: "" } },
      { upsert: true }
    );

    return NextResponse.json({ success: true, config: updatePayload });
  } catch {
    return NextResponse.json({ error: "Failed to update config" }, { status: 500 });
  }
}
