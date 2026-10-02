import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/mongodb";
import bcrypt from "bcryptjs";
import { signSession } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const { fullName, name, email, password } = await req.json();

    if (!fullName?.trim() || !email?.trim() || !password) {
      return NextResponse.json(
        { error: "Nama Lengkap, Email, dan Password wajib diisi." },
        { status: 400 }
      );
    }

    const emailClean = email.toLowerCase().trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailClean)) {
      return NextResponse.json(
        { error: "Format email tidak valid." },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "Password minimal 6 karakter." },
        { status: 400 }
      );
    }

    const db = await getDatabase();
    const usersCol = db.collection("users");

    // Check existing email
    const existing = await usersCol.findOne({ email: emailClean });
    if (existing) {
      return NextResponse.json(
        { error: "Email sudah terdaftar. Silakan masuk menggunakan akun Anda." },
        { status: 400 }
      );
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const resolvedFullName = fullName.trim();
    const resolvedName = name?.trim() || resolvedFullName.split(/\s+/)[0] || "User";

    // Register user with default role: public_user
    const newUserDoc = {
      name: resolvedName,
      fullName: resolvedFullName,
      email: emailClean,
      password: hashedPassword,
      role: "public_user" as const,
      userType: "human" as const,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const insertResult = await usersCol.insertOne(newUserDoc);

    const sessionUser = {
      id: insertResult.insertedId.toString(),
      name: resolvedName,
      fullName: resolvedFullName,
      email: emailClean,
      role: "public_user" as const,
    };

    // Auto-login: sign session JWT and set cookie
    const token = await signSession(sessionUser);

    const res = NextResponse.json({
      success: true,
      message: "Registrasi berhasil.",
      user: sessionUser,
    });

    res.cookies.set("auth_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24, // 24 hours
      path: "/",
    });

    return res;
  } catch (error) {
    console.error("Register error:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan pada server saat registrasi." },
      { status: 500 }
    );
  }
}
