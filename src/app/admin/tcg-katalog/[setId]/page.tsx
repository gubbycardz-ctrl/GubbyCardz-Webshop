import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { requireAdmin } from "@/modules/auth/server";
import { SET_REGIONS } from "@/modules/catalog";
import { getCatalogRepository } from "@/modules/catalog/server";
import { SetEditForm } from "./set-edit-form";

export const metadata: Metadata = { title: "Edit set" };

export default function EditSetPage({ params }: PageProps<"/admin/tcg-katalog/[setId]">) {
  return (
    <Suspense fallback={<p className="text-foreground/60">Loading …</p>}>
      <EditSet params={params} />
    </Suspense>
  );
}

async function EditSet({ params }: Pick<PageProps<"/admin/tcg-katalog/[setId]">, "params">) {
  await requireAdmin();
  const { setId } = await params;
  const repository = getCatalogRepository();
  const set = await repository.getCardSet(setId);
  if (!set) notFound();
  const game = (await repository.listGames()).find((candidate) => candidate.id === set.gameId);

  return (
    <div className="flex flex-col gap-6">
      <section>
        <Link href={`/admin/tcg-katalog?spiel=${set.gameId}`} className="text-sm text-foreground/60 hover:text-brand-blue">
          ← TCG Catalog
        </Link>
        <h1 className="mt-2 text-3xl font-bold">{set.nameEn ?? set.name}</h1>
        <p className="mt-1 text-sm text-foreground/60">
          {game?.name ?? set.gameId} · {SET_REGIONS[set.region ?? "international"]}
          {set.source && ` · kept up to date from ${set.source}`}
        </p>
        <p className="mt-2 max-w-2xl text-sm text-foreground/70">
          Saving takes this set over: the catalog sync can still fill in empty fields, but it no longer overwrites what you enter here.
        </p>
      </section>
      <SetEditForm set={set} />
    </div>
  );
}
