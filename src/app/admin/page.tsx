import { Suspense } from "react";
import { requireAdmin } from "@/modules/auth/server";
import { signOut } from "./actions";

export default function AdminPage() {
  return (
    <Suspense fallback={<p className="text-foreground/60">Wird geladen …</p>}>
      <AdminHome />
    </Suspense>
  );
}

async function AdminHome() {
  const admin = await requireAdmin();

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-3xl font-bold">Admin-Bereich</h1>
        <form action={signOut} className="flex items-center gap-3 text-sm">
          <span className="text-foreground/60">{admin.email}</span>
          <button type="submit" className="rounded-lg border border-foreground/20 px-3 py-1.5 hover:bg-foreground/5">
            Abmelden
          </button>
        </form>
      </div>
      <p className="mt-6 text-foreground/60">
        Hier könnt ihr bald Spiele, Sets, Produkte und Angebote verwalten.
      </p>
    </>
  );
}
