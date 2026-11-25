"use client";

import type { Game } from "@/modules/catalog";
import { createCardSet, createGame } from "../catalog-actions";
import { Field, FormMessage, SubmitButton, inputClass, useAdminForm } from "./form-kit";

export function GameForm() {
  const { state, pending, onSubmit } = useAdminForm(createGame);
  return (
    <form onSubmit={onSubmit} className="flex flex-wrap items-end gap-3">
      <Field label="TCG name">
        <input name="name" required placeholder="e.g. Pokémon" className={inputClass} />
      </Field>
      <SubmitButton pending={pending}>Add TCG</SubmitButton>
      <FormMessage state={state} />
    </form>
  );
}

export function CardSetForm({ games }: { games: Game[] }) {
  const { state, pending, onSubmit } = useAdminForm(createCardSet);
  return (
    <form onSubmit={onSubmit} className="grid gap-3 sm:grid-cols-2">
      <Field label="TCG">
        <select name="gameId" required className={inputClass}>
          {games.map((game) => (
            <option key={game.id} value={game.id}>
              {game.name}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Set name">
        <input name="name" required placeholder="e.g. Scarlet & Violet—151" className={inputClass} />
      </Field>
      <Field label="Set code">
        <input name="code" required placeholder="e.g. MEW or OP-05" className={inputClass} />
      </Field>
      <Field label="Release date (optional)">
        <input name="releaseDate" type="date" className={inputClass} />
      </Field>
      <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
        <SubmitButton pending={pending}>Add set</SubmitButton>
        <FormMessage state={state} />
      </div>
    </form>
  );
}
