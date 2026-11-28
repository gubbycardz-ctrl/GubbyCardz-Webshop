"use client";

import { useState } from "react";
import {
  ADMIN_PRODUCT_KINDS,
  ADMIN_SEALED_CATEGORIES,
  describeCardSet,
  eraOptions,
  groupSetsByEra,
  setsOfEra,
  type CardSet,
  type Game,
  type Product,
  type ProductKind,
} from "@/modules/catalog";
import { createProduct, updateProduct } from "../catalog-actions";
import { Field, FormMessage, SubmitButton, inputClass, useAdminForm } from "./form-kit";
import { OfferFields } from "./offer-forms";

const KINDS = Object.keys(ADMIN_PRODUCT_KINDS) as ProductKind[];

/**
 * Creates a new product (with its first offer, unless switched off), or edits `product` when given.
 * The choices narrow down step by step: TCG → era → set → product type.
 */
export function ProductForm({
  games,
  sets,
  defaultGameId,
  product,
}: {
  games: Game[];
  sets: CardSet[];
  defaultGameId?: string;
  product?: Product;
}) {
  const { state, pending, onSubmit } = useAdminForm(product ? updateProduct.bind(null, product.id) : createProduct, {
    resetOnSuccess: !product,
  });
  const [kind, setKind] = useState<ProductKind>(product?.kind ?? "single");
  const [withOffer, setWithOffer] = useState(!product);
  const [gameId, setGameId] = useState(product ? (product.gameId ?? "") : (defaultGameId ?? games[0]?.id ?? ""));
  const setsOfGame = sets.filter((set) => set.gameId === gameId);
  const [era, setEra] = useState(() => {
    const current = product && "setId" in product ? sets.find((set) => set.id === product.setId) : undefined;
    return current?.era ?? "";
  });
  const eras = eraOptions(setsOfGame);
  const visibleSets = setsOfEra(setsOfGame, era);
  const single = product?.kind === "single" ? product : undefined;
  // Accessories have no set, so the era and set steps drop out.
  const hasSet = kind !== "accessory";

  function changeGame(nextGameId: string) {
    setGameId(nextGameId);
    setEra("");
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-3 sm:grid-cols-2">
      <Field label={kind === "accessory" ? "TCG (optional)" : "TCG"}>
        <select name="gameId" value={gameId} onChange={(event) => changeGame(event.target.value)} className={inputClass}>
          {kind === "accessory" && <option value="">– all TCGs –</option>}
          {games.map((game) => (
            <option key={game.id} value={game.id}>
              {game.name}
            </option>
          ))}
        </select>
      </Field>
      {hasSet && eras.length > 0 && (
        <Field label="Era">
          <select value={era} onChange={(event) => setEra(event.target.value)} className={inputClass}>
            <option value="">All eras</option>
            {eras.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </Field>
      )}
      {hasSet && (
        <Field label={kind === "single" ? "Set" : "Set (optional)"}>
          <select
            name="setId"
            className={inputClass}
            required={kind === "single"}
            key={`${gameId}|${era}`}
            defaultValue={product && "setId" in product ? product.setId : undefined}
          >
            {kind === "sealed" && <option value="">– no specific set –</option>}
            {era === "" && eras.length > 0
              ? groupSetsByEra(visibleSets).map((group) =>
                  group.era ? (
                    <optgroup key={group.era} label={group.era}>
                      {group.sets.map(setOption)}
                    </optgroup>
                  ) : (
                    group.sets.map(setOption)
                  ),
                )
              : visibleSets.map(setOption)}
          </select>
        </Field>
      )}
      <Field label="Product type">
        {/* Fixed once created: the product's offers were made for its type. */}
        <select
          name="kind"
          value={kind}
          onChange={(event) => setKind(event.target.value as ProductKind)}
          disabled={Boolean(product)}
          className={`${inputClass} disabled:opacity-60`}
        >
          {KINDS.map((option) => (
            <option key={option} value={option}>
              {ADMIN_PRODUCT_KINDS[option]}
            </option>
          ))}
        </select>
      </Field>
      {kind === "sealed" && (
        <Field label="Category">
          <CategorySelect defaultValue={product?.kind === "sealed" ? product.category : undefined} />
        </Field>
      )}
      <Field label="Name">
        <input name="name" required defaultValue={product?.name} placeholder="e.g. Charizard ex" className={inputClass} />
      </Field>
      {kind === "single" && (
        <>
          <Field label="Number">
            <input
              name="collectorNumber"
              required
              defaultValue={single?.collectorNumber}
              placeholder="e.g. 199/165 or OP05-119"
              className={inputClass}
            />
          </Field>
          <Field label="Rarity">
            <input name="rarity" required defaultValue={single?.rarity} placeholder="e.g. Special Illustration Rare" className={inputClass} />
          </Field>
        </>
      )}
      <label className="flex items-start gap-2 text-sm sm:col-span-2">
        <input type="checkbox" name="hidden" defaultChecked={product?.hidden === true} className="mt-1" />
        <span>
          Hidden in the shop (draft)
          <span className="block text-foreground/60">Not visible and not purchasable – only here in the admin area.</span>
        </span>
      </label>
      {!product && (
        <fieldset className="mt-2 rounded-xl border border-foreground/10 p-4 sm:col-span-2">
          <legend className="px-1 text-sm font-semibold">First offer</legend>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="withOffer" checked={withOffer} onChange={(event) => setWithOffer(event.target.checked)} />
            Create a sales offer right away
          </label>
          {withOffer ? (
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              {/* A different product type means different offer inputs, so start them afresh. */}
              <OfferFields key={kind} productKind={kind} />
            </div>
          ) : (
            <p className="mt-2 text-sm text-foreground/60">
              The product is saved without an offer – the shop then shows “Derzeit ausverkauft” (sold out). Offers can be added later.
            </p>
          )}
        </fieldset>
      )}
      <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
        <SubmitButton pending={pending}>{product ? "Save" : withOffer ? "Create product and offer" : "Create product"}</SubmitButton>
        <FormMessage state={state} />
        {kind === "single" && setsOfGame.length === 0 && (
          <p className="text-sm text-foreground/60">This TCG has no sets yet – load them in “TCG Catalog” or add one under “TCGs & Sets”.</p>
        )}
      </div>
      {product && (
        <p className="text-sm text-foreground/60 sm:col-span-2">
          The shop address follows the name{kind === "single" && " and the number"} – old links to the product stop working after a change.
        </p>
      )}
    </form>
  );
}

function setOption(set: CardSet) {
  return (
    <option key={set.id} value={set.id}>
      {describeCardSet(set)}
    </option>
  );
}

function CategorySelect({ defaultValue }: { defaultValue?: string }) {
  return (
    <select name="category" required defaultValue={defaultValue ?? ""} className={inputClass}>
      <option value="" disabled>
        – choose –
      </option>
      {Object.entries(ADMIN_SEALED_CATEGORIES).map(([value, label]) => (
        <option key={value} value={value}>
          {label}
        </option>
      ))}
    </select>
  );
}
