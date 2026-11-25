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
import { getCatalogRepository } from "@/modules/catalog/server";
import { inputClass } from "../_components/form-kit";
import { SyncPanel } from "./sync-panel";

export const metadata: Metadata = { title: "TCG-Katalog" };

export default function TcgCatalogPage({ searchParams }: PageProps<"/admin/tcg-katalog">) {
  return (
    <Suspense fallback={<p className="text-foreground/60">Wird geladen …</p>}>
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
        <h1 className="text-3xl font-bold">TCG-Katalog</h1>
        <p className="mt-2 max-w-2xl text-sm text-foreground/70">
          Alle Sets, aus denen du beim Anlegen eines Produkts wählst. Neue Sets holst du aus der Quelle – erst nach einer Vorschau und
          deiner Freigabe. Produkte und Bestände bleiben dabei unberührt.
        </p>
      </section>

      <SyncPanel />

      <section>
        <h2 className="text-xl font-semibold">Sets</h2>
        {games.length === 0 ? (
          <p className="mt-3 text-foreground/60">Noch keine Spiele. Mit „Prüfen“ oben legt die Pokémon-Quelle das Spiel an.</p>
        ) : (
          <>
            <form method="get" className="mt-3 flex flex-wrap items-end gap-3 text-sm">
              <label className="flex flex-col gap-1">
                <span className="text-foreground/70">Spiel</span>
                <select name="spiel" defaultValue={gameId} className={inputClass}>
                  {games.map((game) => (
                    <option key={game.id} value={game.id}>
                      {game.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex min-w-48 flex-1 flex-col gap-1">
                <span className="text-foreground/70">Suche (Name, Code, Ära)</span>
                <input name="q" defaultValue={query} placeholder="z. B. 151 oder Karmesin" className={inputClass} />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-foreground/70">Status</span>
                <select name="status" defaultValue={status} className={inputClass}>
                  <option value="">Alle</option>
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
                  <option value="">Alle</option>
                  {Object.entries(SET_REGIONS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
              <button type="submit" className="rounded-lg border border-foreground/20 px-4 py-2 font-medium hover:bg-foreground/5">
                Filtern
              </button>
            </form>

            <p className="mt-3 text-sm text-foreground/60">
              {filtered.length} von {allSets.length} Sets
              {filtered.length > shown.length && ` – die ersten ${shown.length} werden angezeigt, bitte mit der Suche eingrenzen`}
              {duplicates.size > 0 && ` · ${duplicates.size} mögliche Dubletten (markiert)`}
            </p>
            <SetTable sets={shown} productCounts={productCounts} duplicates={duplicates} />
          </>
        )}
      </section>
    </div>
  );
}

function SetTable({ sets, productCounts, duplicates }: { sets: CardSet[]; productCounts: Map<string, number>; duplicates: Set<string> }) {
  if (sets.length === 0) return <p className="mt-4 text-foreground/60">Keine Sets gefunden.</p>;
  return (
    <div className="mt-3 overflow-x-auto rounded-xl border border-foreground/10">
      <table className="w-full min-w-176 text-left text-sm">
        <thead className="bg-foreground/5 text-foreground/70">
          <tr>
            <th className="px-3 py-2 font-medium">Set</th>
            <th className="px-3 py-2 font-medium">Code</th>
            <th className="px-3 py-2 font-medium">Ära</th>
            <th className="px-3 py-2 font-medium">Typ</th>
            <th className="px-3 py-2 font-medium">Region</th>
            <th className="px-3 py-2 font-medium">Erscheint</th>
            <th className="px-3 py-2 font-medium">Status</th>
            <th className="px-3 py-2 text-right font-medium">Produkte</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-foreground/10">
          {sets.map((set) => (
            <tr key={set.id} className="align-top">
              <td className="px-3 py-2">
                <span className="font-medium">{set.nameEn ?? set.name}</span>
                {[set.nameDe, set.nameJa]
                  .filter((name) => name && name !== (set.nameEn ?? set.name))
                  .map((name) => (
                    <span key={name} className="block text-foreground/60">
                      {name}
                    </span>
                  ))}
                {duplicates.has(set.id) && <span className="mt-1 inline-block rounded-full bg-brand-red/10 px-2 py-0.5 text-xs text-brand-red">Dublette?</span>}
              </td>
              <td className="px-3 py-2 font-mono text-xs">{set.code}</td>
              <td className="px-3 py-2">{set.era ?? "–"}</td>
              <td className="px-3 py-2">{set.setType ? SET_TYPES[set.setType] : "–"}</td>
              <td className="px-3 py-2">{set.region === "japan" ? "Japan" : "EN/DE"}</td>
              <td className="px-3 py-2 whitespace-nowrap">{set.releaseDate ? formatDate(set.releaseDate) : "–"}</td>
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
  return new Date(`${isoDate}T00:00:00`).toLocaleDateString("de-DE");
}
