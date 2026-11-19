import { jwtVerify, SignJWT } from "jose";

const SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "super-secret-genai-chatbot-token-key-2026"
);

export interface EngagementWidgetClaims {
  engagementId: string;
  windowId: string;
  entryPointId: string;
  origin: string;
}

export async function signEngagementWidgetToken(
  claims: EngagementWidgetClaims
): Promise<string> {
  return new SignJWT({ ...claims, purpose: "engagement-widget" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("12h")
    .sign(SECRET);
}

export async function verifyEngagementWidgetToken(
  token: string
): Promise<EngagementWidgetClaims | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET);
    if (
      payload.purpose !== "engagement-widget" ||
      typeof payload.engagementId !== "string" ||
      typeof payload.windowId !== "string" ||
      typeof payload.entryPointId !== "string" ||
      typeof payload.origin !== "string"
    ) {
      return null;
    }

    return {
      engagementId: payload.engagementId,
      windowId: payload.windowId,
      entryPointId: payload.entryPointId,
      origin: payload.origin,
    };
  } catch {
    return null;
  }
}
