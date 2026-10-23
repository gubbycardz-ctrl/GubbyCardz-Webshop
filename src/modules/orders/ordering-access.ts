import "server-only";
import { isAdminSession } from "@/modules/auth/server";
import type { PaymentProvider } from "@/modules/payment";
import { getPaymentProvider } from "@/modules/payment/server";

export type OrderingAccess =
  | { open: true; provider: PaymentProvider; testMode: boolean }
  | { open: false; reason: string };

const NOT_CONFIGURED = "Bestellen ist in Kürze möglich – die Bezahlung wird gerade eingerichtet.";

/**
 * Who may order right now. Without payment keys nobody (an order would reserve stock that is
 * never paid). With test keys only admins: a test card costs nothing, so in the live shop anyone
 * could otherwise create orders that look paid. With live keys everybody.
 */
export async function getOrderingAccess(): Promise<OrderingAccess> {
  const provider = getPaymentProvider();
  if (!provider) return { open: false, reason: NOT_CONFIGURED };
  if (provider.mode === "live") return { open: true, provider, testMode: false };
  return (await isAdminSession()) ? { open: true, provider, testMode: true } : { open: false, reason: NOT_CONFIGURED };
}
