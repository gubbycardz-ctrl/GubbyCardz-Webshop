import { z } from "zod";
import type { ProductKind } from "./product";
import {
  CARD_CONDITIONS,
  CARD_LANGUAGES,
  GRADING_COMPANIES,
  MAX_GRADE,
  MIN_GRADE,
  keysOf,
} from "./vocabulary";

const languageSchema = z.enum(keysOf(CARD_LANGUAGES));

// An offer is *what we sell*: one purchasable variant of a product with its
// own price and stock. Money is stored in cents as an integer, never as float.
const offerBase = z.object({
  id: z.string().min(1),
  productId: z.string().min(1),
  priceCents: z.int().positive(),
  stock: z.int().nonnegative(),
});

const rawCardOfferSchema = offerBase.extend({
  type: z.literal("raw-card"),
  language: languageSchema,
  condition: z.enum(keysOf(CARD_CONDITIONS)),
});

const gradedCardOfferSchema = offerBase.extend({
  type: z.literal("graded-card"),
  language: languageSchema,
  gradingCompany: z.enum(keysOf(GRADING_COMPANIES)),
  // Half grades (e.g. 9.5) exist at BGS and CGC.
  grade: z
    .number()
    .min(MIN_GRADE)
    .max(MAX_GRADE)
    .refine((grade) => Number.isInteger(grade * 2), "Nur ganze oder halbe Noten"),
  certNumber: z.string().trim().min(1),
});

const sealedOfferSchema = offerBase.extend({
  type: z.literal("sealed"),
  language: languageSchema,
});

const accessoryOfferSchema = offerBase.extend({
  type: z.literal("accessory"),
});

export const offerSchema = z.discriminatedUnion("type", [
  rawCardOfferSchema,
  gradedCardOfferSchema,
  sealedOfferSchema,
  accessoryOfferSchema,
]);

export type Offer = z.infer<typeof offerSchema>;
export type OfferType = Offer["type"];

const OFFER_TYPES_BY_PRODUCT_KIND: Record<ProductKind, readonly OfferType[]> = {
  single: ["raw-card", "graded-card"],
  sealed: ["sealed"],
  accessory: ["accessory"],
};

export function isOfferTypeAllowedFor(productKind: ProductKind, offerType: OfferType) {
  return OFFER_TYPES_BY_PRODUCT_KIND[productKind].includes(offerType);
}
