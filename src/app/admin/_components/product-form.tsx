"use client";

import { useState } from "react";
import { PRODUCT_KIND_LABELS, type CardSet, type Game, type Product, type ProductKind } from "@/modules/catalog";
import { createProduct, updateProduct } from "../catalog-actions";
import { Field, FormMessage, SubmitButton, inputClass, useAdminForm } from "./form-kit";

const KINDS = Object.keys(PRODUCT_KIND_LABELS) as ProductKind[];

/** Creates a new product, or edits `product` when given. */
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
  const [gameId, setGameId] = useState(product ? (product.gameId ?? "") : (defaultGameId ?? games[0]?.id ?? ""));
  const setsOfGame = sets.filter((set) => set.gameId === gameId);
  const single = product?.kind === "single" ? product : undefined;

  return (
    <form onSubmit={onSubmit} className="grid gap-3 sm:grid-cols-2">
      <Field label="Produktart">
        {/* Fixed once created: the product's offers were made for its kind. */}
        <select
          name="kind"
          value={kind}
          onChange={(event) => setKind(event.target.value as ProductKind)}
          disabled={Boolean(product)}
          className={`${inputClass} disabled:opacity-60`}
        >
          {KINDS.map((option) => (
            <option key={option} value={option}>
              {PRODUCT_KIND_LABELS[option]}
            </option>
          ))}
        </select>
      </Field>
      <Field label={kind === "accessory" ? "Spiel (optional)" : "Spiel"}>
        <select name="gameId" value={gameId} onChange={(event) => setGameId(event.target.value)} className={inputClass}>
          {kind === "accessory" && <option value="">– für alle Spiele –</option>}
          {games.map((game) => (
            <option key={game.id} value={game.id}>
              {game.name}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Name">
        <input name="name" required defaultValue={product?.name} placeholder="z. B. Glurak ex" className={inputClass} />
      </Field>
      {kind !== "accessory" && (
        <Field label={kind === "single" ? "Set" : "Set (optional)"}>
          <select
            name="setId"
            className={inputClass}
            required={kind === "single"}
            key={gameId}
            defaultValue={product && "setId" in product ? product.setId : undefined}
          >
            {kind === "sealed" && <option value="">– kein bestimmtes Set –</option>}
            {setsOfGame.map((set) => (
              <option key={set.id} value={set.id}>
                {set.name} ({set.code})
              </option>
            ))}
          </select>
        </Field>
      )}
      {kind === "single" && (
        <>
          <Field label="Nummer">
            <input
              name="collectorNumber"
              required
              defaultValue={single?.collectorNumber}
              placeholder="z. B. 199/165 oder OP05-119"
              className={inputClass}
            />
          </Field>
          <Field label="Seltenheit">
            <input name="rarity" required defaultValue={single?.rarity} placeholder="z. B. Special Illustration Rare" className={inputClass} />
          </Field>
        </>
      )}
      <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
        <SubmitButton pending={pending}>{product ? "Speichern" : "Produkt anlegen"}</SubmitButton>
        <FormMessage state={state} />
        {kind === "single" && setsOfGame.length === 0 && (
          <p className="text-sm text-foreground/60">Für dieses Spiel gibt es noch kein Set – bitte zuerst im Admin-Bereich anlegen.</p>
        )}
      </div>
      {product && (
        <p className="text-sm text-foreground/60 sm:col-span-2">
          Die Shop-Adresse folgt dem Namen{kind === "single" && " und der Nummer"} – alte Links auf das Produkt funktionieren danach nicht mehr.
        </p>
      )}
    </form>
  );
}
