import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/mongodb";
import { getSessionFromRequest } from "@/lib/auth";
import {
  fetchProviderModels,
  getActiveProviderApiKeyIndex,
  getProviderSummary,
  getStoredProviderApiKeys,
  getStoredProviderConnection,
  normalizeProviderBaseUrl,
  setActiveProviderApiKeyIndex,
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

  let input: { baseUrl?: unknown } = {};
  try {
    const body: unknown = await req.json();
    if (body && typeof body === "object" && !Array.isArray(body)) input = body as { baseUrl?: unknown };
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

  let apiKeys: string[];
  try {
    apiKeys = await getStoredProviderApiKeys(db, provider.id, connection);
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Gagal membaca API key provider.",
    }, { status: 500 });
  }
  if (!apiKeys.length) {
    return NextResponse.json({ success: false, error: "Tambahkan API key sebelum menguji koneksi." }, { status: 400 });
  }

  const startIndex = getActiveProviderApiKeyIndex(connection, apiKeys.length);
  let catalog: Awaited<ReturnType<typeof fetchProviderModels>> | undefined;
  let successfulIndex = -1;
  const failures: string[] = [];
  for (let attempt = 0; attempt < apiKeys.length; attempt += 1) {
    const index = (startIndex + attempt) % apiKeys.length;
    try {
      catalog = await fetchProviderModels(provider.id, apiKeys[index], baseUrl);
      successfulIndex = index;
      break;
    } catch (error) {
      failures.push(`API key ${index + 1}: ${error instanceof Error ? error.message : "Uji koneksi gagal."}`);
      if (attempt < apiKeys.length - 1) {
        try {
          await setActiveProviderApiKeyIndex(db, provider.id, (index + 1) % apiKeys.length);
        } catch (rotationError) {
          return NextResponse.json({
            success: false,
            error: rotationError instanceof Error ? rotationError.message : "Gagal menyimpan posisi API key berikutnya.",
          }, { status: 500 });
        }
      }
    }
  }
  if (!catalog || successfulIndex < 0) {
    try {
      await setActiveProviderApiKeyIndex(db, provider.id, 0);
    } catch (rotationError) {
      return NextResponse.json({
        success: false,
        error: rotationError instanceof Error ? rotationError.message : "Gagal mengatur ulang posisi API key.",
      }, { status: 500 });
    }
    return NextResponse.json({
      success: false,
      error: `Semua ${apiKeys.length} API key gagal. Posisi diatur kembali ke API key 1. ${failures.join(" | ")}`,
    }, { status: 502 });
  }

  const next: StoredProviderConnection = {
    providerId: provider.id,
    ...(connection?.encryptedApiKeys ? { encryptedApiKeys: connection.encryptedApiKeys } : {}),
    ...(connection?.encryptedApiKey ? { encryptedApiKey: connection.encryptedApiKey } : {}),
    activeApiKeyIndex: successfulIndex,
    baseUrl,
    availableModels: catalog.models,
    modelDetails: catalog.modelDetails,
    selectedModels: (connection?.selectedModels || []).filter((model) => catalog.models.includes(model)),
    freeEndpointCatalogVerified: true,
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
      message: `Koneksi ${provider.name} berhasil menggunakan API key ${successfulIndex + 1}. ${catalog.models.length} Free Endpoint dari katalog NVIDIA terverifikasi.`,
      provider: toProviderConnectionSummary(provider, next),
    });
  } catch (error) {
    console.error("Provider test save error:", error);
    return NextResponse.json({ success: false, error: "Koneksi berhasil diuji tetapi gagal menyimpan konfigurasi." }, { status: 500 });
  }
}
