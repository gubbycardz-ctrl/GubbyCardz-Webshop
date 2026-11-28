"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { addToCart, type AddToCartState } from "@/app/(shop)/warenkorb/actions";

export function AddToCartButton({ offerId }: { offerId: string }) {
  const [state, setState] = useState<AddToCartState>({});
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        disabled={pending}
        onClick={() => startTransition(async () => setState(await addToCart(offerId)))}
        className="rounded-full bg-brand-red px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
      >
        {pending ? "Wird hinzugefügt …" : "In den Warenkorb"}
      </button>
      {state.success && (
        <Link href="/warenkorb" role="status" className="text-xs text-green-700 hover:underline dark:text-green-400">
          ✓ {state.success} – ansehen
        </Link>
      )}
      {state.error && (
        <p role="alert" className="text-xs text-brand-red">
          {state.error}
        </p>
      )}
    </div>
  );
}
