"use client";

import { useState, useTransition, type FormEvent } from "react";
import { MAX_IMPORT_FILE_BYTES, type ImportOutcome, type ImportRowResult, type ImportRowStatus } from "@/modules/catalog";
import { inputClass } from "../_components/form-kit";
import { importProducts } from "../import-actions";

const STATUS_LABELS: Record<ImportRowStatus, string> = {
  create: "Neu",
  update: "Ändern",
  unchanged: "Unverändert",
  error: "Fehler",
};

const STATUS_CLASSES: Record<ImportRowStatus, string> = {
  create: "text-brand-blue",
  update: "text-brand-blue",
  unchanged: "text-foreground/50",
  error: "text-brand-red",
};

export function ImportForm() {
  const [outcome, setOutcome] = useState<ImportOutcome | null>(null);
  const [pending, startTransition] = useTransition();

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget, (event.nativeEvent as SubmitEvent).submitter);
    const file = formData.get("file");
    // Larger requests never reach the Server Action, so say it here.
    if (file instanceof File && file.size > MAX_IMPORT_FILE_BYTES) {
      setOutcome({ ok: false, error: `Die Datei ist zu groß (höchstens ${MAX_IMPORT_FILE_BYTES / 1024} KB).` });
      return;
    }
    startTransition(async () => setOutcome(await importProducts(formData)));
  }

  const changes = outcome?.ok ? outcome.rows.filter((row) => row.status === "create" || row.status === "update").length : 0;
  const canImport = outcome?.ok && !outcome.hasErrors && !outcome.written && changes > 0;

  return (
    // A new file or option makes the preview stale: only what was checked may be imported.
    <form onSubmit={onSubmit} onChange={() => setOutcome(null)} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-foreground/70">Excel-Datei (.xlsx)</span>
        <input
          type="file"
          name="file"
          required
          accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          className={inputClass}
        />
      </label>
      <label className="flex items-start gap-2 text-sm">
        <input type="checkbox" name="overwriteStock" className="mt-1" />
        <span>
          Bestand aus der Datei übernehmen
          <span className="block text-foreground/60">
            Nur direkt nach einer Inventur – sonst kommen inzwischen verkaufte Artikel zurück in den Shop.
          </span>
        </span>
      </label>
      <div className="flex flex-wrap gap-3">
        <button
          type="submit"
          name="intent"
          value="preview"
          disabled={pending}
          className="rounded-lg border border-foreground/20 px-4 py-2 text-sm font-medium hover:bg-foreground/5 disabled:opacity-50"
        >
          {pending ? "Wird geprüft …" : "Prüfen"}
        </button>
        {canImport && (
          <button
            type="submit"
            name="intent"
            value="import"
            disabled={pending}
            className="rounded-lg bg-brand-blue px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
          >
            {changes} Artikel importieren
          </button>
        )}
      </div>
      {outcome && <ImportResult outcome={outcome} />}
    </form>
  );
}

function ImportResult({ outcome }: { outcome: ImportOutcome }) {
  if (!outcome.ok) {
    return (
      <p role="alert" className="text-sm text-brand-red">
        {outcome.error}
      </p>
    );
  }
  return (
    <div className="flex flex-col gap-3">
      <Summary outcome={outcome} />
      {outcome.ignoredColumns.length > 0 && (
        <p className="text-sm text-foreground/60">Nicht verwendete Spalten: {outcome.ignoredColumns.join(", ")}</p>
      )}
      <RowTable rows={outcome.rows} />
    </div>
  );
}

function Summary({ outcome }: { outcome: Extract<ImportOutcome, { ok: true }> }) {
  const count = (status: ImportRowStatus) => outcome.rows.filter((row) => row.status === status).length;
  const counts = (Object.keys(STATUS_LABELS) as ImportRowStatus[]).map((status) => `${count(status)} ${STATUS_LABELS[status]}`).join(" · ");

  if (outcome.written) {
    const { products, offers, failures } = outcome.written;
    return (
      <div role="status" className="text-sm">
        <p className="font-medium text-green-700 dark:text-green-400">
          Importiert: {offers} Artikel und {products} Produkte gespeichert.
        </p>
        {failures.length > 0 && (
          <ul className="mt-2 list-disc pl-5 text-brand-red">
            {failures.map((failure) => (
              <li key={failure}>{failure}</li>
            ))}
          </ul>
        )}
      </div>
    );
  }
  return (
    <p role="status" className="text-sm">
      <span className="font-medium">Vorschau – noch nichts gespeichert.</span> {counts}
      {outcome.hasErrors && (
        <span className="block text-brand-red">Bitte die Fehler in der Datei korrigieren und erneut prüfen – vorher wird nichts importiert.</span>
      )}
    </p>
  );
}

function RowTable({ rows }: { rows: ImportRowResult[] }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-foreground/10">
      <table className="w-full text-left text-sm">
        <thead className="bg-foreground/5 text-foreground/70">
          <tr>
            <th className="px-3 py-2 font-medium">Zeile</th>
            <th className="px-3 py-2 font-medium">SKU / Name</th>
            <th className="px-3 py-2 font-medium">Status</th>
            <th className="px-3 py-2 font-medium">Details</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-foreground/10">
          {rows.map((row) => (
            <tr key={row.line} className="align-top">
              <td className="px-3 py-2 text-foreground/60">{row.line}</td>
              <td className="px-3 py-2">
                <span className="font-mono text-xs">{row.sku || "–"}</span>
                <span className="block">{row.name}</span>
              </td>
              <td className={`whitespace-nowrap px-3 py-2 font-medium ${STATUS_CLASSES[row.status]}`}>{STATUS_LABELS[row.status]}</td>
              <td className="px-3 py-2">
                <ul>
                  {row.messages.map((message) => (
                    <li key={message}>{message}</li>
                  ))}
                </ul>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
