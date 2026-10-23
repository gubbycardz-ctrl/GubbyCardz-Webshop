import "server-only";
import { InvalidInputError, InvalidSpreadsheetError, readSheet } from "read-excel-file/node";

// Adapter around the xlsx library: the rest of the code only knows these types,
// so the library can be replaced without touching business logic.

/**
 * A cell as written in the file. Numbers keep their exact digits (e.g. "30.97"),
 * so money never passes through a float.
 */
export type SpreadsheetCell = string | { number: string } | null;
export type SpreadsheetRow = SpreadsheetCell[];

export class SpreadsheetError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SpreadsheetError";
  }
}

/** Reads the first sheet of an .xlsx file. Fails with a German message for anything that is not one. */
export async function readFirstSheet(file: Blob): Promise<SpreadsheetRow[]> {
  try {
    const rows = await readSheet(Buffer.from(await file.arrayBuffer()), {
      parseNumber: (digits: string) => ({ number: digits }),
    });
    return rows.map((row) => row.map(toCell));
  } catch (error) {
    if (error instanceof InvalidInputError && error.code === "XLS_FILE_NOT_SUPPORTED") {
      throw new SpreadsheetError("Alte .xls-Dateien gehen nicht – bitte in Excel als .xlsx speichern.");
    }
    if (error instanceof InvalidInputError || error instanceof InvalidSpreadsheetError) {
      throw new SpreadsheetError("Die Datei ist keine lesbare Excel-Datei (.xlsx).");
    }
    throw error;
  }
}

function toCell(value: unknown): SpreadsheetCell {
  if (value === null || value === undefined) return null;
  if (typeof value === "object" && "number" in value) return { number: String(value.number) };
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value);
}
