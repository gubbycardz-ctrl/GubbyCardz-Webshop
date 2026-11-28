import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { getGame, getProductsOfGame } from "@/modules/catalog/server";
import { ProductGrid } from "@/app/(shop)/product-grid";

export async function generateMetadata({ params }: PageProps<"/spiele/[gameId]">): Promise<Metadata> {
  const { gameId } = await params;
  const game = await getGame(gameId);
  return game
    ? {
        title: game.name,
        description: `${game.name}-Karten, Booster und Zubehör bei GubbyCardz.`,
        alternates: { canonical: `/spiele/${game.id}` },
      }
    : { title: "Spiel nicht gefunden" };
}

export default function GamePage({ params }: PageProps<"/spiele/[gameId]">) {
  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-10">
      <Link href="/spiele" className="text-sm text-foreground/60 hover:text-brand-blue">
        ← Alle Spiele
      </Link>
      <Suspense fallback={<p className="mt-6 text-foreground/60">Produkte werden geladen …</p>}>
        <GameProducts params={params} />
      </Suspense>
    </main>
  );
}

async function GameProducts({ params }: Pick<PageProps<"/spiele/[gameId]">, "params">) {
  const { gameId } = await params;
  const game = await getGame(gameId);
  if (!game) notFound();

  const products = await getProductsOfGame(game.id);

  return (
    <>
      <h1 className="mt-2 text-3xl font-extrabold uppercase italic tracking-tight sm:text-4xl">{game.name}</h1>
      {products.length === 0 ? (
        <p className="mt-6 text-foreground/60">Noch keine Produkte für dieses Spiel.</p>
      ) : (
        <ProductGrid products={products} games={[game]} />
      )}
    </>
  );
}
