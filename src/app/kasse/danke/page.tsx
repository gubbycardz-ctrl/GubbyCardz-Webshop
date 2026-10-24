import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { getGames, getRecommendedProducts } from "@/modules/catalog/server";
import { orderNumber, type Order, type OrderStatus } from "@/modules/orders";
import { getOrderRepository, readLastOrderId } from "@/modules/orders/server";
import { ProductGrid } from "../../product-grid";
import { AddressLines, OrderItems } from "../order-summary";

export const metadata: Metadata = {
  title: "Danke für deine Bestellung",
  robots: { index: false },
};

// Only the short order number travels in the URL – no personal data.
const ORDER_NUMBER = /^[A-F0-9]{8}$/;

// The real payment state, so nobody expects a parcel for an order that was never paid.
const STATUS_TEXT: Record<OrderStatus, string> = {
  "awaiting-payment":
    "Wir warten noch auf die Bestätigung deiner Zahlung. Sobald sie da ist, packen wir deine Bestellung und verschicken sie versichert. Bei Zahlung per Lastschrift kann das einige Tage dauern.",
  paid: "Deine Zahlung ist eingegangen. Wir packen deine Bestellung und verschicken sie versichert.",
  shipped: "Deine Bestellung ist unterwegs.",
  cancelled: "Diese Bestellung wurde storniert – es wurde nichts berechnet.",
};

const STATUS_CLASSES: Record<OrderStatus, string> = {
  "awaiting-payment": "bg-foreground/5",
  paid: "bg-green-600/10",
  shipped: "bg-green-600/10",
  cancelled: "bg-brand-red/10",
};

export default function ThankYouPage({ searchParams }: PageProps<"/kasse/danke">) {
  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-10">
      <h1 className="text-3xl font-bold">Danke für deine Bestellung!</h1>
      <Suspense fallback={<p className="mt-4 text-foreground/60">Bestellung wird geladen …</p>}>
        <OrderDetails searchParams={searchParams} />
      </Suspense>
      <Link href="/spiele" className="mt-8 inline-block font-medium text-brand-blue hover:underline">
        Weiter stöbern
      </Link>
    </main>
  );
}

async function OrderDetails({ searchParams }: Pick<PageProps<"/kasse/danke">, "searchParams">) {
  const { bestellung } = await searchParams;
  const number = typeof bestellung === "string" && ORDER_NUMBER.test(bestellung) ? bestellung : null;
  const order = number ? await ownOrder(number) : null;

  return (
    <>
      {number && (
        <p className="mt-4">
          Deine Bestellnummer: <span className="font-mono font-semibold">{number}</span>
        </p>
      )}
      {order ? <Summary order={order} /> : <p className="mt-4 text-foreground/80">{STATUS_TEXT["awaiting-payment"]}</p>}
      <Suspense>
        <Recommendations excludedProductIds={order?.lines.map((line) => line.productId) ?? []} />
      </Suspense>
    </>
  );
}

/**
 * The order placed in this browser (see last-order-cookie.ts). The number in the URL alone
 * is guessable, so a foreign or guessed number shows no order details.
 */
async function ownOrder(number: string): Promise<Order | null> {
  // Uncached read of the current payment state.
  await connection();
  const orderId = await readLastOrderId();
  if (!orderId || orderNumber(orderId) !== number) return null;
  return getOrderRepository().getOrder(orderId);
}

function Summary({ order }: { order: Order }) {
  return (
    <div className="mt-6 flex flex-col gap-8">
      <p role="status" className={`rounded-lg px-4 py-3 ${STATUS_CLASSES[order.status]}`}>
        {STATUS_TEXT[order.status]}
      </p>
      <section>
        <h2 className="font-semibold">Deine Bestellung</h2>
        <OrderItems order={order} />
      </section>
      <section className="rounded-xl border border-foreground/10 p-4">
        <h2 className="font-semibold">Lieferadresse</h2>
        <AddressLines address={order.shippingAddress} />
        <p className="mt-2 text-sm text-foreground/60">E-Mail: {order.email}</p>
      </section>
    </div>
  );
}

async function Recommendations({ excludedProductIds }: { excludedProductIds: string[] }) {
  // Catalog data is read at request time, so `next build` never touches the database.
  await connection();
  const [products, games] = await Promise.all([getRecommendedProducts(excludedProductIds), getGames()]);
  if (products.length === 0) return null;

  return (
    <section className="mt-12" aria-labelledby="recommendations-heading">
      <h2 id="recommendations-heading" className="text-2xl font-bold">
        Das könnte dir auch gefallen
      </h2>
      <ProductGrid products={products} games={games} columns="sm:grid-cols-2" />
    </section>
  );
}
