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
        // LM Studio
        baseUrl: config.lmStudioUrl,
        model: config.lmStudioModel,
        // OpenRouter
        openRouterApiKey: config.openRouterApiKey,
        openRouterModel: config.openRouterModel,
        // Common
        temperature: config.temperature,
        maxTokens: config.maxTokens,
      },
    });
  } catch (err) {
    return NextResponse.json({ error: "Failed to fetch config" }, { status: 500 });
  }
}

// PUT /api/genai-route/config
export async function PUT(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.role !== "admin") return NextResponse.json({ error: "Admin only" }, { status: 403 });

  try {
    const {
      provider,
      baseUrl,
      model,
      openRouterApiKey,
      openRouterModel,
      temperature,
      maxTokens,
    } = await req.json();

    const db = await getDatabase();

    const updatePayload = {
      provider: provider === "openrouter" ? "openrouter" : "lmstudio",
      // LM Studio fields
      baseUrl: baseUrl || "http://localhost:1234/v1",
      model: model || "local-model",
      // OpenRouter fields
      openRouterApiKey: openRouterApiKey || "",
      openRouterModel: openRouterModel || "meta-llama/llama-3.3-70b-instruct:free",
      // Common
      temperature: typeof temperature === "number" ? temperature : 0.7,
      maxTokens: typeof maxTokens === "number" ? maxTokens : 1024,
      updatedAt: new Date(),
    };

    // Update both keys for backward compatibility
    await Promise.all([
      db.collection("genaiConfig").updateOne(
        { key: "active_config" },
        { $set: updatePayload },
        { upsert: true }
      ),
      db.collection("genaiConfig").updateOne(
        { key: "lmstudio" },
        { $set: updatePayload },
        { upsert: true }
      ),
    ]);

    return NextResponse.json({ success: true, config: updatePayload });
  } catch (err) {
    return NextResponse.json({ error: "Failed to update config" }, { status: 500 });
  }
}
