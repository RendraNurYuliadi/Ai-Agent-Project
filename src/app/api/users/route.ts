import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/mongodb";
import { getSessionFromRequest } from "@/lib/auth";
import bcrypt from "bcryptjs";

export async function GET(req: NextRequest) {
  try {
    const session = await getSessionFromRequest(req);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const db = await getDatabase();
    const users = await db
      .collection("users")
      .find({}, { projection: { password: 0 } })
      .sort({ createdAt: -1 })
      .toArray();

    const formattedUsers = users.map((u) => ({
      id: u._id.toString(),
      name: u.name,
      fullName: u.fullName || u.name || "",
      email: u.email,
      role: u.role,
      createdAt: u.createdAt || null,
      updatedAt: u.updatedAt || null,
    }));

    return NextResponse.json({ users: formattedUsers });
  } catch (error) {
    console.error("Fetch users error:", error);
    return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSessionFromRequest(req);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.role !== "admin") {
      return NextResponse.json(
        { error: "Hanya Admin yang dapat menambahkan user baru." },
        { status: 403 }
      );
    }

    const { name, email, password, role, fullName } = await req.json();

    if (!name || !email || !password || !role) {
      return NextResponse.json(
        { error: "Nama, email, password, dan role wajib diisi." },
        { status: 400 }
      );
    }

    const validRoles = ["admin", "manager", "public_user"];
    if (!validRoles.includes(role)) {
      return NextResponse.json(
        { error: "Role tidak valid. Pilih: admin, manager, atau public_user." },
        { status: 400 }
      );
    }

    const db = await getDatabase();
    const usersCol = db.collection("users");

    const existing = await usersCol.findOne({ email: email.toLowerCase().trim() });
    if (existing) {
      return NextResponse.json(
        { error: "Email sudah terdaftar." },
        { status: 400 }
      );
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await usersCol.insertOne({
      name: name.trim(),
      fullName: fullName?.trim() || name.trim(),
      email: email.toLowerCase().trim(),
      password: hashedPassword,
      role,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return NextResponse.json({
      success: true,
      user: {
        id: result.insertedId.toString(),
        name: name.trim(),
        email: email.toLowerCase().trim(),
        role,
      },
    });
  } catch (error) {
    console.error("Create user error:", error);
    return NextResponse.json({ error: "Failed to create user" }, { status: 500 });
  }
}
