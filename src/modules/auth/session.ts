import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { cache } from "react";
import { getAdminAuth } from "@/shared/firebase-admin";
import { isAdmin, parseAdminEmails, type SessionUser } from "./admin-policy";

// Firebase's hosting products only forward a cookie with exactly this name.
const SESSION_COOKIE = "__session";
// Cookie name and lifetime are listed in the privacy policy (src/app/(legal)/datenschutz) – keep it in sync.
const SESSION_DURATION_MS = 5 * 24 * 60 * 60 * 1000;
// Firebase recommends minting session cookies only from fresh sign-ins.
const MAX_SIGN_IN_AGE_SECONDS = 5 * 60;

export const ADMIN_LOGIN_PATH = "/admin/login";

export type StartSessionResult = { ok: true } | { ok: false; reason: "invalid-token" | "stale-sign-in" | "not-admin" };

/** Exchanges a Firebase ID token for an httpOnly session cookie – for admins only. */
export async function startAdminSession(idToken: string): Promise<StartSessionResult> {
  const auth = getAdminAuth();
  const decoded = await auth.verifyIdToken(idToken, true).catch((error: unknown) => {
    logRejectedSignIn("invalid-token", errorCode(error));
    return null;
  });
  if (!decoded) return { ok: false, reason: "invalid-token" };

  if (Date.now() / 1000 - decoded.auth_time > MAX_SIGN_IN_AGE_SECONDS) {
    logRejectedSignIn("stale-sign-in", decoded.uid);
    return { ok: false, reason: "stale-sign-in" };
  }
  const user = toSessionUser(decoded);
  if (!isAdmin(user, adminEmails())) {
    logRejectedSignIn("not-admin", decoded.uid);
    return { ok: false, reason: "not-admin" };
  }

  const sessionCookie = await auth.createSessionCookie(idToken, { expiresIn: SESSION_DURATION_MS });
  (await cookies()).set(SESSION_COOKIE, sessionCookie, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DURATION_MS / 1000,
  });
  return { ok: true };
}

/** The signed-in user, or null. Checks revocation, so a logout ends every session. */
export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  const sessionCookie = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!sessionCookie) return null;

  // Verification compares against the current time, which only makes sense at request time.
  await connection();
  const decoded = await getAdminAuth()
    .verifySessionCookie(sessionCookie, true)
    .catch(() => null);
  return decoded ? toSessionUser(decoded) : null;
});

/** Guard for admin pages and Server Actions: redirects everyone else to the login. */
export async function requireAdmin(): Promise<SessionUser> {
  const user = await getSessionUser();
  // Re-checked on every request so removing an email from ADMIN_EMAILS takes effect immediately.
  if (!user || !isAdmin(user, adminEmails())) redirect(ADMIN_LOGIN_PATH);
  return user;
}

/** For pages and actions that only change their behavior for admins (instead of redirecting like requireAdmin). */
export async function isAdminSession(): Promise<boolean> {
  const user = await getSessionUser();
  return user !== null && isAdmin(user, adminEmails());
}

export async function endSession() {
  const user = await getSessionUser();
  (await cookies()).delete(SESSION_COOKIE);
  if (user) await getAdminAuth().revokeRefreshTokens(user.uid);
}

// Shows up in the App Hosting logs. Only reason and uid/error code – never tokens or email addresses.
function logRejectedSignIn(reason: string, detail: string) {
  console.warn(`Admin sign-in rejected: ${reason} (${detail})`);
}

function errorCode(error: unknown) {
  return typeof error === "object" && error !== null && "code" in error ? String(error.code) : "unknown";
}

function adminEmails() {
  return parseAdminEmails(process.env.ADMIN_EMAILS);
}

function toSessionUser(token: { uid: string; email?: string; email_verified?: boolean }): SessionUser {
  return { uid: token.uid, email: token.email ?? null, emailVerified: token.email_verified === true };
}
