import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/mongodb";
import { getSessionFromRequest } from "@/lib/auth";

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
    const { displayName, description } = await req.json();
    if (!displayName?.trim()) {
      return NextResponse.json({ error: "Nama Knowledge Base wajib diisi" }, { status: 400 });
    }

    // Generate collection name: kb_ + lowercase alphanumeric
    const collectionName = "kb_" + displayName.trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "")
      .slice(0, 30);

    const db = await getDatabase();

    // Check if collection name already taken
    const existing = await db.collection("knowledgeBases").findOne({ collectionName });
    if (existing) {
      return NextResponse.json(
        { error: `Knowledge Base dengan nama "${collectionName}" sudah ada.` },
        { status: 400 }
      );
    }

    const newKb = {
      collectionName,
      displayName: displayName.trim(),
      description: description?.trim() || "",
      createdBy: { id: session.id, name: session.name },
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await db.collection("knowledgeBases").insertOne(newKb);

    // Create the MongoDB collection (insert & delete a dummy doc to initialize it)
    const kbCol = db.collection(collectionName);
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
