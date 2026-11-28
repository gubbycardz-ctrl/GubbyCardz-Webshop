import type { Metadata } from "next";
import Link from "next/link";
import { CARD_CONDITIONS } from "@/modules/catalog";
import { SHOP_OPERATOR } from "@/modules/legal";
import { SHIPPING_NOTE, TAX_NOTE } from "@/modules/pricing";
import { MAX_ORDER_VALUE_CENTS, SHIPPING_COUNTRIES, shippingCostCents, SHIPPING_COUNTRY_CODES } from "@/modules/shipping";
import { formatEuro } from "@/shared/money";
import { Placeholder } from "../placeholder";

export const metadata: Metadata = {
  title: "Allgemeine Geschäftsbedingungen",
  description: "Die AGB von GubbyCardz.",
};

// Prices, shipping and conditions come from their modules, so the terms never contradict the shop.
export default function TermsPage() {
  return (
    <>
      <h1>Allgemeine Geschäftsbedingungen</h1>

      <h2>1. Geltungsbereich und Vertragspartner</h2>
      <p>Diese AGB gelten für alle Bestellungen im Online-Shop GubbyCardz. Dein Vertragspartner ist {SHOP_OPERATOR.name}.</p>
      <Placeholder>Ob nur an Verbraucher oder auch an Unternehmer verkauft wird.</Placeholder>

      <h2>2. Vertragsschluss</h2>
      <Placeholder>Ablauf von der Bestellung bis zur Annahme – ergänzen, sobald der Checkout steht.</Placeholder>

      <h2>3. Preise</h2>
      <p>
        {TAX_NOTE} {SHIPPING_NOTE}.
      </p>

      <h2>4. Versand</h2>
      <p>Wir versenden ausschließlich versichert und nur in diese Länder:</p>
      <ul>
        {SHIPPING_COUNTRY_CODES.map((country) => (
          <li key={country}>
            {SHIPPING_COUNTRIES[country].label}: {formatEuro(shippingCostCents(country))}
          </li>
        ))}
      </ul>
      <p>Der Warenwert einer Bestellung darf höchstens {formatEuro(MAX_ORDER_VALUE_CENTS)} betragen (ohne Versandkosten).</p>
      <Placeholder>Lieferzeit.</Placeholder>

      <h2>5. Zahlung</h2>
      <Placeholder>Zahlungsarten und Fälligkeit – ergänzen, sobald Stripe angebunden ist.</Placeholder>

      <h2>6. Eigentumsvorbehalt</h2>
      <Placeholder>Formulierung des Eigentumsvorbehalts.</Placeholder>

      <h2>7. Zustand von Einzelkarten</h2>
      <p>Den Zustand von Einzelkarten geben wir nach der Cardmarket-Skala an:</p>
      <ul>
        {Object.values(CARD_CONDITIONS).map(({ label, abbreviation }) => (
          <li key={abbreviation}>
            {label} ({abbreviation})
          </li>
        ))}
      </ul>
      <Placeholder>Beschreibung der Stufen bzw. Verweis auf die Cardmarket-Definitionen.</Placeholder>

      <h2>8. Gewährleistung</h2>
      <Placeholder>Gesetzliche Mängelhaftung.</Placeholder>

      <h2>9. Widerrufsrecht</h2>
      <p>
        Als Verbraucher hast du ein Widerrufsrecht. Einzelheiten stehen in der{" "}
        <Link href="/widerruf">Widerrufsbelehrung</Link>.
      </p>
    </>
  );
}
