import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getDatabase } from "@/lib/mongodb";
import { getSessionFromRequest } from "@/lib/auth";
import { validateComponentTemplate } from "@/lib/component-templates";
import { generateUniqueName } from "@/lib/duplicate-name";

function canManage(role: string): boolean {
  return role === "admin" || role === "manager";
}

async function validateArticleReferences(
  db: Awaited<ReturnType<typeof getDatabase>>,
  articleRefs: Array<{ collectionName: string; articleId: string }>
): Promise<boolean> {
  const collections = [...new Set(articleRefs.map((item) => item.collectionName))];
  const registered = await db.collection("knowledgeBases")
    .find({ collectionName: { $in: collections } }, { projection: { collectionName: 1 } })
    .toArray();
  const registeredNames = new Set(registered.map((item) => item.collectionName));
  if (collections.some((name) => !registeredNames.has(name))) return false;

  const checks = await Promise.all(articleRefs.map((item) =>
    db.collection(item.collectionName).findOne({ _id: new ObjectId(item.articleId) }, { projection: { _id: 1 } })
  ));
  return checks.every(Boolean);
}

export async function GET(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canManage(session.role)) return NextResponse.json({ error: "Akses ditolak" }, { status: 403 });

  try {
    const db = await getDatabase();
    const templates = await db.collection("components").find({}).sort({ updatedAt: -1 }).toArray();
    return NextResponse.json({
      components: templates.map(({ _id, ...template }) => ({ id: _id.toString(), ...template })),
    });
  } catch (error) {
    console.error("GET components error:", error);
    return NextResponse.json({ error: "Gagal memuat component templates." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canManage(session.role)) return NextResponse.json({ error: "Akses ditolak" }, { status: 403 });

  try {
    const body = await req.json();
    const duplicateFromId = typeof body.duplicateFromId === "string" ? body.duplicateFromId.trim() : "";

    const db = await getDatabase();

    if (duplicateFromId) {
      const source = await db.collection("components").findOne({ _id: new ObjectId(duplicateFromId) });
      if (!source) return NextResponse.json({ error: "Component template sumber tidak ditemukan." }, { status: 404 });

      const existing = await db.collection("components").find({}, { projection: { name: 1 } }).toArray();
      const newName = generateUniqueName(source.name, existing.map((item) => item.name));
      const now = new Date();
      const { _id, createdAt, updatedAt, createdBy, updatedBy, ...rest } = source;
      const result = await db.collection("components").insertOne({
        ...rest,
        name: newName,
        createdBy: { id: session.id, name: session.name },
        createdAt: now,
        updatedAt: now,
      });
      return NextResponse.json({ success: true, id: result.insertedId.toString(), name: newName }, { status: 201 });
    }

    const validation = validateComponentTemplate(body);
    if (!validation.success) return NextResponse.json({ error: validation.error }, { status: 400 });

    if (!await validateArticleReferences(db, validation.data.articleRefs)) {
      return NextResponse.json({ error: "Satu atau lebih artikel Knowledge Base tidak ditemukan." }, { status: 400 });
    }

    const now = new Date();
    const result = await db.collection("components").insertOne({
      ...validation.data,
      createdBy: { id: session.id, name: session.name },
      createdAt: now,
      updatedAt: now,
    });
    return NextResponse.json({ success: true, id: result.insertedId.toString() }, { status: 201 });
  } catch (error) {
    console.error("POST components error:", error);
    return NextResponse.json({ error: "Gagal menyimpan component template." }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canManage(session.role)) return NextResponse.json({ error: "Akses ditolak" }, { status: 403 });

  try {
    const db = await getDatabase();
    const result = await db.collection("components").deleteMany({});
    return NextResponse.json({ success: true, deletedCount: result.deletedCount });
  } catch (error) {
    console.error("DELETE all components error:", error);
    return NextResponse.json({ error: "Gagal menghapus semua component template." }, { status: 500 });
  }
}