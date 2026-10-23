import "server-only";

// Until Stripe is connected, orders can only be placed where ORDERING_ENABLED=true (locally,
// against the emulator). In the live shop an order would reserve stock without any payment.
// Remove this switch together with the Stripe integration.
export function isOrderingEnabled() {
  return process.env.ORDERING_ENABLED === "true";
}

export const ORDERING_DISABLED_MESSAGE = "Bestellen ist in Kürze möglich – die Bezahlung wird gerade eingerichtet.";
