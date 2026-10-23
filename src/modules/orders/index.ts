// Public interface of the orders module. Server code additionally imports from "./server".
export {
  ORDER_STATUSES,
  ORDER_STATUS_LABELS,
  orderNumber,
  orderSchema,
  type Order,
  type OrderLine,
  type OrderStatus,
  type ShippingAddress,
} from "./order";
export { checkoutFields, parseCheckoutForm, type CheckoutCustomer } from "./checkout-form";
export { buildOrder, maxOrderValueMessage, type BuildOrderResult } from "./build-order";
export { packingList, type PackingListLine } from "./packing-list";
export { ORDER_LIST_LIMIT, OrderError, type OrderRepository } from "./order-repository";
