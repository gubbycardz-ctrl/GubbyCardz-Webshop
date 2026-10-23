"use server";

import { updateTag } from "next/cache";
import { requireAdmin } from "@/modules/auth/server";
import { MAX_IMPORT_FILE_BYTES } from "@/modules/catalog";
import { CATALOG_CACHE_TAG, previewCatalogImport, runCatalogImport, type ImportOutcome } from "@/modules/catalog/server";

/** "Prüfen" only reads; "Importieren" re-checks the same file and writes it, unless any row has an error. */
export async function importProducts(formData: FormData): Promise<ImportOutcome> {
  await requireAdmin();
  const file = formData.get("file");
  if (!(file instanceof Blob) || file.size === 0) return { ok: false, error: "Bitte eine Excel-Datei (.xlsx) auswählen." };
  if (file.size > MAX_IMPORT_FILE_BYTES) {
    return { ok: false, error: `Die Datei ist zu groß (höchstens ${MAX_IMPORT_FILE_BYTES / 1024} KB).` };
  }
  const options = { overwriteStock: formData.get("overwriteStock") === "on" };
  if (formData.get("intent") !== "import") return previewCatalogImport(file, options);

  const outcome = await runCatalogImport(file, options);
  if (outcome.ok && outcome.written) updateTag(CATALOG_CACHE_TAG);
  return outcome;
}
