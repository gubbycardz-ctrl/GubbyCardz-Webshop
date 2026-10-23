import { describe, expect, it } from "vitest";
import type { SpreadsheetRow } from "@/shared/spreadsheet";
import { MAX_IMPORT_ROWS, parseImportSheet } from "./import-rows";

// Header and values as in the shop owner's stock list.
const HEADER = ["SKU", "Name", "TCG", "Set", "Kategorie", "Sprache", "Zustand", "Bestand", "EK", "VK", "Lagerplatz", "Bilddatei", "Steuerart", "Herkunft"];
const n = (digits: string) => ({ number: digits });

function sheet(...rows: SpreadsheetRow[]): SpreadsheetRow[] {
  return [HEADER, ...rows];
}

function parse(rows: SpreadsheetRow[]) {
  const result = parseImportSheet(rows);
  if (!result.ok) throw new Error(result.error);
  return result;
}

describe("parseImportSheet", () => {
  it("reads a sealed product with exact cents from number cells", () => {
    const { rows, errors } = parse(
      sheet(["pkm-dr-bb-en-001", "Destined Rivals", "Pokémon", "Destined Rivals", "Booster Bundle", "Englisch", "Neu/Sealed", n("3"), n("63.5"), n("72"), "SEALED-01", "PKM-DR-BB-EN-001.jpg", "Regelbesteuert", "Gewerblich"]),
    );
    expect(errors).toEqual([]);
    expect(rows).toEqual([
      {
        line: 2,
        sku: "PKM-DR-BB-EN-001",
        name: "Destined Rivals",
        gameName: "Pokémon",
        setName: "Destined Rivals",
        kind: "sealed",
        category: "booster-bundle",
        variant: { type: "sealed", language: "en" },
        priceCents: 7200,
        stock: 3,
        purchasePriceCents: 6350,
        taxScheme: "standard",
        origin: "commercial",
        storageLocation: "SEALED-01",
      },
    ]);
  });

  it("understands the category and language spellings of the stock list", () => {
    const row = (category: string, language: string) => ["SKU-1", "X", "Pokémon", "", category, language, "Neu/Sealed", n("1"), n("1"), n("2")];
    const parsed = (category: string, language = "Englisch") => parse(sheet(row(category, language))).rows[0];
    expect(parsed("Collection").category).toBe("collection");
    expect(parsed("Build & Battle Stadium").category).toBe("collection");
    expect(parsed("Half Display").category).toBe("display");
    expect(parsed("Mini Tin Display").category).toBe("display");
    expect(parsed("Tin").category).toBe("tin");
    expect(parsed("Elite Trainer Box").category).toBe("elite-trainer-box");
    expect(parsed("Collection", "Simplified Chinese").variant).toEqual({ type: "sealed", language: "zh-Hans" });
    expect(parsed("Collection", "Deutsch").variant).toEqual({ type: "sealed", language: "de" });
  });

  it("reads slabs as graded singles", () => {
    const header = [...HEADER, "Nummer", "Seltenheit", "Zertifikat"];
    const { rows, errors } = parse([
      header,
      ["PKM-BASE-SLAB-DE-001", "Raichu", "Pokémon", "Base Set", "Slab", "Deutsch", "BGS 8.5", n("1"), n("220"), n("240"), "SLABS-01", "", "Differenzbesteuert", "Privat", "14/102", "Holo Rare", n("15869070")],
    ]);
    expect(errors).toEqual([]);
    expect(rows[0]).toMatchObject({
      kind: "single",
      collectorNumber: "14/102",
      rarity: "Holo Rare",
      variant: { type: "graded-card", language: "de", gradingCompany: "bgs", grade: 8.5, certNumber: "15869070" },
      taxScheme: "margin",
      origin: "private",
    });
  });

  it("reports every problem of a row at once, with the Excel row number", () => {
    const header = [...HEADER, "Nummer", "Seltenheit", "Zertifikat"];
    const result = parse([header, ["OP-1", "Nami", "One Piece", "OP01", "Slab", "Klingonisch", "PSA 10", "zwei", n("30.975"), "", "", "", "Steuerfrei", "", "", "SR", ""]]);
    expect(result.rows).toEqual([]);
    expect(result.errors).toEqual([
      {
        line: 2,
        sku: "OP-1",
        name: "Nami",
        messages: [
          "VK: bitte ausfüllen",
          "Bestand: „zwei“ ist keine ganze Zahl",
          "EK: „30.975“ ist kein Euro-Betrag",
          "Steuerart: „Steuerfrei“ ist unbekannt",
          "Sprache: „Klingonisch“ ist unbekannt",
          "Nummer: bitte ausfüllen",
          "Zertifikat: bitte ausfüllen (gegradete Karte)",
        ],
      },
    ]);
  });

  it("rounds Excel's float artifacts, but takes typed German amounts as well", () => {
    const row = (ek: SpreadsheetRow[number]) => ["S", "X", "", "", "Zubehör", "", "", n("1"), ek, "8,99 €"];
    expect(parse(sheet(row(n("30.969999999999999")))).rows[0]).toMatchObject({ purchasePriceCents: 3097, priceCents: 899 });
    expect(parse(sheet(row(n("30.970000000000002")))).rows[0]).toMatchObject({ purchasePriceCents: 3097 });
    expect(parse(sheet(row("1.024,50"))).rows[0]).toMatchObject({ purchasePriceCents: 102450 });
  });

  it("rejects sealed rows with a card condition", () => {
    const { errors } = parse(sheet(["S", "X", "Pokémon", "", "Tin", "Englisch", "PSA 10", n("1"), n("1"), n("2")]));
    expect(errors[0].messages).toEqual(["Zustand: „PSA 10“ passt nicht zu Sealed-Ware (leer lassen oder „Neu/Sealed“)"]);
  });

  it("matches column titles loosely, ignores unknown ones and skips empty rows", () => {
    const result = parseImportSheet([
      ["sku", "NAME", "Kategorie", "Preis", "Notiz"],
      ["S-1", "Sleeves", "Zubehör", n("8.99"), "egal"],
      [null, "", null, null, null],
    ]);
    expect(result).toMatchObject({ ok: true, ignoredColumns: ["Notiz"], rows: [{ line: 2, sku: "S-1", priceCents: 899 }] });
  });

  it("refuses sheets without the key columns or with too many rows", () => {
    expect(parseImportSheet([["SKU", "Name"]])).toEqual({ ok: false, error: "Spalten fehlen in der ersten Zeile: Kategorie, VK" });
    expect(parseImportSheet([HEADER])).toEqual({ ok: false, error: "Die Datei enthält keine Artikel." });
    const tooMany = Array.from({ length: MAX_IMPORT_ROWS + 1 }, (_, index) => [`S-${index}`]);
    expect(parseImportSheet([HEADER, ...tooMany])).toMatchObject({ ok: false });
  });
});
