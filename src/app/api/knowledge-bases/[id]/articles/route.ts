import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/mongodb";
import { getSessionFromRequest } from "@/lib/auth";

// GET /api/knowledge-bases/[id]/articles
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search") || "";
  const category = searchParams.get("category") || "";

  try {
    const db = await getDatabase();
    // id here is the collectionName or mongo _id — support both
    let collectionName = id;
    if (id.length === 24 && /^[0-9a-f]+$/i.test(id)) {
      const { ObjectId } = await import("mongodb");
      if (ObjectId.isValid(id)) {
        const kb = await db.collection("knowledgeBases").findOne({ _id: new ObjectId(id) });
        if (kb) collectionName = kb.collectionName;
      }
    }

    const query: Record<string, unknown> = {};
    if (category && category !== "All") query.category = category;
    if (search.trim()) {
      const regex = { $regex: search.trim(), $options: "i" };
      query.$or = [{ title: regex }, { content: regex }, { summary: regex }, { detail: regex }];
    }

    const articles = await db.collection(collectionName).find(query).sort({ createdAt: -1 }).toArray();
    const categories = await db.collection(collectionName).distinct("category");

    return NextResponse.json({
      articles: articles.map((a) => {
        const { _id, ...rest } = a;
        return { id: _id.toString(), ...rest };
      }),
      categories: categories.filter(Boolean),
    });
  } catch (err) {
    console.error("GET articles error:", err);
    return NextResponse.json({ error: "Failed to fetch articles" }, { status: 500 });
  }
}

// POST /api/knowledge-bases/[id]/articles
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.role === "public_user") return NextResponse.json({ error: "Akses ditolak" }, { status: 403 });

  const { id } = await params;

  try {
    const db = await getDatabase();
    let collectionName = id;
    if (id.length === 24 && /^[0-9a-f]+$/i.test(id)) {
      const { ObjectId } = await import("mongodb");
      if (ObjectId.isValid(id)) {
        const kb = await db.collection("knowledgeBases").findOne({ _id: new ObjectId(id) });
        if (kb) collectionName = kb.collectionName;
      }
    }

    const body = await req.json();
    let tags = body.tags;
    if (typeof tags === "string") {
      tags = tags.split(",").map((t: string) => t.trim()).filter(Boolean);
    } else if (!Array.isArray(tags)) {
      tags = [];
    }

    const newArticle = {
      ...body,
      tags,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: { id: session.id, name: session.name },
    };

    const result = await db.collection(collectionName).insertOne(newArticle);

    // Update KB updatedAt
    await db.collection("knowledgeBases").updateOne(
      { collectionName },
      { $set: { updatedAt: new Date() } }
    );

    return NextResponse.json({ success: true, article: { id: result.insertedId.toString(), ...newArticle } });
  } catch (err) {
    console.error("POST article error:", err);
    return NextResponse.json({ error: "Failed to create article" }, { status: 500 });
  }
}

// PUT /api/knowledge-bases/[id]/articles — update an article
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.role === "public_user") return NextResponse.json({ error: "Akses ditolak" }, { status: 403 });

  const { id } = await params;

  try {
    const db = await getDatabase();
    let collectionName = id;
    if (id.length === 24 && /^[0-9a-f]+$/i.test(id)) {
      const { ObjectId } = await import("mongodb");
      if (ObjectId.isValid(id)) {
        const kb = await db.collection("knowledgeBases").findOne({ _id: new ObjectId(id) });
        if (kb) collectionName = kb.collectionName;
      }
    }

    const body = await req.json();
    const { articleId, id: bodyArticleId, _id, ...updateData } = body;
    const targetId = articleId || bodyArticleId || _id;

    if (!targetId) {
      return NextResponse.json({ error: "Article ID is required" }, { status: 400 });
    }

    const { ObjectId } = await import("mongodb");
    if (!ObjectId.isValid(targetId)) {
      return NextResponse.json({ error: "Invalid Article ID format" }, { status: 400 });
    }

    let tags = updateData.tags;
    if (typeof tags === "string") {
      tags = tags.split(",").map((t: string) => t.trim()).filter(Boolean);
    } else if (!Array.isArray(tags)) {
      tags = [];
    }

    const fieldsToUpdate = {
      ...updateData,
      tags,
      updatedAt: new Date(),
    };

    const result = await db.collection(collectionName).updateOne(
      { _id: new ObjectId(targetId) },
      { $set: fieldsToUpdate }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: "Article not found" }, { status: 404 });
    }

    await db.collection("knowledgeBases").updateOne(
      { collectionName },
      { $set: { updatedAt: new Date() } }
    );

    return NextResponse.json({ success: true, message: "Article updated successfully" });
  } catch (err) {
    console.error("PUT article error:", err);
    return NextResponse.json({ error: "Failed to update article" }, { status: 500 });
  }
}

// DELETE /api/knowledge-bases/[id]/articles — delete an article
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.role === "public_user") return NextResponse.json({ error: "Akses ditolak" }, { status: 403 });

  const { id } = await params;
  const { searchParams } = new URL(req.url);
  let articleId = searchParams.get("articleId");

  if (!articleId) {
    try {
      const body = await req.json();
      articleId = body.articleId || body.id;
    } catch {
      // no body
    }
  }

  if (!articleId) {
    return NextResponse.json({ error: "Article ID is required" }, { status: 400 });
  }

  try {
    const db = await getDatabase();
    let collectionName = id;
    if (id.length === 24 && /^[0-9a-f]+$/i.test(id)) {
      const { ObjectId } = await import("mongodb");
      if (ObjectId.isValid(id)) {
        const kb = await db.collection("knowledgeBases").findOne({ _id: new ObjectId(id) });
        if (kb) collectionName = kb.collectionName;
      }
    }

    const { ObjectId } = await import("mongodb");
    if (!ObjectId.isValid(articleId)) {
      return NextResponse.json({ error: "Invalid Article ID format" }, { status: 400 });
    }

    const result = await db.collection(collectionName).deleteOne({ _id: new ObjectId(articleId) });

    if (result.deletedCount === 0) {
      return NextResponse.json({ error: "Article not found" }, { status: 404 });
    }

    await db.collection("knowledgeBases").updateOne(
      { collectionName },
      { $set: { updatedAt: new Date() } }
    );

    return NextResponse.json({ success: true, message: "Article deleted successfully" });
  } catch (err) {
    console.error("DELETE article error:", err);
    return NextResponse.json({ error: "Failed to delete article" }, { status: 500 });
  }
}
