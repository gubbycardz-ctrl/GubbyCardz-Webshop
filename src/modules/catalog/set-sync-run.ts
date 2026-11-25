import "server-only";
import { CatalogError, type CatalogRepository } from "./catalog-repository";
import { getCatalogRepository } from "./default-repository";
import type { Game } from "./game";
import { planSetSync, type SetSyncItem, type SetSyncPlan, type SetSyncStatus } from "./set-sync";
import { fetchPokemonSets, POKEMON_GAME_ID, TCGDEX_API, type GetJson } from "./set-sources/tcgdex-pokemon";

// Runs a set sync: fetch from the source, compare with the catalog (set-sync.ts), and – only on request –
// write. Preview and apply do the same steps on fresh data, so what is written is what was checked.
// Only sets are written; products, offers and stock are never touched.

const SOURCES = {
  pokemon: { game: { id: POKEMON_GAME_ID, name: "Pokémon" } satisfies Game, fetchSets: fetchPokemonSets },
} as const;

export type SetSyncSourceId = keyof typeof SOURCES;
export const SET_SYNC_SOURCE_IDS = Object.keys(SOURCES) as SetSyncSourceId[];

export type SetSyncRow = {
  id: string;
  name: string;
  code: string;
  region?: string;
  releaseDate?: string;
  status: SetSyncStatus;
  changes: string[];
  notes: string[];
};

export type SetSyncOutcome =
  | { ok: false; error: string }
  | {
      ok: true;
      /** The game does not exist yet; applying creates it. */
      newGame: boolean;
      rows: SetSyncRow[];
      notInSource: number;
      /** Only after applying. */
      written?: { sets: number; failures: string[] };
    };

type Deps = { repository?: CatalogRepository; getJson?: GetJson; today?: string };

const REQUEST_TIMEOUT_MS = 15_000;

/** Only the source's own API may be called, whatever a plan or a redirect might say. */
async function httpGetJson(url: string): Promise<unknown> {
  if (!url.startsWith(`${TCGDEX_API}/`)) throw new Error("Unerlaubte Adresse");
  const response = await fetch(url, { signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS), headers: { accept: "application/json" }, cache: "no-store" });
  if (!response.ok) throw new Error(`HTTP ${response.status} bei ${url}`);
  return response.json();
}

export async function previewSetSync(sourceId: SetSyncSourceId, deps: Deps = {}): Promise<SetSyncOutcome> {
  const prepared = await prepare(sourceId, deps);
  return prepared.ok ? summarize(prepared) : prepared;
}

export async function runSetSync(sourceId: SetSyncSourceId, deps: Deps = {}): Promise<SetSyncOutcome> {
  const prepared = await prepare(sourceId, deps);
  if (!prepared.ok) return prepared;

  const repository = deps.repository ?? getCatalogRepository();
  const { game } = SOURCES[sourceId];
  const failures: string[] = [];
  let sets = 0;
  if (prepared.newGame) await repository.saveGame(game);
  for (const item of prepared.plan.items) {
    if (item.status === "conflict") continue;
    // A set that is only re-confirmed on a day it was already confirmed needs no write.
    if (item.status === "unchanged" && prepared.existing.get(item.set.id)?.verifiedAt === prepared.today) continue;
    try {
      await repository.saveCardSet(item.set);
      if (item.status !== "unchanged") sets++;
    } catch (error) {
      if (!(error instanceof CatalogError)) throw error;
      failures.push(`${item.set.name}: ${error.message}`);
    }
  }
  return { ...summarize(prepared), written: { sets, failures } };
}

async function prepare(sourceId: SetSyncSourceId, deps: Deps) {
  const source = SOURCES[sourceId];
  const repository = deps.repository ?? getCatalogRepository();
  const today = deps.today ?? new Date().toISOString().slice(0, 10);

  let incoming;
  try {
    incoming = await source.fetchSets(deps.getJson ?? httpGetJson);
  } catch (error) {
    const reason = error instanceof Error ? error.message : "unbekannter Fehler";
    return { ok: false as const, error: `Die Quelle ist nicht erreichbar oder lieferte unerwartete Daten (${reason}). Es wurde nichts geändert.` };
  }

  const games = await repository.listGames();
  const newGame = !games.some((game) => game.id === source.game.id);
  const existingSets = newGame ? [] : await repository.listCardSets(source.game.id);
  const plan = planSetSync(incoming, existingSets, { today });
  return { ok: true as const, newGame, plan, today, existing: new Map(existingSets.map((set) => [set.id, set])) };
}

function summarize({ newGame, plan }: { newGame: boolean; plan: SetSyncPlan }): Extract<SetSyncOutcome, { ok: true }> {
  return { ok: true, newGame, rows: plan.items.map(toRow), notInSource: plan.notInSource.length };
}

function toRow({ set, status, changes, notes }: SetSyncItem): SetSyncRow {
  return { id: set.id, name: set.name, code: set.code, region: set.region, releaseDate: set.releaseDate, status, changes, notes };
}
