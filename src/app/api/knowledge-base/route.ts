import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/mongodb";
import { getSessionFromRequest } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const session = await getSessionFromRequest(req);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || "";
    const category = searchParams.get("category") || "";

    const db = await getDatabase();
    const query: Record<string, unknown> = {};

    if (category && category !== "All") {
      query.category = category;
    }

    if (search.trim()) {
      const regex = { $regex: search.trim(), $options: "i" };
      query.$or = [
        { title: regex },
        { summary: regex },
        { detail: regex },
        { category: regex },
        { content: regex },
        { tags: regex },
      ];
    }

    const articles = await db
      .collection("knowledgeBase")
      .find(query)
      .sort({ createdAt: -1 })
      .toArray();

    const formattedArticles = articles.map((doc) => {
      const { _id, ...rest } = doc;
      return {
        id: _id.toString(),
        ...rest,
      };
    });

    // Also get all unique categories for filtering
    const categories = await db
      .collection("knowledgeBase")
      .distinct("category");

    return NextResponse.json({
      articles: formattedArticles,
      categories: categories.filter(Boolean),
    });
  } catch (error) {
    console.error("Fetch knowledge base error:", error);
    return NextResponse.json(
      { error: "Failed to fetch knowledge base articles" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSessionFromRequest(req);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Role check: Admin and Manager can add/edit knowledge base
    if (session.role === "public_user") {
      return NextResponse.json(
        { error: "Akses ditolak. Public user hanya memiliki akses baca." },
        { status: 403 }
      );
    }

    const body = await req.json();

    if (!body.title && !body.content && !body.detail) {
      return NextResponse.json(
        { error: "Judul atau isi artikel wajib diisi." },
        { status: 400 }
      );
    }

    // Process tags if string
    let tags = body.tags;
    if (typeof tags === "string") {
      tags = tags
        .split(",")
        .map((t: string) => t.trim())
        .filter(Boolean);
    } else if (!Array.isArray(tags)) {
      tags = [];
    }

    const newArticle = {
      ...body,
      tags,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: {
        id: session.id,
        name: session.name,
      },
    };

    const db = await getDatabase();
    const result = await db.collection("knowledgeBase").insertOne(newArticle);

    return NextResponse.json({
      success: true,
      article: {
        id: result.insertedId.toString(),
        ...newArticle,
      },
    });
  } catch (error) {
    console.error("Create article error:", error);
    return NextResponse.json(
      { error: "Failed to create knowledge base article" },
      { status: 500 }
    );
  }
}
