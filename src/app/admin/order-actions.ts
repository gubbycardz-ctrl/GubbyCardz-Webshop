"use server";

import { refresh, updateTag } from "next/cache";
import { requireAdmin } from "@/modules/auth/server";
import { CATALOG_CACHE_TAG } from "@/modules/catalog/server";
import { OrderError } from "@/modules/orders";
import { getOrderRepository } from "@/modules/orders/server";
import type { FormState } from "./catalog-actions";

const UNCHANGED = "Die Bestellung hat inzwischen einen anderen Status – bitte Seite prüfen.";

export async function markOrderPaid(orderId: unknown): Promise<FormState> {
  await requireAdmin();
  return changeStatus(orderId, (id, now) => getOrderRepository().markPaid(id, now));
}

export async function markOrderShipped(orderId: unknown): Promise<FormState> {
  await requireAdmin();
  return changeStatus(orderId, (id, now) => getOrderRepository().markShipped(id, now));
}

export async function cancelOrder(orderId: unknown): Promise<FormState> {
  await requireAdmin();
  const state = await changeStatus(orderId, (id, now) => getOrderRepository().cancel(id, now));
  // The reserved stock is back on sale.
  if (!state.error) updateTag(CATALOG_CACHE_TAG);
  return state;
}

async function changeStatus(orderId: unknown, change: (id: string, now: Date) => Promise<string>): Promise<FormState> {
  if (!isId(orderId)) return { error: "Bestellung nicht gefunden." };
  try {
    if ((await change(orderId, new Date())) === "unchanged") return { error: UNCHANGED };
  } catch (error) {
    if (error instanceof OrderError) return { error: error.message };
    throw error;
  }
  refresh();
  return { success: "Gespeichert." };
}

// Bound arguments arrive from the browser like any other input, so check them too.
function isId(value: unknown): value is string {
  return typeof value === "string" && value.length > 0 && value.length <= 128;
}
