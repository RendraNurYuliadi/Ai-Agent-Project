import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/mongodb";
import bcrypt from "bcryptjs";
import { signSession } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email dan password wajib diisi." },
        { status: 400 }
      );
    }

    const db = await getDatabase();
    const usersCol = db.collection("users");

    const user = await usersCol.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      return NextResponse.json(
        { error: "Email atau password salah." },
        { status: 401 }
      );
    }

    let isMatch = false;
    // Check if password in db is hashed
    if (user.password && user.password.startsWith("$2")) {
      isMatch = await bcrypt.compare(password, user.password);
    } else {
      // Plain text fallback, then upgrade to bcrypt hash
      if (user.password === password) {
        isMatch = true;
        const hashed = await bcrypt.hash(password, 10);
        await usersCol.updateOne(
          { _id: user._id },
          { $set: { password: hashed, updatedAt: new Date() } }
        );
      }
    }

    if (!isMatch) {
      return NextResponse.json(
        { error: "Email atau password salah." },
        { status: 401 }
      );
    }

    const sessionUser = {
      id: user._id.toString(),
      name: user.name || "User",
      fullName: user.fullName || user.name || "User",
      email: user.email,
      role: user.role || "public_user",
    };

    const token = await signSession(sessionUser);

    const res = NextResponse.json({
      success: true,
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
    console.error("Login error:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan pada server saat login." },
      { status: 500 }
    );
  }
}
