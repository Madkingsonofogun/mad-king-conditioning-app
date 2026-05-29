import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SignJWT, jwtVerify } from "jose";
import { prisma } from "@/lib/prisma";
import { hashPassword, verifyPassword } from "@/lib/password";

const cookieName = "smart_coach_session";
const secret = new TextEncoder().encode(process.env.AUTH_SECRET || "local-development-secret-change-before-production");

export async function createSession(user: { id: string; role: string; email: string; name: string }) {
  const token = await new SignJWT({
    sub: user.id,
    role: user.role,
    email: user.email,
    name: user.name
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secret);

  cookies().set(cookieName, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/"
  });
}

export function clearSession() {
  cookies().delete(cookieName);
}

export async function getSession() {
  const token = cookies().get(cookieName)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret);
    return {
      userId: String(payload.sub),
      role: String(payload.role),
      email: String(payload.email),
      name: String(payload.name)
    };
  } catch {
    return null;
  }
}

export async function requireUser() {
  const session = await getSession();
  if (!session) redirect("/login");
  return session;
}

export async function requireCoach() {
  const session = await requireUser();
  if (!["ADMIN", "COACH"].includes(session.role)) redirect("/client/dashboard");
  return session;
}

export async function requireAdmin() {
  const session = await requireUser();
  if (session.role !== "ADMIN") redirect("/admin/dashboard");
  return session;
}

export async function requireClient() {
  const session = await requireUser();
  if (session.role !== "CLIENT") redirect("/admin/dashboard");
  const profile = await prisma.clientProfile.findUnique({ where: { userId: session.userId } });
  if (!profile) redirect("/login");
  return { session, profile };
}

export async function login(identifier: string, passwordOrPin: string) {
  const trimmed = identifier.trim();
  const code = passwordOrPin.trim();

  if (!trimmed && /^\d+$/.test(code)) {
    const admins = await prisma.user.findMany({ where: { role: "ADMIN" } });
    for (const admin of admins) {
      if (await verifyPassword(code, admin.passwordHash)) {
        await createSession(admin);
        return admin;
      }
    }
    return null;
  }

  const emailMatch = trimmed.includes("@")
    ? await prisma.user.findUnique({ where: { email: trimmed.toLowerCase() } })
    : null;

  const user =
    emailMatch ??
    (await prisma.user.findFirst({
      where: {
        name: trimmed,
        role: { in: ["ADMIN", "COACH"] }
      }
    }));

  if (!user) return null;
  const ok = await verifyPassword(code, user.passwordHash);
  if (!ok) return null;
  await createSession(user);
  return user;
}
