import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getDatabase } from "@/lib/mongodb";
import { getSessionFromRequest } from "@/lib/auth";
import { validateComponentTemplate } from "@/lib/component-templates";
import { generateUniqueName } from "@/lib/duplicate-name";

function canManage(role: string): boolean {
  return role === "admin" || role === "manager";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

async function validateArticleReferences(
  db: Awaited<ReturnType<typeof getDatabase>>,
  articleRefs: Array<{ collectionName: string; articleId: string }>
): Promise<boolean> {
  if (articleRefs.length === 0) return true;
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

export async function POST(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canManage(session.role)) return NextResponse.json({ error: "Akses ditolak" }, { status: 403 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "File JSON tidak valid." }, { status: 400 });
  }
  if (!isRecord(body) || !Array.isArray(body.components) || body.components.length < 1 || body.components.length > 100) {
    return NextResponse.json({ error: "Import harus berisi 1 sampai 100 komponen." }, { status: 400 });
  }

  try {
    const db = await getDatabase();
    const validatedComponents = [];
    for (const [index, component] of body.components.entries()) {
      const validation = validateComponentTemplate(component);
      if (!validation.success) {
        return NextResponse.json({ error: `Komponen ${index + 1}: ${validation.error}` }, { status: 400 });
      }
      if (!await validateArticleReferences(db, validation.data.articleRefs)) {
        return NextResponse.json({ error: `Referensi artikel pada komponen ${index + 1} tidak ditemukan. Hapus articleRefs jika komponen tidak memerlukan pemicu artikel.` }, { status: 400 });
      }
      validatedComponents.push(validation.data);
    }

    const existing = await db.collection("components").find({}, { projection: { name: 1 } }).toArray();
    const names = existing.map((item) => item.name);
    const now = new Date();
    const documents = validatedComponents.map((component) => {
      const name = generateUniqueName(component.name, names);
      names.push(name);
      return {
        ...component,
        name,
        createdBy: { id: session.id, name: session.name },
        createdAt: now,
        updatedAt: now,
      };
    });
    await db.collection("components").insertMany(documents);
    return NextResponse.json({ success: true, imported: documents.length, names: documents.map((item) => item.name) }, { status: 201 });
  } catch (error) {
    console.error("POST component import error:", error);
    return NextResponse.json({ error: "Gagal mengimpor component templates." }, { status: 500 });
  }
}