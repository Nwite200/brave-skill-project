import "server-only";

import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { cache } from "react";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import type { Role } from "@prisma/client";

export const SESSION_COOKIE = "bs_session";
const SESSION_DAYS = 7;

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  role: Role;
  status: "ACTIVE" | "SUSPENDED";
  avatarUrl: string | null;
  tokenVersion: number;
};

const secretKey = () => new TextEncoder().encode(env.authSecret);

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

export async function createSessionToken(user: {
  id: string;
  role: Role;
  tokenVersion: number;
}) {
  return new SignJWT({ role: user.role, tv: user.tokenVersion })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user.id)
    .setIssuedAt()
    .setIssuer("brave-skill")
    .setAudience("brave-skill-web")
    .setExpirationTime(`${SESSION_DAYS}d`)
    .sign(secretKey());
}

export async function readSessionToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, secretKey(), {
      issuer: "brave-skill",
      audience: "brave-skill-web",
    });
    if (!payload.sub) return null;
    return { userId: payload.sub, role: payload.role as Role, tokenVersion: Number(payload.tv ?? 0) };
  } catch {
    return null;
  }
}

export async function setSessionCookie(token: string) {
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: env.isProduction,
    path: "/",
    maxAge: SESSION_DAYS * 24 * 60 * 60,
  });
}

export async function clearSessionCookie() {
  const jar = await cookies();
  jar.set(SESSION_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: env.isProduction,
    path: "/",
    maxAge: 0,
  });
}

export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const payload = await readSessionToken(token);
  if (!payload) return null;

  let user;
  try {
    const user = await db.user.findUnique({
      where: { id: payload.userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        avatarUrl: true,
        tokenVersion: true,
      },
    });
  } catch {
    // Public frontend must remain available before D1 is provisioned.
    return null;
  }
  if (!user || user.status !== "ACTIVE") return null;
  if (user.tokenVersion !== payload.tokenVersion) return null;
  return user;
});

export async function requireUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) throw new AuthError("Please sign in to continue.", 401);
  return user;
}

export async function requireRole(...roles: Role[]): Promise<SessionUser> {
  const user = await requireUser();
  if (!roles.includes(user.role)) throw new AuthError("You do not have access to this resource.", 403);
  return user;
}

export async function requireStaff(): Promise<SessionUser> {
  return requireRole("MASTER_ADMIN", "ADMIN", "INSTRUCTOR");
}

export async function requireAdmin(): Promise<SessionUser> {
  return requireRole("MASTER_ADMIN", "ADMIN");
}

export class AuthError extends Error {
  status: number;
  constructor(message: string, status = 401) {
    super(message);
    this.status = status;
    this.name = "AuthError";
  }
}

export function isStaff(role?: Role | null) {
  return role === "MASTER_ADMIN" || role === "ADMIN" || role === "INSTRUCTOR";
}

export function isAdmin(role?: Role | null) {
  return role === "MASTER_ADMIN" || role === "ADMIN";
}

export const ROLE_LABEL: Record<Role, string> = {
  MASTER_ADMIN: "Master Administrator",
  ADMIN: "Administrator",
  INSTRUCTOR: "Instructor",
  STUDENT: "Student",
};

/** Page-level guard: redirects instead of throwing so users never see a 500. */
export async function requireStaffPage(): Promise<SessionUser> {
  const { redirect } = await import("next/navigation");
  const user = await getSessionUser();
  if (!user) redirect("/login?next=/admin");
  const authed = user as SessionUser;
  if (authed.role === "STUDENT") redirect("/dashboard");
  return authed;
}

export async function requireAdminPage(): Promise<SessionUser> {
  const { redirect } = await import("next/navigation");
  const user = await getSessionUser();
  if (!user) redirect("/login?next=/admin");
  const authed = user as SessionUser;
  if (authed.role === "STUDENT") redirect("/dashboard");
  if (!isAdmin(authed.role)) redirect("/admin?denied=admin-only");
  return authed;
}
