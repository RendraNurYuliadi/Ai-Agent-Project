import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/mongodb";
import { getSessionFromRequest } from "@/lib/auth";
import { ObjectId } from "mongodb";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params;
    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ error: "ID artikel tidak valid" }, { status: 400 });
    }

    const body = await req.json();
    const { _id, id: bodyId, ...updateFields } = body;

    if (typeof updateFields.tags === "string") {
      updateFields.tags = updateFields.tags
        .split(",")
        .map((t: string) => t.trim())
        .filter(Boolean);
    }

    updateFields.updatedAt = new Date();
    updateFields.updatedBy = {
      id: session.id,
      name: session.name,
    };

    const db = await getDatabase();
    const result = await db
      .collection("knowledgeBase")
      .updateOne({ _id: new ObjectId(id) }, { $set: updateFields });

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: "Artikel tidak ditemukan" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: "Artikel berhasil diperbarui",
    });
  } catch (error) {
    console.error("Update article error:", error);
    return NextResponse.json(
      { error: "Failed to update knowledge base article" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params;
    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ error: "ID artikel tidak valid" }, { status: 400 });
    }

    const db = await getDatabase();
    const result = await db
      .collection("knowledgeBase")
      .deleteOne({ _id: new ObjectId(id) });

    if (result.deletedCount === 0) {
      return NextResponse.json({ error: "Artikel tidak ditemukan" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: "Artikel berhasil dihapus",
    });
  } catch (error) {
    console.error("Delete article error:", error);
    return NextResponse.json(
      { error: "Failed to delete knowledge base article" },
      { status: 500 }
    );
  }
}
