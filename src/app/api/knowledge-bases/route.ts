import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getDatabase } from "@/lib/mongodb";
import { getSessionFromRequest } from "@/lib/auth";
import { generateUniqueCollectionName, generateUniqueName } from "@/lib/duplicate-name";

// GET /api/knowledge-bases — list all KB registrations
export async function GET(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const db = await getDatabase();
    const kbs = await db.collection("knowledgeBases").find({}).sort({ createdAt: -1 }).toArray();

    // Get article count per KB
    const kbsWithCount = await Promise.all(
      kbs.map(async (kb) => {
        const count = await db.collection(kb.collectionName).countDocuments();
        return {
          id: kb._id.toString(),
          collectionName: kb.collectionName,
          displayName: kb.displayName,
          description: kb.description || "",
          isActive: kb.isActive !== false,
          articleCount: count,
          createdAt: kb.createdAt,
          updatedAt: kb.updatedAt,
        };
      })
    );

    return NextResponse.json({ knowledgeBases: kbsWithCount });
  } catch (err) {
    console.error("GET knowledge-bases error:", err);
    return NextResponse.json({ error: "Failed to fetch knowledge bases" }, { status: 500 });
  }
}

// POST /api/knowledge-bases — create a new KB
export async function POST(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (session.role === "public_user") {
    return NextResponse.json({ error: "Akses ditolak" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const duplicateFromId = typeof body.duplicateFromId === "string" ? body.duplicateFromId.trim() : "";

    if (duplicateFromId) {
      const db = await getDatabase();
      const source = await db.collection("knowledgeBases").findOne({ _id: new ObjectId(duplicateFromId) });
      if (!source) {
        return NextResponse.json({ error: "Knowledge Base sumber tidak ditemukan." }, { status: 404 });
      }

      const existing = await db.collection("knowledgeBases").find({}, { projection: { displayName: 1, collectionName: 1 } }).toArray();
      const newDisplayName = generateUniqueName(source.displayName, existing.map((item) => item.displayName));
      const baseCollectionName = "kb_" + newDisplayName.trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "_")
        .replace(/^_+|_+$/g, "")
        .slice(0, 30);
      const newCollectionName = generateUniqueCollectionName(baseCollectionName, existing.map((item) => item.collectionName));

      const now = new Date();
      const newKb = {
        collectionName: newCollectionName,
        displayName: newDisplayName,
        description: source.description || "",
        isActive: source.isActive !== false,
        createdBy: { id: session.id, name: session.name },
        createdAt: now,
        updatedAt: now,
      };

      const result = await db.collection("knowledgeBases").insertOne(newKb);
      const kbCol = db.collection(newCollectionName);
      await kbCol.createIndex({ createdAt: -1 });

      const sourceCollection = db.collection(source.collectionName);
      const sourceArticles = await sourceCollection.find({}).toArray();
      if (sourceArticles.length > 0) {
        await kbCol.insertMany(sourceArticles);
      }

      return NextResponse.json({
        success: true,
        name: newDisplayName,
        knowledgeBase: {
          id: result.insertedId.toString(),
          ...newKb,
          articleCount: sourceArticles.length,
        },
      }, { status: 201 });
    }

    const { displayName, description } = body;
    if (!displayName?.trim()) {
      return NextResponse.json({ error: "Nama Knowledge Base wajib diisi" }, { status: 400 });
    }

    const db = await getDatabase();
    const existingRecords = await db.collection("knowledgeBases").find({}, { projection: { displayName: 1, collectionName: 1 } }).toArray();

    const collectionName = "kb_" + displayName.trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "")
      .slice(0, 30);

    const uniqueCollectionName = generateUniqueCollectionName(collectionName, existingRecords.map((item) => item.collectionName));

    const newKb = {
      collectionName: uniqueCollectionName,
      displayName: displayName.trim(),
      description: description?.trim() || "",
      isActive: true,
      createdBy: { id: session.id, name: session.name },
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await db.collection("knowledgeBases").insertOne(newKb);

    const kbCol = db.collection(uniqueCollectionName);
    await kbCol.createIndex({ createdAt: -1 });

    return NextResponse.json({
      success: true,
      knowledgeBase: {
        id: result.insertedId.toString(),
        ...newKb,
        articleCount: 0,
      },
    });
  } catch (err) {
    console.error("POST knowledge-bases error:", err);
    return NextResponse.json({ error: "Failed to create knowledge base" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.role !== "admin") return NextResponse.json({ error: "Admin only" }, { status: 403 });

  try {
    const db = await getDatabase();
    const knowledgeBases = await db.collection("knowledgeBases").find({}, { projection: { collectionName: 1 } }).toArray();
    await Promise.all(knowledgeBases.map(async (base) => {
      try {
        await db.collection(base.collectionName).drop();
      } catch {
        // The registered collection may already be missing.
      }
    }));
    const result = await db.collection("knowledgeBases").deleteMany({});
    return NextResponse.json({ success: true, deletedCount: result.deletedCount });
  } catch (error) {
    console.error("DELETE all knowledge bases error:", error);
    return NextResponse.json({ error: "Gagal menghapus semua Knowledge Base." }, { status: 500 });
  }
}
