import { randomBytes, createHash } from "crypto";
import { cookies } from "next/headers";
import { prisma } from "./prisma";
import type { NextResponse } from "next/server";

const SESSION_COOKIE = "turf_session";
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 7; // 7 jours

export type Role = "CUSTOMER" | "EDITOR" | "ADMIN" | "SUPER_ADMIN";

export type SessionUser = {
  id: string;
  email: string;
  displayName: string | null;
  role: Role;
};

export function setSessionCookie(res: NextResponse, token: string, expiresAt: Date) {
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    expires: expiresAt,
    path: "/",
  });
}

export async function clearSessionCookie() {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

/** CrÃ©e une session serveur et retourne le token brut (Ã  poser en cookie httpOnly). */
export async function createSession(userId: string) {
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  await prisma.session.create({
    data: { userId, tokenHash: hashToken(token), expiresAt },
  });
  return { token, expiresAt };
}

export async function destroySession(token: string) {
  await prisma.session.updateMany({
    where: { tokenHash: hashToken(token), revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

/** RÃ©sout l'utilisateur courant depuis le cookie de session, ou null. */
export async function getSessionUser(): Promise<SessionUser | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const session = await prisma.session.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { user: true },
  });
  if (!session || session.revokedAt || session.expiresAt < new Date()) return null;

  return {
    id: session.user.id,
    email: session.user.email,
    displayName: session.user.displayName,
    role: session.user.role as Role,
  };
}

export function isStaff(role: Role | undefined | null) {
  return role === "ADMIN" || role === "SUPER_ADMIN" || role === "EDITOR";
}

export const sessionCookie = SESSION_COOKIE;
export const sessionTtlMs = SESSION_TTL_MS;
