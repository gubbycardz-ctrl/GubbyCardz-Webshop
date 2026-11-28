"use client";

import { SET_STATUSES, SET_TYPES, type CardSet } from "@/modules/catalog";
import { updateCardSet } from "../../catalog-actions";
import { Field, FormMessage, SubmitButton, inputClass, useAdminForm } from "../../_components/form-kit";

/** Corrects one set. Saving takes it over: the catalog sync no longer overwrites what is typed here. */
export function SetEditForm({ set }: { set: CardSet }) {
  const { state, pending, onSubmit } = useAdminForm(updateCardSet.bind(null, set.id), { resetOnSuccess: false });
  return (
    <form onSubmit={onSubmit} className="grid gap-3 sm:grid-cols-2">
      <Field label="Name (shown in lists)">
        <input name="name" required defaultValue={set.name} className={inputClass} />
      </Field>
      <Field label="Set code">
        <input name="code" required defaultValue={set.code} className={inputClass} />
      </Field>
      <Field label="English name">
        <input name="nameEn" defaultValue={set.nameEn} className={inputClass} />
      </Field>
      <Field label="German name (shown to customers)">
        <input name="nameDe" defaultValue={set.nameDe} className={inputClass} />
      </Field>
      <Field label="Japanese name">
        <input name="nameJa" defaultValue={set.nameJa} className={inputClass} />
      </Field>
      <Field label="Era">
        <input name="era" defaultValue={set.era} placeholder="e.g. Scarlet & Violet" className={inputClass} />
      </Field>
      <Field label="Set type">
        <select name="setType" defaultValue={set.setType ?? ""} className={inputClass}>
          <option value="">–</option>
          {Object.entries(SET_TYPES).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Status">
        <select name="status" defaultValue={set.status ?? ""} className={inputClass}>
          <option value="">–</option>
          {Object.entries(SET_STATUSES).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Release date">
        <input name="releaseDate" type="date" defaultValue={set.releaseDate} className={inputClass} />
      </Field>
      <Field label="Pre-release date">
        <input name="preReleaseDate" type="date" defaultValue={set.preReleaseDate} className={inputClass} />
      </Field>
      <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
        <SubmitButton pending={pending}>Save</SubmitButton>
        <FormMessage state={state} />
      </div>
    </form>
  );
}
