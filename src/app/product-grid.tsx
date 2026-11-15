import Link from "next/link";
import { describeProductKind, type Game, type Product } from "@/modules/catalog";
import { getAvailableOffers } from "@/modules/catalog/server";
import { formatEuro } from "@/shared/money";
import { PriceNote } from "./price-note";
import { ProductImagePlaceholder } from "./product-image";

const WIDE_COLUMNS = "sm:grid-cols-3 lg:grid-cols-4";

/** Product tiles with price, as on the home page; narrow pages pass fewer columns. */
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
    <>
      <ul className={`mt-6 grid grid-cols-2 gap-4 ${columns}`}>
        {products.map((product) => (
          <li key={product.id}>
            <ProductCard product={product} gameName={product.gameId && gameNames.get(product.gameId)} />
          </li>
        ))}
      </ul>
      <PriceNote className="mt-4" />
    </>
  );
}

async function ProductCard({ product, gameName }: { product: Product; gameName?: string }) {
  // Cached per product, so the tiles cost no extra database reads on repeated visits.
  const offers = await getAvailableOffers(product.id);
  // Offers come sorted by price, cheapest first.
  const [cheapest] = offers;
  const hasSeveralPrices = offers.some((offer) => offer.priceCents !== cheapest.priceCents);

  return (
    <Link
      href={`/produkte/${product.slug}`}
      className="group flex h-full flex-col overflow-hidden rounded-xl border border-foreground/10 bg-background transition hover:-translate-y-0.5 hover:border-brand-blue hover:shadow-lg"
    >
      <span className="relative block">
        <ProductImagePlaceholder className="aspect-[4/3] w-full" />
        {!cheapest && (
          <span className="absolute left-2 top-2 rounded-full bg-foreground px-2.5 py-0.5 text-xs font-semibold text-background">
            Ausverkauft
          </span>
        )}
      </span>
      <span className="flex flex-1 flex-col gap-1 p-3 sm:p-4">
        <span className="text-xs font-medium uppercase tracking-wide text-foreground/60">
          {[gameName, describeProductKind(product)].filter(Boolean).join(" · ")}
        </span>
        <span className="font-semibold leading-snug group-hover:text-brand-blue">{product.name}</span>
        {product.kind === "single" && (
          <span className="text-sm text-foreground/60">
            {product.collectorNumber} · {product.rarity}
          </span>
        )}
        {cheapest && (
          <span className="mt-auto pt-2 text-lg font-bold">
            {hasSeveralPrices && <span className="text-sm font-normal text-foreground/60">ab </span>}
            {formatEuro(cheapest.priceCents)}
          </span>
        )}
      </span>
    </Link>
  );
}
