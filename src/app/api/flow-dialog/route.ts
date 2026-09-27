import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/mongodb";
import { getSessionFromRequest } from "@/lib/auth";
import { ObjectId } from "mongodb";

export async function GET(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const db = await getDatabase();
    const flows = await db.collection("flowDialogs").find({}).sort({ createdAt: -1 }).toArray();
    return NextResponse.json({
      flows: flows.map((f) => ({
        id: f._id.toString(),
        name: f.name,
        description: f.description,
        nodes: f.nodes || [],
        edges: f.edges || [],
        isActive: f.isActive,
        createdAt: f.createdAt,
        updatedAt: f.updatedAt,
      })),
    });
  } catch (err) {
    return NextResponse.json({ error: "Failed to fetch flows" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.role === "public_user") return NextResponse.json({ error: "Akses ditolak" }, { status: 403 });
  try {
    const { name, description, nodes, edges } = await req.json();
    if (!name) return NextResponse.json({ error: "Nama flow wajib diisi" }, { status: 400 });
    const db = await getDatabase();
    const result = await db.collection("flowDialogs").insertOne({
      name, description: description || "", nodes: nodes || [], edges: edges || [],
      isActive: false,
      createdBy: { id: session.id, name: session.name },
      createdAt: new Date(), updatedAt: new Date(),
    });
    return NextResponse.json({ success: true, id: result.insertedId.toString() });
  } catch (err) {
    return NextResponse.json({ error: "Failed to create flow" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.role === "public_user") return NextResponse.json({ error: "Akses ditolak" }, { status: 403 });
  try {
    const { id, name, description, nodes, edges, isActive } = await req.json();
    if (!ObjectId.isValid(id)) return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    const db = await getDatabase();
    if (isActive) {
      await db.collection("flowDialogs").updateMany({}, { $set: { isActive: false } });
    }
    await db.collection("flowDialogs").updateOne(
      { _id: new ObjectId(id) },
      { $set: { name, description, nodes, edges, isActive, updatedAt: new Date() } }
    );
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: "Failed to update flow" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.role !== "admin") return NextResponse.json({ error: "Admin only" }, { status: 403 });
  try {
    const { id } = await req.json();
    if (!ObjectId.isValid(id)) return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    const db = await getDatabase();
    await db.collection("flowDialogs").deleteOne({ _id: new ObjectId(id) });
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: "Failed to delete flow" }, { status: 500 });
  }
}
