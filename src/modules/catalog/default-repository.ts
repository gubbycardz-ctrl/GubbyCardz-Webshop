import "server-only";
import { getAdminFirestore } from "@/shared/firebase-admin";
import { createFirestoreCatalogRepository } from "./firestore-catalog-repository";

/** Uncached repository – for writes and for admin pages that must see their own changes. */
export function getCatalogRepository() {
  return createFirestoreCatalogRepository(getAdminFirestore());
}
