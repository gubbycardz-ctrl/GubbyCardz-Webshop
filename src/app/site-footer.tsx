import Image from "next/image";
import Link from "next/link";

const LEGAL_LINKS = [
  { href: "/impressum", label: "Impressum" },
  { href: "/datenschutz", label: "Datenschutz" },
  { href: "/agb", label: "AGB" },
  { href: "/widerruf", label: "Widerrufsbelehrung" },
] as const;

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-foreground/10 bg-surface/60">
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-x-8 gap-y-6 px-4 py-8 text-sm text-foreground/60">
        <div className="flex max-w-sm flex-col gap-3">
          <Image src="/brand/logo-wordmark.png" alt="" width={800} height={350} className="h-10 w-auto self-start" />
          <p>Sammelkarten, Sealed-Produkte und Zubehör – immer versichert verschickt.</p>
        </div>
        <div className="flex flex-col gap-3 sm:items-end">
          <nav aria-label="Rechtliches">
            <ul className="flex flex-wrap gap-x-5 gap-y-2">
              {LEGAL_LINKS.map(({ href, label }) => (
                <li key={href}>
                  <Link href={href} className="hover:text-brand-blue">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <p>© GubbyCardz</p>
        </div>
      </div>
    </footer>
  );
}
