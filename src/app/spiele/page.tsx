import type { Metadata } from "next";
import { Suspense } from "react";
import { GameLinks } from "@/app/game-links";

export const metadata: Metadata = {
  title: "Spiele",
  description: "Alle Sammelkartenspiele im Sortiment von GubbyCardz.",
  alternates: { canonical: "/spiele" },
};

export default function GamesPage() {
  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-10">
      <h1 className="text-3xl font-bold">Spiele</h1>
      <Suspense fallback={<p className="mt-6 text-foreground/60">Spiele werden geladen …</p>}>
        <GameLinks />
      </Suspense>
    </main>
  );
}
