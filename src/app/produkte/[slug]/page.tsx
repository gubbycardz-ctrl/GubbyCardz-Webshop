import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { PRODUCT_KIND_LABELS, describeOffer, type Product } from "@/modules/catalog";
import { getAvailableOffers, getCardSet, getGame, getProduct } from "@/modules/catalog/server";
import { formatEuro } from "@/shared/money";

export async function generateMetadata({ params }: PageProps<"/produkte/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProduct(slug);
  return product ? { title: product.name } : { title: "Produkt nicht gefunden" };
}

export default function ProductPage({ params }: PageProps<"/produkte/[slug]">) {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-10">
      <Suspense fallback={<p className="text-foreground/60">Produkt wird geladen …</p>}>
        <ProductDetails params={params} />
      </Suspense>
    </main>
  );
}

async function ProductDetails({ params }: Pick<PageProps<"/produkte/[slug]">, "params">) {
  const { slug } = await params;
  const product = await getProduct(slug);
  if (!product) notFound();

  const [game, cardSet, offers] = await Promise.all([
    product.gameId ? getGame(product.gameId) : null,
    setOf(product),
    getAvailableOffers(product.id),
  ]);

  return (
    <>
      {game && (
        <Link href={`/spiele/${game.id}`} className="text-sm text-foreground/60 hover:text-brand-blue">
          ← {game.name}
        </Link>
      )}
      <h1 className="mt-2 text-3xl font-bold">{product.name}</h1>
      <dl className="mt-4 grid grid-cols-[auto_1fr] gap-x-6 gap-y-1 text-sm">
        <dt className="text-foreground/60">Art</dt>
        <dd>{PRODUCT_KIND_LABELS[product.kind]}</dd>
        {cardSet && (
          <>
            <dt className="text-foreground/60">Set</dt>
            <dd>
              {cardSet.name} ({cardSet.code})
            </dd>
          </>
        )}
        {product.kind === "single" && (
          <>
            <dt className="text-foreground/60">Nummer</dt>
            <dd>{product.collectorNumber}</dd>
            <dt className="text-foreground/60">Seltenheit</dt>
            <dd>{product.rarity}</dd>
          </>
        )}
      </dl>

      <h2 className="mt-10 text-xl font-semibold">Angebote</h2>
      {offers.length === 0 ? (
        <p className="mt-3 text-foreground/60">Derzeit ausverkauft.</p>
      ) : (
        <ul className="mt-3 divide-y divide-foreground/10 rounded-xl border border-foreground/10">
          {offers.map((offer) => (
            <li key={offer.id} className="flex items-center justify-between gap-4 px-4 py-3">
              <span>
                {describeOffer(offer)}
                <span className="block text-sm text-foreground/60">{offer.stock} auf Lager</span>
              </span>
              <span className="shrink-0 text-lg font-semibold">{formatEuro(offer.priceCents)}</span>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

function setOf(product: Product) {
  return product.kind !== "accessory" && product.setId ? getCardSet(product.gameId, product.setId) : null;
}
