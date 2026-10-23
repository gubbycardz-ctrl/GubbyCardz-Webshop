import Link from "next/link";

const LEGAL_LINKS = [
  { href: "/impressum", label: "Impressum" },
  { href: "/datenschutz", label: "Datenschutz" },
  { href: "/agb", label: "AGB" },
  { href: "/widerruf", label: "Widerrufsbelehrung" },
] as const;

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-foreground/10">
      <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center justify-between gap-4 px-4 py-6 text-sm text-foreground/60">
        <p>© GubbyCardz</p>
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
      </div>
    </footer>
  );
}
