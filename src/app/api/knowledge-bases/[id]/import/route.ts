import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/mongodb";
import { getSessionFromRequest } from "@/lib/auth";
import Papa from "papaparse";

// POST /api/knowledge-bases/[id]/import
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

    let rawRows: Record<string, unknown>[] = [];

    const contentType = req.headers.get("content-type") || "";
    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const file = formData.get("file") as File | null;
      if (!file) return NextResponse.json({ error: "File CSV tidak ditemukan" }, { status: 400 });
      const csvData = await file.text();
      const result = Papa.parse<Record<string, unknown>>(csvData, {
        header: true, skipEmptyLines: "greedy", dynamicTyping: true,
        transformHeader: (h) => h.trim(),
      });
      rawRows = result.data;
    } else {
      const body = await req.json();
      if (Array.isArray(body.rows)) {
        rawRows = body.rows;
      } else if (typeof body.csv === "string") {
        const result = Papa.parse<Record<string, unknown>>(body.csv, {
          header: true, skipEmptyLines: "greedy", dynamicTyping: true,
          transformHeader: (h) => h.trim(),
        });
        rawRows = result.data;
      }
    }

    const validRows = rawRows.filter((r) =>
      Object.values(r).some((v) => v !== null && v !== "" && v !== undefined)
    );

    if (validRows.length === 0) return NextResponse.json({ error: "Tidak ada data CSV yang valid" }, { status: 400 });

    const now = new Date();
    const docs = validRows.map((row) => {
      const doc: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(row)) {
        if (!k.trim()) continue;
        if (k.trim() === "tags" && typeof v === "string") {
          doc[k.trim()] = v.split(",").map((t) => t.trim()).filter(Boolean);
        } else {
          doc[k.trim()] = v;
        }
      }
      doc.createdAt = now;
      doc.updatedAt = now;
      doc.importedBy = { id: session.id, name: session.name };
      return doc;
    });

    const result = await db.collection(collectionName).insertMany(docs);

    await db.collection("knowledgeBases").updateOne(
      { collectionName },
      { $set: { updatedAt: new Date() } }
    );

    return NextResponse.json({
      success: true,
      insertedCount: result.insertedCount,
      message: `Berhasil mengimpor ${result.insertedCount} artikel ke "${collectionName}".`,
    });
  } catch (err) {
    console.error("CSV import error:", err);
    return NextResponse.json({ error: "Gagal memproses file CSV" }, { status: 500 });
  }
}
