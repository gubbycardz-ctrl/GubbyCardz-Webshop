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

## Prüfen

```bash
npm run lint && npm run typecheck && npm run build
```
