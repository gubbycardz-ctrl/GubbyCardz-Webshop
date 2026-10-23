import { z } from "zod";
import { MAX_CART_LINES } from "@/modules/cart";
import { SHIPPING_COUNTRY_CODES } from "@/modules/shipping";

// An order is a snapshot: names and prices are copied in, so later catalog
// changes never alter what the customer bought.

export const ORDER_STATUSES = ["awaiting-payment", "paid", "cancelled"] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

const cents = z.int().nonnegative();

export const orderLineSchema = z.object({
  offerId: z.string().min(1),
  productId: z.string().min(1),
  productName: z.string().min(1),
  description: z.string(),
  unitPriceCents: z.int().positive(),
  quantity: z.int().positive(),
});

export const shippingAddressSchema = z.object({
  name: z.string().trim().min(1).max(100),
  street: z.string().trim().min(1).max(100),
  postalCode: z.string().trim().min(1).max(10),
  city: z.string().trim().min(1).max(60),
  country: z.enum(SHIPPING_COUNTRY_CODES),
});

export const orderSchema = z.object({
  id: z.string().min(1),
  status: z.enum(ORDER_STATUSES),
  createdAt: z.iso.datetime(),
  email: z.email().max(254),
  shippingAddress: shippingAddressSchema,
  lines: z.array(orderLineSchema).min(1).max(MAX_CART_LINES),
  subtotalCents: cents,
  shippingCents: cents,
  totalCents: cents,
  paymentSessionId: z.string().min(1).optional(),
  paidAt: z.iso.datetime().optional(),
  cancelledAt: z.iso.datetime().optional(),
});

export type OrderLine = z.infer<typeof orderLineSchema>;
export type ShippingAddress = z.infer<typeof shippingAddressSchema>;
export type Order = z.infer<typeof orderSchema>;
