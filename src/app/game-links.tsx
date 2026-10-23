import Link from "next/link";
import { connection } from "next/server";
import { getGames } from "@/modules/catalog/server";

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
