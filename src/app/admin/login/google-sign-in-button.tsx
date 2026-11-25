"use client";

import { useState, useTransition } from "react";
import { signInWithGoogle } from "@/modules/auth/client";
import { signInAsAdmin } from "../actions";

export function GoogleSignInButton() {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    setError(null);
    startTransition(async () => {
      let idToken: string;
      try {
        idToken = await signInWithGoogle();
      } catch {
        setError("Google sign-in was cancelled or failed.");
        return;
      }
      try {
        // On success the action redirects to /admin and never returns.
        const result = await signInAsAdmin(idToken);
        setError(result.error);
      } catch {
        // Usually a new shop version went live while this page was open.
        setError("The shop was just updated. Reload the page (Ctrl+F5) and sign in again.");
      }
    });
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <button
        type="button"
        onClick={handleClick}
        disabled={isPending}
        className="rounded-lg bg-brand-blue px-5 py-2.5 font-medium text-white hover:opacity-90 disabled:opacity-50"
      >
        {isPending ? "Signing in …" : "Sign in with Google"}
      </button>
      {error && (
        <p role="alert" className="text-sm text-brand-red">
          {error}
        </p>
      )}
    </div>
  );
}
