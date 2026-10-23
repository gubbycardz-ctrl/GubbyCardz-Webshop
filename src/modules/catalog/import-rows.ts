import { TAX_SCHEMES, type TaxScheme } from "@/modules/pricing";
import { parseEuroToCents } from "@/shared/money";
import type { SpreadsheetCell, SpreadsheetRow } from "@/shared/spreadsheet";
import { PURCHASE_ORIGINS, type PurchaseOrigin } from "./offer-internals";
import type { ProductKind } from "./product";
import { toSlug } from "./slug";
import {
  CARD_CONDITIONS,
  CARD_LANGUAGES,
  GRADING_COMPANIES,
  SEALED_CATEGORIES,
  type CardCondition,
  type CardLanguage,
  type GradingCompany,
  type SealedCategory,
} from "./vocabulary";

// Turns the rows of the product import sheet into typed import rows. Only vocabulary is
// translated here (e.g. "Booster Bundle" → sealed/booster-bundle); the catalog schemas
// check the result later. Matching ignores case, accents and punctuation, because the
// sheet is typed by hand.

export const MAX_IMPORT_ROWS = 500;
// A sheet with MAX_IMPORT_ROWS rows is far smaller; anything bigger is not a product list.
// Also stays below the 1 MB body limit of Server Actions.
export const MAX_IMPORT_FILE_BYTES = 512 * 1024;

/** Column titles in the first row; the first title of each entry is the one in the template. */
export const IMPORT_COLUMNS = {
  sku: ["SKU"],
  name: ["Name"],
  game: ["TCG", "Spiel"],
  set: ["Set"],
  category: ["Kategorie"],
  collectorNumber: ["Nummer", "Kartennummer"],
  rarity: ["Seltenheit"],
  language: ["Sprache"],
  condition: ["Zustand"],
  certNumber: ["Zertifikat", "Zertifikatsnummer"],
  stock: ["Bestand"],
  purchasePrice: ["EK"],
  price: ["VK", "Preis"],
  taxScheme: ["Steuerart"],
  origin: ["Herkunft"],
  storageLocation: ["Lagerplatz"],
  // Accepted so the template can carry it; images are not imported yet.
  imageFile: ["Bilddatei"],
} as const;

type Column = keyof typeof IMPORT_COLUMNS;

const REQUIRED_COLUMNS: readonly Column[] = ["sku", "name", "category", "price"];

export type ImportVariant =
  | { type: "raw-card"; language: CardLanguage; condition: CardCondition }
  | { type: "graded-card"; language: CardLanguage; gradingCompany: GradingCompany; grade: number; certNumber: string }
  | { type: "sealed"; language: CardLanguage }
  | { type: "accessory" };

export type ImportRow = {
  /** Row number as Excel shows it, for messages. */
  line: number;
  sku: string;
  name: string;
  gameName?: string;
  setName?: string;
  kind: ProductKind;
  category?: SealedCategory;
  collectorNumber?: string;
  rarity?: string;
  variant: ImportVariant;
  priceCents: number;
  // Optional here: only new articles need them (see import-plan.ts).
  stock?: number;
  purchasePriceCents?: number;
  taxScheme?: TaxScheme;
  origin?: PurchaseOrigin;
  storageLocation?: string;
};

export type ImportRowError = { line: number; sku: string; name: string; messages: string[] };

export type ParsedSheet =
  | { ok: true; rows: ImportRow[]; errors: ImportRowError[]; ignoredColumns: string[] }
  | { ok: false; error: string };

type CategoryChoice = { kind: "single" } | { kind: "sealed"; category: SealedCategory } | { kind: "accessory" };

