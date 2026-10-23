import { z } from "zod";
import { SHIPPING_COUNTRY_CODES, type ShippingCountry } from "@/modules/shipping";
import { optionalText, text, validateForm, type FormFields, type FormResult } from "@/shared/form-validation";
import { shippingAddressSchema, type ShippingAddress } from "./order";

export type CheckoutCustomer = { email: string; shippingAddress: ShippingAddress };

const FIELD_LABELS: Record<string, string> = {
  email: "E-Mail",
  name: "Name",
  street: "Straße und Hausnummer",
  postalCode: "PLZ",
  city: "Ort",
  country: "Land",
};

const POSTAL_CODE_FORMATS: Record<ShippingCountry, { pattern: RegExp; example: string }> = {
  DE: { pattern: /^\d{5}$/, example: "12345" },
  NL: { pattern: /^\d{4} ?[A-Z]{2}$/, example: "1234 AB" },
};

const customerSchema = z
  .object({
    email: z.email().max(254),
    name: shippingAddressSchema.shape.name,
    street: shippingAddressSchema.shape.street,
    postalCode: shippingAddressSchema.shape.postalCode,
    city: shippingAddressSchema.shape.city,
    country: z.enum(SHIPPING_COUNTRY_CODES),
  })
  .superRefine((customer, context) => {
    const format = POSTAL_CODE_FORMATS[customer.country];
    if (!format.pattern.test(customer.postalCode)) {
      context.addIssue({ code: "custom", path: ["postalCode"], message: `bitte im Format ${format.example}` });
    }
  });

export function parseCheckoutForm(fields: FormFields): FormResult<CheckoutCustomer> {
  const result = validateForm(
    customerSchema,
    {
      email: text(fields.email).toLowerCase(),
      name: text(fields.name),
      street: text(fields.street),
      postalCode: text(fields.postalCode).toUpperCase(),
      city: text(fields.city),
      country: optionalText(fields.country),
    },
    FIELD_LABELS,
  );
  if (!result.ok) return result;

  const { email, ...shippingAddress } = result.value;
  return { ok: true, value: { email, shippingAddress } };
}
