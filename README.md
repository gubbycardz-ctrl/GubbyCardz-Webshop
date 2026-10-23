# GubbyCardz Webshop

Webshop für Pokémon- und One-Piece-Karten. Next.js + Firebase.

**Vor jeder Arbeit am Code: [`CLAUDE.md`](CLAUDE.md) lesen** – dort stehen Prinzipien, Architektur und alle Entscheidungen.

## Lokal starten

Voraussetzungen: Node.js 20+, Java (für die Firebase-Emulatoren).

```bash
npm install
npm run emulators   # Terminal 1: Firebase-Emulatoren (UI: http://localhost:4000)
npm run seed        # Terminal 2: einmalig Beispieldaten laden
npm run dev         # Terminal 2: Shop (http://localhost:3000)
```

Admin-Bereich lokal: http://localhost:3000/admin → „Mit Google anmelden“ → im Emulator-Fenster
„Add new account“ mit der E-Mail `admin@example.com`.

## Prüfen

```bash
npm run lint && npm run typecheck && npm test && npm run build
npm run test:integration   # Firestore-Emulator, braucht Java
npm run test:e2e           # Browser-Tests (Playwright), braucht Java
```

Einmalig für Browser-Tests: `npx playwright install chromium`.

Dieselben Prüfungen laufen automatisch bei jedem Pull Request (GitHub Actions, `.github/workflows/ci.yml`).
