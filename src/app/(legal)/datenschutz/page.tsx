import type { Metadata } from "next";
import { OperatorAddress } from "../operator-address";
import { Placeholder } from "../placeholder";

export const metadata: Metadata = {
  title: "Datenschutzerklärung",
  description: "Wie GubbyCardz mit deinen personenbezogenen Daten umgeht.",
};

// Describes what the shop actually does today. When a feature changes how personal data is
// handled (cookies, order data, payment, bot protection), update the matching section here.
export default function PrivacyPage() {
  return (
    <>
      <h1>Datenschutzerklärung</h1>

      <h2>Verantwortlicher</h2>
      <OperatorAddress />

      <h2>Hosting und Datenbank</h2>
      <p>
        Der Shop läuft auf Firebase App Hosting der Google Cloud in der Region europe-west4 (Niederlande). Bestelldaten
        speichern wir in Cloud Firestore in der EU (Multi-Region eur3).
      </p>
      <Placeholder>
        Anbieter (Google), Server-Logfiles, Rechtsgrundlage, Auftragsverarbeitungsvertrag und mögliche Übermittlung in
        Drittländer.
      </Placeholder>

      <h2>Cookies</h2>
      <p>Wir setzen nur technisch notwendige Cookies, keine Analyse- oder Werbe-Cookies:</p>
      <ul>
        <li>
          <strong>cart</strong> – merkt sich, welche Artikel in deinem Warenkorb liegen (nur Artikel und Mengen),
          30 Tage.
        </li>
        <li>
          <strong>__session</strong> – nur für die Anmeldung von Shop-Mitarbeitern im Verwaltungsbereich, 5 Tage.
        </li>
      </ul>
      <Placeholder>Rechtsgrundlage (§ 25 Abs. 2 Nr. 2 TDDDG).</Placeholder>

      <h2>Bestellungen</h2>
      <p>
        Du bestellst bei uns ohne Kundenkonto. Für die Abwicklung erheben wir deine E-Mail-Adresse, deinen Namen und
        deine Lieferanschrift.
      </p>
      <Placeholder>Rechtsgrundlage, Weitergabe an den Versanddienstleister (welcher?) und Speicherdauer.</Placeholder>

      <h2>Zahlung</h2>
      <Placeholder>Abschnitt zu Stripe ergänzen, sobald die Zahlung angebunden ist.</Placeholder>

      <h2>Schriftarten</h2>
      <p>Die Schriftarten liefern wir selbst aus. Dein Browser baut dafür keine Verbindung zu Google auf.</p>

      <h2>Deine Rechte</h2>
      <Placeholder>
        Auskunft, Berichtigung, Löschung, Einschränkung, Datenübertragbarkeit, Widerspruch und Beschwerderecht bei der
        zuständigen Aufsichtsbehörde.
      </Placeholder>
    </>
  );
}
