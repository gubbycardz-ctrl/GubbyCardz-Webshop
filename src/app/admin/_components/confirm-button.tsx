"use client";

import { useState, useTransition } from "react";
import type { FormState } from "../catalog-actions";

/** A status change that cannot be undone, confirmed by the admin first. */
export function ConfirmButton({
  action,
  confirmMessage,
  label,
  variant = "primary",
}: {
  action: () => Promise<FormState>;
  confirmMessage: string;
  label: string;
  variant?: "primary" | "danger";
}) {
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();

  function handleClick() {
    if (!window.confirm(confirmMessage)) return;
    setError(undefined);
    startTransition(async () => setError((await action()).error));
  }

  const style =
    variant === "danger"
      ? "border border-brand-red text-brand-red hover:bg-brand-red/10"
      : "bg-brand-blue text-white hover:opacity-90";
  return (
    <span className="inline-flex flex-col items-start gap-1">
      <button
        type="button"
        onClick={handleClick}
        disabled={pending}
        className={`rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-50 ${style}`}
      >
        {pending ? "Wird gespeichert …" : label}
      </button>
      {error && (
        <span role="alert" className="max-w-xs text-xs text-brand-red">
          {error}
        </span>
      )}
    </span>
  );
}
