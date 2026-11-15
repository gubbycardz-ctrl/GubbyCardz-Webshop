import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense, type ReactNode } from "react";
import { getGames, getNewestProducts } from "@/modules/catalog/server";
import { SHIPPING_COUNTRIES } from "@/modules/shipping";
import { formatEuro } from "@/shared/money";
import { GameLinks } from "./game-links";
import { ShieldIcon, SparklesIcon, TruckIcon } from "./icons";
import { ProductGrid } from "./product-grid";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

const SHIPPING_RATES = Object.values(SHIPPING_COUNTRIES)
  .map((country) => `${country.label} ${formatEuro(country.insuredRateCents)}`)
  .join(" · ");

export default function Home() {
  return (
    <main className="w-full">
      {/* Always dark, in both color schemes – the logo is drawn for a dark outline. */}
      <section className="relative overflow-hidden bg-black text-white">
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-[radial-gradient(circle_at_15%_20%,rgba(250,0,13,0.45),transparent_45%),radial-gradient(circle_at_85%_80%,rgba(0,149,255,0.45),transparent_45%)]"
        />
        <div className="relative mx-auto grid w-full max-w-6xl items-center gap-8 px-4 py-12 sm:py-16 md:grid-cols-2">
          <div className="flex flex-col items-start gap-5">
            <h1 className="text-4xl font-extrabold uppercase italic leading-tight tracking-tight sm:text-5xl">
              Sammelkarten für Sammler
            </h1>
            <p className="max-w-md text-lg text-white/80">
              Einzelkarten, gegradete Karten, Booster, Displays und Zubehör – immer versichert verschickt.
            </p>
            <Link
              href="/spiele"
              className="rounded-full bg-brand-red px-7 py-3 font-semibold uppercase tracking-wide text-white shadow-lg transition hover:-translate-y-0.5 hover:opacity-90"
            >
              Zum Sortiment
            </Link>
          </div>
          <Image
            src="/brand/logo-wordmark.png"
            alt="GubbyCardz – Trading Cards & Merchandise"
            width={800}
            height={350}
            priority
            className="order-first h-auto w-full max-w-md justify-self-center md:order-none"
          />
        </div>
      </section>

      <section aria-label="Unsere Vorteile" className="border-b border-foreground/10 bg-foreground/5">
        <ul className="mx-auto grid w-full max-w-6xl gap-4 px-4 py-5 sm:grid-cols-3">
          <Benefit icon={<ShieldIcon className="size-7" />} title="Immer versichert" text="Jedes Paket geht versichert auf die Reise." />
          <Benefit icon={<TruckIcon className="size-7" />} title="Versand" text={SHIPPING_RATES} />
          <Benefit icon={<SparklesIcon className="size-7" />} title="Ehrlicher Zustand" text="Einzelkarten bewertet nach der Cardmarket-Skala." />
        </ul>
      </section>

      <div className="mx-auto w-full max-w-6xl px-4 pb-14">
        <section className="mt-12" aria-labelledby="games-heading">
          <SectionHeading id="games-heading">Spiele</SectionHeading>
          <Suspense fallback={<p className="mt-6 text-foreground/60">Spiele werden geladen …</p>}>
            <GameLinks />
          </Suspense>
        </section>

        <Suspense>
          <NewestProducts />
        </Suspense>
      </div>
    </main>
  );
}

function Benefit({ icon, title, text }: { icon: ReactNode; title: string; text: string }) {
  return (
    <li className="flex items-center gap-3">
      <span className="shrink-0 text-brand-blue">{icon}</span>
      <span>
        <span className="block font-semibold">{title}</span>
        <span className="block text-sm text-foreground/70">{text}</span>
      </span>
    </li>
  );
}

function SectionHeading({ id, children }: { id: string; children: ReactNode }) {
  return (
    <h2 id={id} className="border-l-4 border-brand-red pl-3 text-2xl font-extrabold uppercase italic tracking-tight">
      {children}
    </h2>
  );
}

// Hidden entirely while no product has a creation date yet – an empty "new" section helps nobody.
async function NewestProducts() {
  // Catalog data is read at request time, so `next build` never touches the database.
  await connection();
  const [products, games] = await Promise.all([getNewestProducts(), getGames()]);
  if (products.length === 0) return null;

  return (
    <section className="mt-14" aria-labelledby="newest-heading">
      <SectionHeading id="newest-heading">Neu im Sortiment</SectionHeading>
      <ProductGrid products={products} games={games} />
    </section>
  );
}
