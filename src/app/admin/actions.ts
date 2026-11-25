"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { ADMIN_LOGIN_PATH, endSession, startAdminSession } from "@/modules/auth/server";

// Firebase ID tokens are JWTs of a few hundred to ~2000 characters.
const idTokenSchema = z.string().min(1).max(4096);

const SIGN_IN_ERRORS = {
  "invalid-token": "Sign-in failed. Please try again.",
  "stale-sign-in": "The sign-in is too old. Please sign in again.",
  "not-admin": "This account has no access to the admin area.",
} as const;

export async function signInAsAdmin(idToken: unknown): Promise<{ error: string }> {
  const parsed = idTokenSchema.safeParse(idToken);
  if (!parsed.success) return { error: SIGN_IN_ERRORS["invalid-token"] };

  const result = await startAdminSession(parsed.data);
  if (!result.ok) return { error: SIGN_IN_ERRORS[result.reason] };
  redirect("/admin");
}

export async function signOut() {
  await endSession();
  redirect(ADMIN_LOGIN_PATH);
}
