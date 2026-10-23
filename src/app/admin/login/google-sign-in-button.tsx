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
        setError("Anmeldung bei Google abgebrochen oder fehlgeschlagen.");
        return;
      }
      try {
        // On success the action redirects to /admin and never returns.
        const result = await signInAsAdmin(idToken);
        setError(result.error);
      } catch {
        // Usually a new shop version went live while this page was open.
        setError("Der Shop wurde gerade aktualisiert. Bitte lade die Seite neu (Strg+F5) und melde dich erneut an.");
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
        {isPending ? "Anmeldung läuft …" : "Mit Google anmelden"}
      </button>
      {error && (
        <p role="alert" className="text-sm text-brand-red">
          {error}
        </p>
      )}
    </div>
  );
}
