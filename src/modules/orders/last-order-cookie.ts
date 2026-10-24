import "server-only";
import { cookies } from "next/headers";

// Lets the thank-you page show the order to the person who placed it – and only to them:
// the cookie holds the random order id, while the URL only carries the short, guessable number.
// Technically necessary for the purchase (TTDSG § 25 Abs. 2), short-lived.
const LAST_ORDER_COOKIE = "last-order";
// Cookie name and lifetime are listed in the privacy policy (src/app/(legal)/datenschutz) – keep it in sync.
const LAST_ORDER_MAX_AGE_SECONDS = 24 * 60 * 60;
const ORDER_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

/** Only callable from Server Actions (cookies cannot be set while rendering). */
export async function rememberLastOrder(orderId: string) {
  (await cookies()).set(LAST_ORDER_COOKIE, orderId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: LAST_ORDER_MAX_AGE_SECONDS,
  });
}

/** The id of the order placed in this browser, or null. Anything that is not an order id is ignored. */
export async function readLastOrderId(): Promise<string | null> {
  const value = (await cookies()).get(LAST_ORDER_COOKIE)?.value;
  return value && ORDER_ID.test(value) ? value : null;
}
