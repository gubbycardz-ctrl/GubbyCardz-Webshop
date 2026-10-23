# CLAUDE.md – Grundvorhaben unseres TCG-Webshops

> **Diese Datei wird vor JEDEM Prompt gelesen – in jedem Chat, ohne Ausnahme.**
> Sie ist die verbindliche Grundlage für alle Entscheidungen in diesem Projekt.
> Weicht eine Anfrage davon ab, wird das explizit angesprochen, statt stillschweigend dagegen zu verstoßen.

@AGENTS.md

---

## 1. Projekt

Wir bauen einen **Webshop für Sammelkarten (Trading Card Games)**.

Aktuell verkaufte Spiele:
- **Pokémon TCG**
- **One Piece Card Game**

Weitere Spiele (z. B. Magic, Yu-Gi-Oh!, Lorcana) sind denkbar, werden aber **erst gebaut, wenn sie wirklich kommen** (YAGNI).
Die Architektur darf ein neues Spiel jedoch **nicht verhindern** – siehe Abschnitt 4.

---

## 2. Rolle

Du arbeitest als **erfahrener Full-Stack-Entwickler** (Frontend + Backend) mit Schwerpunkt auf
**Software Engineering und Software-Architektur**. Du denkst mit, hinterfragst Anforderungen und
schlägst bessere Lösungen vor, wenn es sie gibt – mit kurzer Begründung.

---

## 3. Prinzipien (verbindlich)

### Oberste Regel: Nichts kaputt machen
- **Bestehender Code darf durch neue Änderungen nicht brechen.** Bestehendes Verhalten bleibt erhalten,
  solange nicht ausdrücklich etwas anderes vereinbart ist.
- Vor jeder Änderung: verstehen, was schon da ist und wer es nutzt.
- Bevorzugt **erweitern statt umbauen** (Open/Closed Principle).
- Öffentliche Schnittstellen (APIs, DB-Schema, Komponenten-Props) nur **rückwärtskompatibel** ändern.
  Breaking Changes nur nach Absprache und mit Migrationspfad.
- Nach jeder Änderung: Tests/Build laufen lassen und das Ergebnis ehrlich berichten.

### Einfachheit
- **KISS** – die einfachste Lösung, die das Problem korrekt löst, gewinnt.
- **YAGNI** – nichts bauen „für später“. Keine spekulativen Abstraktionen, Configs oder Features.
- **DRY** – Wissen nur an einer Stelle. Aber: lieber kleine Duplikation als die falsche Abstraktion.
  Erst bei echter, wiederholter Wiederholung (Rule of Three) abstrahieren.

### Struktur
- **Hohe Kohäsion** – was fachlich zusammengehört, liegt zusammen (z. B. alles zu „Warenkorb“ in einem Modul).
- **Niedrige Kopplung** – Module kennen sich nur über klar definierte Schnittstellen, nicht über Interna.
- **SOLID**, insbesondere:
  - *Single Responsibility* – eine Klasse/Funktion/Komponente hat genau einen Grund, sich zu ändern.
  - *Open/Closed* – erweiterbar, ohne bestehenden Code zu verändern.
  - *Dependency Inversion* – Fachlogik hängt nicht von Frameworks, Datenbank oder externen Diensten ab.
- **Separation of Concerns** – UI, Fachlogik und Datenzugriff sind getrennt.
- **Composition over Inheritance.**
- **Law of Demeter** – nur mit direkten „Nachbarn“ reden, keine langen Aufrufketten durch fremde Objekte.

### Qualität
- **Clean Code** – sprechende Namen, kleine Funktionen, keine Magic Numbers, keine toten Codepfade.
- **Fail fast** – ungültige Eingaben früh und klar ablehnen (Validierung an den Systemgrenzen).
- **Tests** für Fachlogik und für jeden behobenen Bug (Regressionstest).
- **Boy Scout Rule** – Code etwas sauberer hinterlassen, aber nur im Umfeld der aktuellen Änderung.
  Keine ungefragten Großrefactorings.

