import "server-only";
import { getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

// Created lazily so `next build` never needs credentials. On App Hosting the
// project and credentials come from the environment; locally `.env.development`
// points to the emulators.
function getAdminApp() {
  return getApps()[0] ?? initializeApp();
}

export function getAdminFirestore() {
  return getFirestore(getAdminApp());
}

export function getAdminAuth() {
  return getAuth(getAdminApp());
}
