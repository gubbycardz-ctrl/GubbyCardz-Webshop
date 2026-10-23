// We always ship insured, to Germany and the Netherlands. This is the only place to change rates.
export const SHIPPING_COUNTRIES = {
  // 5 kg parcel, insured up to 500 € (both rates confirmed by the shop owner).
  DE: { label: "Deutschland", insuredRateCents: 769 },
  NL: { label: "Niederlande", insuredRateCents: 1749 },
} as const;

export type ShippingCountry = keyof typeof SHIPPING_COUNTRIES;

export const SHIPPING_COUNTRY_CODES = Object.keys(SHIPPING_COUNTRIES) as [ShippingCountry, ...ShippingCountry[]];

export function shippingCostCents(country: ShippingCountry): number {
  return SHIPPING_COUNTRIES[country].insuredRateCents;
}
