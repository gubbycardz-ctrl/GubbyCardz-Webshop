const euro = new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" });

/** Formats integer cents for display, e.g. 3999 → "39,99 €". */
export function formatEuro(cents: number) {
  return euro.format(cents / 100);
}

/** Formats integer cents for a form field, e.g. 3999 → "39,99". */
export function centsToEuroInput(cents: number) {
  return (cents / 100).toFixed(2).replace(".", ",");
}

/**
 * Parses a German euro amount typed by a person ("39,99", "1.250", "39.99 €") into cents.
 * Returns null for anything ambiguous instead of guessing.
 */
export function parseEuroToCents(input: string): number | null {
  let text = input.replace(/[\s€]/g, "");
  if (text.includes(",")) {
    // German notation: dots are thousands separators, the comma is the decimal separator.
    text = text.replace(/\./g, "").replace(",", ".");
  } else if (/^\d{1,3}(\.\d{3})+$/.test(text)) {
    text = text.replace(/\./g, "");
  }
  if (!/^\d+(\.\d{1,2})?$/.test(text)) return null;

  const [whole, fraction = ""] = text.split(".");
  // Integer arithmetic only – never let floats touch money.
  return Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
}