// Spellings from real stock lists, in addition to our own labels and keys.
const SEALED_CATEGORY_ALIASES: Partial<Record<SealedCategory, readonly string[]>> = {
  display: ["Half Display", "Halbes Display", "Booster Display", "Mini Tin Display"],
  booster: ["Booster Pack", "Boosterpack"],
  "booster-bundle": ["Booster Bundle", "Boosterbundle"],
  "elite-trainer-box": ["ETB", "Top Trainer Box"],
  tin: ["Tin Box", "Tin-Box", "Mini Tin"],
  collection: ["Collection", "Kollektion", "Box", "Build & Battle Stadium", "Build & Battle Box", "Premium Collection", "Gift Box"],
  deck: ["Starter Deck", "Theme Deck", "Themendeck"],
};
const SINGLE_ALIASES = ["Einzelkarte", "Karte", "Single", "Slab", "Graded", "Gegradet"];
const ACCESSORY_ALIASES = ["Zubehör", "Accessory", "Accessories"];

const LANGUAGE_ALIASES: Partial<Record<CardLanguage, readonly string[]>> = {
  de: ["German"],
  en: ["English"],
  ja: ["JP", "Japanese"],
  "zh-Hans": ["Simplified Chinese", "Chinesisch", "SCH", "ZH", "CN"],
};
const GRADING_COMPANY_ALIASES: Partial<Record<GradingCompany, readonly string[]>> = { bgs: ["Beckett"] };
const TAX_SCHEME_ALIASES: Record<TaxScheme, readonly string[]> = {
  standard: ["Regelbesteuert", "Regel", "19 %", "Standard"],
  margin: ["Differenzbesteuert", "Differenz", "§ 25a", "Margin"],
};
const ORIGIN_ALIASES: Partial<Record<PurchaseOrigin, readonly string[]>> = {
  private: ["Private"],
  commercial: ["Gewerbe", "Händler", "Commercial"],
};
// Sealed products have no card condition; these are the usual ways to say so.
const SEALED_CONDITIONS = new Set(["", "neu-sealed", "neu", "sealed", "ovp"].map(toSlug));

const CATEGORIES = new Map<string, CategoryChoice>([
  ...SINGLE_ALIASES.map((alias) => [normalize(alias), { kind: "single" }] as const),
  ...ACCESSORY_ALIASES.map((alias) => [normalize(alias), { kind: "accessory" }] as const),
  ...[...vocabularyLookup(SEALED_CATEGORIES, SEALED_CATEGORY_ALIASES)].map(
    ([alias, category]) => [alias, { kind: "sealed", category }] as const,
  ),
]);
const LANGUAGES = vocabularyLookup(CARD_LANGUAGES, LANGUAGE_ALIASES);
const CONDITIONS = vocabularyLookup(
  Object.fromEntries(Object.entries(CARD_CONDITIONS).map(([key, { label, abbreviation }]) => [key, [label, abbreviation]])) as Record<
    CardCondition,
    string[]
  >,
);
const GRADING_COMPANIES_BY_NAME = vocabularyLookup(GRADING_COMPANIES, GRADING_COMPANY_ALIASES);
const TAX_SCHEMES_BY_NAME = vocabularyLookup(TAX_SCHEMES, TAX_SCHEME_ALIASES);
const ORIGINS = vocabularyLookup(PURCHASE_ORIGINS, ORIGIN_ALIASES);

/** "PSA 10", "BGS 8.5", "Beckett 9,5". */
const GRADING_PATTERN = /^([a-z]+)\s*(\d{1,2}(?:[.,]\d)?)$/i;

export function parseImportSheet(sheet: readonly SpreadsheetRow[]): ParsedSheet {
  const [header = [], ...body] = sheet;
  const columns = matchColumns(header);
  const missing = REQUIRED_COLUMNS.filter((column) => columns.indexes[column] === undefined);
  if (missing.length > 0) {
    return { ok: false, error: `Spalten fehlen in der ersten Zeile: ${missing.map((column) => IMPORT_COLUMNS[column][0]).join(", ")}` };
  }

  const lines = body
    .map((cells, index) => ({ cells, line: index + 2 }))
    .filter(({ cells }) => cells.some((cell) => cellText(cell) !== ""));
  if (lines.length === 0) return { ok: false, error: "Die Datei enthält keine Artikel." };
  if (lines.length > MAX_IMPORT_ROWS) {
    return { ok: false, error: `Höchstens ${MAX_IMPORT_ROWS} Artikel pro Datei – bitte aufteilen.` };
  }

  const rows: ImportRow[] = [];
  const errors: ImportRowError[] = [];
  for (const { cells, line } of lines) {
    const cell = (column: Column) => {
      const index = columns.indexes[column];
      return index === undefined ? null : (cells[index] ?? null);
    };
    const result = parseRow(cell, line);
    if (result.ok) rows.push(result.row);
    else errors.push({ line, sku: cellText(cell("sku")).toUpperCase(), name: cellText(cell("name")), messages: result.messages });
  }
  return { ok: true, rows, errors, ignoredColumns: columns.ignored };
}

