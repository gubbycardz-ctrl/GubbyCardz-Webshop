import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { requireAdmin } from "@/modules/auth/server";
import { PRODUCT_KIND_LABELS } from "@/modules/catalog";
import { getCatalogRepository } from "@/modules/catalog/server";
import { deleteProduct } from "../../catalog-actions";
import { DeleteButton } from "../../_components/delete-button";
import { OfferForm, OfferRow } from "../../_components/offer-forms";

export const metadata: Metadata = { title: "Produkt" };

export default function AdminProductPage({ params }: PageProps<"/admin/produkte/[id]">) {
  return (
    <Suspense fallback={<p className="text-foreground/60">Wird geladen …</p>}>
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
  const offers = await repository.listOffers(product.id);

  return (
    <div className="flex flex-col gap-10">
      <section>
        <Link href={`/admin/produkte?filter=${product.gameId ?? "zubehoer"}`} className="text-sm text-foreground/60 hover:text-brand-blue">
          ← Produkte
        </Link>
        <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
          <h1 className="text-3xl font-bold">{product.name}</h1>
          <DeleteButton
            action={deleteProduct.bind(null, product.id)}
            confirmMessage={`Produkt „${product.name}“ und ${offers.length === 1 ? "sein Angebot" : `alle ${offers.length} Angebote`} wirklich löschen?`}
            label="Produkt löschen"
          />
        </div>
        <p className="mt-1 text-sm text-foreground/60">
          {PRODUCT_KIND_LABELS[product.kind]}
          {product.kind === "single" && ` · ${product.collectorNumber} · ${product.rarity}`}
          {" · "}
          <Link href={`/produkte/${product.slug}`} className="text-brand-blue hover:underline">
            Im Shop ansehen
          </Link>
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold">Angebote</h2>
        {offers.length === 0 ? (
          <p className="mt-3 text-foreground/60">Noch keine Angebote – im Shop steht „Derzeit ausverkauft“.</p>
        ) : (
          <div className="mt-3 divide-y divide-foreground/10 rounded-xl border border-foreground/10">
            {offers.map((offer) => (
              <OfferRow key={offer.id} offer={offer} />
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="text-xl font-semibold">Neues Angebot</h2>
        <div className="mt-3">
          <OfferForm productId={product.id} productKind={product.kind} />
        </div>
      </section>
    </div>
  );
}
