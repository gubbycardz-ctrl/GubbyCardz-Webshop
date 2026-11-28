import { cardSetSchema, type CardSet } from "./game";
import { comparableName } from "./set-labels";
import { toSlug } from "./slug";

// Compares the sets a data source reports with the sets the shop already has and says what to do.
// Pure on purpose: nothing here reads the network or the database, so the rules are easy to test.
//
// Rules:
// - Nothing is ever deleted, and products and stock are not touched.
// - Sets that came from the same source are refreshed from it.
// - Sets entered by hand are only *completed* (empty fields filled), never overwritten; differences are noted.
// - Sets the source reports with the same name and date in the same market are contradictory (a data error
//   at the source) and are not imported – they are listed as conflicts for the admin to look at.
// - A hand-made set that might be the same one is matched by code or name, but only if exactly one fits.
//   Anything unclear becomes a new set with a note, so the admin decides – never a silent merge.

/** A set as a data source reports it, before it is compared with what the shop knows. */
export type SourceSet = {
  id: string;
  gameId: string;
  source: string;
  /** Unique across sources, e.g. "tcgdex:en/sv01". */
  sourceId: string;
  region: NonNullable<CardSet["region"]>;
  code: string;
  name: string;
  nameEn?: string;
  nameDe?: string;
  nameJa?: string;
  /** Absent where the TCG has no eras (the era dropdown then stays away). */
  era?: string;
  setType?: CardSet["setType"];
  releaseDate: string;
  preReleaseDate?: string;
};

/** What a source adapter returns: the sets it understood, and the entries it left out on purpose, with the reason. */
export type SourceResult = {
  sets: SourceSet[];
  skipped: { name: string; code?: string; reason: string }[];
};

export type SetSyncStatus = "create" | "update" | "enrich" | "unchanged" | "conflict" | "skipped";
export type SetSyncItem = {
  status: SetSyncStatus;
  /** What to write if the item is applied. */
  set: CardSet;
  /** Human-readable differences, for the preview. */
  changes: string[];
  notes: string[];
};
export type SetSyncPlan = {
  items: SetSyncItem[];
  /** Sets of this source that it no longer reports. Reported only – never removed. */
  notInSource: CardSet[];
};

type CatalogField = "name" | "nameEn" | "nameDe" | "nameJa" | "era" | "setType" | "region" | "releaseDate" | "preReleaseDate" | "code";

const FIELD_LABELS: Record<CatalogField, string> = {
  name: "Name",
  nameEn: "Name (EN)",
  nameDe: "Name (DE)",
  nameJa: "Name (JA)",
  era: "Era",
  setType: "Type",
  region: "Region",
  releaseDate: "Release date",
  preReleaseDate: "Pre-release date",
  code: "Code",
};

// Fields a source maintains on sets it created.
const MANAGED_FIELDS: readonly CatalogField[] = ["code", "name", "nameEn", "nameDe", "nameJa", "era", "setType", "region", "releaseDate", "preReleaseDate"];
// Fields it may fill in on sets entered by hand – the code and the name stay as the admin wrote them.
const FILLABLE_FIELDS: readonly CatalogField[] = ["nameEn", "nameDe", "nameJa", "era", "setType", "region", "releaseDate", "preReleaseDate"];

export function statusFor(releaseDate: string, today: string): "announced" | "released" {
  return releaseDate <= today ? "released" : "announced";
}

export function planSetSync(incoming: readonly SourceSet[], existing: readonly CardSet[], { today }: { today: string }): SetSyncPlan {
  const bySourceId = new Map(existing.filter((set) => set.sourceId).map((set) => [set.sourceId, set]));
  const byId = new Map(existing.map((set) => [set.id, set]));
  const claimed = new Set<string>();
  const items: SetSyncItem[] = [];
  const contradictions = findContradictions(incoming);

  for (const source of incoming) {
    const notes: string[] = [];
    const contradicting = contradictions.get(source.sourceId);
    if (contradicting) {
      notes.push(`Same name and date as ${contradicting.join(", ")} – the source contradicts itself here, skipped`);
      items.push({ status: "conflict", set: toNewSet(source, today), changes: [], notes });
      continue;
    }
    let match = bySourceId.get(source.sourceId) ?? byId.get(source.id);
    if (match && claimed.has(match.id)) match = undefined;

    if (!match && source.region === "international") {
      const candidates = existing.filter((set) => isHandMadeLookalike(set, source) && !claimed.has(set.id));
      if (candidates.length === 1) match = candidates[0];
      else if (candidates.length > 1) {
        notes.push(`Possible duplicate of ${candidates.map((set) => `${set.name} (${set.code})`).join(", ")} – not merged`);
      }
    }

    if (!match) {
      items.push({ status: "create", set: toNewSet(source, today), changes: [], notes });
      continue;
    }
    claimed.add(match.id);
    items.push(match.source === source.source ? refreshManaged(match, source, today, notes) : completeHandMade(match, source, today, notes));
  }

  const reported = new Set(incoming.map((source) => source.sourceId));
  const notInSource = existing.filter((set) => set.source === incoming[0]?.source && !claimed.has(set.id) && !(set.sourceId && reported.has(set.sourceId)));
  return { items, notInSource };
}

