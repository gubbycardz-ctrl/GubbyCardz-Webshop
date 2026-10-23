import { describe, expect, it } from "vitest";
import { parseCheckoutForm } from "./checkout-form";

const valid = {
  email: " Kunde@Example.com ",
  name: "Max Mustermann",
  street: "Hauptstraße 1",
  postalCode: "10115",
  city: "Berlin",
  country: "DE",
};

describe("parseCheckoutForm", () => {
  it("accepts a German address and normalizes the email", () => {
    expect(parseCheckoutForm(valid)).toEqual({
      ok: true,
      value: {
        email: "kunde@example.com",
        shippingAddress: { name: "Max Mustermann", street: "Hauptstraße 1", postalCode: "10115", city: "Berlin", country: "DE" },
      },
    });
  });

  it("accepts Dutch postal codes with or without space", () => {
    for (const postalCode of ["1012 ab", "1012AB"]) {
      const result = parseCheckoutForm({ ...valid, country: "NL", postalCode, city: "Amsterdam" });
      expect(result.ok && result.value.shippingAddress.postalCode).toBe(postalCode.toUpperCase());
    }
  });

  it("checks the postal code against the chosen country", () => {
    expect(parseCheckoutForm({ ...valid, country: "NL" })).toEqual({ ok: false, error: "PLZ: bitte im Format 1234 AB" });
    expect(parseCheckoutForm({ ...valid, postalCode: "1234" })).toEqual({ ok: false, error: "PLZ: bitte im Format 12345" });
  });

  it("only ships to supported countries", () => {
    expect(parseCheckoutForm({ ...valid, country: "AT" }).ok).toBe(false);
  });

  it("reports missing fields in German", () => {
    expect(parseCheckoutForm({ country: "DE" })).toEqual({
      ok: false,
      error: "E-Mail: bitte ausfüllen · Name: bitte ausfüllen · Straße und Hausnummer: bitte ausfüllen · PLZ: bitte ausfüllen · Ort: bitte ausfüllen",
    });
  });

  it("rejects invalid email addresses", () => {
    const result = parseCheckoutForm({ ...valid, email: "kein-at-zeichen" });
    expect(!result.ok && result.error).toMatch(/^E-Mail: /);
  });
});
