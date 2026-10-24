import Link from "next/link";
import { PRODUCT_KIND_LABELS, type Game, type Product } from "@/modules/catalog";

const WIDE_COLUMNS = "sm:grid-cols-2 lg:grid-cols-4";

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
      {products.map((product) => (
        <li key={product.id}>
          <Link
            href={`/produkte/${product.slug}`}
            className="flex h-full flex-col gap-1 rounded-xl border border-foreground/10 p-4 transition-colors hover:border-brand-blue"
          >
            <span className="text-xs font-medium uppercase tracking-wide text-foreground/60">
              {[product.gameId && gameNames.get(product.gameId), PRODUCT_KIND_LABELS[product.kind]].filter(Boolean).join(" · ")}
            </span>
            <span className="font-semibold">{product.name}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
