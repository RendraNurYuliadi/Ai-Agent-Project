import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { NextRequest } from "next/server";

const SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "super-secret-genai-chatbot-token-key-2026"
);

export interface UserSession {
  id: string;
  name: string;
  fullName: string;
  email: string;
  role: "admin" | "manager" | "public_user";
  userType: "human" | "bot";
}

export async function signSession(user: UserSession): Promise<string> {
  return await new SignJWT({
    id: user.id,
    name: user.name,
    fullName: user.fullName,
    email: user.email,
    role: user.role,
    userType: user.userType,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("24h")
    .sign(SECRET);
}

export async function verifyToken(token: string): Promise<UserSession | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET);
    return {
      id: payload.id as string,
      name: payload.name as string,
      fullName: (payload.fullName as string) || (payload.name as string) || "User",
      email: payload.email as string,
      role: payload.role as "admin" | "manager" | "public_user",
      userType: payload.userType === "bot" ? "bot" : "human",
    };
  } catch {
    return null;
  }
}

export async function getSession(): Promise<UserSession | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get("auth_token")?.value;
  if (!token) return null;
  return await verifyToken(token);
}

export async function getSessionFromRequest(
  req: NextRequest
): Promise<UserSession | null> {
  const token = req.cookies.get("auth_token")?.value;
  if (!token) return null;
  return await verifyToken(token);
}
