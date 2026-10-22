import type { Offer } from "./offer";
import type { ProductKind } from "./product";
import { CARD_CONDITIONS, CARD_LANGUAGES, GRADING_COMPANIES } from "./vocabulary";

export const PRODUCT_KIND_LABELS: Record<ProductKind, string> = {
  single: "Einzelkarte",
  sealed: "Sealed",
  accessory: "Zubehör",
};

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
