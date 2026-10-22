import { z } from "zod";

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

export const cardSetSchema = z.object({
  id: z.string().min(1),
  gameId: slugSchema,
  name: z.string().trim().min(1),
  // Printed set code, e.g. "SV3" or "OP-05".
  code: z.string().trim().min(1),
  releaseDate: z.iso.date().optional(),
});

export type CardSet = z.infer<typeof cardSetSchema>;
