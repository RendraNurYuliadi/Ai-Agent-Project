import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth";
import {
  getOpenRouterModels,
  testLMStudioConnection,
  testOpenRouterConnection,
  OPENROUTER_FREE_MODEL,
} from "@/lib/ai";

// POST /api/genai-route/test — test AI connectivity (LM Studio or OpenRouter)
export async function POST(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { provider = "lmstudio", baseUrl, model, listModelsOnly } = await req.json();

    if (provider === "openrouter") {
      const key = process.env.OPENROUTER_API_KEY || "";
      if (listModelsOnly) {
        const models = await getOpenRouterModels(key);
        return NextResponse.json({
          success: true,
          message: "Koneksi OpenRouter berhasil diuji dan model tersedia.",
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
  } catch (err: unknown) {
    return NextResponse.json({
      success: false,
      error: err instanceof Error ? err.message : "Gagal menguji koneksi AI provider.",
    });
  }
}
