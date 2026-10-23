import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { readFirstSheet, SpreadsheetError } from "./spreadsheet";

const FIXTURE = new URL("../../test/fixtures/product-import.xlsx", import.meta.url);

describe("readFirstSheet", () => {
  it("reads the first sheet, keeping the exact digits of numbers", async () => {
    const rows = await readFirstSheet(new Blob([await readFile(FIXTURE)]));
    expect(rows[0].slice(0, 3)).toEqual(["SKU", "Name", "TCG"]);
    expect(rows[1].slice(10, 13)).toEqual([{ number: "3" }, { number: "30.97" }, { number: "59.9" }]);
    expect(rows[2][9]).toBe("0015869070");
    expect(rows).toHaveLength(4);
  });

  it("rejects files that are not .xlsx with a German message", async () => {
    await expect(readFirstSheet(new Blob(["SKU;Name\n1;Test"]))).rejects.toThrow(SpreadsheetError);
    await expect(readFirstSheet(new Blob(["SKU;Name\n1;Test"]))).rejects.toThrow("keine lesbare Excel-Datei");
  });
});
