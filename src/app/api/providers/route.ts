import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/mongodb";
import { getSessionFromRequest } from "@/lib/auth";
import { PROVIDERS, toProviderConnectionSummary } from "@/lib/providers";
import type { StoredProviderConnection } from "@/types/providers";

export async function GET(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.role !== "admin" && session.role !== "manager") {
    return NextResponse.json({ error: "Akses ditolak" }, { status: 403 });
  }

  try {
    const db = await getDatabase();
    const stored = await db.collection<StoredProviderConnection>("aiProviderConnections").find({}).toArray();
    const byId = new Map(stored.map((connection) => [connection.providerId, connection]));
    const providers = PROVIDERS.map((provider) => toProviderConnectionSummary(provider, byId.get(provider.id) || null));
    return NextResponse.json({ providers });
  } catch (error) {
    console.error("GET providers error:", error);
    return NextResponse.json({ error: "Gagal memuat provider." }, { status: 500 });
  }
}
