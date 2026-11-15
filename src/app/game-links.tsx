import Link from "next/link";
import { connection } from "next/server";
import { getGames } from "@/modules/catalog/server";

// Tiles alternate between the two brand colors – by position, so a new game needs no code.
const ACCENTS = [
  "from-brand-blue/25 hover:border-brand-blue/70 hover:shadow-brand-blue/10",
  "from-brand-red/25 hover:border-brand-red/70 hover:shadow-brand-red/10",
] as const;

/** All games as tiles linking to their product lists. Render inside `<Suspense>`. */
export async function GameLinks() {
  // Catalog data is read at request time, so `next build` never touches the database.
  await connection();
  const games = await getGames();

  if (games.length === 0) {
    return <p className="mt-6 text-foreground/60">Noch keine Spiele im Sortiment.</p>;
  }

  return (
    <ul className="mt-6 grid gap-4 sm:grid-cols-2">
      {games.map((game, index) => (
        <li key={game.id}>
          <Link
            href={`/spiele/${game.id}`}
            className={`group flex min-h-36 items-end justify-between gap-4 rounded-2xl border border-foreground/10 bg-surface bg-linear-to-br to-transparent to-60% p-6 transition hover:-translate-y-1 hover:shadow-lg ${ACCENTS[index % ACCENTS.length]}`}
          >
            <span className="text-2xl font-bold tracking-tight sm:text-3xl">{game.name}</span>
            <span aria-hidden="true" className="text-2xl text-foreground/50 transition-transform group-hover:translate-x-1 group-hover:text-foreground">
              →
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
