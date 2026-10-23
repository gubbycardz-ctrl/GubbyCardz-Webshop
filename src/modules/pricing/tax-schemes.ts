// How the VAT of a sale is calculated once GubbyCardz is no longer a small business (§ 19 UStG).
// It depends on how each item was bought, so it is recorded per offer from the start:
// switching to regular VAT then needs no catch-up of old stock.
export const TAX_SCHEMES = {
  // Bought with a VAT invoice: 19 % VAT on the full selling price.
  standard: "Regelbesteuert (19 %)",
  // Bought from private sellers (or without deductible VAT): VAT only on the margin,
  // never shown on the invoice, which instead names the special scheme.
  margin: "Differenzbesteuert (§ 25a UStG)",
} as const;

export type TaxScheme = keyof typeof TAX_SCHEMES;
