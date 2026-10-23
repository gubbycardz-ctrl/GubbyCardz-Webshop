import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { requireAdmin } from "@/modules/auth/server";
import { ORDER_LIST_LIMIT, ORDER_STATUSES, ORDER_STATUS_LABELS, orderNumber, type OrderStatus } from "@/modules/orders";
import { getOrderRepository } from "@/modules/orders/server";
import { formatEuro } from "@/shared/money";
import { formatDateTime } from "./format";

export const metadata: Metadata = { title: "Bestellungen" };

// Packing is the daily job, so paid orders come first.
const DEFAULT_FILTER: OrderStatus = "paid";
const ALL = "alle";
const FILTERS = [...ORDER_STATUSES.map((status) => ({ value: status, label: ORDER_STATUS_LABELS[status] })), { value: ALL, label: "Alle" }];

export default function AdminOrdersPage({ searchParams }: PageProps<"/admin/bestellungen">) {
  return (
    <Suspense fallback={<p className="text-foreground/60">Wird geladen …</p>}>
      <OrderList searchParams={searchParams} />
    </Suspense>
  );
}

async function OrderList({ searchParams }: Pick<PageProps<"/admin/bestellungen">, "searchParams">) {
  await requireAdmin();
  const { status: requested } = await searchParams;
  // Anything unknown in the URL falls back to the default instead of failing.
  const filter = FILTERS.find((candidate) => candidate.value === requested)?.value ?? DEFAULT_FILTER;
  const orders = await getOrderRepository().listOrders(filter === ALL ? {} : { status: filter as OrderStatus });

  return (
    <div>
      <h1 className="text-3xl font-bold">Bestellungen</h1>
      <nav className="mt-4 flex flex-wrap gap-2 text-sm">
        {FILTERS.map(({ value, label }) => (
          <Link
            key={value}
            href={`/admin/bestellungen?status=${value}`}
            aria-current={value === filter ? "page" : undefined}
            className={`rounded-full border px-3 py-1 ${value === filter ? "border-brand-blue bg-brand-blue text-white" : "border-foreground/20 hover:bg-foreground/5"}`}
          >
            {label}
          </Link>
        ))}
      </nav>

      {orders.length === 0 ? (
        <p className="mt-6 text-foreground/60">Keine Bestellungen.</p>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-xl border border-foreground/10">
          <table className="w-full text-left text-sm">
            <thead className="bg-foreground/5 text-foreground/70">
              <tr>
                <th className="px-4 py-2 font-medium">Nr.</th>
                <th className="px-4 py-2 font-medium">Datum</th>
                <th className="px-4 py-2 font-medium">Kunde</th>
                <th className="px-4 py-2 text-right font-medium">Artikel</th>
                <th className="px-4 py-2 text-right font-medium">Summe</th>
                <th className="px-4 py-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-foreground/10">
              {orders.map((order) => (
                <tr key={order.id} className="hover:bg-foreground/5">
                  <td className="px-4 py-2 font-mono">
                    <Link href={`/admin/bestellungen/${order.id}`} className="text-brand-blue hover:underline">
                      {orderNumber(order.id)}
                    </Link>
                  </td>
                  <td className="whitespace-nowrap px-4 py-2">{formatDateTime(order.createdAt)}</td>
                  <td className="px-4 py-2">
                    {order.shippingAddress.name} ({order.shippingAddress.country})
                  </td>
                  <td className="px-4 py-2 text-right">{order.lines.reduce((sum, line) => sum + line.quantity, 0)}</td>
                  <td className="px-4 py-2 text-right">{formatEuro(order.totalCents)}</td>
                  <td className="px-4 py-2">{ORDER_STATUS_LABELS[order.status]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {orders.length === ORDER_LIST_LIMIT && (
        <p className="mt-3 text-sm text-foreground/60">Es werden die neuesten {ORDER_LIST_LIMIT} Bestellungen angezeigt.</p>
      )}
    </div>
  );
}
