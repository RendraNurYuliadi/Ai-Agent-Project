import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { ObjectId } from "mongodb";
import { getDatabase } from "@/lib/mongodb";
import { getSessionFromRequest } from "@/lib/auth";
import {
  decryptProviderSecret,
  getEncryptedProviderApiKeys,
  getProviderSummary,
  getStoredProviderConnection,
} from "@/lib/providers";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: RouteContext) {
  const session = await getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if ((session.role !== "admin" && session.role !== "manager") || session.userType !== "human") {
    return NextResponse.json({ error: "Akses ditolak" }, { status: 403 });
  }
  const { id } = await params;
  const provider = getProviderSummary(id);
  if (!provider) return NextResponse.json({ error: "Provider tidak ditemukan." }, { status: 404 });

  let input: { password?: unknown };
  try {
    const body: unknown = await req.json();
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json({ error: "Data verifikasi password tidak valid." }, { status: 400 });
    }
    input = body as { password?: unknown };
  } catch {
    return NextResponse.json({ error: "Data verifikasi password tidak valid." }, { status: 400 });
  }
  const password = typeof input.password === "string" ? input.password : "";
  if (!password || password.length > 4096) {
    return NextResponse.json({ error: "Password login wajib diisi." }, { status: 400 });
  }

  try {
    if (!ObjectId.isValid(session.id)) {
      return NextResponse.json({ error: "Sesi pengguna tidak valid. Login kembali." }, { status: 401 });
    }
    const db = await getDatabase();
    const user = await db.collection<{ password?: string }>("users").findOne(
      { _id: new ObjectId(session.id) },
      { projection: { password: 1 } }
    );
    if (!user?.password) return NextResponse.json({ error: "Pengguna tidak ditemukan." }, { status: 404 });

    let passwordMatches = false;
    if (user.password.startsWith("$2")) {
      passwordMatches = await bcrypt.compare(password, user.password);
    } else if (user.password === password) {
      passwordMatches = true;
      await db.collection("users").updateOne(
        { _id: new ObjectId(session.id) },
        { $set: { password: await bcrypt.hash(password, 10), updatedAt: new Date() } }
      );
    }
    if (!passwordMatches) return NextResponse.json({ error: "Password login salah." }, { status: 401 });

    const connection = await getStoredProviderConnection(db, provider.id);
    const encryptedKeys = getEncryptedProviderApiKeys(connection);
    if (!encryptedKeys.length) return NextResponse.json({ error: "Tidak ada API key tersimpan untuk ditampilkan." }, { status: 404 });

    return NextResponse.json(
      { apiKeys: encryptedKeys.map(decryptProviderSecret) },
      { headers: { "Cache-Control": "no-store, max-age=0" } }
    );
  } catch (error) {
    console.error("Provider API key reveal error:", error);
    return NextResponse.json({ error: "Gagal memverifikasi password atau menampilkan API key." }, { status: 500 });
  }
}
