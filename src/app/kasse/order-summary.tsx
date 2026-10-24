import type { Order, ShippingAddress } from "@/modules/orders";
import { TAX_NOTE } from "@/modules/pricing";
import { SHIPPING_COUNTRIES } from "@/modules/shipping";
import { formatEuro } from "@/shared/money";

// Shared by the order overview (before ordering) and the thank-you page (after),
// so the customer sees the same lines and totals in both places.

export function OrderItems({ order }: { order: Order }) {
  return (
    <>
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
    </>
  );
}

export function AddressLines({ address }: { address: ShippingAddress }) {
  return (
    <address className="mt-2 not-italic leading-relaxed">
      {address.name}
      <br />
      {address.street}
      <br />
      {address.postalCode} {address.city}
      <br />
      {SHIPPING_COUNTRIES[address.country].label}
    </address>
  );
}
