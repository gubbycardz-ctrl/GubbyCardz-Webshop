"use client";

import { useState, useTransition, type FormEvent } from "react";
import type { SetSyncStatus } from "@/modules/catalog";
import type { SetSyncOutcome } from "@/modules/catalog/server";
import { syncSets } from "../tcg-actions";

const STATUS_LABELS: Record<SetSyncStatus, string> = {
  create: "Neu",
  update: "Aktualisiert",
  enrich: "Ergänzt",
  unchanged: "Unverändert",
  conflict: "Übersprungen",
};

const STATUS_CLASSES: Record<SetSyncStatus, string> = {
  create: "text-brand-blue",
  update: "text-brand-blue",
  enrich: "text-brand-blue",
  unchanged: "text-foreground/50",
  conflict: "text-brand-red",
};

export function SyncPanel() {
  const [outcome, setOutcome] = useState<SetSyncOutcome | null>(null);
  const [pending, startTransition] = useTransition();

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget, (event.nativeEvent as SubmitEvent).submitter);
    startTransition(async () => setOutcome(await syncSets(formData)));
  }

  const changed = outcome?.ok ? outcome.rows.filter((row) => row.status !== "unchanged" && row.status !== "conflict") : [];
  const canApply = outcome?.ok && !outcome.written && (changed.length > 0 || outcome.newGame);

  return (
    <section className="rounded-xl border border-foreground/10 p-4">
      <h2 className="text-xl font-semibold">Pokémon-Sets aktualisieren</h2>
      <p className="mt-1 text-sm text-foreground/70">
        Quelle: <a href="https://tcgdex.dev" className="text-brand-blue hover:underline">TCGdex</a>. Umfang: Schwert &amp; Schild, Karmesin &amp;
        Purpur und Mega-Entwicklung in Englisch, Deutsch und Japanisch. Es wird nichts gelöscht, und von dir angelegte Sets werden nur
        ergänzt, nie überschrieben.
      </p>
      <form onSubmit={onSubmit} onChange={() => setOutcome(null)} className="mt-3 flex flex-wrap gap-3">
        <input type="hidden" name="source" value="pokemon" />
        <button
          type="submit"
          name="intent"
          value="preview"
          disabled={pending}
          className="rounded-lg border border-foreground/20 px-4 py-2 text-sm font-medium hover:bg-foreground/5 disabled:opacity-50"
        >
          {pending ? "Wird geprüft …" : "Prüfen"}
        </button>
        {canApply && (
          <button
            type="submit"
            name="intent"
            value="apply"
            disabled={pending}
            className="rounded-lg bg-brand-blue px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
          >
            {pending ? "Wird übernommen …" : `${changed.length} Änderungen übernehmen`}
          </button>
        )}
      </form>
      {outcome && <Outcome outcome={outcome} />}
    </section>
  );
}

function Outcome({ outcome }: { outcome: SetSyncOutcome }) {
  if (!outcome.ok) {
    return (
      <p role="alert" className="mt-3 text-sm text-brand-red">
        {outcome.error}
      </p>
    );
  }
  const counts = (status: SetSyncStatus) => outcome.rows.filter((row) => row.status === status).length;
  const changed = outcome.rows.filter((row) => row.status !== "unchanged" || row.notes.length > 0);

  return (
    <div className="mt-3 flex flex-col gap-3 text-sm">
      {outcome.written && (
        <p role="status" className="text-green-700 dark:text-green-400">
          {outcome.written.sets} Sets übernommen.
        </p>
      )}
      {outcome.written?.failures.map((failure) => (
        <p key={failure} role="alert" className="text-brand-red">
          {failure}
        </p>
      ))}
      <p className="text-foreground/70">
        {outcome.rows.length} Sets in der Quelle: {counts("create")} neu · {counts("enrich")} ergänzt · {counts("update")} aktualisiert ·{" "}
        {counts("unchanged")} unverändert
        {counts("conflict") > 0 && ` · ${counts("conflict")} übersprungen (Quelle widersprüchlich)`}
        {outcome.notInSource > 0 && ` · ${outcome.notInSource} Sets, die die Quelle nicht mehr nennt (bleiben bestehen)`}
        {outcome.newGame && " · das Spiel „Pokémon“ wird neu angelegt"}
      </p>
      {changed.length > 0 && (
        <div className="max-h-96 overflow-auto rounded-lg border border-foreground/10">
          <table className="w-full text-left">
            <tbody className="divide-y divide-foreground/10">
              {changed.map((row) => (
                <tr key={row.id} className="align-top">
                  <td className={`px-3 py-2 font-medium whitespace-nowrap ${STATUS_CLASSES[row.status]}`}>{STATUS_LABELS[row.status]}</td>
                  <td className="px-3 py-2">
                    {row.name} <span className="font-mono text-xs text-foreground/60">({row.code}{row.region === "japan" ? ", JP" : ""})</span>
                    {row.releaseDate && <span className="block text-foreground/60">Erscheint {new Date(`${row.releaseDate}T00:00:00`).toLocaleDateString("de-DE")}</span>}
                    {[...row.changes, ...row.notes].map((line) => (
                      <span key={line} className="block text-foreground/60">
                        {line}
                      </span>
                    ))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
