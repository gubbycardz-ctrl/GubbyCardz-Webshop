import type { Metadata } from "next";
import { Suspense } from "react";
import { requireAdmin } from "@/modules/auth/server";
import {
  MAX_PAGE_SIZE,
  SET_REGIONS,
  SET_STATUSES,
  SET_TYPES,
  duplicateSetIds,
  matchesSetSearch,
  type CardSet,
} from "@/modules/catalog";
import { SET_SYNC_SOURCES, getCatalogRepository } from "@/modules/catalog/server";
import Link from "next/link";
import { inputClass } from "../_components/form-kit";
import { SyncPanel } from "./sync-panel";

export const metadata: Metadata = { title: "TCG Catalog" };

const SOURCE_DESCRIPTIONS: Record<string, string> = {
  pokemon: "Source: TCGdex. Scope: Sword & Shield, Scarlet & Violet and Mega Evolution, in English, German and Japanese.",
  "one-piece":
    "Source: the official One Piece Card Game website (English). Booster packs, extra and premium boosters and starter decks, including announced sets with their pre-release date.",
  lorcana: "Source: Lorcast, a community database (English). The numbered main sets, including announced ones.",
};

export default function TcgCatalogPage({ searchParams }: PageProps<"/admin/tcg-katalog">) {
  return (
    <Suspense fallback={<p className="text-foreground/60">Loading …</p>}>
      <TcgCatalog searchParams={searchParams} />
    </Suspense>
  );
}

function first(value: string | string[] | undefined) {
  return typeof value === "string" ? value : undefined;
}

async function TcgCatalog({ searchParams }: Pick<PageProps<"/admin/tcg-katalog">, "searchParams">) {
  await requireAdmin();
  const repository = getCatalogRepository();
  const games = await repository.listGames();
  const params = await searchParams;
  const gameId = games.find((game) => game.id === first(params.spiel))?.id ?? games[0]?.id;
  const query = first(params.q) ?? "";
  const status = first(params.status) ?? "";
  const region = first(params.region) ?? "";

  const allSets = gameId ? await repository.listCardSets(gameId) : [];
  const duplicates = duplicateSetIds(allSets);
  const filtered = allSets.filter(
    (set) =>
      matchesSetSearch(set, query) && (!status || set.status === status) && (!region || (set.region ?? "international") === region),
  );
  const shown = filtered.slice(0, MAX_PAGE_SIZE);
  const productCounts = await repository.countProductsBySet(shown.map((set) => set.id));

  return (
    <div className="flex flex-col gap-8">
      <section>
        <h1 className="text-3xl font-bold">TCG Catalog</h1>
        <p className="mt-2 max-w-2xl text-sm text-foreground/70">
          All sets you can pick from when creating a product. Load new sets from the source – only after a preview and your approval. Products and stock are never touched.
        </p>
      </section>

      <div className="flex flex-col gap-4">
        {SET_SYNC_SOURCES.map(({ id, label }) => (
          <SyncPanel key={id} source={id} label={label} description={SOURCE_DESCRIPTIONS[id]} />
        ))}
      </div>

      <section>
        <h2 className="text-xl font-semibold">Sets</h2>
        {games.length === 0 ? (
          <p className="mt-3 text-foreground/60">No TCGs yet. “Check” above lets the Pokémon source create the TCG.</p>
        ) : (
          <>
            <form method="get" className="mt-3 flex flex-wrap items-end gap-3 text-sm">
              <label className="flex flex-col gap-1">
                <span className="text-foreground/70">TCG</span>
                <select name="spiel" defaultValue={gameId} className={inputClass}>
                  {games.map((game) => (
                    <option key={game.id} value={game.id}>
                      {game.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex min-w-48 flex-1 flex-col gap-1">
                <span className="text-foreground/70">Search (name, code, era)</span>
                <input name="q" defaultValue={query} placeholder="e.g. 151 or Prismatic" className={inputClass} />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-foreground/70">Status</span>
                <select name="status" defaultValue={status} className={inputClass}>
                  <option value="">All</option>
                  {Object.entries(SET_STATUSES).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-foreground/70">Region</span>
                <select name="region" defaultValue={region} className={inputClass}>
                  <option value="">All</option>
                  {Object.entries(SET_REGIONS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
              <button type="submit" className="rounded-lg border border-foreground/20 px-4 py-2 font-medium hover:bg-foreground/5">
                Filter
              </button>
            </form>

            <p className="mt-3 text-sm text-foreground/60">
              {filtered.length} of {allSets.length} sets
              {filtered.length > shown.length && ` – showing the first ${shown.length}, narrow it down with the search`}
              {duplicates.size > 0 && ` · ${duplicates.size} possible duplicates (marked)`}
            </p>
            <SetTable sets={shown} productCounts={productCounts} duplicates={duplicates} />
          </>
        )}
      </section>
    </div>
  );
}

function SetTable({ sets, productCounts, duplicates }: { sets: CardSet[]; productCounts: Map<string, number>; duplicates: Set<string> }) {
  if (sets.length === 0) return <p className="mt-4 text-foreground/60">No sets found.</p>;
  return (
    <div className="mt-3 overflow-x-auto rounded-xl border border-foreground/10">
      <table className="w-full min-w-176 text-left text-sm">
        <thead className="bg-foreground/5 text-foreground/70">
          <tr>
            <th className="px-3 py-2 font-medium">Set</th>
            <th className="px-3 py-2 font-medium">Code</th>
            <th className="px-3 py-2 font-medium">Era</th>
            <th className="px-3 py-2 font-medium">Type</th>
            <th className="px-3 py-2 font-medium">Region</th>
            <th className="px-3 py-2 font-medium">Releases</th>
            <th className="px-3 py-2 font-medium">Status</th>
            <th className="px-3 py-2 text-right font-medium">Products</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-foreground/10">
          {sets.map((set) => (
            <tr key={set.id} className="align-top">
              <td className="px-3 py-2">
                <Link href={`/admin/tcg-katalog/${set.id}`} className="font-medium text-brand-blue hover:underline">
                  {set.nameEn ?? set.name}
                </Link>
                {[set.nameDe, set.nameJa]
                  .filter((name) => name && name !== (set.nameEn ?? set.name))
                  .map((name) => (
                    <span key={name} className="block text-foreground/60">
                      {name}
                    </span>
                  ))}
                {duplicates.has(set.id) && <span className="mt-1 inline-block rounded-full bg-brand-red/10 px-2 py-0.5 text-xs text-brand-red">Duplicate?</span>}
              </td>
              <td className="px-3 py-2 font-mono text-xs">{set.code}</td>
              <td className="px-3 py-2">{set.era ?? "–"}</td>
              <td className="px-3 py-2">{set.setType ? SET_TYPES[set.setType] : "–"}</td>
              <td className="px-3 py-2">{set.region === "japan" ? "Japan" : "EN/DE"}</td>
              <td className="px-3 py-2 whitespace-nowrap">
                {set.releaseDate ? formatDate(set.releaseDate) : "–"}
                {set.preReleaseDate && <span className="block text-xs text-foreground/60">Pre-release {formatDate(set.preReleaseDate)}</span>}
              </td>
              <td className="px-3 py-2">{set.status ? SET_STATUSES[set.status] : "–"}</td>
              <td className="px-3 py-2 text-right">{productCounts.get(set.id) ?? 0}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function formatDate(isoDate: string) {
  return new Date(`${isoDate}T00:00:00`).toLocaleDateString("en-GB");
}
