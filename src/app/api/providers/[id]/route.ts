import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/mongodb";
import { getSessionFromRequest } from "@/lib/auth";
import {
  getProviderSummary,
  getStoredProviderConnection,
  toProviderConnectionSummary,
} from "@/lib/providers";
import type { StoredProviderConnection } from "@/types/providers";

type RouteContext = { params: Promise<{ id: string }> };

function canManage(role: string): boolean {
  return role === "admin" || role === "manager";
}

export async function GET(req: NextRequest, { params }: RouteContext) {
  const session = await getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canManage(session.role)) return NextResponse.json({ error: "Akses ditolak" }, { status: 403 });
  const { id } = await params;
  const provider = getProviderSummary(id);
  if (!provider) return NextResponse.json({ error: "Provider tidak ditemukan." }, { status: 404 });

  try {
    const db = await getDatabase();
    const connection = await getStoredProviderConnection(db, provider.id);
    return NextResponse.json({ provider: toProviderConnectionSummary(provider, connection) });
  } catch (error) {
    console.error("GET provider config error:", error);
    return NextResponse.json({ error: "Gagal memuat konfigurasi provider." }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: RouteContext) {
  const session = await getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canManage(session.role)) return NextResponse.json({ error: "Akses ditolak" }, { status: 403 });
  const { id } = await params;
  const provider = getProviderSummary(id);
  if (!provider) return NextResponse.json({ error: "Provider tidak ditemukan." }, { status: 404 });
  if (!provider.supported) return NextResponse.json({ error: provider.setupNote || "Integrasi provider belum tersedia." }, { status: 400 });

  try {
    const body: unknown = await req.json();
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json({ error: "Konfigurasi provider tidak valid." }, { status: 400 });
    }
    const input = body as { selectedModels?: unknown };
    const db = await getDatabase();
    const existing = await getStoredProviderConnection(db, provider.id);
    if (!existing?.freeEndpointCatalogVerified) {
      return NextResponse.json({ error: "Uji koneksi ulang untuk memverifikasi daftar Free Endpoint NVIDIA sebelum memilih model." }, { status: 409 });
    }
    const selectedModelsInput: unknown[] | null = Array.isArray(input.selectedModels)
      ? input.selectedModels
      : null;
    if (!selectedModelsInput) {
      return NextResponse.json({ error: "Pilih daftar model yang akan digunakan." }, { status: 400 });
    }
    if (!existing?.connected) {
      return NextResponse.json({ error: "Uji koneksi provider sebelum memilih model." }, { status: 409 });
    }
    const requestedModels = selectedModelsInput.filter((model): model is string => typeof model === "string");
    if (requestedModels.length !== selectedModelsInput.length) {
      return NextResponse.json({ error: "Daftar model yang dipilih tidak valid." }, { status: 400 });
    }
    if (requestedModels.some((model) => !existing.availableModels.includes(model))) {
      return NextResponse.json({ error: "Model hanya dapat digunakan setelah terverifikasi sebagai Free Endpoint dari katalog NVIDIA." }, { status: 400 });
    }

    const bots = await db.collection<{ name?: string; interactions?: Array<{ config?: { providerId?: string; model?: string } }> }>("bots")
      .find({ interactions: { $elemMatch: { "config.providerId": provider.id } } }, { projection: { name: 1, interactions: 1 } })
      .toArray();
    const conflict = bots.find((bot) => bot.interactions?.some((interaction) =>
      interaction.config?.providerId === provider.id &&
      interaction.config.model &&
      !requestedModels.includes(interaction.config.model)
    ));
    if (conflict) {
      return NextResponse.json({
        error: `Model masih digunakan bot "${conflict.name || "Tanpa nama"}". Ubah konfigurasi bot terlebih dahulu.`,
      }, { status: 409 });
    }
    const next: StoredProviderConnection = {
      ...existing,
      selectedModels: [...new Set(requestedModels)].slice(0, 1000),
      updatedAt: new Date(),
    };

    await db.collection<StoredProviderConnection>("aiProviderConnections").updateOne(
      { providerId: provider.id },
      { $set: next },
      { upsert: true }
    );
    return NextResponse.json({ provider: toProviderConnectionSummary(provider, next) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Gagal menyimpan konfigurasi provider.";
    const status = message.includes("PROVIDER_CREDENTIALS_ENCRYPTION_KEY") ? 503 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(req: NextRequest, { params }: RouteContext) {
  const session = await getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canManage(session.role)) return NextResponse.json({ error: "Akses ditolak" }, { status: 403 });
  const { id } = await params;
  if (!getProviderSummary(id)) return NextResponse.json({ error: "Provider tidak ditemukan." }, { status: 404 });

  try {
    const db = await getDatabase();
    const usingBot = await db.collection<{ name?: string }>("bots").findOne(
      { interactions: { $elemMatch: { "config.providerId": id } } },
      { projection: { name: 1 } }
    );
    if (usingBot) {
      return NextResponse.json({
        error: `Provider masih digunakan bot "${usingBot.name || "Tanpa nama"}". Ubah konfigurasi bot terlebih dahulu.`,
      }, { status: 409 });
    }
    await db.collection("aiProviderConnections").deleteOne({ providerId: id });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE provider config error:", error);
    return NextResponse.json({ error: "Gagal memutus koneksi provider." }, { status: 500 });
  }
}