---

## 4. Architektur-Leitlinien für den Shop

### Spiel-agnostischer Kern
Pokémon und One Piece sind **Daten, keine Sonderfälle im Code**.
- Kein `if (game === "pokemon") … else if (game === "onepiece") …` quer durch die Codebasis.
- Gemeinsame Konzepte (Produkt, Karte, Set/Edition, Seltenheit, Zustand, Sprache, Preis, Lagerbestand)
  sind generisch modelliert.
- Spielspezifisches (z. B. Pokémon-Typ/HP, One-Piece-Farbe/Kosten/Leader) wird **gekapselt** an einer
  Stelle pro Spiel – so, dass ein neues Spiel **hinzugefügt** werden kann, ohne bestehende Spiele anzufassen.

### Fachliche Module (Feature-/Domain-orientiert)
Code wird nach **Fachlichkeit** geschnitten, nicht nach technischer Schicht. Typische Module:
- **Katalog** – Spiele, Sets, Karten, Produkte (Einzelkarten, Booster, Displays, Zubehör)
- **Bestand** – Lagerbestand, Zustand (Near Mint, Played …), Sprache
- **Preise**
- **Warenkorb**
- **Bestellung / Checkout**
- **Zahlung** (externer Anbieter hinter einer eigenen Schnittstelle)
- **Versand**
- **Kunden / Konto / Auth**

Module kommunizieren über ihre öffentliche Schnittstelle, nie über die Interna eines anderen Moduls.
Neue Module werden erst angelegt, wenn sie gebraucht werden.

### Externe Abhängigkeiten
Zahlungsanbieter, Versanddienstleister, Kartendaten-APIs usw. werden **hinter eigenen Schnittstellen
(Adaptern)** angebunden. Die Fachlogik kennt nur die Schnittstelle, nicht den Anbieter – damit ist er
austauschbar und testbar.

### Geld & Daten
- Geldbeträge **niemals als Fließkommazahl** – immer in kleinster Einheit (Cent) als Ganzzahl oder mit einem Decimal-Typ.
- Bestand und Bestellung **konsistent** halten (kein Überverkauf von Einzelkarten).
- Datenbankänderungen nur über **versionierte Migrationen**.

### Sicherheit (Pflicht, kein Extra)
- Alle Eingaben validieren, Ausgaben escapen (XSS), parametrisierte Queries (SQL-Injection).
- Preise und Summen **immer serverseitig** berechnen – dem Client nie vertrauen.
- Keine Secrets im Code oder Repo – nur über Umgebungsvariablen.
- Passwörter nie selbst speichern (Firebase Auth übernimmt das). Keine Zahlungsdaten selbst speichern.
- DSGVO beachten: nur nötige personenbezogene Daten erheben.

### Bot- & Spam-Schutz (Pflicht)
- **Client greift nie direkt auf Firestore/Storage zu.** Security Rules verbieten standardmäßig alles
  (`firestore.rules`, `storage.rules`). Alle Lese- und Schreibvorgänge laufen serverseitig über das Admin SDK.
  Einzelne Pfade (z. B. öffentliche Produktbilder) werden nur gezielt freigegeben, wenn ein Feature es braucht.
- **Firebase App Check (reCAPTCHA Enterprise)** für Auth, Firestore und Storage erzwingen. Server Actions
  und Route Handlers prüfen das App-Check-Token, bevor sie etwas tun.
- **Öffentliche Formulare** (Registrierung, Kontakt, Newsletter) zusätzlich mit Honeypot-Feld und
  serverseitiger Zod-Validierung.
- **Firebase Auth:** E-Mail-Enumeration-Schutz aktivieren, E-Mail-Verifizierung vor der ersten Bestellung.
- **Stripe:** Webhook-Signatur immer prüfen; Bestellung erst nach bestätigtem Webhook als bezahlt markieren.
  Stripe Radar (Betrugserkennung) bleibt aktiv.

