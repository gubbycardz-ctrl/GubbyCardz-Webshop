import "server-only";
import { getAdminFirestore } from "@/shared/firebase-admin";
import { createFirestoreOrderRepository } from "./firestore-order-repository";

export function getOrderRepository() {
  return createFirestoreOrderRepository(getAdminFirestore());
}
