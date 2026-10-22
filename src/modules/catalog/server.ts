// Server-only entry of the catalog module: keeps firebase-admin out of client bundles.
import "server-only";

export { createFirestoreCatalogRepository } from "./firestore-catalog-repository";
