import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/mongodb";
import { getSessionFromRequest } from "@/lib/auth";
import {
  decryptProviderSecret,
  encryptProviderSecret,
  getActiveProviderApiKeyIndex,
  getEncryptedProviderApiKeys,
  getProviderSummary,
  getStoredProviderConnection,
  MAX_PROVIDER_API_KEYS,
  normalizeProviderBaseUrl,
  toProviderConnectionSummary,
} from "@/lib/providers";
import type { StoredProviderConnection } from "@/types/providers";

type RouteContext = { params: Promise<{ id: string }> };

function canManage(role: string): boolean {
  return role === "admin" || role === "manager";
}

export async function POST(req: NextRequest, { params }: RouteContext) {
  const session = await getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canManage(session.role)) return NextResponse.json({ error: "Akses ditolak" }, { status: 403 });
  const { id } = await params;
  const provider = getProviderSummary(id);
  if (!provider?.supported) return NextResponse.json({ error: "Provider tidak ditemukan atau belum didukung." }, { status: 404 });

  let input: { apiKey?: unknown };
  try {
    const body: unknown = await req.json();
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json({ error: "Data API key tidak valid." }, { status: 400 });
    }
    input = body as { apiKey?: unknown };
  } catch {
    return NextResponse.json({ error: "Data API key tidak valid." }, { status: 400 });
  }
  const apiKey = typeof input.apiKey === "string" ? input.apiKey.trim() : "";
  if (!apiKey) return NextResponse.json({ error: "API key wajib diisi." }, { status: 400 });
  if (apiKey.length > 4096) return NextResponse.json({ error: "API key terlalu panjang." }, { status: 400 });

  try {
    const db = await getDatabase();
    const connection = await getStoredProviderConnection(db, provider.id);
    const encryptedKeys = getEncryptedProviderApiKeys(connection);
    if (encryptedKeys.length >= MAX_PROVIDER_API_KEYS) {
      return NextResponse.json({ error: `Maksimal ${MAX_PROVIDER_API_KEYS} API key.` }, { status: 400 });
    }
    if (encryptedKeys.some((encryptedKey) => decryptProviderSecret(encryptedKey) === apiKey)) {
      return NextResponse.json({ error: "API key tersebut sudah tersimpan." }, { status: 409 });
    }

    const now = new Date();
    const next: StoredProviderConnection = {
      ...(connection || {
        providerId: provider.id,
        baseUrl: normalizeProviderBaseUrl(provider.id),
        availableModels: [],
        selectedModels: [],
        connected: false,
        updatedAt: now,
      }),
      encryptedApiKeys: [...encryptedKeys, encryptProviderSecret(apiKey)],
      activeApiKeyIndex: getActiveProviderApiKeyIndex(connection, encryptedKeys.length),
      updatedAt: now,
    };
    delete next.encryptedApiKey;
    await db.collection<StoredProviderConnection>("aiProviderConnections").updateOne(
      { providerId: provider.id },
      { $set: next, $unset: { encryptedApiKey: "" } },
      { upsert: true }
    );
    return NextResponse.json({
      success: true,
      provider: toProviderConnectionSummary(provider, next),
    });
  } catch (error) {
    console.error("Provider API key add error:", error);
    const message = error instanceof Error ? error.message : "Gagal menyimpan API key.";
    return NextResponse.json({
      error: message,
    }, { status: message.includes("PROVIDER_CREDENTIALS_ENCRYPTION_KEY") ? 503 : 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: RouteContext) {
  const session = await getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canManage(session.role)) return NextResponse.json({ error: "Akses ditolak" }, { status: 403 });
  const { id } = await params;
  const provider = getProviderSummary(id);
  if (!provider?.supported) return NextResponse.json({ error: "Provider tidak ditemukan atau belum didukung." }, { status: 404 });

  let input: { index?: unknown };
  try {
    const body: unknown = await req.json();
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json({ error: "Data API key tidak valid." }, { status: 400 });
    }
    input = body as { index?: unknown };
  } catch {
    return NextResponse.json({ error: "Data API key tidak valid." }, { status: 400 });
  }
  if (typeof input.index !== "number" || !Number.isInteger(input.index) || input.index < 0) {
    return NextResponse.json({ error: "Nomor API key tidak valid." }, { status: 400 });
  }

  try {
    const db = await getDatabase();
    const connection = await getStoredProviderConnection(db, provider.id);
    if (!connection) return NextResponse.json({ error: "API key tidak ditemukan." }, { status: 404 });
    const encryptedKeys = getEncryptedProviderApiKeys(connection);
    if (input.index >= encryptedKeys.length) {
      return NextResponse.json({ error: "API key tidak ditemukan." }, { status: 404 });
    }
    if (encryptedKeys.length === 1) {
      const usingBot = await db.collection<{ name?: string }>("bots").findOne(
        { interactions: { $elemMatch: { "config.providerId": provider.id } } },
        { projection: { name: 1 } }
      );
      if (usingBot) {
        return NextResponse.json({
          error: `API key masih digunakan bot "${usingBot.name || "Tanpa nama"}". Ubah konfigurasi bot terlebih dahulu.`,
        }, { status: 409 });
      }
    }

    const nextKeys = encryptedKeys.filter((_, index) => index !== input.index);
    const activeIndex = getActiveProviderApiKeyIndex(connection, encryptedKeys.length);
    const nextActiveIndex = nextKeys.length === 0
      ? 0
      : input.index < activeIndex
        ? activeIndex - 1
        : input.index === activeIndex
          ? Math.min(input.index, nextKeys.length - 1)
          : activeIndex;
    const next: StoredProviderConnection = {
      ...connection!,
      encryptedApiKeys: nextKeys,
      activeApiKeyIndex: nextActiveIndex,
      ...(nextKeys.length === 0 ? {
        connected: false,
        freeEndpointCatalogVerified: false,
        availableModels: [],
        modelDetails: {},
        selectedModels: [],
      } : {}),
      updatedAt: new Date(),
    };
    delete next.encryptedApiKey;
    await db.collection<StoredProviderConnection>("aiProviderConnections").updateOne(
      { providerId: provider.id },
      { $set: next, $unset: { encryptedApiKey: "" } }
    );
    return NextResponse.json({
      success: true,
      provider: toProviderConnectionSummary(provider, next),
    });
  } catch (error) {
    console.error("Provider API key delete error:", error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : "Gagal menghapus API key.",
    }, { status: 500 });
  }
}
