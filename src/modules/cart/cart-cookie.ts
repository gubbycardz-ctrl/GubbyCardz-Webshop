import "server-only";
import { cookies } from "next/headers";
import { connection } from "next/server";
import { getCatalogRepository } from "@/modules/catalog/server";
import { parseCart, serializeCart, type Cart } from "./cart";
import { priceCart, type PricedCart } from "./priced-cart";

// Technically necessary for the purchase, so no consent banner is needed (TTDSG § 25 Abs. 2).
const CART_COOKIE = "cart";
// Cookie name and lifetime are listed in the privacy policy (src/app/(legal)/datenschutz) – keep it in sync.
const CART_MAX_AGE_SECONDS = 30 * 24 * 60 * 60;

export async function readCart(): Promise<Cart> {
  return parseCart((await cookies()).get(CART_COOKIE)?.value);
}

/** Only callable from Server Actions (cookies cannot be set while rendering). */
export async function writeCart(cart: Cart) {
  const cookieStore = await cookies();
  if (cart.length === 0) {
    cookieStore.delete(CART_COOKIE);
    return;
  }
  cookieStore.set(CART_COOKIE, serializeCart(cart), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: CART_MAX_AGE_SECONDS,
  });
}

/** The cart with current prices and stock – read fresh, never from the page cache. */
export async function getPricedCart(): Promise<PricedCart> {
  const cart = await readCart();
  if (cart.length === 0) return priceCart(cart, new Map(), new Map());

  // Uncached database reads belong to the request, never to a prerender.
  await connection();
  const catalog = getCatalogRepository();
  const offers = await catalog.getOffersByIds(cart.map((line) => line.offerId));
  const products = await catalog.getProductsByIds(offers.map((offer) => offer.productId));
  return priceCart(
    cart,
    new Map(offers.map((offer) => [offer.id, offer])),
    new Map(products.map((product) => [product.id, product])),
  );
}
