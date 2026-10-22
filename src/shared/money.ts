const euro = new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" });

/** Formats integer cents for display, e.g. 3999 → "39,99 €". */
export function formatEuro(cents: number) {
  return euro.format(cents / 100);
}
