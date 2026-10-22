import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-center justify-center gap-4 px-4 py-16 text-center">
      <h1 className="text-3xl font-bold">Seite nicht gefunden</h1>
      <p className="text-foreground/60">Diese Seite gibt es nicht (mehr).</p>
      <Link href="/spiele" className="font-medium text-brand-blue hover:underline">
        Zum Sortiment
      </Link>
    </main>
  );
}
