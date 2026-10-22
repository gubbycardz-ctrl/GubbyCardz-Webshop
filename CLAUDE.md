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
| `npm run build` | Produktions-Build |

Vor jedem Commit müssen `lint`, `typecheck`, `test` und `build` grün sein – bei Änderungen am Datenzugriff zusätzlich `test:integration`.

**Modul-Aufbau** (Beispiel `src/modules/catalog/`):
- `index.ts` – öffentliche Schnittstelle, auch für Client-Code sicher (Typen, Schemas, Konstanten)
- `server.ts` – nur für Server-Code (`import "server-only"`), z. B. Firestore-Repository mit Admin SDK
- Fachlogik hängt nur von der Repository-Schnittstelle ab (`CatalogRepository`), nie direkt von Firestore
- Neue Firestore-Abfragen mit mehreren Feldern brauchen einen Eintrag in `firestore.indexes.json`

**Seiten & Caching (Next.js 16, Cache Components):**
- Datenbank-Lesezugriffe für Seiten laufen über gecachte Funktionen (`"use cache"` + `cacheLife` + `cacheTag`),
  z. B. `src/modules/catalog/cached-queries.ts` – spart Firestore-Lesezugriffe (Kosten, Bot-Schutz).
- `next build` greift **nie** auf die Datenbank zu: Datenteile stehen in `<Suspense>` und hängen an `params`
  oder `await connection()`.
- Nach Änderungen durch den Admin-Bereich wird per `cacheTag` (z. B. `CATALOG_CACHE_TAG`) neu validiert.
- Unbekannte Slugs → `notFound()` (Next setzt `noindex`).
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
| Suche          | Vorerst Firestore-Filter; Typesense/Algolia erst bei Bedarf | YAGNI |
| Katalog-Modell | **Produkt** (was es gibt: Einzelkarte / Sealed / Zubehör) getrennt von **Angebot** (was wir verkaufen: Preis in Cent, Bestand, Sprache, Zustand oder Grading) | Eine Karte in mehreren Zuständen/Sprachen; Überverkauf-Schutz per Transaktion auf `stock` |
| Sortiment      | Einzelkarten, gegradete Karten (PSA/BGS/CGC), Sealed, Zubehör | Antwort Shop-Betreiber |
| Kartensprachen | Deutsch, Englisch, Japanisch, Chinesisch (vereinfacht) | Antwort Shop-Betreiber |
| Kartenzustand  | Cardmarket-Skala (MT bis PO), Vorauswahl Near Mint | Bekannt bei deutschen Sammlern; Bestand ist überwiegend NM |
| Seltenheit     | Freitext statt fester Liste | Seltenheiten unterscheiden sich je Spiel und ändern sich mit jeder Ära |
| Produktpflege  | Admin-Bereich im Shop | Antwort Shop-Betreiber |
