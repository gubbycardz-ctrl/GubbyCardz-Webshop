import { z } from "zod";

export const MAX_SKU_LENGTH = 40;
export const MAX_STORAGE_LOCATION_LENGTH = 60;

// Internal stock-keeping data of an offer. Customers must never see it (least of
// all the purchase price), so it is stored apart from the offer, which the shop
// reads, caches and hands to the cart. Only admin code loads it.
export const offerInternalsSchema = z.object({
  // Upper case, so "abc-1" and "ABC-1" cannot become two different SKUs.
  sku: z
    .string()
    .trim()
    .max(MAX_SKU_LENGTH)
    .regex(/^[A-Z0-9][A-Z0-9._/-]*$/, "Nur Großbuchstaben, Ziffern und . _ / -")
    .optional(),
  /** EK per unit in cents. Zero is allowed, e.g. for cards pulled from our own packs. */
  purchasePriceCents: z.int().nonnegative().optional(),
  /** Free text, e.g. "Regal A3 / Ordner 2". */
  storageLocation: z.string().trim().min(1).max(MAX_STORAGE_LOCATION_LENGTH).optional(),
});

export type OfferInternals = z.infer<typeof offerInternalsSchema>;
