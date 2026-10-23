import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { describeProductKind, type Product } from "@/modules/catalog";
import { getGame, getProductsOfGame } from "@/modules/catalog/server";

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
    <main className="mx-auto w-full max-w-5xl px-4 py-10">
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
      <h1 className="mt-2 text-3xl font-bold">{game.name}</h1>
      {products.length === 0 ? (
        <p className="mt-6 text-foreground/60">Noch keine Produkte für dieses Spiel.</p>
      ) : (
        <ul className="mt-6 divide-y divide-foreground/10 rounded-xl border border-foreground/10">
          {products.map((product) => (
            <li key={product.id}>
              <Link
                href={`/produkte/${product.slug}`}
                className="flex items-center justify-between gap-4 px-4 py-3 hover:bg-foreground/5"
              >
                <span>
                  <span className="font-medium">{product.name}</span>
                  <span className="block text-sm text-foreground/60">{productSubtitle(product)}</span>
                </span>
                <span className="shrink-0 text-sm text-foreground/60">{describeProductKind(product)}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

function productSubtitle(product: Product) {
  return product.kind === "single" ? `${product.collectorNumber} · ${product.rarity}` : "";
}
