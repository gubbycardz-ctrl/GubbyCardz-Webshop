import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

export const metadata: Metadata = {
  title: "Danke für deine Bestellung",
  robots: { index: false },
};

// Only the short order number travels in the URL – no personal data.
const ORDER_NUMBER = /^[A-F0-9]{8}$/;

export default function ThankYouPage({ searchParams }: PageProps<"/kasse/danke">) {
  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-10">
      <h1 className="text-3xl font-bold">Danke für deine Bestellung!</h1>
      <Suspense>
        <OrderNumber searchParams={searchParams} />
      </Suspense>
      {/* Shown right after the payment page; the confirmation itself arrives separately from the provider. */}
      <p className="mt-4 text-foreground/80">
        Sobald deine Zahlung bestätigt ist, packen wir deine Bestellung und verschicken sie versichert. Bei Zahlung per
        Lastschrift kann die Bestätigung einige Tage dauern.
      </p>
      <Link href="/spiele" className="mt-6 inline-block font-medium text-brand-blue hover:underline">
        Weiter stöbern
      </Link>
    </main>
  );
}

async function OrderNumber({ searchParams }: Pick<PageProps<"/kasse/danke">, "searchParams">) {
  const { bestellung } = await searchParams;
  if (typeof bestellung !== "string" || !ORDER_NUMBER.test(bestellung)) return null;
  return (
    <p className="mt-4">
      Deine Bestellnummer: <span className="font-mono font-semibold">{bestellung}</span>
    </p>
  );
}
