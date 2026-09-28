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

    // Mask the Gemini API Key slightly for security if needed, or return as is for admin editing
    return NextResponse.json({
      config: {
        provider: config.provider,
        baseUrl: config.lmStudioUrl,
        model: config.lmStudioModel,
        geminiApiKey: config.geminiApiKey,
        geminiModel: config.geminiModel,
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
    const { provider, baseUrl, model, geminiApiKey, geminiModel, temperature, maxTokens } = await req.json();
    const db = await getDatabase();

    const updatePayload = {
      provider: provider === "gemini" ? "gemini" : "lmstudio",
      baseUrl: baseUrl || "http://localhost:1234/v1",
      model: model || "local-model",
      geminiApiKey: geminiApiKey || "",
      geminiModel: geminiModel || "gemini-1.5-flash",
      temperature: typeof temperature === "number" ? temperature : 0.7,
      maxTokens: typeof maxTokens === "number" ? maxTokens : 1024,
      updatedAt: new Date(),
    };

    // Update both "active_config" and "lmstudio" keys for backward compatibility
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
