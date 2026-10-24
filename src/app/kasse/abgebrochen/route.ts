import { revalidateTag } from "next/cache";
import { redirect } from "next/navigation";
import type { NextRequest } from "next/server";
import { writeCart } from "@/modules/cart/server";
import { CATALOG_CACHE_TAG } from "@/modules/catalog/server";
import { abandonCheckout } from "@/modules/orders";
import { getOrderRepository } from "@/modules/orders/server";
import { getPaymentProvider } from "@/modules/payment/server";

// The payment page's "back" link leads here. The order id in the URL is a random UUID only the
// customer knows; anything else is ignored.
const ORDER_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export async function GET(request: NextRequest) {
  const orderId = request.nextUrl.searchParams.get("id");
  const provider = getPaymentProvider();
  if (provider && orderId && ORDER_ID.test(orderId)) {
    const order = await abandonCheckout(orderId, provider, getOrderRepository(), new Date());
    if (order) {
      await writeCart(order.lines.map(({ offerId, quantity }) => ({ offerId, quantity })));
      revalidateTag(CATALOG_CACHE_TAG, "max");
    }
  }
  redirect("/warenkorb?zahlung=abgebrochen");
}
