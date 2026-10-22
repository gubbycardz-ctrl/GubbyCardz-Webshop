"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { ADMIN_LOGIN_PATH, endSession, startAdminSession } from "@/modules/auth/server";

// Firebase ID tokens are JWTs of a few hundred to ~2000 characters.
const idTokenSchema = z.string().min(1).max(4096);

const SIGN_IN_ERRORS = {
  "invalid-token": "Anmeldung fehlgeschlagen. Bitte erneut versuchen.",
  "stale-sign-in": "Die Anmeldung ist zu alt. Bitte erneut anmelden.",
  "not-admin": "Dieses Konto hat keinen Zugriff auf den Admin-Bereich.",
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
