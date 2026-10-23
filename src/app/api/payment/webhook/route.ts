import { revalidateTag } from "next/cache";
import { CATALOG_CACHE_TAG } from "@/modules/catalog/server";
import { applyPaymentEvent } from "@/modules/orders";
import { getOrderRepository } from "@/modules/orders/server";
import { PaymentWebhookError } from "@/modules/payment";
import { getPaymentProvider } from "@/modules/payment/server";

// Payment events (Stripe → shop). Called by the provider, not by browsers, so the provider's
// signature check takes the place of App Check here. Only a confirmed event marks an order paid.

// Real events are a few KB; anything far bigger is not worth reading.
const MAX_PAYLOAD_BYTES = 512 * 1024;

export async function POST(request: Request) {
  const provider = getPaymentProvider();
  if (!provider) return new Response("Payment is not configured", { status: 503 });
  if (Number(request.headers.get("content-length") ?? 0) > MAX_PAYLOAD_BYTES) return new Response(null, { status: 413 });

  let event;
  try {
    event = provider.parseWebhook(await request.text(), request.headers);
  } catch (error) {
    if (error instanceof PaymentWebhookError) return new Response("Invalid signature", { status: 400 });
    throw error;
  }
  if (!event) return new Response(null, { status: 204 });

  // Errors (e.g. database unavailable) end in a 500, and the provider retries the event later.
  const outcome = await applyPaymentEvent(event, getOrderRepository(), new Date());
  // Stock of a cancelled order is back for sale.
  if (outcome === "cancelled") revalidateTag(CATALOG_CACHE_TAG, "max");
  if (outcome === "paid-after-cancel" || outcome === "amount-mismatch") {
    console.error(`Payment needs manual review (${outcome}): order ${event.orderId}, checkout ${event.sessionId}`);
  }
  return Response.json({ outcome });
}
