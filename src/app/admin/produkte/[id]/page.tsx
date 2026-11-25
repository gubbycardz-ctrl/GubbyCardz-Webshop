import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { requireAdmin } from "@/modules/auth/server";
import { describeProductKindAdmin } from "@/modules/catalog";
import { getCatalogRepository } from "@/modules/catalog/server";
import { deleteProduct } from "../../catalog-actions";
import { DeleteButton } from "../../_components/delete-button";
import { OfferForm, OfferRow } from "../../_components/offer-forms";
import { ProductForm } from "../../_components/product-form";

export const metadata: Metadata = { title: "Produkt" };

export default function AdminProductPage({ params }: PageProps<"/admin/produkte/[id]">) {
  return (
    <Suspense fallback={<p className="text-foreground/60">Loading …</p>}>
      <ProductWithOffers params={params} />
    </Suspense>
  );
}

async function ProductWithOffers({ params }: Pick<PageProps<"/admin/produkte/[id]">, "params">) {
  await requireAdmin();
  const { id } = await params;
  const repository = getCatalogRepository();
  const product = await repository.getProductById(id);
  if (!product) notFound();
  const [offers, games] = await Promise.all([repository.listOffers(product.id), repository.listGames()]);
  // All games' sets, because the product may move to another game.
  const sets = (await Promise.all(games.map((game) => repository.listCardSets(game.id)))).flat();
  const internals = await repository.getOfferInternals(offers.map((offer) => offer.id));

  return (
    <div className="flex flex-col gap-10">
      <section>
        <Link href={`/admin/produkte?filter=${product.gameId ?? "zubehoer"}`} className="text-sm text-foreground/60 hover:text-brand-blue">
          ← Products
        </Link>
        <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
          <h1 className="text-3xl font-bold">{product.name}</h1>
          <DeleteButton
            action={deleteProduct.bind(null, product.id)}
            confirmMessage={`Really delete the product “${product.name}” and ${offers.length === 1 ? "its offer" : `all ${offers.length} offers`}?`}
            label="Delete product"
          />
        </div>
        <p className="mt-1 text-sm text-foreground/60">
          {describeProductKindAdmin(product)}
          {product.kind === "single" && ` · ${product.collectorNumber} · ${product.rarity}`}
          {" · "}
          {product.hidden ? (
            <span className="font-medium text-foreground">Hidden – not visible and not purchasable in the shop</span>
          ) : (
            <Link href={`/produkte/${product.slug}`} className="text-brand-blue hover:underline">
              View in shop
            </Link>
          )}
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold">Product details</h2>
        <div className="mt-3">
          <ProductForm games={games} sets={sets} product={product} />
        </div>
      </section>

      <section>
        <h2 className="text-xl font-semibold">Offers</h2>
        {offers.length === 0 ? (
          <p className="mt-3 text-foreground/60">No offers yet – the shop shows “Derzeit ausverkauft” (sold out).</p>
        ) : (
          <div className="mt-3 divide-y divide-foreground/10 rounded-xl border border-foreground/10">
            {offers.map((offer) => (
              <OfferRow key={offer.id} offer={offer} internals={internals.get(offer.id)} />
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="text-xl font-semibold">New offer</h2>
        <div className="mt-3">
          <OfferForm productId={product.id} productKind={product.kind} />
        </div>
      </section>
    </div>
  );
}
