import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { createSession, setSessionCookie } from "@/lib/session";
import { logAudit } from "@/lib/authz";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body?.password === "string" ? body.password : "";

  if (!email || !password) {
    return NextResponse.json({ error: "Email et mot de passe requis." }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    return NextResponse.json({ error: "Identifiants invalides." }, { status: 401 });
  }

  const { token, expiresAt } = await createSession(user.id);
  await logAudit(user.id, "USER_LOGIN", "User", user.id);

  const res = NextResponse.json({
    user: { id: user.id, email: user.email, displayName: user.displayName, role: user.role },
  });
  setSessionCookie(res, token, expiresAt);
  return res;
}
