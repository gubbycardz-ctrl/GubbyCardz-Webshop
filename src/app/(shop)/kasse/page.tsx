import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { getPricedCart } from "@/modules/cart/server";
import { checkoutFields } from "@/modules/orders";
import { readCheckoutCustomer } from "@/modules/orders/server";
import { AddressForm } from "./address-form";

export const metadata: Metadata = {
  title: "Kasse",
  robots: { index: false },
};

export default function CheckoutPage() {
  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-10">
      <p className="text-sm text-foreground/60">Schritt 1 von 2</p>
      <h1 className="text-3xl font-bold">Lieferadresse</h1>
      <Suspense fallback={<p className="mt-6 text-foreground/60">Wird geladen …</p>}>
        <AddressStep />
      </Suspense>
    </main>
  );
}

async function AddressStep() {
  const cart = await getPricedCart();
  if (cart.lines.length === 0) {
    return (
      <p className="mt-6 text-foreground/60">
        Dein Warenkorb ist leer.{" "}
        <Link href="/spiele" className="text-brand-blue hover:underline">
          Zum Sortiment
        </Link>
      </p>
    );
  }

  // Coming back from the overview ("Ändern") shows the address entered before.
  const customer = await readCheckoutCustomer();
  return (
    <>
      <Link href="/warenkorb" className="mt-2 inline-block text-sm text-foreground/60 hover:text-brand-blue">
        ← Zurück zum Warenkorb
      </Link>
      <AddressForm defaults={customer ? checkoutFields(customer) : {}} />
    </>
  );
}
