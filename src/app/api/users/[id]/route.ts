import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/mongodb";
import { getSessionFromRequest } from "@/lib/auth";
import { ObjectId } from "mongodb";
import bcrypt from "bcryptjs";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSessionFromRequest(req);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.role !== "admin") {
      return NextResponse.json(
        { error: "Hanya Admin yang dapat mengedit user." },
        { status: 403 }
      );
    }

    const { id } = await params;
    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ error: "ID user tidak valid" }, { status: 400 });
    }

    const { name, email, password, role, fullName } = await req.json();

    const db = await getDatabase();
    const usersCol = db.collection("users");

    const targetUser = await usersCol.findOne({ _id: new ObjectId(id) });
    if (!targetUser) {
      return NextResponse.json({ error: "User tidak ditemukan" }, { status: 404 });
    }

    const updateDoc: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    if (name) updateDoc.name = name.trim();
    if (fullName !== undefined) updateDoc.fullName = fullName?.trim() || name?.trim() || targetUser.name;
    if (role) {
      const validRoles = ["admin", "manager", "public_user"];
      if (!validRoles.includes(role)) {
        return NextResponse.json({ error: "Role tidak valid" }, { status: 400 });
      }
      updateDoc.role = role;
    }

    if (email) {
      const lowerEmail = email.toLowerCase().trim();
      if (lowerEmail !== targetUser.email) {
        const emailTaken = await usersCol.findOne({
          email: lowerEmail,
          _id: { $ne: new ObjectId(id) },
        });
        if (emailTaken) {
          return NextResponse.json(
            { error: "Email sudah digunakan oleh user lain" },
            { status: 400 }
          );
        }
        updateDoc.email = lowerEmail;
      }
    }

    if (password && password.trim().length > 0) {
      updateDoc.password = await bcrypt.hash(password.trim(), 10);
    }

    await usersCol.updateOne({ _id: new ObjectId(id) }, { $set: updateDoc });

    return NextResponse.json({
      success: true,
      message: "User berhasil diperbarui",
    });
  } catch (error) {
    console.error("Update user error:", error);
    return NextResponse.json({ error: "Failed to update user" }, { status: 500 });
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

    if (session.role !== "admin") {
      return NextResponse.json(
        { error: "Hanya Admin yang dapat menghapus user." },
        { status: 403 }
      );
    }

    const { id } = await params;
    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ error: "ID user tidak valid" }, { status: 400 });
    }

    if (session.id === id) {
      return NextResponse.json(
        { error: "Anda tidak dapat menghapus akun Anda sendiri." },
        { status: 400 }
      );
    }

    const db = await getDatabase();
    const result = await db.collection("users").deleteOne({ _id: new ObjectId(id) });

    if (result.deletedCount === 0) {
      return NextResponse.json({ error: "User tidak ditemukan" }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: "User berhasil dihapus" });
  } catch (error) {
    console.error("Delete user error:", error);
    return NextResponse.json({ error: "Failed to delete user" }, { status: 500 });
  }
}
