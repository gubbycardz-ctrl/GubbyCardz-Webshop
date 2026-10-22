// Reference data shared by all games. Adding an entry here extends the shop
// without touching any other code.

export const CARD_LANGUAGES = {
  de: "Deutsch",
  en: "Englisch",
  ja: "Japanisch",
  "zh-Hans": "Chinesisch (vereinfacht)",
} as const;

export type CardLanguage = keyof typeof CARD_LANGUAGES;

// Cardmarket scale, best to worst – familiar to German collectors.
export const CARD_CONDITIONS = {
  mint: { label: "Mint", abbreviation: "MT" },
  "near-mint": { label: "Near Mint", abbreviation: "NM" },
  excellent: { label: "Excellent", abbreviation: "EX" },
  good: { label: "Good", abbreviation: "GD" },
  "light-played": { label: "Light Played", abbreviation: "LP" },
  played: { label: "Played", abbreviation: "PL" },
  poor: { label: "Poor", abbreviation: "PO" },
} as const;

export type CardCondition = keyof typeof CARD_CONDITIONS;

// Most of our stock is Near Mint, so forms preselect it.
export const DEFAULT_CARD_CONDITION: CardCondition = "near-mint";

export const GRADING_COMPANIES = {
  psa: "PSA",
  bgs: "BGS (Beckett)",
  cgc: "CGC",
} as const;

export type GradingCompany = keyof typeof GRADING_COMPANIES;

export const MIN_GRADE = 1;
export const MAX_GRADE = 10;

export function keysOf<T extends object>(record: T) {
  return Object.keys(record) as [keyof T & string, ...(keyof T & string)[]];
}