function matchColumns(header: SpreadsheetRow) {
  const byTitle = new Map(
    (Object.entries(IMPORT_COLUMNS) as [Column, readonly string[]][]).flatMap(([column, titles]) =>
      titles.map((title) => [normalize(title), column] as const),
    ),
  );
  const indexes: Partial<Record<Column, number>> = {};
  const ignored: string[] = [];
  header.forEach((cell, index) => {
    const title = cellText(cell);
    const column = byTitle.get(normalize(title));
    if (column && indexes[column] === undefined) indexes[column] = index;
    else if (title !== "") ignored.push(title);
  });
  return { indexes, ignored };
}

type CellReader = (column: Column) => SpreadsheetCell;

function parseRow(cell: CellReader, line: number): { ok: true; row: ImportRow } | { ok: false; messages: string[] } {
  const messages: string[] = [];
  const required = (column: Column) => {
    const value = cellText(cell(column));
    if (value === "") messages.push(`${IMPORT_COLUMNS[column][0]}: bitte ausfüllen`);
    return value;
  };
  const optional = (column: Column) => cellText(cell(column)) || undefined;
  const choice = <T>(column: Column, lookup: ReadonlyMap<string, T>) => {
    const value = cellText(cell(column));
    if (value === "") return undefined;
    const found = lookup.get(normalize(value));
    if (found === undefined) messages.push(`${IMPORT_COLUMNS[column][0]}: „${value}“ ist unbekannt`);
    return found;
  };
  const money = (column: Column) => {
    const value = cell(column);
    if (cellText(value) === "") return undefined;
    const cents = parseMoney(value);
    if (cents === null) messages.push(`${IMPORT_COLUMNS[column][0]}: „${cellText(value)}“ ist kein Euro-Betrag`);
    return cents ?? undefined;
  };

  const sku = required("sku").toUpperCase();
  const name = required("name");
  required("category");
  const category = choice("category", CATEGORIES);
  required("price");
  const price = money("price");
  const stockText = cellText(cell("stock"));
  const stock = stockText === "" ? undefined : parseCount(stockText);
  if (stock === null) messages.push(`Bestand: „${stockText}“ ist keine ganze Zahl`);

  const common = {
    line,
    sku,
    name,
    gameName: optional("game"),
    setName: optional("set"),
    stock: stock ?? undefined,
    purchasePriceCents: money("purchasePrice"),
    taxScheme: choice("taxScheme", TAX_SCHEMES_BY_NAME),
    origin: choice("origin", ORIGINS),
    storageLocation: optional("storageLocation"),
  };
  const product = category && parseProductPart(category, cell, { required, optional, choice, messages });

  if (messages.length > 0 || !product || price === undefined) return { ok: false, messages };
  return { ok: true, row: { ...common, ...product, priceCents: price } };
}

type FieldReaders = {
  required: (column: Column) => string;
  optional: (column: Column) => string | undefined;
  choice: <T>(column: Column, lookup: ReadonlyMap<string, T>) => T | undefined;
  messages: string[];
};

type ProductPart = Pick<ImportRow, "kind" | "category" | "collectorNumber" | "rarity" | "variant">;

