import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { getGames, getNewestProducts } from "@/modules/catalog/server";
import { GameLinks } from "./game-links";
import { ProductGrid } from "./product-grid";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

const PROMISES = [
  {
    title: "Immer versichert",
    text: "Jede Bestellung geht versichert auf die Reise – nach Deutschland und in die Niederlande.",
  },
  {
    title: "Klarer Kartenzustand",
    text: "Zustand nach Cardmarket-Skala, dazu gegradete Karten von PSA, BGS und CGC.",
  },
  {
    title: "Bestellen ohne Konto",
    text: "Kein Kundenkonto nötig. Bezahlt wird sicher über Stripe.",
  },
] as const;

export default function Home() {
  return (
    <main className="mx-auto w-full max-w-6xl px-4 pb-16">
      <section className="flex flex-col items-center gap-6 py-14 text-center sm:py-20">
        <Image
          src="/brand/logo-wordmark.png"
          alt="GubbyCardz – Trading Cards & Merchandise"
          width={800}
          height={350}
          priority
          className="h-auto w-full max-w-lg drop-shadow-[0_0_3rem_rgb(0_149_255/0.35)]"
        />
        <h1 className="text-4xl font-extrabold tracking-tight sm:text-6xl">
          Sammelkarten <span className="bg-linear-to-r from-brand-blue to-brand-red bg-clip-text text-transparent">für Sammler</span>
        </h1>
        <p className="max-w-xl text-lg text-foreground/70">
          Einzelkarten, gegradete Karten, Booster, Displays und Zubehör – immer versichert verschickt.
        </p>
        <Link
          href="/spiele"
          className="rounded-full bg-brand-red px-8 py-3.5 font-semibold text-white shadow-lg shadow-brand-red/30 transition hover:-translate-y-0.5 hover:brightness-110"
        >
          Zum Sortiment
        </Link>
      </section>

      <div className="grid gap-4 sm:grid-cols-3">
        {PROMISES.map(({ title, text }) => (
          <div key={title} className="rounded-2xl border border-foreground/10 bg-surface p-5">
            <h2 className="font-semibold">{title}</h2>
            <p className="mt-1 text-sm text-foreground/60">{text}</p>
          </div>
        ))}
      </div>

      <section className="mt-16" aria-labelledby="games-heading">
        <h2 id="games-heading" className="text-2xl font-bold tracking-tight sm:text-3xl">
          Spiele
        </h2>
        <Suspense fallback={<p className="mt-6 text-foreground/60">Spiele werden geladen …</p>}>
          <GameLinks />
        </Suspense>
      </section>

      <Suspense>
        <NewestProducts />
      </Suspense>
    </main>
  );
}

// Hidden entirely while no product has a creation date yet – an empty "new" section helps nobody.
async function NewestProducts() {
  // Catalog data is read at request time, so `next build` never touches the database.
  await connection();
  const [products, games] = await Promise.all([getNewestProducts(), getGames()]);
  if (products.length === 0) return null;

  return (
    <section className="mt-16" aria-labelledby="newest-heading">
      <h2 id="newest-heading" className="text-2xl font-bold tracking-tight sm:text-3xl">
        Neu im Sortiment
      </h2>
      <ProductGrid products={products} games={games} />
    </section>
  );
}
