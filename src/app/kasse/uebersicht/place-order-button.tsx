"use client";

import { useState, useTransition } from "react";
import { placeOrder, type CheckoutState } from "../actions";

/** The legally required "Button-Lösung" (§ 312j BGB): the label must say that ordering costs money. */
export function PlaceOrderButton({ totalCents, disabledReason }: { totalCents: number; disabledReason?: string }) {
  const [state, setState] = useState<CheckoutState>({});
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex flex-col items-end gap-2">
      <button
        type="button"
        disabled={pending || disabledReason !== undefined}
        onClick={() => startTransition(async () => setState(await placeOrder(totalCents)))}
        className="rounded-lg bg-brand-red px-6 py-3 font-semibold text-white hover:opacity-90 disabled:opacity-50"
      >
        {pending ? "Weiter zur Bezahlung …" : "Zahlungspflichtig bestellen"}
      </button>
      {disabledReason && <p className="max-w-md text-right text-sm text-foreground/60">{disabledReason}</p>}
      {state.error && (
        <p role="alert" className="max-w-md text-right text-sm text-brand-red">
          {state.error}
        </p>
      )}
    </div>
  );
}
