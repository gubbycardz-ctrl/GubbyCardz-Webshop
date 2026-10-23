import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { getSessionUser } from "@/modules/auth/server";
import { signOut } from "./actions";

export const metadata: Metadata = {
  title: { default: "Admin", template: "%s | Admin | GubbyCardz" },
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return (
    <div className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">
      <Suspense>
        <AdminBar />
      </Suspense>
      {children}
    </div>
  );
}

// Display only – every admin page and action still calls requireAdmin() itself.
async function AdminBar() {
  const user = await getSessionUser();
  if (!user) return null;

  return (
    <div className="mb-8 flex flex-wrap items-center justify-between gap-4 border-b border-foreground/10 pb-4 text-sm">
      <nav className="flex gap-4 font-medium">
        <Link href="/admin" className="hover:text-brand-blue">
          Spiele & Sets
        </Link>
        <Link href="/admin/produkte" className="hover:text-brand-blue">
          Produkte
        </Link>
        <Link href="/admin/bestellungen" className="hover:text-brand-blue">
          Bestellungen
        </Link>
      </nav>
      <form action={signOut} className="flex items-center gap-3">
        <span className="text-foreground/60">{user.email}</span>
        <button type="submit" className="rounded-lg border border-foreground/20 px-3 py-1.5 hover:bg-foreground/5">
          Abmelden
        </button>
      </form>
    </div>
  );
}
