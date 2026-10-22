import "server-only";
import { getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

// Created lazily so `next build` never needs credentials. On App Hosting the
// project and credentials come from the environment; locally `.env.development`
// points to the emulators.
export function getAdminFirestore() {
  const app = getApps()[0] ?? initializeApp();
  return getFirestore(app);
}
