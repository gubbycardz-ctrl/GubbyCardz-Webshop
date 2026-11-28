import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { requireAdmin } from "@/modules/auth/server";
import { MAX_PAGE_SIZE, describeProductKindAdmin, type Product } from "@/modules/catalog";
import { getCatalogRepository } from "@/modules/catalog/server";
import { ProductForm } from "../_components/product-form";

export const metadata: Metadata = { title: "Produkte" };

// Accessories can exist without a game, so they get their own filter.
const ACCESSORIES_FILTER = "zubehoer";

export default function AdminProductsPage({ searchParams }: PageProps<"/admin/produkte">) {
  return (
    <Suspense fallback={<p className="text-foreground/60">Loading …</p>}>
      <Products searchParams={searchParams} />
    </Suspense>
  );
}

async function Products({ searchParams }: Pick<PageProps<"/admin/produkte">, "searchParams">) {
  await requireAdmin();
  const repository = getCatalogRepository();
  const games = await repository.listGames();
  const { filter } = await searchParams;
  const selected = typeof filter === "string" ? filter : (games[0]?.id ?? ACCESSORIES_FILTER);

  const [products, sets] = await Promise.all([
    selected === ACCESSORIES_FILTER
      ? repository.listProducts({ kind: "accessory", limit: MAX_PAGE_SIZE, includeHidden: true })
      : repository.listProducts({ gameId: selected, limit: MAX_PAGE_SIZE, includeHidden: true }),
    Promise.all(games.map((game) => repository.listCardSets(game.id))).then((lists) => lists.flat()),
  ]);

  const tabs = [...games.map((game) => ({ id: game.id, name: game.name })), { id: ACCESSORIES_FILTER, name: "Accessories" }];

  return (
    <div className="flex flex-col gap-10">
      <section>
        <h1 className="text-3xl font-bold">Products</h1>
        <nav className="mt-4 flex flex-wrap gap-2 text-sm">
          {tabs.map((tab) => (
            <Link
              key={tab.id}
              href={`/admin/produkte?filter=${tab.id}`}
              className={`rounded-full border px-3 py-1 ${tab.id === selected ? "border-brand-blue text-brand-blue" : "border-foreground/20 hover:bg-foreground/5"}`}
            >
              {tab.name}
            </Link>
          ))}
        </nav>
        <ProductList products={products} />
      </section>

      <section>
        <h2 className="text-xl font-semibold">New product</h2>
        <div className="mt-3">
          {games.length === 0 ? (
            <p className="text-foreground/60">
              Please add a TCG first under <Link href="/admin" className="text-brand-blue hover:underline">TCGs & Sets</Link>, or load them in <Link href="/admin/tcg-katalog" className="text-brand-blue hover:underline">TCG Catalog</Link>.
            </p>
          ) : (
            <ProductForm games={games} sets={sets} defaultGameId={selected === ACCESSORIES_FILTER ? undefined : selected} />
          )}
        </div>
      </section>
    </div>
  );
}

function ProductList({ products }: { products: Product[] }) {
  if (products.length === 0) return <p className="mt-4 text-foreground/60">No products yet.</p>;

  return (
    <ul className="mt-4 divide-y divide-foreground/10 rounded-xl border border-foreground/10">
      {products.map((product) => (
        <li key={product.id}>
          <Link href={`/admin/produkte/${product.id}`} className="flex justify-between gap-4 px-4 py-3 hover:bg-foreground/5">
            <span>
              {product.name}
              {product.kind === "single" && <span className="text-foreground/60"> · {product.collectorNumber}</span>}
              {product.hidden && <span className="ml-2 rounded-full bg-foreground/10 px-2 py-0.5 text-xs">Hidden</span>}
            </span>
            <span className="text-sm text-foreground/60">
              {describeProductKindAdmin(product)}
              {product.kind === "sealed" && !product.category && <span className="text-brand-red"> · Category missing</span>}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
