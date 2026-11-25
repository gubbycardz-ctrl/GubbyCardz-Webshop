import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { requireAdmin } from "@/modules/auth/server";
import { getCatalogRepository } from "@/modules/catalog/server";
import { ORDER_STATUS_LABELS, orderNumber, packingList, type Order } from "@/modules/orders";
import { getOrderRepository } from "@/modules/orders/server";
import type { ShippingCountry } from "@/modules/shipping";
import { formatEuro } from "@/shared/money";
import { ConfirmButton } from "../../_components/confirm-button";
import { cancelOrder, markOrderPaid, markOrderShipped } from "../../order-actions";
import { formatDateTime } from "../format";

export const metadata: Metadata = { title: "Order" };

const COUNTRY_NAMES = { DE: "Germany", NL: "Netherlands" } satisfies Record<ShippingCountry, string>;

export default function AdminOrderPage({ params }: PageProps<"/admin/bestellungen/[id]">) {
  return (
    <Suspense fallback={<p className="text-foreground/60">Loading …</p>}>
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
          ← Orders
        </Link>
        <h1 className="mt-2 text-3xl font-bold">
          Order <span className="font-mono">{number}</span>
        </h1>
        <p className="mt-1 text-sm text-foreground/60">
          {ORDER_STATUS_LABELS[order.status]} · ordered on {formatDateTime(order.createdAt)}
          {order.paidAt && ` · paid on ${formatDateTime(order.paidAt)}`}
          {order.shippedAt && ` · shipped on ${formatDateTime(order.shippedAt)}`}
          {order.cancelledAt && ` · cancelled on ${formatDateTime(order.cancelledAt)}`}
        </p>
        <StatusActions order={order} number={number} />
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-foreground/10 p-4">
          <h2 className="font-semibold">Shipping address</h2>
          <address className="mt-2 not-italic leading-relaxed">
            {order.shippingAddress.name}
            <br />
            {order.shippingAddress.street}
            <br />
            {order.shippingAddress.postalCode} {order.shippingAddress.city}
            <br />
            {COUNTRY_NAMES[order.shippingAddress.country]}
          </address>
        </div>
        <div className="rounded-xl border border-foreground/10 p-4">
          <h2 className="font-semibold">Contact</h2>
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
          confirmMessage={`Has the payment of ${formatEuro(order.totalCents)} for order ${number} arrived?`}
          label="Mark as paid"
        />
        <ConfirmButton
          action={cancelOrder.bind(null, order.id)}
          confirmMessage={`Really cancel order ${number}? The items go back into stock.`}
          label="Cancel order"
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
          confirmMessage={`Is order ${number} packed and shipped?`}
          label="Mark as shipped"
        />
      </div>
    );
  }
  return null;
}

/**
 * Sorted by storage location, so the items can be picked in one walk.
 * Locations are read fresh from the offer internals: they are not part of the order snapshot,
 * because the item may have been moved since the purchase.
 */
async function PackingList({ order }: { order: Order }) {
  const internals = await getCatalogRepository().getOfferInternals(order.lines.map((line) => line.offerId));
  const locations = new Map(order.lines.map((line) => [line.offerId, internals.get(line.offerId)?.storageLocation]));
  return (
    <section>
      <h2 className="text-xl font-semibold">Packing list</h2>
      <div className="mt-3 overflow-x-auto rounded-xl border border-foreground/10">
        <table className="w-full text-left text-sm">
          <thead className="bg-foreground/5 text-foreground/70">
            <tr>
              <th className="px-4 py-2 font-medium">Location</th>
              <th className="px-4 py-2 text-right font-medium">Qty</th>
              <th className="px-4 py-2 font-medium">Item</th>
              <th className="px-4 py-2 text-right font-medium">Unit price</th>
              <th className="px-4 py-2 text-right font-medium">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-foreground/10">
            {packingList(order, locations).map((line) => (
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
        <dt>Subtotal</dt>
        <dd>{formatEuro(order.subtotalCents)}</dd>
        <dt>Shipping ({order.shippingAddress.country})</dt>
        <dd>{formatEuro(order.shippingCents)}</dd>
        <dt className="font-semibold">Grand total</dt>
        <dd className="font-semibold">{formatEuro(order.totalCents)}</dd>
      </dl>
    </section>
  );
}