function parseProductPart(category: CategoryChoice, cell: CellReader, fields: FieldReaders): ProductPart | undefined {
  const { required, optional, choice, messages } = fields;
  if (category.kind === "accessory") return { kind: "accessory", variant: { type: "accessory" } };

  required("game");
  required("language");
  const language = choice("language", LANGUAGES);

  if (category.kind === "sealed") {
    const conditionText = cellText(cell("condition"));
    if (!SEALED_CONDITIONS.has(normalize(conditionText))) {
      messages.push(`Zustand: „${conditionText}“ passt nicht zu Sealed-Ware (leer lassen oder „Neu/Sealed“)`);
    }
    if (!language) return undefined;
    return { kind: "sealed", category: category.category, variant: { type: "sealed", language } };
  }

  required("set");
  const collectorNumber = required("collectorNumber");
  const rarity = required("rarity");
  const conditionText = required("condition");
  const condition = conditionText ? parseCondition(conditionText, optional("certNumber")) : undefined;
  if (condition && "error" in condition) messages.push(condition.error);
  if (!language || !condition || "error" in condition) return undefined;
  return { kind: "single", collectorNumber, rarity, variant: { ...condition, language } };
}

/** Raw condition ("NM", "Near Mint") or grading ("PSA 10"), which also needs the certificate number. */
type CardVariant =
  | { type: "raw-card"; condition: CardCondition }
  | { type: "graded-card"; gradingCompany: GradingCompany; grade: number; certNumber: string };

function parseCondition(text: string, certNumber: string | undefined): CardVariant | { error: string } {
  const raw = CONDITIONS.get(normalize(text));
  if (raw) return { type: "raw-card", condition: raw };

  const grading = GRADING_PATTERN.exec(text);
  const gradingCompany = grading && GRADING_COMPANIES_BY_NAME.get(normalize(grading[1]));
  if (!grading || !gradingCompany) return { error: `Zustand: „${text}“ ist unbekannt (z. B. „NM“ oder „PSA 10“)` };
  if (!certNumber) return { error: "Zertifikat: bitte ausfüllen (gegradete Karte)" };
  return { type: "graded-card", gradingCompany, grade: Number(grading[2].replace(",", ".")), certNumber };
}

function cellText(cell: SpreadsheetCell): string {
  if (cell === null) return "";
  return typeof cell === "string" ? cell.trim() : cell.number;
}

/** Number cells come with exact digits; text cells are typed German amounts like "24,50 €". */
function parseMoney(cell: SpreadsheetCell): number | null {
  if (cell === null) return null;
  return typeof cell === "string" ? parseEuroToCents(cell) : decimalDigitsToCents(cell.number);
}

/**
 * Excel sometimes stores 30.97 as "30.969999999999999" – those are rounded, but a real
 * fraction of a cent ("30.975") is rejected. String arithmetic only: money never becomes a float.
 */
function decimalDigitsToCents(digits: string): number | null {
  const match = /^(\d+)(?:\.(\d+))?$/.exec(digits);
  if (!match) return null;
  const [, whole, fraction = ""] = match;
  const cents = Number(whole) * 100 + Number(fraction.slice(0, 2).padEnd(2, "0"));
  const rest = fraction.slice(2);
  if (/^0*$/.test(rest) || /^0{6,}/.test(rest)) return cents;
  if (/^9{6,}/.test(rest)) return cents + 1;
  return null;
}

function parseCount(text: string): number | null {
  return /^\d+$/.test(text) ? Number(text) : null;
}

/** Matching key for user-typed words: "Neu/Sealed", "neu sealed" and "NEU-SEALED" are equal. */
function normalize(text: string): string {
  return toSlug(text);
}

/** Looks up a vocabulary entry by its key, its label(s) and extra aliases. */
function vocabularyLookup<K extends string>(
  labels: Record<K, string | readonly string[]>,
  aliases: Partial<Record<K, readonly string[]>> = {},
): Map<string, K> {
  const lookup = new Map<string, K>();
  for (const key of Object.keys(labels) as K[]) {
    for (const name of [key, ...[labels[key]].flat(), ...(aliases[key] ?? [])]) lookup.set(normalize(name), key);
  }
  return lookup;
}
