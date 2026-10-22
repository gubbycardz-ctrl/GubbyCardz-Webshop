"use client";

import { useState, useTransition, type FormEvent, type ReactNode } from "react";
import type { FormState } from "../catalog-actions";

export const inputClass =
  "w-full rounded-lg border border-foreground/20 bg-background px-3 py-2 text-sm focus:border-brand-blue focus:outline-none";

type Action = (previous: FormState, formData: FormData) => Promise<FormState>;

/**
 * Submits a form to a Server Action. Unlike a plain `<form action>`, inputs are only
 * cleared after success, so a validation error never wipes what the admin typed.
 */
export function useAdminForm(action: Action, { resetOnSuccess = true } = {}) {
  const [state, setState] = useState<FormState>({});
  const [pending, startTransition] = useTransition();

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    startTransition(async () => {
      const result = await action({}, formData);
      setState(result);
      if (!result.error && resetOnSuccess) form.reset();
    });
  }

  return { state, pending, onSubmit };
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="text-foreground/70">{label}</span>
      {children}
    </label>
  );
}

export function SubmitButton({ pending, children }: { pending: boolean; children: ReactNode }) {
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-lg bg-brand-blue px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
    >
      {pending ? "Speichert …" : children}
    </button>
  );
}

export function FormMessage({ state }: { state: FormState }) {
  if (state.error) {
    return (
      <p role="alert" className="text-sm text-brand-red">
        {state.error}
      </p>
    );
  }
  if (state.success) {
    return (
      <p role="status" className="text-sm text-green-700 dark:text-green-400">
        {state.success}
      </p>
    );
  }
  return null;
}
