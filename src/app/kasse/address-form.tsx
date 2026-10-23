"use client";

import { useState, useTransition, type FormEvent, type ReactNode } from "react";
import { SHIPPING_COUNTRIES } from "@/modules/shipping";
import { HONEYPOT_FIELD, type FormFields } from "@/shared/form-validation";
import { saveCheckoutAddress, type CheckoutState } from "./actions";

const inputClass =
  "w-full rounded-lg border border-foreground/20 bg-background px-3 py-2 focus:border-brand-blue focus:outline-none";

/** Keeps what the customer typed when validation fails (a plain form action would reset it). */
export function AddressForm({ defaults }: { defaults: FormFields }) {
  const [state, setState] = useState<CheckoutState>({});
  const [pending, startTransition] = useTransition();

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(async () => setState(await saveCheckoutAddress({}, formData)));
  }

  return (
    <form onSubmit={onSubmit} className="mt-6 grid gap-4 sm:grid-cols-6">
      <Field label="E-Mail" className="sm:col-span-6">
        <input name="email" type="email" required autoComplete="email" maxLength={254} defaultValue={defaults.email} className={inputClass} />
        <span className="text-xs text-foreground/60">Für die Bestellbestätigung und Rückfragen zur Lieferung.</span>
      </Field>
      <Field label="Vor- und Nachname" className="sm:col-span-6">
        <input name="name" required autoComplete="name" maxLength={100} defaultValue={defaults.name} className={inputClass} />
      </Field>
      <Field label="Straße und Hausnummer" className="sm:col-span-6">
        <input name="street" required autoComplete="street-address" maxLength={100} defaultValue={defaults.street} className={inputClass} />
      </Field>
      <Field label="PLZ" className="sm:col-span-2">
        <input name="postalCode" required autoComplete="postal-code" maxLength={10} defaultValue={defaults.postalCode} className={inputClass} />
      </Field>
      <Field label="Ort" className="sm:col-span-4">
        <input name="city" required autoComplete="address-level2" maxLength={60} defaultValue={defaults.city} className={inputClass} />
      </Field>
      <Field label="Land" className="sm:col-span-6">
        <select name="country" autoComplete="country" defaultValue={defaults.country ?? "DE"} className={inputClass}>
          {Object.entries(SHIPPING_COUNTRIES).map(([code, country]) => (
            <option key={code} value={code}>
              {country.label}
            </option>
          ))}
        </select>
        <span className="text-xs text-foreground/60">Wir versenden versichert nach Deutschland und in die Niederlande.</span>
      </Field>
      {/* Honeypot: hidden from people and screen readers, filled in by bots. */}
      <input type="text" name={HONEYPOT_FIELD} tabIndex={-1} autoComplete="off" aria-hidden="true" className="hidden" />
      <div className="flex flex-col items-end gap-2 sm:col-span-6">
        {state.error && (
          <p role="alert" className="text-right text-sm text-brand-red">
            {state.error}
          </p>
        )}
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-brand-blue px-5 py-2.5 font-medium text-white hover:opacity-90 disabled:opacity-50"
        >
          {pending ? "Wird geprüft …" : "Weiter zur Bestellübersicht"}
        </button>
      </div>
    </form>
  );
}

function Field({ label, className, children }: { label: string; className: string; children: ReactNode }) {
  return (
    <label className={`flex flex-col gap-1 text-sm ${className}`}>
      <span className="text-foreground/70">{label}</span>
      {children}
    </label>
  );
}
