import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { describeOffer, describeProductKind } from "@/modules/catalog";
import type { PricedCartLine } from "@/modules/cart";
import { getPricedCart } from "@/modules/cart/server";
import { maxOrderValueMessage } from "@/modules/orders";
import { exceedsMaxOrderValue } from "@/modules/shipping";
import { formatEuro } from "@/shared/money";
import { PriceNote } from "@/app/price-note";
import { changeQuantity, removeFromCart } from "./actions";

export const metadata: Metadata = {
  title: "Warenkorb",
  robots: { index: false },
};

export default function CartPage() {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-10">
      <h1 className="text-3xl font-bold">Warenkorb</h1>
      <Suspense fallback={<p className="mt-6 text-foreground/60">Warenkorb wird geladen …</p>}>
        <CartContents />
      </Suspense>
    </main>
  );
}

async function CartContents() {
  const cart = await getPricedCart();

  if (cart.lines.length === 0 && cart.missingCount === 0) {
    return (
      <p className="mt-6 text-foreground/60">
        Dein Warenkorb ist leer.{" "}
        <Link href="/spiele" className="text-brand-blue hover:underline">
          Zum Sortiment
        </Link>
      </p>
    );
  }

  return (
    <>
      {cart.missingCount > 0 && (
        <p role="alert" className="mt-6 text-sm text-brand-red">
          {cart.missingCount === 1
            ? "Ein Artikel ist nicht mehr im Sortiment und wurde nicht berücksichtigt."
            : `${cart.missingCount} Artikel sind nicht mehr im Sortiment und wurden nicht berücksichtigt.`}
        </p>
      )}
      <ul className="mt-6 divide-y divide-foreground/10 rounded-xl border border-foreground/10">
        {cart.lines.map((line) => (
          <CartLineItem key={line.offer.id} line={line} />
        ))}
      </ul>
      <div className="mt-6 flex flex-col items-end gap-1">
        <p className="text-lg">
          Zwischensumme ({cart.itemCount} Artikel):{" "}
          <span className="font-semibold">{formatEuro(cart.subtotalCents)}</span>
        </p>
        <PriceNote />
        {exceedsMaxOrderValue(cart.subtotalCents) && (
          <p role="alert" className="max-w-md text-right text-sm text-brand-red">
            {maxOrderValueMessage()}
          </p>
        )}
        <button
          type="button"
          disabled
          title="Die Kasse folgt in Kürze"
          className="mt-3 rounded-lg bg-brand-blue px-5 py-2.5 font-medium text-white opacity-50"
        >
          Zur Kasse (folgt in Kürze)
        </button>
      </div>
    </>
  );
}

function CartLineItem({ line }: { line: PricedCartLine }) {
  const { offer, product } = line;
  return (
    <li className="flex flex-wrap items-center justify-between gap-4 px-4 py-4">
      <div className="min-w-48 flex-1">
        <Link href={`/produkte/${product.slug}`} className="font-medium hover:text-brand-blue">
          {product.name}
        </Link>
        <span className="block text-sm text-foreground/60">
          {describeProductKind(product)} · {describeOffer(offer)} · {formatEuro(offer.priceCents)} pro Stück
        </span>
        {line.issue === "reduced" && (
          <span className="block text-sm text-brand-red">Nur noch {offer.stock} auf Lager – Menge angepasst.</span>
        )}
        {line.issue === "sold-out" && <span className="block text-sm text-brand-red">Leider ausverkauft.</span>}
      </div>
      <div className="flex items-center gap-3">
        {line.issue !== "sold-out" && (
          <form action={changeQuantity.bind(null, offer.id)} className="flex items-center gap-2">
            <label className="sr-only" htmlFor={`quantity-${offer.id}`}>
              Menge
            </label>
            <input
              id={`quantity-${offer.id}`}
              name="quantity"
              type="number"
              min={1}
              max={offer.stock}
              defaultValue={line.quantity}
              className="w-16 rounded-lg border border-foreground/20 bg-background px-2 py-1 text-sm"
            />
            <button type="submit" className="text-sm text-brand-blue hover:underline">
              Ändern
            </button>
          </form>
        )}
        <form action={removeFromCart.bind(null, offer.id)}>
          <button type="submit" className="text-sm text-foreground/60 hover:text-brand-red">
            Entfernen
          </button>
        </form>
        <span className="w-24 text-right font-semibold">{formatEuro(line.lineTotalCents)}</span>
      </div>
    </li>
  );
}
