import { z } from "zod";

// Validates form input against a schema and reports problems as German text
// ready to show next to the form, e.g. "Nummer: bitte ausfüllen · Preis: …".

export type FormFields = Record<string, string | undefined>;
export type FormResult<T> = { ok: true; value: T } | { ok: false; error: string };

const MISSING = "bitte ausfüllen";

export function validateForm<T>(
  schema: z.ZodType<T>,
  candidate: unknown,
  fieldLabels: Record<string, string>,
): FormResult<T> {
  const result = schema.safeParse(candidate, { error: z.locales.de().localeError });
  if (result.success) return { ok: true, value: result.data };

  // One message per field; a derived field (e.g. slug from name) would otherwise repeat it.
  // "bitte ausfüllen" wins, because it is the actual cause.
  const values = (candidate ?? {}) as Record<string, unknown>;
  const messages = new Map<string, string>();
  for (const issue of result.error.issues) {
    const field = String(issue.path[0] ?? "");
    const label = fieldLabels[field] ?? field;
    if (values[field] === undefined || values[field] === "") messages.set(label, MISSING);
    else if (!messages.has(label)) messages.set(label, issue.message);
  }
  return { ok: false, error: [...messages].map(([label, message]) => `${label}: ${message}`).join(" · ") };
}

export function text(value: string | undefined) {
  return (value ?? "").trim();
}

export function optionalText(value: string | undefined) {
  return text(value) || undefined;
}

/** Collects the text fields of a submitted form (files are ignored). */
export function formFieldsOf(formData: FormData): FormFields {
  const fields: FormFields = {};
  for (const [key, value] of formData) {
    if (typeof value === "string") fields[key] = value;
  }
  return fields;
}

// A form field people never see, but bots fill in. Public forms reject submissions that contain it.
export const HONEYPOT_FIELD = "website";

export function isHoneypotFilled(fields: FormFields) {
  return text(fields[HONEYPOT_FIELD]) !== "";
}
