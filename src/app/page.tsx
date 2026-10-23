import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { PRODUCT_KIND_LABELS } from "@/modules/catalog";
import { getGames, getNewestProducts } from "@/modules/catalog/server";
import { GameLinks } from "./game-links";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

export default function Home() {
  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-10">
      <section className="flex flex-col items-center gap-6 text-center">
        <Image
          src="/brand/logo-wordmark.png"
          alt="GubbyCardz – Trading Cards & Merchandise"
          width={800}
          height={350}
          priority
          className="h-auto w-full max-w-md"
        />
        <h1 className="text-3xl font-bold sm:text-4xl">Sammelkarten für Sammler</h1>
        <p className="max-w-xl text-lg text-foreground/70">
          Einzelkarten, gegradete Karten, Booster, Displays und Zubehör – immer versichert verschickt.
        </p>
        <Link
          href="/spiele"
          className="rounded-full bg-brand-red px-6 py-3 font-semibold text-white transition-opacity hover:opacity-90"
        >
          Zum Sortiment
        </Link>
      </section>

      <section className="mt-16" aria-labelledby="games-heading">
        <h2 id="games-heading" className="text-2xl font-bold">
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

  const gameNames = new Map(games.map((game) => [game.id, game.name]));

  return (
    <section className="mt-16" aria-labelledby="newest-heading">
      <h2 id="newest-heading" className="text-2xl font-bold">
        Neu im Sortiment
      </h2>
      <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {products.map((product) => (
          <li key={product.id}>
            <Link
              href={`/produkte/${product.slug}`}
              className="flex h-full flex-col gap-1 rounded-xl border border-foreground/10 p-4 transition-colors hover:border-brand-blue"
            >
              <span className="text-xs font-medium uppercase tracking-wide text-foreground/60">
                {[product.gameId && gameNames.get(product.gameId), PRODUCT_KIND_LABELS[product.kind]]
                  .filter(Boolean)
                  .join(" · ")}
              </span>
              <span className="font-semibold">{product.name}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
