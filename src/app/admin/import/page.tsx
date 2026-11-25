import type { Metadata } from "next";
import { Suspense } from "react";
import { requireAdmin } from "@/modules/auth/server";
import { MAX_IMPORT_ROWS } from "@/modules/catalog";
import { ImportForm } from "./import-form";

export const metadata: Metadata = { title: "Import" };

const TEMPLATE_URL = "/vorlagen/produktimport-vorlage.xlsx";

// What each column expects – kept next to the form, where the questions come up. The column titles stay German:
// they are the headers of the Excel template.
const COLUMN_HELP: [column: string, required: string, values: string][] = [
  ["SKU", "always", "Stock number, e.g. PKM-SIT-BB-DE-001 – the key for later imports"],
  ["Name", "always", "Product name; same name = same product (e.g. one card in several conditions)"],
  ["TCG", "except accessories", "TCG as under “TCGs & Sets”, e.g. Pokémon, One Piece"],
  ["Set", "single cards", "Name or code of an existing set; optional for sealed"],
  ["Kategorie", "always", "Einzelkarte, Slab, Display, Booster, Booster Bundle, Elite Trainer Box, Tin, Blister, Collection, Deck, Sonstiges, Zubehör"],
  ["Nummer, Seltenheit", "single cards", "e.g. 14/102 and Holo Rare"],
  ["Sprache", "except accessories", "German, English, Japanese, Chinese (Simplified)"],
  ["Zustand", "single cards", "NM, LP … or PSA 10, BGS 8.5, CGC 9.5; empty or New/Sealed for sealed products"],
  ["Zertifikat", "slabs", "Certificate number from the grading company"],
  ["Bestand", "new items", "whole number"],
  ["EK, VK", "VK always, EK for new items", "Euros, e.g. 24,50 (EK = purchase price, VK = selling price)"],
  ["Steuerart", "new items", "Standard (Regelbesteuert) or Margin (Differenzbesteuert)"],
  ["Herkunft", "new items", "Private or Commercial"],
  ["Lagerplatz", "–", "free text, e.g. SEALED-01"],
  ["Bilddatei", "–", "not imported yet (image upload comes later)"],
];

export default function AdminImportPage() {
  return (
    <Suspense fallback={<p className="text-foreground/60">Loading …</p>}>
      <ImportPage />
    </Suspense>
  );
}

async function ImportPage() {
  await requireAdmin();
  return (
    <div className="flex flex-col gap-8">
      <section>
        <h1 className="text-3xl font-bold">Import products</h1>
        <p className="mt-2 text-sm text-foreground/70">
          Start with <strong>Check</strong> – nothing is saved by it. Only a file without errors is imported. The first sheet is read,
          at most {MAX_IMPORT_ROWS} rows.{" "}
          <a href={TEMPLATE_URL} download className="text-brand-blue hover:underline">
            Download template
          </a>
        </p>
      </section>

      <ImportForm />

      <section className="text-sm">
        <h2 className="text-xl font-semibold">What happens to existing SKUs?</h2>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>A SKU that already exists is updated – never created twice.</li>
          <li>Price, name and storage location are taken over.</li>
          <li>Purchase price, origin and tax scheme are only filled in when missing – never overwritten.</li>
          <li>Stock stays as it is, unless “Take stock from the file” is ticked.</li>
          <li>TCG, set, category, language and condition do not change – do that under “Products”.</li>
        </ul>
      </section>

      <section>
        <h2 className="text-xl font-semibold">Columns</h2>
        <div className="mt-3 overflow-x-auto rounded-xl border border-foreground/10">
          <table className="w-full text-left text-sm">
            <thead className="bg-foreground/5 text-foreground/70">
              <tr>
                <th className="px-3 py-2 font-medium">Column</th>
                <th className="px-3 py-2 font-medium">Required</th>
                <th className="px-3 py-2 font-medium">Values</th>
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
        <p className="mt-2 text-sm text-foreground/60">TCGs and sets must exist beforehand – under “TCGs & Sets”, or load them in “TCG Catalog”.</p>
      </section>
    </div>
  );
}
