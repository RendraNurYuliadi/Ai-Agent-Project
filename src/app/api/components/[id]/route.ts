import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getDatabase } from "@/lib/mongodb";
import { getSessionFromRequest } from "@/lib/auth";
import { validateComponentTemplate } from "@/lib/component-templates";

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

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canManage(session.role)) return NextResponse.json({ error: "Akses ditolak" }, { status: 403 });

  const { id } = await params;
  if (!ObjectId.isValid(id)) return NextResponse.json({ error: "Invalid ID" }, { status: 400 });

  try {
    const validation = validateComponentTemplate(await req.json());
    if (!validation.success) return NextResponse.json({ error: validation.error }, { status: 400 });

    const db = await getDatabase();
    if (!await validateArticleReferences(db, validation.data.articleRefs)) {
      return NextResponse.json({ error: "Satu atau lebih artikel Knowledge Base tidak ditemukan." }, { status: 400 });
    }

    const result = await db.collection("components").updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          ...validation.data,
          updatedBy: { id: session.id, name: session.name },
          updatedAt: new Date(),
        },
      }
    );
    if (!result.matchedCount) return NextResponse.json({ error: "Component template tidak ditemukan." }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("PUT component error:", error);
    return NextResponse.json({ error: "Gagal memperbarui component template." }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canManage(session.role)) return NextResponse.json({ error: "Akses ditolak" }, { status: 403 });

  const { id } = await params;
  if (!ObjectId.isValid(id)) return NextResponse.json({ error: "Invalid ID" }, { status: 400 });

  try {
    const db = await getDatabase();
    const result = await db.collection("components").deleteOne({ _id: new ObjectId(id) });
    if (!result.deletedCount) return NextResponse.json({ error: "Component template tidak ditemukan." }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE component error:", error);
    return NextResponse.json({ error: "Gagal menghapus component template." }, { status: 500 });
  }
}