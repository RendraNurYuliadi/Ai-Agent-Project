import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/mongodb";
import { getSessionFromRequest } from "@/lib/auth";
import Papa from "papaparse";

export async function POST(req: NextRequest) {
  try {
    const session = await getSessionFromRequest(req);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.role === "public_user") {
      return NextResponse.json(
        { error: "Akses ditolak. Public user hanya memiliki akses baca." },
        { status: 403 }
      );
    }

    const contentType = req.headers.get("content-type") || "";
    let csvData = "";
    let rawRows: Record<string, unknown>[] = [];

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const file = formData.get("file") as File | null;
      if (!file) {
        return NextResponse.json(
          { error: "File CSV tidak ditemukan." },
          { status: 400 }
        );
      }
      csvData = await file.text();
    } else {
      const body = await req.json();
      if (body.csv) {
        csvData = body.csv;
      } else if (Array.isArray(body.rows)) {
        rawRows = body.rows;
      } else {
        return NextResponse.json(
          { error: "Payload CSV atau rows tidak ditemukan." },
          { status: 400 }
        );
      }
    }

    // Parse CSV if string
    if (csvData) {
      const parseResult = Papa.parse<Record<string, unknown>>(csvData, {
        header: true,
        skipEmptyLines: "greedy",
        dynamicTyping: true,
        transformHeader: (header) => header.trim(),
      });

      if (parseResult.errors && parseResult.errors.length > 0) {
        const errorMsg = parseResult.errors.map((e) => e.message).join(", ");
        console.warn("CSV parse warnings/errors:", errorMsg);
      }

      rawRows = parseResult.data;
    }

    if (!rawRows || rawRows.length === 0) {
      return NextResponse.json(
        { error: "Tidak ada baris data valid yang ditemukan pada CSV." },
        { status: 400 }
      );
    }

    const now = new Date();
    const documentsToInsert = rawRows
      .filter((row) => {
        // filter out completely empty objects
        return Object.values(row).some((val) => val !== null && val !== "" && val !== undefined);
      })
      .map((row) => {
        const doc: Record<string, unknown> = {};

        // Dynamic structure: copy all dynamic columns
        for (const [key, value] of Object.entries(row)) {
          if (!key) continue;
          const cleanKey = key.trim();

          // If field is tags and is a string, split by commas
          if (cleanKey === "tags" && typeof value === "string") {
            doc[cleanKey] = value
              .split(",")
              .map((t) => t.trim())
              .filter(Boolean);
          } else {
            doc[cleanKey] = value;
          }
        }

        doc.createdAt = now;
        doc.updatedAt = now;
        doc.importedBy = {
          id: session.id,
          name: session.name,
        };

        return doc;
      });

    if (documentsToInsert.length === 0) {
      return NextResponse.json(
        { error: "Tidak ada artikel yang valid untuk diimpor." },
        { status: 400 }
      );
    }

    const db = await getDatabase();
    const result = await db
      .collection("knowledgeBase")
      .insertMany(documentsToInsert);

    return NextResponse.json({
      success: true,
      insertedCount: result.insertedCount,
      message: `Berhasil mengimpor ${result.insertedCount} artikel.`,
    });
  } catch (error) {
    console.error("CSV import error:", error);
    return NextResponse.json(
      { error: "Gagal memproses file CSV." },
      { status: 500 }
    );
  }
}
