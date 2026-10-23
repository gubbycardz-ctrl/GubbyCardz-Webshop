"use client";

import { useState } from "react";
import {
  CARD_CONDITIONS,
  CARD_LANGUAGES,
  DEFAULT_CARD_CONDITION,
  GRADING_COMPANIES,
  MAX_SKU_LENGTH,
  MAX_STORAGE_LOCATION_LENGTH,
  describeOffer,
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
  const [cardType, setCardType] = useState<CardOfferType>("raw-card");
  // Sealed products and accessories have exactly one offer type.
  const type = productKind === "single" ? cardType : productKind;

  return (
    <form onSubmit={onSubmit} className="grid gap-3 sm:grid-cols-3">
      <input type="hidden" name="type" value={type} />
      {productKind === "single" && (
        <Field label="Art">
          <select value={cardType} onChange={(event) => setCardType(event.target.value as CardOfferType)} className={inputClass}>
            <option value="raw-card">Rohe Karte</option>
            <option value="graded-card">Gegradet</option>
          </select>
        </Field>
      )}
      {type !== "accessory" && (
        <Field label="Sprache">
          <Options name="language" options={CARD_LANGUAGES} />
        </Field>
      )}
      {type === "raw-card" && (
        <Field label="Zustand">
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
          <Field label="Grading-Firma">
            <Options name="gradingCompany" options={GRADING_COMPANIES} />
          </Field>
          <Field label="Note">
            <input name="grade" required inputMode="decimal" placeholder="z. B. 10 oder 9,5" className={inputClass} />
          </Field>
          <Field label="Zertifikatsnummer">
            <input name="certNumber" required className={inputClass} />
          </Field>
        </>
      )}
      <Field label="Preis in €">
        <input name="price" required inputMode="decimal" placeholder="z. B. 39,99" className={inputClass} />
      </Field>
      <Field label="Bestand">
        <input name="stock" required type="number" min={0} step={1} defaultValue={1} className={inputClass} />
      </Field>
      <InternalsFields />
      <div className="flex flex-wrap items-center gap-3 sm:col-span-3">
        <SubmitButton pending={pending}>Angebot anlegen</SubmitButton>
        <FormMessage state={state} />
      </div>
    </form>
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
        {describeOffer(offer)}
        <span className="block text-foreground/60">
          aktuell {formatEuro(offer.priceCents)} · {offer.stock} auf Lager
        </span>
      </div>
      <InternalsFields internals={internals} compact />
      <Field label="Preis in €">
        <input name="price" required inputMode="decimal" defaultValue={centsToEuroInput(offer.priceCents)} className={`${inputClass} w-28`} />
      </Field>
      <Field label="Bestand">
        <input name="stock" required type="number" min={0} step={1} defaultValue={offer.stock} className={`${inputClass} w-24`} />
      </Field>
      <SubmitButton pending={pending}>Speichern</SubmitButton>
      <DeleteButton
        action={deleteOffer.bind(null, offer.id)}
        confirmMessage={`Angebot „${describeOffer(offer)}“ wirklich löschen?`}
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
      <Field label="SKU (intern)">
        <input name="sku" maxLength={MAX_SKU_LENGTH} defaultValue={internals.sku} placeholder="z. B. PKM-MEW-199-DE" className={`${inputClass} ${width} uppercase`} />
      </Field>
      <Field label="EK in € (intern)">
        <input
          name="purchasePrice"
          inputMode="decimal"
          defaultValue={internals.purchasePriceCents === undefined ? undefined : centsToEuroInput(internals.purchasePriceCents)}
          placeholder="z. B. 24,50"
          className={`${inputClass} ${compact ? "w-28" : ""}`}
        />
      </Field>
      <Field label="Lagerplatz (intern)">
        <input name="storageLocation" maxLength={MAX_STORAGE_LOCATION_LENGTH} defaultValue={internals.storageLocation} placeholder="z. B. Regal A3" className={`${inputClass} ${width}`} />
      </Field>
    </>
  );
}

function Options({ name, options, defaultValue }: { name: string; options: Record<string, string>; defaultValue?: string }) {
  return (
    <select name={name} defaultValue={defaultValue} className={inputClass}>
      {Object.entries(options).map(([value, label]) => (
        <option key={value} value={value}>
          {label}
        </option>
      ))}
    </select>
  );
}
