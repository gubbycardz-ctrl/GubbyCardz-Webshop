"use server";

import { refresh, updateTag } from "next/cache";
import { requireAdmin } from "@/modules/auth/server";
import {
  CATALOG_CACHE_TAG,
  SET_SYNC_SOURCE_IDS,
  previewSetSync,
  runSetSync,
  type SetSyncOutcome,
  type SetSyncSourceId,
} from "@/modules/catalog/server";

/** "Check" only reads and compares; "Apply" re-checks the same source and writes the sets. */
export async function syncSets(formData: FormData): Promise<SetSyncOutcome> {
  await requireAdmin();
  const source = formData.get("source");
  if (typeof source !== "string" || !SET_SYNC_SOURCE_IDS.includes(source as SetSyncSourceId)) {
    return { ok: false, error: "Unknown source." };
  }
  if (formData.get("intent") !== "apply") return previewSetSync(source as SetSyncSourceId);

  const outcome = await runSetSync(source as SetSyncSourceId);
  if (outcome.ok && outcome.written) {
    updateTag(CATALOG_CACHE_TAG);
    refresh();
  }
  return outcome;
}
