import Link from "next/link";
import { connection } from "next/server";
import { getGames } from "@/modules/catalog/server";

// Tiles take the brand colors in turn – a new game needs no color of its own.
const TILE_ACCENTS = ["from-brand-red to-[#8f0007]", "from-brand-blue to-[#004f8a]"] as const;

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
            className={`group flex min-h-36 flex-col justify-end rounded-2xl bg-gradient-to-br p-6 text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg ${TILE_ACCENTS[index % TILE_ACCENTS.length]}`}
          >
            <span className="text-2xl font-extrabold uppercase italic tracking-tight sm:text-3xl">{game.name}</span>
            <span aria-hidden="true" className="mt-1 text-sm font-medium text-white/85">
              Jetzt entdecken <span className="inline-block transition-transform group-hover:translate-x-1">→</span>
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
