"use client";

import { useState } from "react";
import {
  ADMIN_GRADING_COMPANIES,
  ADMIN_LANGUAGES,
  ADMIN_PURCHASE_ORIGINS,
  ADMIN_TAX_SCHEMES,
  CARD_CONDITIONS,
  DEFAULT_CARD_CONDITION,
  MAX_SKU_LENGTH,
  MAX_STORAGE_LOCATION_LENGTH,
  describeOfferAdmin,
  type Offer,
  type OfferInternals,
  type ProductKind,
} from "@/modules/catalog";
import { centsToEuroInput, formatEuro } from "@/shared/money";
import { createOffer, deleteOffer, updateOffer } from "../catalog-actions";
import { DeleteButton } from "./delete-button";
import { Field, FormMessage, SubmitButton, inputClass, useAdminForm } from "./form-kit";

type CardOfferType = "raw-card" | "graded-card";

export function OfferForm({ productId, productKind }: { productId: string; productKind: ProductKind }) {
  const { state, pending, onSubmit } = useAdminForm(createOffer.bind(null, productId));

  return (
    <form onSubmit={onSubmit} className="grid gap-3 sm:grid-cols-3">
      <OfferFields productKind={productKind} />
      <div className="flex flex-wrap items-center gap-3 sm:col-span-3">
        <SubmitButton pending={pending}>Create offer</SubmitButton>
        <FormMessage state={state} />
      </div>
    </form>
  );
}

/** All inputs of a new offer for a product of the given kind. Place inside a three-column grid. */
export function OfferFields({ productKind }: { productKind: ProductKind }) {
  const [cardType, setCardType] = useState<CardOfferType>("raw-card");
  // Sealed products and accessories have exactly one offer type.
  const type = productKind === "single" ? cardType : productKind;

  return (
    <>
      <input type="hidden" name="type" value={type} />
      {productKind === "single" && (
        <Field label="Type">
          <select value={cardType} onChange={(event) => setCardType(event.target.value as CardOfferType)} className={inputClass}>
            <option value="raw-card">Raw card</option>
            <option value="graded-card">Graded</option>
          </select>
        </Field>
      )}
      {type !== "accessory" && (
        <Field label="Language">
          <Options name="language" options={ADMIN_LANGUAGES} />
        </Field>
      )}
      {type === "raw-card" && (
        <Field label="Condition">
          <Options
            name="condition"
            defaultValue={DEFAULT_CARD_CONDITION}
            options={Object.fromEntries(
              Object.entries(CARD_CONDITIONS).map(([key, condition]) => [key, `${condition.label} (${condition.abbreviation})`]),
            )}
          />
        </Field>
      )}
      {type === "graded-card" && (
        <>
          <Field label="Grading company">
            <Options name="gradingCompany" options={ADMIN_GRADING_COMPANIES} />
          </Field>
          <Field label="Grade">
            <input name="grade" required inputMode="decimal" placeholder="e.g. 10 or 9.5" className={inputClass} />
          </Field>
          <Field label="Certificate number">
            <input name="certNumber" required className={inputClass} />
          </Field>
        </>
      )}
      <Field label="Price in €">
        <input name="price" required inputMode="decimal" placeholder="e.g. 39.99" className={inputClass} />
      </Field>
      <Field label="Stock">
        <input name="stock" required type="number" min={0} step={1} defaultValue={1} className={inputClass} />
      </Field>
      <TaxSchemeField />
      <InternalsFields />
    </>
  );
}

/** One row per offer: price, stock and internal data can be changed in place. */
export function OfferRow({ offer, internals = {} }: { offer: Offer; internals?: OfferInternals }) {
  const { state, pending, onSubmit } = useAdminForm(updateOffer.bind(null, offer.productId, offer.id), {
    resetOnSuccess: false,
  });

  return (
    <form onSubmit={onSubmit} className="flex flex-wrap items-end gap-3 px-4 py-3">
      <div className="min-w-48 flex-1 text-sm">
        {describeOfferAdmin(offer)}
        <span className="block text-foreground/60">
          currently {formatEuro(offer.priceCents)} · {offer.stock} in stock
        </span>
      </div>
      <TaxSchemeField defaultValue={offer.taxScheme} />
      <InternalsFields internals={internals} compact />
      <Field label="Price in €">
        <input name="price" required inputMode="decimal" defaultValue={centsToEuroInput(offer.priceCents)} className={`${inputClass} w-28`} />
      </Field>
      <Field label="Stock">
        <input name="stock" required type="number" min={0} step={1} defaultValue={offer.stock} className={`${inputClass} w-24`} />
      </Field>
      <SubmitButton pending={pending}>Save</SubmitButton>
      <DeleteButton
        action={deleteOffer.bind(null, offer.id)}
        confirmMessage={`Really delete the offer “${describeOfferAdmin(offer)}”?`}
      />
      <FormMessage state={state} />
    </form>
  );
}

/** Internal only – the shop never shows these. */
function InternalsFields({ internals = {}, compact = false }: { internals?: OfferInternals; compact?: boolean }) {
  const width = compact ? "w-32" : "";
  return (
    <>
      <Field label="SKU (internal)">
        <input name="sku" maxLength={MAX_SKU_LENGTH} defaultValue={internals.sku} placeholder="e.g. PKM-MEW-199-DE" className={`${inputClass} ${width} uppercase`} />
      </Field>
      <Field label="Purchase price in € (internal)">
        <input
          name="purchasePrice"
          required
          inputMode="decimal"
          defaultValue={internals.purchasePriceCents === undefined ? undefined : centsToEuroInput(internals.purchasePriceCents)}
          placeholder="e.g. 24.50"
          className={`${inputClass} ${compact ? "w-28" : ""}`}
        />
      </Field>
      <Field label="Origin (internal)">
        <Options name="origin" options={ADMIN_PURCHASE_ORIGINS} defaultValue={internals.origin} placeholder="– choose –" required />
      </Field>
      <Field label="Storage location (internal)">
        <input name="storageLocation" maxLength={MAX_STORAGE_LOCATION_LENGTH} defaultValue={internals.storageLocation} placeholder="e.g. Shelf A3" className={`${inputClass} ${width}`} />
      </Field>
    </>
  );
}

/** Shown to nobody yet: it only matters once the shop leaves the small-business scheme (§ 19 UStG). */
function TaxSchemeField({ defaultValue }: { defaultValue?: string }) {
  return (
    <Field label="Tax scheme">
      <Options name="taxScheme" options={ADMIN_TAX_SCHEMES} defaultValue={defaultValue} placeholder="– choose –" required />
    </Field>
  );
}

/** Without a default value, a placeholder makes the choice deliberate – and shows legacy offers that lack one. */
function Options({
  name,
  options,
  defaultValue,
  placeholder,
  required = false,
}: {
  name: string;
  options: Record<string, string>;
  defaultValue?: string;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <select name={name} defaultValue={defaultValue ?? (placeholder === undefined ? undefined : "")} required={required} className={inputClass}>
      {placeholder !== undefined && (
        <option value="" disabled>
          {placeholder}
        </option>
      )}
      {Object.entries(options).map(([value, label]) => (
        <option key={value} value={value}>
          {label}
        </option>
      ))}
    </select>
  );
}
