import Link from "next/link";
import { ShopFrame } from "./(shop)/shop-frame";

// Lives above the shop layout (it also answers addresses that match no route), so it brings its own frame.
export default function NotFound() {
  return (
    <ShopFrame>
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-center justify-center gap-4 px-4 py-16 text-center">
        <h1 className="text-3xl font-bold">Seite nicht gefunden</h1>
        <p className="text-foreground/60">Diese Seite gibt es nicht (mehr).</p>
        <Link href="/spiele" className="font-medium text-brand-blue hover:underline">
          Zum Sortiment
        </Link>
      </main>
    </ShopFrame>
  );
}
