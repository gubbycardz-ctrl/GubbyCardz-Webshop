import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { getGames } from "@/modules/catalog/server";

export const metadata: Metadata = {
  title: "Spiele",
  description: "Alle Sammelkartenspiele im Sortiment von GubbyCardz.",
};

export default function GamesPage() {
  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-10">
      <h1 className="text-3xl font-bold">Spiele</h1>
      <Suspense fallback={<p className="mt-6 text-foreground/60">Spiele werden geladen …</p>}>
        <GameList />
      </Suspense>
    </main>
  );
}

async function GameList() {
  // Catalog data is read at request time, so `next build` never touches the database.
  await connection();
  const games = await getGames();

  if (games.length === 0) {
    return <p className="mt-6 text-foreground/60">Noch keine Spiele im Sortiment.</p>;
  }

  return (
    <ul className="mt-6 grid gap-4 sm:grid-cols-2">
      {games.map((game) => (
        <li key={game.id}>
          <Link
            href={`/spiele/${game.id}`}
            className="block rounded-xl border border-foreground/10 p-6 text-xl font-semibold transition-colors hover:border-brand-blue hover:text-brand-blue"
          >
            {game.name}
          </Link>
        </li>
      ))}
    </ul>
  );
}
