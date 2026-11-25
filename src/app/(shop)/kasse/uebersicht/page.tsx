import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { getPricedCart } from "@/modules/cart/server";
import { buildOrder, type Order } from "@/modules/orders";
import { getOrderingAccess, readCheckoutCustomer } from "@/modules/orders/server";
import { AddressLines, OrderItems } from "../order-summary";
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

  const access = await getOrderingAccess();
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
      {access.open && access.testMode && <TestModeNote />}
      <PlaceOrderButton totalCents={preview.order.totalCents} disabledReason={access.open ? undefined : access.reason} />
    </div>
  );
}

/** Only admins see this: test payments are closed to customers (see ordering-access.ts). */
function TestModeNote() {
  return (
    <p role="note" className="rounded-lg bg-brand-blue/10 px-4 py-3 text-sm">
      <strong>Testmodus:</strong> Es wird kein echtes Geld abgebucht. Bezahle mit der Testkarte 4242 4242 4242 4242, einem
      beliebigen Ablaufdatum in der Zukunft und einer beliebigen Prüfziffer.
    </p>
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
      <AddressLines address={address} />
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
      <OrderItems order={order} />
    </section>
  );
}
