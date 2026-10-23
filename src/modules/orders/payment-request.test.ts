import { describe, expect, it } from "vitest";
import type { Order } from "./order";
import { checkoutRequestFor } from "./payment-request";

const order: Order = {
  id: "0b4c6f0e-1a2b-4c3d-8e9f-001122334455",
  status: "awaiting-payment",
  createdAt: "2026-10-23T12:00:00.000Z",
  email: "kunde@example.com",
  shippingAddress: { name: "Max", street: "Hauptstraße 1", postalCode: "1011 AB", city: "Amsterdam", country: "NL" },
  lines: [{ offerId: "o1", productId: "p1", productName: "Glurak ex", description: "Deutsch · NM", unitPriceCents: 11999, quantity: 2 }],
  subtotalCents: 23998,
  shippingCents: 1749,
  totalCents: 25747,
};

describe("checkoutRequestFor", () => {
  it("charges exactly the snapshot amounts and expires after 31 minutes", () => {
    const request = checkoutRequestFor(order, new Date("2026-10-23T12:00:00Z"));
    expect(request).toMatchObject({
      orderId: order.id,
      orderNumber: "0B4C6F0E",
      email: "kunde@example.com",
      lines: [{ name: "Glurak ex", description: "Deutsch · NM", unitAmountCents: 11999, quantity: 2 }],
      shipping: { label: "Versand nach Niederlande (versichert)", amountCents: 1749 },
      expiresAt: new Date("2026-10-23T12:31:00Z"),
    });
    const charged = request.lines.reduce((sum, line) => sum + line.unitAmountCents * line.quantity, 0) + request.shipping.amountCents;
    expect(charged).toBe(order.totalCents);
  });

  it("returns to the thank-you page with the short number and to the cancel route with the full id", () => {
    const request = checkoutRequestFor(order, new Date());
    expect(request.successUrl).toMatch(/\/kasse\/danke\?bestellung=0B4C6F0E$/);
    expect(request.cancelUrl).toMatch(new RegExp(`/kasse/abgebrochen\\?id=${order.id}$`));
  });
});
