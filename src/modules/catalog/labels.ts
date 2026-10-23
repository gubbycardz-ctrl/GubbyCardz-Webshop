import type { Offer } from "./offer";
import type { Product, ProductKind } from "./product";
import { CARD_CONDITIONS, CARD_LANGUAGES, GRADING_COMPANIES, SEALED_CATEGORIES } from "./vocabulary";

export const PRODUCT_KIND_LABELS: Record<ProductKind, string> = {
  single: "Einzelkarte",
  sealed: "Sealed",
  accessory: "Zubehör",
};

/** The most specific kind we know, e.g. "Elite Trainer Box" instead of just "Sealed". */
export function describeProductKind(product: Product): string {
  return product.kind === "sealed" && product.category
    ? SEALED_CATEGORIES[product.category]
    : PRODUCT_KIND_LABELS[product.kind];
}

/** Human-readable variant of an offer, e.g. "Deutsch · Near Mint (NM)". */
export function describeOffer(offer: Offer): string {
  switch (offer.type) {
    case "raw-card": {
      const condition = CARD_CONDITIONS[offer.condition];
      return `${CARD_LANGUAGES[offer.language]} · ${condition.label} (${condition.abbreviation})`;
    }
    case "graded-card":
      return `${CARD_LANGUAGES[offer.language]} · ${GRADING_COMPANIES[offer.gradingCompany]} ${formatGrade(offer.grade)} · Zert.-Nr. ${offer.certNumber}`;
    case "sealed":
      return CARD_LANGUAGES[offer.language];
    case "accessory":
      return "Neu";
  }
}

function formatGrade(grade: number) {
  return grade.toLocaleString("de-DE");
}
