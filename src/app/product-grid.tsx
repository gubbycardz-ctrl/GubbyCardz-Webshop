import Link from "next/link";
import { describeProductKind, type Game, type Product } from "@/modules/catalog";
import { CardArt } from "./card-art";

const WIDE_COLUMNS = "grid-cols-2 md:grid-cols-3 lg:grid-cols-4";

const badgeClass = "rounded-full border border-foreground/15 px-2 py-0.5 text-xs text-foreground/70";

/** Product tiles as on the home page; narrow pages pass fewer columns. */
export function ProductGrid({
  products,
  games,
  columns = WIDE_COLUMNS,
}: {
  products: readonly Product[];
  games: readonly Game[];
  columns?: string;
}) {
  const gameNames = new Map(games.map((game) => [game.id, game.name]));
  return (
    <ul className={`mt-6 grid gap-4 ${columns}`}>
      {products.map((product) => {
        const gameName = product.gameId ? gameNames.get(product.gameId) : undefined;
        return (
          <li key={product.id}>
            <Link
              href={`/produkte/${product.slug}`}
              className="group flex h-full flex-col gap-3 rounded-2xl border border-foreground/10 bg-surface p-3 transition hover:-translate-y-1 hover:border-brand-blue/70 hover:shadow-lg hover:shadow-brand-blue/10"
            >
              <CardArt topLabel={gameName} bottomLabel={product.kind === "single" ? product.collectorNumber : undefined} />
              <span className="flex flex-1 flex-col gap-1 px-1 pb-1">
                <span className="text-xs font-medium uppercase tracking-wide text-foreground/60">
                  {[gameName, describeProductKind(product)].filter(Boolean).join(" · ")}
                </span>
                <span className="font-semibold leading-snug group-hover:text-brand-blue">{product.name}</span>
                {product.kind === "single" && (
                  <span className="mt-auto flex flex-wrap gap-1.5 pt-2">
                    <span className={`${badgeClass} font-mono`}>{product.collectorNumber}</span>
                    <span className={badgeClass}>{product.rarity}</span>
                  </span>
                )}
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
