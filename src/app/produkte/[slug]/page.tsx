import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { describeOffer, describeProductKind, type Product } from "@/modules/catalog";
import { getAvailableOffers, getCardSet, getGame, getProduct } from "@/modules/catalog/server";
import { formatEuro } from "@/shared/money";
import { PriceNote } from "@/app/price-note";
import { CardArt } from "@/app/card-art";
import { AddToCartButton } from "./add-to-cart-button";

export async function generateMetadata({ params }: PageProps<"/produkte/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProduct(slug);
  return product
    ? {
        title: product.name,
        description: `${product.name} (${describeProductKind(product)}) bei GubbyCardz kaufen.`,
        alternates: { canonical: `/produkte/${product.slug}` },
      }
    : { title: "Produkt nicht gefunden" };
}

export default function ProductPage({ params }: PageProps<"/produkte/[slug]">) {
  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-10">
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
      <div className="mt-4 grid gap-8 md:grid-cols-[18rem_1fr]">
        <CardArt
          topLabel={game?.name}
          bottomLabel={product.kind === "single" ? product.collectorNumber : undefined}
          className="mx-auto w-full max-w-72 self-start shadow-2xl shadow-brand-blue/10"
        />
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-brand-blue">{describeProductKind(product)}</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl">{product.name}</h1>
          <dl className="mt-5 grid grid-cols-[auto_1fr] gap-x-6 gap-y-1.5 rounded-2xl border border-foreground/10 bg-surface p-4 text-sm">
            <dt className="text-foreground/60">Art</dt>
            <dd>{describeProductKind(product)}</dd>
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
                <dd className="font-mono">{product.collectorNumber}</dd>
                <dt className="text-foreground/60">Seltenheit</dt>
                <dd>{product.rarity}</dd>
              </>
            )}
          </dl>

          <h2 className="mt-8 text-xl font-semibold">Angebote</h2>
          {offers.length === 0 ? (
            <p className="mt-3 rounded-2xl border border-dashed border-foreground/20 px-4 py-6 text-center text-foreground/60">
              Derzeit ausverkauft.
            </p>
          ) : (
            <ul className="mt-3 flex flex-col gap-3">
              {offers.map((offer) => (
                <li
                  key={offer.id}
                  className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3 rounded-2xl border border-foreground/10 bg-surface px-4 py-3"
                >
                  <span className="min-w-48 flex-1">
                    <OfferBadges description={describeOffer(offer)} />
                    <span className="mt-1.5 block text-sm text-foreground/60">{offer.stock} auf Lager</span>
                  </span>
                  <span className="ml-auto flex shrink-0 items-center gap-4">
                    <span className="text-xl font-bold">{formatEuro(offer.priceCents)}</span>
                    <AddToCartButton offerId={offer.id} />
                  </span>
                </li>
              ))}
            </ul>
          )}
          {offers.length > 0 && <PriceNote className="mt-3" />}
        </div>
      </div>
    </>
  );
}

const OFFER_PART_SEPARATOR = " · ";

/** Language, condition, grading … as one badge each. The separators stay in the text for screen readers. */
function OfferBadges({ description }: { description: string }) {
  return (
    <span className="flex flex-wrap gap-1.5">
      {description.split(OFFER_PART_SEPARATOR).map((part, index) => (
        <span key={part}>
          {index > 0 && <span className="sr-only">{OFFER_PART_SEPARATOR}</span>}
          <span className="inline-block rounded-full border border-foreground/15 bg-background px-2.5 py-0.5 text-sm font-medium">
            {part}
          </span>
        </span>
      ))}
    </span>
  );
}

function setOf(product: Product) {
  return product.kind !== "accessory" && product.setId ? getCardSet(product.gameId, product.setId) : null;
}
