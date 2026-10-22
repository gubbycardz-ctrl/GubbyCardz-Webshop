"use server";

import { MAX_CART_LINES, isOfferId, quantityOf, setQuantity } from "@/modules/cart";
import { readCart, writeCart } from "@/modules/cart/server";
import { getCatalogRepository } from "@/modules/catalog/server";

export type AddToCartState = { error?: string; success?: string };

export async function addToCart(offerId: unknown): Promise<AddToCartState> {
  if (!isOfferId(offerId)) return { error: "Dieses Angebot gibt es nicht mehr." };

  // Checked against fresh stock – the product page itself may be cached for a few minutes.
  const [offer] = await getCatalogRepository().getOffersByIds([offerId]);
  if (!offer || offer.stock === 0) return { error: "Leider gerade ausverkauft." };

  const cart = await readCart();
  const wanted = quantityOf(cart, offerId) + 1;
  if (wanted > offer.stock) return { error: `Mehr als ${offer.stock} haben wir leider nicht auf Lager.` };

  const result = setQuantity(cart, offerId, wanted);
  if (!result.ok) return { error: `Der Warenkorb ist voll (höchstens ${MAX_CART_LINES} verschiedene Artikel).` };
  await writeCart(result.cart);
  return { success: wanted === 1 ? "Im Warenkorb" : `${wanted}× im Warenkorb` };
}

export async function changeQuantity(offerId: unknown, formData: FormData) {
  if (!isOfferId(offerId)) return;
  const requested = Number(formData.get("quantity"));
  if (!Number.isInteger(requested)) return;

  // Never store more than is in stock; the cart page shows what was available.
  const [offer] = await getCatalogRepository().getOffersByIds([offerId]);
  const result = setQuantity(await readCart(), offerId, Math.min(requested, offer?.stock ?? 0));
  if (result.ok) await writeCart(result.cart);
}

export async function removeFromCart(offerId: unknown) {
  if (!isOfferId(offerId)) return;
  const result = setQuantity(await readCart(), offerId, 0);
  if (result.ok) await writeCart(result.cart);
}
