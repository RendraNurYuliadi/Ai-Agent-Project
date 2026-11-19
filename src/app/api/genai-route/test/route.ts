import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth";

// POST /api/genai-route/test — legacy route; NVIDIA NIM is managed by /api/providers
export async function POST(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { listModelsOnly } = await req.json();
    if (!listModelsOnly) {
      return NextResponse.json({ success: false, error: "Gunakan menu Providers untuk menguji NVIDIA NIM." }, { status: 400 });
    }
    return NextResponse.json({ success: false, error: "Gunakan menu Providers untuk memuat model NVIDIA NIM." }, { status: 400 });
  } catch (err: unknown) {
    return NextResponse.json({
      success: false,
      error: err instanceof Error ? err.message : "Gagal menguji koneksi AI provider.",
    });
  }
}
