import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/mongodb";
import { getSessionFromRequest } from "@/lib/auth";
import {
  encryptProviderSecret,
  fetchProviderModels,
  getProviderSummary,
  getStoredProviderApiKey,
  getStoredProviderConnection,
  normalizeProviderBaseUrl,
  toProviderConnectionSummary,
} from "@/lib/providers";
import type { StoredProviderConnection } from "@/types/providers";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: RouteContext) {
  const session = await getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.role !== "admin" && session.role !== "manager") {
    return NextResponse.json({ error: "Akses ditolak" }, { status: 403 });
  }
  const { id } = await params;
  const provider = getProviderSummary(id);
  if (!provider) return NextResponse.json({ error: "Provider tidak ditemukan." }, { status: 404 });
  if (!provider.supported) return NextResponse.json({ error: provider.setupNote || "Integrasi provider belum tersedia." }, { status: 400 });

  let input: { apiKey?: unknown; baseUrl?: unknown } = {};
  try {
    const body: unknown = await req.json();
    if (body && typeof body === "object" && !Array.isArray(body)) {
      input = body as { apiKey?: unknown; baseUrl?: unknown };
    }
  } catch {
    return NextResponse.json({ success: false, error: "Data uji koneksi tidak valid." }, { status: 400 });
  }

  let db: Awaited<ReturnType<typeof getDatabase>>;
  try {
    db = await getDatabase();
  } catch (error) {
    console.error("Provider test database error:", error);
    return NextResponse.json({ success: false, error: "Gagal mengakses database provider." }, { status: 500 });
  }
  const connection = await getStoredProviderConnection(db, provider.id);
  let baseUrl: string;
  try {
    baseUrl = normalizeProviderBaseUrl(provider.id, typeof input.baseUrl === "string" ? input.baseUrl : connection?.baseUrl);
  } catch (error) {
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : "Base URL provider tidak valid." }, { status: 400 });
  }

  let apiKey = "";
  if (provider.id !== "lmstudio") {
    const suppliedKey = typeof input.apiKey === "string" ? input.apiKey.trim() : "";
    if (suppliedKey.length > 4096) {
      return NextResponse.json({ success: false, error: "API key terlalu panjang." }, { status: 400 });
    }
    try {
      apiKey = suppliedKey || await getStoredProviderApiKey(db, provider.id);
    } catch (error) {
      return NextResponse.json({
        success: false,
        error: error instanceof Error ? error.message : "API key provider wajib diisi.",
      }, { status: 400 });
    }
  }

  let models: string[];
  try {
    models = await fetchProviderModels(provider.id, apiKey, baseUrl);
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Gagal menguji koneksi provider.",
    }, { status: 502 });
  }

  let encryptedApiKey: string | undefined;
  try {
    encryptedApiKey = provider.id === "lmstudio"
      ? connection?.encryptedApiKey
      : typeof input.apiKey === "string" && input.apiKey.trim()
        ? encryptProviderSecret(apiKey)
        : connection?.encryptedApiKey;
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Gagal mengenkripsi kredensial provider.",
    }, { status: 503 });
  }

  const next: StoredProviderConnection = {
    providerId: provider.id,
    ...(encryptedApiKey ? { encryptedApiKey } : {}),
    baseUrl,
    availableModels: models,
    selectedModels: connection?.selectedModels || [],
    connected: true,
    lastTestAt: new Date(),
    updatedAt: new Date(),
  };
  try {
    await db.collection<StoredProviderConnection>("aiProviderConnections").updateOne(
      { providerId: provider.id },
      { $set: next },
      { upsert: true }
    );
    return NextResponse.json({
      success: true,
      message: `Koneksi ${provider.name} berhasil. ${models.length} model tersedia.`,
      provider: toProviderConnectionSummary(provider, next),
    });
  } catch (error) {
    console.error("Provider test save error:", error);
    return NextResponse.json({ success: false, error: "Koneksi berhasil diuji tetapi gagal menyimpan konfigurasi." }, { status: 500 });
  }
}
