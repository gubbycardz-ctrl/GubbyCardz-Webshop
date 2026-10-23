import type { Metadata } from "next";
import { Suspense } from "react";
import { requireAdmin } from "@/modules/auth/server";
import { MAX_IMPORT_ROWS } from "@/modules/catalog";
import { ImportForm } from "./import-form";

export const metadata: Metadata = { title: "Import" };

const TEMPLATE_URL = "/vorlagen/produktimport-vorlage.xlsx";

// What each column expects – kept next to the form, where the questions come up.
const COLUMN_HELP: [column: string, required: string, values: string][] = [
  ["SKU", "immer", "Lagernummer, z. B. PKM-SIT-BB-DE-001 – Schlüssel für spätere Importe"],
  ["Name", "immer", "Produktname; gleicher Name = gleiches Produkt (z. B. eine Karte in mehreren Zuständen)"],
  ["TCG", "außer Zubehör", "Spiel wie unter „Spiele & Sets“, z. B. Pokémon, One Piece"],
  ["Set", "Einzelkarten", "Name oder Code eines vorhandenen Sets; bei Sealed freiwillig"],
  ["Kategorie", "immer", "Einzelkarte, Slab, Display, Booster, Booster Bundle, Elite Trainer Box, Tin, Blister, Collection, Deck, Sonstiges, Zubehör"],
  ["Nummer, Seltenheit", "Einzelkarten", "z. B. 14/102 und Holo Rare"],
  ["Sprache", "außer Zubehör", "Deutsch, Englisch, Japanisch, Chinesisch (vereinfacht)"],
  ["Zustand", "Einzelkarten", "NM, LP … oder PSA 10, BGS 8.5, CGC 9.5; bei Sealed leer oder Neu/Sealed"],
  ["Zertifikat", "Slabs", "Zertifikatsnummer vom Grading"],
  ["Bestand", "neue Artikel", "ganze Zahl"],
  ["EK, VK", "VK immer, EK bei neuen", "Euro, z. B. 24,50"],
  ["Steuerart", "neue Artikel", "Regelbesteuert oder Differenzbesteuert"],
  ["Herkunft", "neue Artikel", "Privat oder Gewerblich"],
  ["Lagerplatz", "–", "freier Text, z. B. SEALED-01"],
  ["Bilddatei", "–", "wird noch nicht übernommen (Bilder-Upload folgt)"],
];

export default function AdminImportPage() {
  return (
    <Suspense fallback={<p className="text-foreground/60">Wird geladen …</p>}>
      <ImportPage />
    </Suspense>
  );
}

async function ImportPage() {
  await requireAdmin();
  return (
    <div className="flex flex-col gap-8">
      <section>
        <h1 className="text-3xl font-bold">Produkte importieren</h1>
        <p className="mt-2 text-sm text-foreground/70">
          Erst <strong>Prüfen</strong> – dabei wird nichts gespeichert. Importiert wird nur eine Datei ohne Fehler. Gelesen wird
          das erste Tabellenblatt, höchstens {MAX_IMPORT_ROWS} Zeilen.{" "}
          <a href={TEMPLATE_URL} download className="text-brand-blue hover:underline">
            Vorlage herunterladen
          </a>
        </p>
      </section>

      <ImportForm />

      <section className="text-sm">
        <h2 className="text-xl font-semibold">Was passiert mit bestehenden SKUs?</h2>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>Eine SKU, die es schon gibt, wird aktualisiert – nie doppelt angelegt.</li>
          <li>Übernommen werden VK, Name und Lagerplatz.</li>
          <li>EK, Herkunft und Steuerart werden nur ergänzt, wenn sie fehlen – nie überschrieben.</li>
          <li>Der Bestand bleibt, außer das Häkchen „Bestand übernehmen“ ist gesetzt.</li>
          <li>TCG, Set, Kategorie, Sprache und Zustand ändern sich nicht – das geht unter „Produkte“.</li>
        </ul>
      </section>

      <section>
        <h2 className="text-xl font-semibold">Spalten</h2>
        <div className="mt-3 overflow-x-auto rounded-xl border border-foreground/10">
          <table className="w-full text-left text-sm">
            <thead className="bg-foreground/5 text-foreground/70">
              <tr>
                <th className="px-3 py-2 font-medium">Spalte</th>
                <th className="px-3 py-2 font-medium">Pflicht</th>
                <th className="px-3 py-2 font-medium">Werte</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-foreground/10">
              {COLUMN_HELP.map(([column, required, values]) => (
                <tr key={column} className="align-top">
                  <td className="whitespace-nowrap px-3 py-2 font-medium">{column}</td>
                  <td className="whitespace-nowrap px-3 py-2">{required}</td>
                  <td className="px-3 py-2 text-foreground/70">{values}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-sm text-foreground/60">TCG und Sets müssen vorher unter „Spiele & Sets“ angelegt sein.</p>
      </section>
    </div>
  );
}
