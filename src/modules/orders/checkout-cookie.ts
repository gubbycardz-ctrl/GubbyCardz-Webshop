import "server-only";
import { cookies } from "next/headers";
import type { FormFields } from "@/shared/form-validation";
import { checkoutFields, parseCheckoutForm, type CheckoutCustomer } from "./checkout-form";

// Carries email and shipping address from the address step to the order overview without
// storing anything for visitors who never order. Technically necessary for the purchase
// (TTDSG § 25 Abs. 2), short-lived and deleted once the order is placed (DSGVO).
const CHECKOUT_COOKIE = "checkout";
// Cookie name and lifetime are listed in the privacy policy (src/app/(legal)/datenschutz) – keep it in sync.
const CHECKOUT_MAX_AGE_SECONDS = 24 * 60 * 60;

/** The saved customer, or null. A tampered or outdated cookie is validated like fresh form input. */
export async function readCheckoutCustomer(): Promise<CheckoutCustomer | null> {
  const value = (await cookies()).get(CHECKOUT_COOKIE)?.value;
  const fields = value ? decode(value) : null;
  if (!fields) return null;
  const result = parseCheckoutForm(fields);
  return result.ok ? result.value : null;
}

/** Only callable from Server Actions (cookies cannot be set while rendering). */
export async function writeCheckoutCustomer(customer: CheckoutCustomer) {
  (await cookies()).set(CHECKOUT_COOKIE, encode(checkoutFields(customer)), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: CHECKOUT_MAX_AGE_SECONDS,
  });
}

export async function clearCheckoutCustomer() {
  (await cookies()).delete(CHECKOUT_COOKIE);
}

// Base64url keeps umlauts and separators cookie-safe.
function encode(fields: FormFields) {
  return Buffer.from(JSON.stringify(fields)).toString("base64url");
}

function decode(value: string): FormFields | null {
  try {
    const parsed: unknown = JSON.parse(Buffer.from(value, "base64url").toString());
    if (typeof parsed !== "object" || parsed === null) return null;
    return Object.fromEntries(Object.entries(parsed).filter(([, field]) => typeof field === "string"));
  } catch {
    return null;
  }
}
