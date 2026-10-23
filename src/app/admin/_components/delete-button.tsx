"use client";

import { useState, useTransition } from "react";
import type { FormState } from "../catalog-actions";

/** Deleting cannot be undone, so the admin confirms with the exact name first. */
export function DeleteButton({
  action,
  confirmMessage,
  label = "Löschen",
}: {
  action: () => Promise<FormState>;
  confirmMessage: string;
  label?: string;
}) {
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();

  function handleClick() {
    if (!window.confirm(confirmMessage)) return;
    setError(undefined);
    startTransition(async () => setError((await action()).error));
  }

  return (
    <span className="inline-flex flex-col items-start gap-1">
      <button
        type="button"
        onClick={handleClick}
        disabled={pending}
        className="text-sm text-brand-red hover:underline disabled:opacity-50"
      >
        {pending ? "Wird gelöscht …" : label}
      </button>
      {error && (
        <span role="alert" className="max-w-xs text-xs text-brand-red">
          {error}
        </span>
      )}
    </span>
  );
}
