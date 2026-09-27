import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/mongodb";
import { getSessionFromRequest } from "@/lib/auth";

// POST /api/genai-route/test — test LM Studio connectivity
export async function POST(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { baseUrl, model } = await req.json();
    const url = baseUrl || process.env.LM_STUDIO_URL || "http://localhost:1234/v1";

    // Test connectivity to LM Studio
    const testRes = await fetch(`${url}/models`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      signal: AbortSignal.timeout(5000),
    });

    if (!testRes.ok) {
      return NextResponse.json({
        success: false,
        error: "LM Studio tidak merespons. Pastikan LM Studio sudah berjalan di " + url,
      });
    }

    const data = await testRes.json();
    const models = data.data?.map((m: { id: string }) => m.id) || [];

    return NextResponse.json({
      success: true,
      message: "LM Studio terhubung!",
      models,
      url,
    });
  } catch (err) {
    return NextResponse.json({
      success: false,
      error: "Tidak dapat terhubung ke LM Studio. Pastikan LM Studio sudah berjalan dan model sudah di-load.",
    });
  }
}
