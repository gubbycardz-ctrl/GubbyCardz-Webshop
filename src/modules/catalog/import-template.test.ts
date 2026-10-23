import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { readFirstSheet } from "@/shared/spreadsheet";
import { parseImportSheet } from "./import-rows";

// The template offered for download on the import page must always pass the import.
const TEMPLATE = new URL("../../../public/vorlagen/produktimport-vorlage.xlsx", import.meta.url);

describe("import template", () => {
  it("contains only known columns and valid example rows", async () => {
    const result = parseImportSheet(await readFirstSheet(new Blob([await readFile(TEMPLATE)])));
    expect(result).toMatchObject({ ok: true, errors: [], ignoredColumns: [] });
    expect(result.ok && result.rows.map((row) => row.variant.type)).toEqual(["sealed", "graded-card", "raw-card"]);
  });
});
