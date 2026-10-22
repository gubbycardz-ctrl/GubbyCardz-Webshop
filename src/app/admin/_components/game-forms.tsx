"use client";

import type { Game } from "@/modules/catalog";
import { createCardSet, createGame } from "../catalog-actions";
import { Field, FormMessage, SubmitButton, inputClass, useAdminForm } from "./form-kit";

export function GameForm() {
  const { state, pending, onSubmit } = useAdminForm(createGame);
  return (
    <form onSubmit={onSubmit} className="flex flex-wrap items-end gap-3">
      <Field label="Name des Spiels">
        <input name="name" required placeholder="z. B. Pokémon" className={inputClass} />
      </Field>
      <SubmitButton pending={pending}>Spiel anlegen</SubmitButton>
      <FormMessage state={state} />
    </form>
  );
}

export function CardSetForm({ games }: { games: Game[] }) {
  const { state, pending, onSubmit } = useAdminForm(createCardSet);
  return (
    <form onSubmit={onSubmit} className="grid gap-3 sm:grid-cols-2">
      <Field label="Spiel">
        <select name="gameId" required className={inputClass}>
          {games.map((game) => (
            <option key={game.id} value={game.id}>
              {game.name}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Name des Sets">
        <input name="name" required placeholder="z. B. Karmesin & Purpur – 151" className={inputClass} />
      </Field>
      <Field label="Set-Code">
        <input name="code" required placeholder="z. B. MEW oder OP-05" className={inputClass} />
      </Field>
      <Field label="Erscheinungsdatum (optional)">
        <input name="releaseDate" type="date" className={inputClass} />
      </Field>
      <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
        <SubmitButton pending={pending}>Set anlegen</SubmitButton>
        <FormMessage state={state} />
      </div>
    </form>
  );
}
