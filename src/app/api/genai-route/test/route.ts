import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/mongodb";
import { getSessionFromRequest } from "@/lib/auth";
import {
  getAIConfig,
  getOpenRouterFreeModels,
  testLMStudioConnection,
  testOpenRouterConnection,
  OPENROUTER_FREE_MODEL,
} from "@/lib/ai";

// POST /api/genai-route/test — test AI connectivity (LM Studio or OpenRouter)
export async function POST(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { provider = "lmstudio", baseUrl, model, apiKey, listModelsOnly } = await req.json();

    if (provider === "openrouter") {
      const db = await getDatabase();
      const storedConfig = await getAIConfig(db);
      const key = apiKey?.trim() || storedConfig.openRouterApiKey || process.env.OPENROUTER_API_KEY || "";
      if (listModelsOnly) {
        const models = await getOpenRouterFreeModels(key);
        return NextResponse.json({
          success: true,
          message: "Daftar model OpenRouter berhasil dimuat.",
          models,
        });
      }
      const targetModel = model || OPENROUTER_FREE_MODEL;
      const result = await testOpenRouterConnection(key, targetModel);
      return NextResponse.json(result);
    } else {
      const url = baseUrl || process.env.LM_STUDIO_URL || "http://localhost:1234/v1";
      const result = await testLMStudioConnection(url);
      return NextResponse.json(result);
    }
  } catch (err: any) {
    return NextResponse.json({
      success: false,
      error: err?.message || "Gagal menguji koneksi AI provider.",
    });
  }
}
