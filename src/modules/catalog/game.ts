import { z } from "zod";
import { keysOf } from "./vocabulary";

// Lowercase words joined by single hyphens, e.g. "one-piece". Used in URLs.
export const slugSchema = z
  .string()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Nur Kleinbuchstaben, Ziffern und Bindestriche");

// Games are data, not code: Pokémon and One Piece are rows, not branches.
export const gameSchema = z.object({
  id: slugSchema,
  name: z.string().trim().min(1),
});

export type Game = z.infer<typeof gameSchema>;

export const SET_STATUSES = { announced: "Announced", released: "Released", archived: "Archived" } as const;
export const SET_TYPES = { main: "Main set", special: "Special set", promo: "Promo" } as const;
// A set is tied to a market: English and German releases share one entry, Japanese sets are their own,
// because they do not match the international ones one to one.
export const SET_REGIONS = { international: "International (EN/DE)", japan: "Japan" } as const;

const optionalText = z.string().trim().min(1).optional();

export const cardSetSchema = z.object({
  id: z.string().min(1),
  gameId: slugSchema,
  // What the shop shows. Sets from the catalog sync use the English name (Japanese sets the Japanese one).
  name: z.string().trim().min(1),
  // Printed set code, e.g. "SV3" or "OP-05".
  code: z.string().trim().min(1),
  releaseDate: z.iso.date().optional(),
  // Set catalog data (see set-sync.ts). All optional, so sets entered by hand before the catalog existed stay valid.
  // These are the names of the *set*, not the language of a stock item – that belongs to the offer.
  nameEn: optionalText,
  nameDe: optionalText,
  nameJa: optionalText,
  era: optionalText,
  setType: z.enum(keysOf(SET_TYPES)).optional(),
  region: z.enum(keysOf(SET_REGIONS)).optional(),
  status: z.enum(keysOf(SET_STATUSES)).optional(),
  // The data source that created and maintains the set (absent for sets entered by hand) and its id there.
  source: optionalText,
  sourceId: optionalText,
  // Last day the set was compared with its source.
  verifiedAt: z.iso.date().optional(),
});

export type CardSet = z.infer<typeof cardSetSchema>;
