import { Suspense } from "react";
import { requireAdmin } from "@/modules/auth/server";
import { getCatalogRepository } from "@/modules/catalog/server";
import { CardSetForm, GameForm } from "./_components/game-forms";

export default function AdminPage() {
  return (
    <Suspense fallback={<p className="text-foreground/60">Wird geladen …</p>}>
      <GamesAndSets />
    </Suspense>
  );
}

async function GamesAndSets() {
  await requireAdmin();
  const repository = getCatalogRepository();
  const games = await repository.listGames();
  const setsPerGame = await Promise.all(games.map((game) => repository.listCardSets(game.id)));

  return (
    <div className="flex flex-col gap-10">
      <section>
        <h1 className="text-3xl font-bold">Spiele & Sets</h1>
        {games.length === 0 ? (
          <p className="mt-4 text-foreground/60">Noch keine Spiele. Legt zuerst ein Spiel an, z. B. „Pokémon“.</p>
        ) : (
          <ul className="mt-4 grid gap-4 sm:grid-cols-2">
            {games.map((game, index) => (
              <li key={game.id} className="rounded-xl border border-foreground/10 p-4">
                <h2 className="font-semibold">{game.name}</h2>
                {setsPerGame[index].length === 0 ? (
                  <p className="mt-2 text-sm text-foreground/60">Noch keine Sets.</p>
                ) : (
                  <ul className="mt-2 text-sm text-foreground/70">
                    {setsPerGame[index].map((set) => (
                      <li key={set.id}>
                        {set.name} ({set.code}){set.releaseDate && ` · ${formatDate(set.releaseDate)}`}
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="text-xl font-semibold">Neues Spiel</h2>
        <div className="mt-3">
          <GameForm />
        </div>
      </section>

      {games.length > 0 && (
        <section>
          <h2 className="text-xl font-semibold">Neues Set</h2>
          <div className="mt-3">
            <CardSetForm games={games} />
          </div>
        </section>
      )}
    </div>
  );
}

function formatDate(isoDate: string) {
  return new Date(`${isoDate}T00:00:00`).toLocaleDateString("de-DE");
}