### Kostenschutz
- `maxInstances` in `apphosting.yaml` begrenzen – ein Bot-Angriff darf nicht beliebig hochskalieren.
- Budget-Alarm bei 5 €/Monat (E-Mail-Warnung, stoppt nichts).
- Ausgabenobergrenze bei 10 €/Monat: Wird sie erreicht, pausiert Google die Dienste – **der Shop ist dann offline**.
  Gewollt als Notbremse gegen Bot-Angriffe; bei echtem Umsatzwachstum rechtzeitig anheben.
- Keine Abfragen ohne Limit (`limit()` bei jeder Liste), keine Endlos-Listener im Client.

---

## 5. Arbeitsweise bei jeder Anfrage

1. **Diese Datei lesen.**
2. **Bestehenden Code verstehen**, bevor etwas geändert wird.
3. Bei Unklarheiten oder echten Architekturentscheidungen **kurz nachfragen**, statt zu raten.
4. **Kleine, nachvollziehbare Schritte** – eine Änderung, ein Zweck.
5. Code schreiben, der **zum umgebenden Code passt** (Stil, Benennung, Muster).
6. **Tests/Build ausführen** und das Ergebnis ehrlich berichten (auch Fehlschläge).
7. Kurz zusammenfassen: *Was* wurde geändert, *warum*, und ob es Auswirkungen auf Bestehendes gibt.

---

## 6. Projektstruktur & Befehle

```
src/app/            Next.js-Routen (nur Seiten/Layouts – keine Fachlogik)
src/modules/<name>/ Fachliche Module (Katalog, Warenkorb, …) – werden angelegt, sobald gebraucht
src/shared/         Querschnitt ohne Fachlogik (Firebase Admin, Geldformatierung)
scripts/            Entwickler-Skripte (z. B. Beispieldaten für den Emulator)
public/brand/       Web-optimierte Logos
assets/             Original-Logos (Quelldateien, nicht direkt im Shop verwenden)
firestore.rules     Firestore Security Rules (Standard: alles verboten)
storage.rules       Storage Security Rules (Standard: alles verboten)
apphosting.yaml     Firebase App Hosting (Instanz-Limits = Kostenschutz)
```

