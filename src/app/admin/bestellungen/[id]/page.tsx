import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { requireAdmin } from "@/modules/auth/server";
import { ORDER_STATUS_LABELS, orderNumber, packingList, type Order } from "@/modules/orders";
import { getOrderRepository } from "@/modules/orders/server";
import { SHIPPING_COUNTRIES } from "@/modules/shipping";
import { formatEuro } from "@/shared/money";
import { ConfirmButton } from "../../_components/confirm-button";
import { cancelOrder, markOrderPaid, markOrderShipped } from "../../order-actions";
import { formatDateTime } from "../format";

export const metadata: Metadata = { title: "Bestellung" };

export default function AdminOrderPage({ params }: PageProps<"/admin/bestellungen/[id]">) {
  return (
    <Suspense fallback={<p className="text-foreground/60">Wird geladen …</p>}>
      <OrderDetails params={params} />
    </Suspense>
  );
}

async function OrderDetails({ params }: Pick<PageProps<"/admin/bestellungen/[id]">, "params">) {
  await requireAdmin();
  const { id } = await params;
  const order = await getOrderRepository().getOrder(id);
  if (!order) notFound();
  const number = orderNumber(order.id);

  return (
    <div className="flex flex-col gap-8">
      <section>
        <Link href={`/admin/bestellungen?status=${order.status}`} className="text-sm text-foreground/60 hover:text-brand-blue">
          ← Bestellungen
        </Link>
        <h1 className="mt-2 text-3xl font-bold">
          Bestellung <span className="font-mono">{number}</span>
        </h1>
        <p className="mt-1 text-sm text-foreground/60">
          {ORDER_STATUS_LABELS[order.status]} · bestellt am {formatDateTime(order.createdAt)}
          {order.paidAt && ` · bezahlt am ${formatDateTime(order.paidAt)}`}
          {order.shippedAt && ` · versendet am ${formatDateTime(order.shippedAt)}`}
          {order.cancelledAt && ` · storniert am ${formatDateTime(order.cancelledAt)}`}
        </p>
        <StatusActions order={order} number={number} />
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-foreground/10 p-4">
          <h2 className="font-semibold">Lieferadresse</h2>
          <address className="mt-2 not-italic leading-relaxed">
            {order.shippingAddress.name}
            <br />
            {order.shippingAddress.street}
            <br />
            {order.shippingAddress.postalCode} {order.shippingAddress.city}
            <br />
            {SHIPPING_COUNTRIES[order.shippingAddress.country].label}
          </address>
        </div>
        <div className="rounded-xl border border-foreground/10 p-4">
          <h2 className="font-semibold">Kontakt</h2>
          <a href={`mailto:${order.email}`} className="mt-2 block text-brand-blue hover:underline">
            {order.email}
          </a>
        </div>
      </section>

      <PackingList order={order} />
    </div>
  );
}

function StatusActions({ order, number }: { order: Order; number: string }) {
  if (order.status === "awaiting-payment") {
    return (
      <div className="mt-4 flex flex-wrap gap-3">
        <ConfirmButton
          action={markOrderPaid.bind(null, order.id)}
          confirmMessage={`Zahlung von ${formatEuro(order.totalCents)} für Bestellung ${number} ist eingegangen?`}
          label="Als bezahlt markieren"
        />
        <ConfirmButton
          action={cancelOrder.bind(null, order.id)}
          confirmMessage={`Bestellung ${number} wirklich stornieren? Die Artikel gehen zurück in den Bestand.`}
          label="Stornieren"
          variant="danger"
        />
      </div>
    );
  }
  if (order.status === "paid") {
    return (
      <div className="mt-4">
        <ConfirmButton
          action={markOrderShipped.bind(null, order.id)}
          confirmMessage={`Bestellung ${number} ist gepackt und versendet?`}
          label="Als versendet markieren"
        />
      </div>
    );
  }
  return null;
}

/** Sorted by storage location, so the items can be picked in one walk. */
function PackingList({ order }: { order: Order }) {
  return (
    <section>
      <h2 className="text-xl font-semibold">Packliste</h2>
      <div className="mt-3 overflow-x-auto rounded-xl border border-foreground/10">
        <table className="w-full text-left text-sm">
          <thead className="bg-foreground/5 text-foreground/70">
            <tr>
              <th className="px-4 py-2 font-medium">Lagerplatz</th>
              <th className="px-4 py-2 text-right font-medium">Menge</th>
              <th className="px-4 py-2 font-medium">Artikel</th>
              <th className="px-4 py-2 text-right font-medium">Einzelpreis</th>
              <th className="px-4 py-2 text-right font-medium">Summe</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-foreground/10">
            {packingList(order).map((line) => (
              <tr key={line.offerId}>
                <td className="px-4 py-2 font-medium">{line.storageLocation ?? <span className="text-foreground/50">–</span>}</td>
                <td className="px-4 py-2 text-right font-semibold">{line.quantity}×</td>
                <td className="px-4 py-2">
                  {line.productName}
                  <span className="block text-foreground/60">{line.description}</span>
                </td>
                <td className="whitespace-nowrap px-4 py-2 text-right">{formatEuro(line.unitPriceCents)}</td>
                <td className="whitespace-nowrap px-4 py-2 text-right">{formatEuro(line.unitPriceCents * line.quantity)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <dl className="mt-4 grid grid-cols-[1fr_auto] gap-x-6 gap-y-1 text-right text-sm">
        <dt>Zwischensumme</dt>
        <dd>{formatEuro(order.subtotalCents)}</dd>
        <dt>Versand ({order.shippingAddress.country})</dt>
        <dd>{formatEuro(order.shippingCents)}</dd>
        <dt className="font-semibold">Gesamtsumme</dt>
        <dd className="font-semibold">{formatEuro(order.totalCents)}</dd>
      </dl>
    </section>
  );
}
