import type { TaxScheme } from "@/modules/pricing";
import type { Offer } from "./offer";
import type { PurchaseOrigin } from "./offer-internals";
import type { Product, ProductKind } from "./product";
import {
  CARD_CONDITIONS,
  type CardLanguage,
  type GradingCompany,
  type SealedCategory,
} from "./vocabulary";

// English labels for the admin area. The shop for customers uses the German vocabulary in vocabulary.ts;
// these maps use `satisfies Record<…>`, so a new key there fails to compile until it is labelled here too.

export const ADMIN_PRODUCT_KINDS = {
  single: "Single card",
  sealed: "Sealed",
  accessory: "Accessory",
} satisfies Record<ProductKind, string>;

export const ADMIN_LANGUAGES = {
  de: "German",
  en: "English",
  ja: "Japanese",
  "zh-Hans": "Chinese (Simplified)",
} satisfies Record<CardLanguage, string>;

export const ADMIN_GRADING_COMPANIES = {
  psa: "PSA",
  bgs: "BGS (Beckett)",
  cgc: "CGC",
} satisfies Record<GradingCompany, string>;

export const ADMIN_SEALED_CATEGORIES = {
  display: "Display",
  booster: "Booster",
  "booster-bundle": "Booster Bundle",
  "elite-trainer-box": "Elite Trainer Box",
  tin: "Tin",
  blister: "Blister",
  collection: "Collection / Box",
  deck: "Deck",
  other: "Other",
} satisfies Record<SealedCategory, string>;

export const ADMIN_TAX_SCHEMES = {
  standard: "Regular VAT (19 %)",
  margin: "Margin scheme (§ 25a UStG)",
} satisfies Record<TaxScheme, string>;

export const ADMIN_PURCHASE_ORIGINS = {
  private: "Private",
  commercial: "Commercial",
} satisfies Record<PurchaseOrigin, string>;

/** The most specific product type, e.g. "Elite Trainer Box" instead of just "Sealed". */
export function describeProductKindAdmin(product: Product): string {
  return product.kind === "sealed" && product.category ? ADMIN_SEALED_CATEGORIES[product.category] : ADMIN_PRODUCT_KINDS[product.kind];
}

/** Variant of an offer for the admin area, e.g. "German · Near Mint (NM)". */
export function describeOfferAdmin(offer: Offer): string {
  switch (offer.type) {
    case "raw-card": {
      const condition = CARD_CONDITIONS[offer.condition];
      return `${ADMIN_LANGUAGES[offer.language]} · ${condition.label} (${condition.abbreviation})`;
    }
    case "graded-card":
      return `${ADMIN_LANGUAGES[offer.language]} · ${ADMIN_GRADING_COMPANIES[offer.gradingCompany]} ${offer.grade} · Cert. no. ${offer.certNumber}`;
    case "sealed":
      return ADMIN_LANGUAGES[offer.language];
    case "accessory":
      return "New";
  }
}