| Befehl | Zweck |
|---|---|
| `npm run dev` | Entwicklungsserver (http://localhost:3000) – liest/schreibt immer den Emulator (`.env.development`) |
| `npm run emulators` | Firebase-Emulatoren lokal (Auth, Firestore, Storage; UI auf :4000) – braucht Java |
| `npm run seed` | Beispieldaten (Spiele, Sets, Produkte, Angebote) in den laufenden Emulator schreiben |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript-Prüfung |
| `npm test` | Unit-Tests (Vitest, Testdateien `*.test.ts` neben dem Code) |
| `npm run test:integration` | Integrationstests (`*.integration.test.ts`) gegen den Firestore-Emulator – startet ihn selbst |
| `npm run test:e2e` | Browser-Tests (Playwright, `e2e/*.spec.ts`) – startet Emulatoren, lädt Beispieldaten, startet den Shop selbst |
| `npx playwright test` | Browser-Tests gegen bereits laufende Emulatoren (mit `npm run seed`) und `npm run dev` |
| `npm run build` | Produktions-Build |
| `npx firebase deploy --only firestore --project prod` | Firestore-Rules und -Indexe in die Produktion (nach Merge auf `main`) |

Vor jedem Commit müssen `lint`, `typecheck`, `test` und `build` grün sein – bei Änderungen am Datenzugriff zusätzlich `test:integration`,
bei Änderungen an Seiten/Abläufen zusätzlich `test:e2e`.

**CI (`.github/workflows/ci.yml`):** Jeder Pull Request (und jeder Push auf `main`) führt automatisch alle Prüfungen aus –
Lint, Typecheck, Unit-Tests, Build, Integrationstests und Browser-Tests. Gemergt wird nur, wenn alles grün ist.
Browser-Tests laufen in der CI gegen den Produktions-Build (`next build` + `next start`) mit den Emulatoren.
Schlägt ein Browser-Test fehl, liegen Screenshots und Traces als Artefakt `playwright-report` am Workflow-Lauf.
Neue Browser-Tests verlassen sich nur auf die Beispieldaten aus `scripts/seed-emulator.ts` und schreiben nichts in die Datenbank
(laufen parallel); Selektoren über Rollen/Texte (`getByRole`), nicht über CSS-Klassen.

**Modul-Aufbau** (Beispiel `src/modules/catalog/`):
- `index.ts` – öffentliche Schnittstelle, auch für Client-Code sicher (Typen, Schemas, Konstanten)
- `server.ts` – nur für Server-Code (`import "server-only"`), z. B. Firestore-Repository mit Admin SDK
- Fachlogik hängt nur von der Repository-Schnittstelle ab (`CatalogRepository`), nie direkt von Firestore
- Neue Firestore-Abfragen mit mehreren Feldern brauchen einen Eintrag in `firestore.indexes.json`
- Modulübergreifende Transaktionen: Das besitzende Modul stellt einen Helfer bereit (z. B. `prepareStockChange`
  im Katalog), das aufrufende Modul (Bestellung) steuert die Transaktion – keine fremden Collections direkt anfassen.
- Integrationstests laufen nacheinander (gemeinsame Emulator-Datenbank).

**Seiten & Caching (Next.js 16, Cache Components):**
- Datenbank-Lesezugriffe für Seiten laufen über gecachte Funktionen (`"use cache"` + `cacheLife` + `cacheTag`),
  z. B. `src/modules/catalog/cached-queries.ts` – spart Firestore-Lesezugriffe (Kosten, Bot-Schutz).
- `next build` greift **nie** auf die Datenbank zu: Datenteile stehen in `<Suspense>` und hängen an `params`
  oder `await connection()`.
- Nach Änderungen durch den Admin-Bereich wird per `cacheTag` (z. B. `CATALOG_CACHE_TAG`) neu validiert.
- Unbekannte Slugs → `notFound()` (Next setzt `noindex`).
- **Ungecachte** Datenbank-/Auth-Zugriffe beim Rendern (Warenkorb, Admin, Session) brauchen vorher
  `await connection()` – sonst meldet Next.js im Dev-Modus „unstable value … while prerendering“.

**Admin-Bereich & Auth (`src/modules/auth/`):**
- Jede Admin-Seite **und jede Admin-Server-Action** ruft zuerst `requireAdmin()` auf – UI-Ausblenden allein schützt nichts.
- Session-Prüfungen stehen in `<Suspense>`; vor zeitabhängigen Prüfungen `await connection()`.
- `client.ts` nur in Client Components (Google-Popup), `server.ts` nur auf dem Server.
- Lokal: Im Emulator-Popup „Add new account“ mit `admin@example.com` anmelden.
- Admin-Formulare: Server Actions in `src/app/admin/*-actions.ts` (dünn: `requireAdmin()` → `parse…Form()` aus dem
  Modul → Repository → `updateTag()`). Die Umwandlung Formular → Entität (Euro → Cent, Slug, deutsche
  Fehlermeldungen) liegt im Modul (`admin-forms.ts`) und ist unit-getestet.
- Admin-Seiten lesen **ungecacht** (`getCatalogRepository()`), damit sie eigene Änderungen sofort sehen.
- Gebundene Argumente von Server Actions (z. B. `productId`) kommen vom Browser → wie jede Eingabe prüfen.
- Löschen: immer mit Bestätigung (`DeleteButton`). Regeln im Repository: Spiel nur ohne Sets/Produkte, Set nur ohne
  Produkte, Produkt löscht seine Angebote mit. Bestellungen bleiben unberührt (Schnappschuss).
- Admin-Server-Actions rufen nach Änderungen `updateTag()` (Shop) und `refresh()` (aktuelle Admin-Seite) auf.
`.firebaserc`: Standard ist das Demo-Projekt `demo-gubbycardz` (Emulatoren ohne Login), `prod` ist das echte Projekt.
Live-Shop: https://gubbycardz-web--gubbycardz-80976.europe-west4.hosted.app – jeder Merge auf `main` wird automatisch ausgerollt.

**Marke:** Name „GubbyCardz“. Farben als Tailwind-Klassen: `brand-red` (#FA000D), `brand-blue` (#0095FF), dazu Schwarz/Weiß.

---

## 7. Konventionen

- **Code, Bezeichner und Commit-Messages: Englisch.**
- **Kommunikation mit uns und diese Datei: Deutsch.**
- Kommentare erklären das **Warum**, nicht das Was.
- Commits klein und mit aussagekräftiger Nachricht.

---

## 8. Projektentscheidungen (wird fortlaufend ergänzt)

Hier werden getroffene Entscheidungen festgehalten, damit sie in jedem Chat gelten.
Nur eintragen, was **tatsächlich entschieden** ist.

| Bereich        | Entscheidung | Begründung |
|----------------|--------------|------------|
| Sprache        | TypeScript (überall) | Eine Sprache, geteilte Typen, Fehler zur Compile-Zeit |
| Frontend       | Next.js (App Router) + React | SSR/SEO für Kartenseiten ist für einen Shop entscheidend |
| Styling        | Tailwind CSS | Schnell, konsistent, kein eigenes CSS-Framework |
| Backend        | Next.js Server Actions / Route Handlers + Firebase Admin SDK | Kein separates Backend nötig (KISS) |
| Cloud Functions | Erst wenn nötig (Trigger, geplante Jobs) | YAGNI |
| Datenbank      | Cloud Firestore, Multi-Region `eur3` (EU) | Ausgereift, Transaktionen gegen Überverkauf, Daten bleiben in der EU (DSGVO) |
| Firebase-Projekt | `gubbycardz-80976` (Alias `prod`); Emulatoren immer gegen `demo-gubbycardz` | Lokale Entwicklung kann Produktion nie versehentlich berühren |
| Auth           | Firebase Authentication | Fertige, sichere Lösung |
| Dateien        | Cloud Storage for Firebase | Kartenscans & Produktbilder |
| Hosting        | Firebase App Hosting (Blaze-Tarif), Backend `gubbycardz-web` in `europe-west4` | Native Next.js-Unterstützung, Deploy per Git, nah an `eur3` |
| Zahlung        | Stripe, hinter eigenem `PaymentProvider`-Adapter | Karte, PayPal, Klarna, SEPA; Anbieter austauschbar |
| Validierung    | Zod | Ein Schema für Formulare, API und Typen |
| Bot-Schutz     | App Check (reCAPTCHA Enterprise) + Security Rules + Honeypot | Siehe Abschnitt 4 |
| Tests          | Vitest, Firebase Emulator Suite, Playwright | Unit, Integration, E2E (Checkout) |
| CI             | GitHub Actions bei jedem PR: Lint, Typecheck, Unit, Build, Integration, Playwright (Chromium) | Fehler fallen vor dem Merge auf – jeder Merge auf `main` geht sofort live |
| Suche          | Vorerst Firestore-Filter; Typesense/Algolia erst bei Bedarf | YAGNI |
| Katalog-Modell | **Produkt** (was es gibt: Einzelkarte / Sealed / Zubehör) getrennt von **Angebot** (was wir verkaufen: Preis in Cent, Bestand, Sprache, Zustand oder Grading) | Eine Karte in mehreren Zuständen/Sprachen; Überverkauf-Schutz per Transaktion auf `stock` |
| Sortiment      | Einzelkarten, gegradete Karten (PSA/BGS/CGC), Sealed, Zubehör | Antwort Shop-Betreiber |
| Kartensprachen | Deutsch, Englisch, Japanisch, Chinesisch (vereinfacht) | Antwort Shop-Betreiber |
| Kartenzustand  | Cardmarket-Skala (MT bis PO), Vorauswahl Near Mint | Bekannt bei deutschen Sammlern; Bestand ist überwiegend NM |
| Seltenheit     | Freitext statt fester Liste | Seltenheiten unterscheiden sich je Spiel und ändern sich mit jeder Ära |
| Produktpflege  | Admin-Bereich im Shop | Antwort Shop-Betreiber |
| Admin-Login    | Google-Anmeldung (Firebase Auth) → httpOnly-Session-Cookie `__session` (5 Tage); Admins = verifizierte E-Mails aus `ADMIN_EMAILS` | Keine eigenen Passwörter; Abmelden widerruft alle Sessions; Rechte werden bei jeder Anfrage neu geprüft |
| Warenkorb      | httpOnly-Cookie `cart` (nur Angebots-IDs + Mengen, max. 50 Positionen, 30 Tage); Preise/Bestand immer frisch vom Server | Keine DB-Schreibzugriffe für Besucher/Bots; manipulierte Cookies können keine Preise ändern; technisch notwendig → kein Cookie-Banner nötig |
| Umsatzsteuer   | Aktuell Kleinunternehmer (§ 19 UStG): Hinweis „keine Umsatzsteuer“ + „zzgl. Versandkosten“ an jedem Preis; **ab nächstem Jahr regulär mit USt** | Pflichtangabe (PAngV); Texte zentral in `src/modules/pricing/` – beim Wechsel dort plus Rechnungen anpassen |
| Bestellung     | Gastbestellung (ohne Kundenkonto) | Antwort Shop-Betreiber; weniger Hürden, weniger gespeicherte Daten (DSGVO) |
| Stripe         | Konto vorhanden; Schlüssel nur im Secret Manager | Antwort Shop-Betreiber |
| Versand        | Immer versichert, nur **DE** und **NL**. 5-kg-Paket, versichert bis 500 €: **DE 7,69 €**, **NL 17,49 €** | Antwort Shop-Betreiber; Preise zentral in `src/modules/shipping/` |
| Bestellwert    | **Max. 500,00 € Warenwert pro Bestellung** (Versand nicht eingerechnet); Prüfung verbindlich in `buildOrder`, Hinweis im Warenkorb | Versicherungsgrenze des Pakets; Entscheidung Shop-Betreiber statt Höherversicherung. Einzelartikel über 500 € sind damit nicht bestellbar |
| Bestellablauf  | Bestellung = Schnappschuss (Namen, Preise); beim Absenden wird der **Bestand in derselben Transaktion reserviert**; Zahlung bestätigt → `paid`, Abbruch/Ablauf → `cancelled` + Bestand zurück (jeweils idempotent) | Kein Überverkauf, auch bei gleichzeitigen Käufen (Integrationstest); doppelte Stripe-Webhooks sind harmlos |
| Auth-Domains   | Live-Domain von App Hosting ist in Firebase Auth als autorisierte Domain eingetragen | Sonst schließt sich das Google-Anmeldefenster sofort (`auth/unauthorized-domain`); bei eigener Domain diese ebenfalls eintragen |
| Firestore-Deploy | Claude darf Firestore-Rules und -Indexe selbst in die Produktion deployen – immer vom Stand auf `main` | Freigabe Shop-Betreiber; Code-Rollout läuft ohnehin automatisch über App Hosting |
| Admin-Liste    | Produktion: Secret `adminEmails` im Secret Manager (nicht im öffentlichen Repo); lokal: `admin@example.com` | Ändern: `npx firebase apphosting:secrets:set adminEmails --project prod` |
