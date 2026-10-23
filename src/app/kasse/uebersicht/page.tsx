import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { getPricedCart } from "@/modules/cart/server";
import { buildOrder, type Order } from "@/modules/orders";
import { ORDERING_DISABLED_MESSAGE, isOrderingEnabled, readCheckoutCustomer } from "@/modules/orders/server";
import { TAX_NOTE } from "@/modules/pricing";
import { SHIPPING_COUNTRIES } from "@/modules/shipping";
import { formatEuro } from "@/shared/money";
import { PlaceOrderButton } from "./place-order-button";

export const metadata: Metadata = {
  title: "Bestellübersicht",
  robots: { index: false },
};

export default function OrderOverviewPage() {
  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-10">
      <p className="text-sm text-foreground/60">Schritt 2 von 2</p>
      <h1 className="text-3xl font-bold">Bestellübersicht</h1>
      <Suspense fallback={<p className="mt-6 text-foreground/60">Wird geladen …</p>}>
        <Overview />
      </Suspense>
    </main>
  );
}

async function Overview() {
  const customer = await readCheckoutCustomer();
  if (!customer) redirect("/kasse");
  const cart = await getPricedCart();
  if (cart.lines.length === 0 && cart.missingCount === 0) redirect("/warenkorb");

  // Same calculation as when ordering, so the overview shows exactly what will be charged.
  const preview = buildOrder({ id: "preview", now: new Date(), customer, cart });
  if (!preview.ok) {
    return (
      <div className="mt-6">
        <p role="alert" className="text-brand-red">
          {preview.error}
        </p>
        <Link href="/warenkorb" className="mt-3 inline-block font-medium text-brand-blue hover:underline">
          Zum Warenkorb
        </Link>
      </div>
    );
  }

  return (
    <div className="mt-6 flex flex-col gap-8">
      <ShippingAddress order={preview.order} />
      <OrderLines order={preview.order} />
      <PlaceOrderButton
        totalCents={preview.order.totalCents}
        disabledReason={isOrderingEnabled() ? undefined : ORDERING_DISABLED_MESSAGE}
      />
    </div>
  );
}

function ShippingAddress({ order }: { order: Order }) {
  const { shippingAddress: address } = order;
  return (
    <section className="rounded-xl border border-foreground/10 p-4">
      <div className="flex items-start justify-between gap-4">
        <h2 className="font-semibold">Lieferadresse</h2>
        <Link href="/kasse" className="text-sm text-brand-blue hover:underline">
          Ändern
        </Link>
      </div>
      <address className="mt-2 not-italic leading-relaxed">
        {address.name}
        <br />
        {address.street}
        <br />
        {address.postalCode} {address.city}
        <br />
        {SHIPPING_COUNTRIES[address.country].label}
      </address>
      <p className="mt-2 text-sm text-foreground/60">E-Mail: {order.email}</p>
    </section>
  );
}

function OrderLines({ order }: { order: Order }) {
  return (
    <section>
      <div className="flex items-start justify-between gap-4">
        <h2 className="font-semibold">Artikel</h2>
        <Link href="/warenkorb" className="text-sm text-brand-blue hover:underline">
          Warenkorb bearbeiten
        </Link>
      </div>
      <ul className="mt-2 divide-y divide-foreground/10 rounded-xl border border-foreground/10">
        {order.lines.map((line) => (
          <li key={line.offerId} className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1 px-4 py-3">
            <span className="min-w-48 flex-1">
              {line.quantity}× {line.productName}
              <span className="block text-sm text-foreground/60">
                {line.description} · {formatEuro(line.unitPriceCents)} pro Stück
              </span>
            </span>
            <span className="font-medium">{formatEuro(line.unitPriceCents * line.quantity)}</span>
          </li>
        ))}
      </ul>
      <dl className="mt-4 grid grid-cols-[1fr_auto] gap-x-6 gap-y-1 text-right">
        <dt>Zwischensumme</dt>
        <dd>{formatEuro(order.subtotalCents)}</dd>
        <dt>Versand nach {SHIPPING_COUNTRIES[order.shippingAddress.country].label} (versichert)</dt>
        <dd>{formatEuro(order.shippingCents)}</dd>
        <dt className="text-lg font-semibold">Gesamtsumme</dt>
        <dd className="text-lg font-semibold">{formatEuro(order.totalCents)}</dd>
      </dl>
      <p className="mt-2 text-right text-sm text-foreground/60">{TAX_NOTE}</p>
    </section>
  );
}
