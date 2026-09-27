import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/mongodb";
import { getSessionFromRequest } from "@/lib/auth";

// GET /api/genai-route/config
export async function GET(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const db = await getDatabase();
    const config = await db.collection("genaiConfig").findOne({ key: "lmstudio" });
    return NextResponse.json({
      config: {
        baseUrl: config?.baseUrl || "http://localhost:1234/v1",
        model: config?.model || "local-model",
        temperature: config?.temperature ?? 0.7,
        maxTokens: config?.maxTokens ?? 1024,
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
    const { baseUrl, model, temperature, maxTokens } = await req.json();
    const db = await getDatabase();
    await db.collection("genaiConfig").updateOne(
      { key: "lmstudio" },
      { $set: { baseUrl, model, temperature, maxTokens, updatedAt: new Date() } },
      { upsert: true }
    );
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: "Failed to update config" }, { status: 500 });
  }
}
