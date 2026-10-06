import { jwtVerify, SignJWT } from "jose";
import { timingSafeEqual } from "node:crypto";

const ADMIN_COOKIE = "casino-admin-session";
const ADMIN_SESSION_SECONDS = 8 * 60 * 60;
const ADMIN_ISSUER = "casino-room";
const ADMIN_AUDIENCE = "casino-room-admin";

function getAdminPasscode() {
  const passcode = process.env.ADMIN_PASSCODE?.trim();
  if (!passcode || passcode.length < 6) {
    throw new Error("ADMIN_PASSCODE must be configured with at least 6 characters.");
  }
  return passcode;
}

function getAdminSessionKey() {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret || Buffer.byteLength(secret) < 32) {
    throw new Error("ADMIN_SESSION_SECRET must be configured with at least 32 bytes.");
  }
  return new TextEncoder().encode(secret);
}

function passcodesMatch(candidate: string, expected: string) {
  const candidateBytes = Buffer.from(candidate);
  const expectedBytes = Buffer.from(expected);
  return candidateBytes.length === expectedBytes.length && timingSafeEqual(candidateBytes, expectedBytes);
}

export class UnauthorizedAdminError extends Error {
  readonly status = 401;

  constructor() {
    super("Unauthorized");
    this.name = "UnauthorizedAdminError";
  }
}

export async function authenticateAdmin(candidate: string) {
  const expected = getAdminPasscode();
  const sessionKey = getAdminSessionKey();
  if (!passcodesMatch(candidate.trim(), expected)) return false;

  const token = await new SignJWT({ role: "admin" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuer(ADMIN_ISSUER)
    .setAudience(ADMIN_AUDIENCE)
    .setIssuedAt()
    .setExpirationTime(`${ADMIN_SESSION_SECONDS}s`)
    .sign(sessionKey);

  const { setCookie } = await import("@tanstack/react-start/server");
  setCookie(ADMIN_COOKIE, token, {
    path: "/",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: ADMIN_SESSION_SECONDS,
  });
  return true;
}

export async function hasAdminSession() {
  const { getCookie } = await import("@tanstack/react-start/server");
  const token = getCookie(ADMIN_COOKIE);
  if (!token) return false;

  const sessionKey = getAdminSessionKey();
  try {
    const { payload } = await jwtVerify(token, sessionKey, {
      algorithms: ["HS256"],
      issuer: ADMIN_ISSUER,
      audience: ADMIN_AUDIENCE,
    });
    return payload.role === "admin";
  } catch {
    return false;
  }
}

export async function requireAdminSession() {
  if (!(await hasAdminSession())) throw new UnauthorizedAdminError();
}