/** Source id → codes of the other sets with the same market, name and date. Only sets that have such twins appear. */
function findContradictions(incoming: readonly SourceSet[]): Map<string, string[]> {
  const groups = new Map<string, SourceSet[]>();
  for (const set of incoming) {
    const name = comparableName(set.nameEn ?? set.name);
    if (!name) continue;
    const key = `${set.gameId}|${set.region}|${name}|${set.releaseDate}`;
    groups.set(key, [...(groups.get(key) ?? []), set]);
  }
  const result = new Map<string, string[]>();
  for (const group of groups.values()) {
    if (group.length < 2) continue;
    for (const set of group) result.set(set.sourceId, group.filter((other) => other !== set).map((other) => other.code));
  }
  return result;
}

function toNewSet(source: SourceSet, today: string): CardSet {
  return cardSetSchema.parse(definedOnly({
    id: source.id,
    gameId: source.gameId,
    name: source.name,
    code: source.code,
    releaseDate: source.releaseDate,
    preReleaseDate: source.preReleaseDate,
    nameEn: source.nameEn,
    nameDe: source.nameDe,
    nameJa: source.nameJa,
    era: source.era,
    setType: source.setType,
    region: source.region,
    status: statusFor(source.releaseDate, today),
    source: source.source,
    sourceId: source.sourceId,
    verifiedAt: today,
  }));
}

function refreshManaged(existing: CardSet, source: SourceSet, today: string, notes: string[]): SetSyncItem {
  const changes: string[] = [];
  const next: Record<string, unknown> = { ...existing };
  for (const field of MANAGED_FIELDS) {
    const value = source[field];
    // A value the source no longer has is kept: nothing disappears by itself.
    if (value === undefined || value === existing[field]) continue;
    changes.push(describeChange(field, existing[field], value));
    next[field] = value;
  }
  // "archived" is the admin's decision; the sync only moves between announced and released.
  if (existing.status !== "archived") next.status = statusFor(source.releaseDate, today);
  if (next.status !== existing.status) changes.push(`Status: ${existing.status ?? "–"} → ${String(next.status)}`);
  next.verifiedAt = today;
  return { status: changes.length > 0 ? "update" : "unchanged", set: cardSetSchema.parse(next), changes, notes };
}

function completeHandMade(existing: CardSet, source: SourceSet, today: string, notes: string[]): SetSyncItem {
  const changes: string[] = [];
  const next: Record<string, unknown> = { ...existing };
  for (const field of FILLABLE_FIELDS) {
    const value = source[field];
    if (value === undefined) continue;
    if (existing[field] === undefined) {
      changes.push(describeChange(field, undefined, value));
      next[field] = value;
    } else if (existing[field] !== value && (field === "releaseDate" || field === "nameEn")) {
      notes.push(`${FIELD_LABELS[field]} differs (existing: ${existing[field]}, source: ${value}) – not overwritten`);
    }
  }
  if (existing.code !== source.code) notes.push(`Code differs (existing: ${existing.code}, source: ${source.code}) – not overwritten`);
  if (!existing.sourceId) {
    changes.push("Linked to the source");
    next.sourceId = source.sourceId;
  }
  if (!existing.status && next.releaseDate) {
    next.status = statusFor(String(next.releaseDate), today);
    changes.push(`Status: ${String(next.status)}`);
  }
  if (changes.length > 0) next.verifiedAt = today;
  return { status: changes.length > 0 ? "enrich" : "unchanged", set: cardSetSchema.parse(next), changes, notes };
}

// Same game, entered by hand, and the same code or name: probably the same set.
function isHandMadeLookalike(existing: CardSet, source: SourceSet): boolean {
  if (existing.gameId !== source.gameId || existing.source || existing.sourceId) return false;
  if ((existing.region ?? "international") !== "international") return false;
  const names = new Set([source.name, source.nameEn, source.nameDe].filter(Boolean).map((name) => toSlug(name as string)));
  return compactCode(existing.code) === compactCode(source.code) || [existing.name, existing.nameEn, existing.nameDe].some((name) => name && names.has(toSlug(name)));
}

/** "OP-05", "OP05" and "op 05" are the same code. */
function compactCode(code: string): string {
  return code.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function describeChange(field: CatalogField, before: unknown, after: unknown): string {
  return before === undefined ? `${FIELD_LABELS[field]}: ${String(after)}` : `${FIELD_LABELS[field]}: ${String(before)} → ${String(after)}`;
}

function definedOnly<T extends Record<string, unknown>>(object: T): T {
  return Object.fromEntries(Object.entries(object).filter(([, value]) => value !== undefined)) as T;
}
