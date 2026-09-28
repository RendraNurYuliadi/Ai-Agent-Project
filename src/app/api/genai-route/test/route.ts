import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth";
import { testLMStudioConnection, testGeminiConnection } from "@/lib/ai";

// POST /api/genai-route/test — test AI connectivity (LM Studio or Google AI Studio)
export async function POST(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { provider = "lmstudio", baseUrl, model, apiKey } = await req.json();

    if (provider === "gemini") {
      const result = await testGeminiConnection(apiKey || process.env.GEMINI_API_KEY || "", model);
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
