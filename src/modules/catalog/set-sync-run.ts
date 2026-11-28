import "server-only";
import { CatalogError, type CatalogRepository } from "./catalog-repository";
import { getCatalogRepository } from "./default-repository";
import type { Game } from "./game";
import { planSetSync, type SetSyncItem, type SetSyncPlan, type SetSyncStatus, type SourceResult } from "./set-sync";
import { toSlug } from "./slug";
import type { Fetchers, GetJson, GetText } from "./set-sources/fetchers";
import { LORCANA_GAME_ID, LORCAST_API, fetchLorcanaSets } from "./set-sources/lorcast-lorcana";
import { ONE_PIECE_GAME_ID, ONE_PIECE_SITE, fetchOnePieceSets } from "./set-sources/onepiece-official";
import { POKEMON_GAME_ID, TCGDEX_API, fetchPokemonSets } from "./set-sources/tcgdex-pokemon";

// Runs a set sync: fetch from the source, compare with the catalog (set-sync.ts), and – only on request –
// write. Preview and apply do the same steps on fresh data, so what is written is what was checked.
// Only sets are written; products, offers and stock are never touched.

type Source = {
  game: Game;
  label: string;
  fetchSets: (fetchers: Fetchers, context: { today: string }) => Promise<SourceResult>;
};

const SOURCES = {
  pokemon: {
    game: { id: POKEMON_GAME_ID, name: "Pokémon" },
    label: "Pokémon",
    fetchSets: async ({ getJson }) => ({ sets: await fetchPokemonSets(getJson), skipped: [] }),
  },
  "one-piece": {
    game: { id: ONE_PIECE_GAME_ID, name: "One Piece" },
    label: "One Piece",
    fetchSets: ({ getText }, context) => fetchOnePieceSets(getText, context),
  },
  lorcana: {
    game: { id: LORCANA_GAME_ID, name: "Disney Lorcana" },
    label: "Disney Lorcana",
    fetchSets: ({ getJson }) => fetchLorcanaSets(getJson),
  },
} satisfies Record<string, Source>;

export type SetSyncSourceId = keyof typeof SOURCES;
export const SET_SYNC_SOURCE_IDS = Object.keys(SOURCES) as SetSyncSourceId[];
/** For the admin page: which sources there are and what they are called. */
export const SET_SYNC_SOURCES = SET_SYNC_SOURCE_IDS.map((id) => ({ id, label: SOURCES[id].label }));

export type SetSyncRow = {
  id: string;
  name: string;
  code: string;
  region?: string;
  releaseDate?: string;
  preReleaseDate?: string;
  status: SetSyncStatus;
  changes: string[];
  notes: string[];
};

export type SetSyncOutcome =
  | { ok: false; error: string }
  | {
      ok: true;
      /** The TCG does not exist yet; applying creates it. */
      newGame: boolean;
      rows: SetSyncRow[];
      notInSource: number;
      /** Only after applying. */
      written?: { sets: number; failures: string[] };
    };

type Deps = { repository?: CatalogRepository; getJson?: GetJson; getText?: GetText; today?: string };

const REQUEST_TIMEOUT_MS = 15_000;
// Only the sources' own addresses may be called, whatever a plan or a redirect might say.
const ALLOWED_PREFIXES = [`${TCGDEX_API}/`, `${LORCAST_API}/`, `${ONE_PIECE_SITE}/`];

async function httpGet(url: string): Promise<Response> {
  if (!ALLOWED_PREFIXES.some((prefix) => url.startsWith(prefix))) throw new Error("Address not allowed");
  const response = await fetch(url, { signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS), cache: "no-store" });
  if (!response.ok) throw new Error(`HTTP ${response.status} for ${url}`);
  return response;
}

const httpGetJson: GetJson = async (url) => (await httpGet(url)).json();
const httpGetText: GetText = async (url) => (await httpGet(url)).text();

export async function previewSetSync(sourceId: SetSyncSourceId, deps: Deps = {}): Promise<SetSyncOutcome> {
  const prepared = await prepare(sourceId, deps);
  return prepared.ok ? summarize(prepared) : prepared;
}

export async function runSetSync(sourceId: SetSyncSourceId, deps: Deps = {}): Promise<SetSyncOutcome> {
  const prepared = await prepare(sourceId, deps);
  if (!prepared.ok) return prepared;

  const repository = deps.repository ?? getCatalogRepository();
  const failures: string[] = [];
  let sets = 0;
  if (prepared.newGame) await repository.saveGame(prepared.game);
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
  const source: Source = SOURCES[sourceId];
  const repository = deps.repository ?? getCatalogRepository();
  const today = deps.today ?? new Date().toISOString().slice(0, 10);

  let result: SourceResult;
  try {
    result = await source.fetchSets({ getJson: deps.getJson ?? httpGetJson, getText: deps.getText ?? httpGetText }, { today });
  } catch (error) {
    const reason = error instanceof Error ? error.message : "unknown error";
    return { ok: false as const, error: `The source is not reachable or returned unexpected data (${reason}). Nothing was changed.` };
  }

  // The TCG may exist under a slightly different spelling ("Lorcana" or "Disney Lorcana"); never create a twin.
  const games = await repository.listGames();
  const existingGame = games.find((game) => matchesGame(game, source.game.id));
  const game = existingGame ?? source.game;
  const existingSets = existingGame ? await repository.listCardSets(game.id) : [];
  const plan = planSetSync(
    result.sets.map((set) => ({ ...set, gameId: game.id })),
    existingSets,
    { today },
  );
  return {
    ok: true as const,
    game,
    newGame: !existingGame,
    plan,
    skipped: result.skipped,
    today,
    existing: new Map(existingSets.map((set) => [set.id, set])),
  };
}

function matchesGame(game: Game, sourceGameId: string): boolean {
  const slug = toSlug(game.name);
  return game.id === sourceGameId || slug === sourceGameId || slug.split("-").includes(sourceGameId);
}

function summarize({ newGame, plan, skipped }: { newGame: boolean; plan: SetSyncPlan; skipped: SourceResult["skipped"] }): Extract<SetSyncOutcome, { ok: true }> {
  const skippedRows: SetSyncRow[] = skipped.map((entry, index) => ({
    id: `skipped-${index}`,
    name: entry.name,
    code: entry.code ?? "–",
    status: "skipped",
    changes: [],
    notes: [entry.reason],
  }));
  return { ok: true, newGame, rows: [...plan.items.map(toRow), ...skippedRows], notInSource: plan.notInSource.length };
}

function toRow({ set, status, changes, notes }: SetSyncItem): SetSyncRow {
  return {
    id: set.id,
    name: set.name,
    code: set.code,
    region: set.region,
    releaseDate: set.releaseDate,
    preReleaseDate: set.preReleaseDate,
    status,
    changes,
    notes,
  };
}
