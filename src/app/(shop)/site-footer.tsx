import Image from "next/image";
import Link from "next/link";

const SHOP_LINKS = [
  { href: "/spiele", label: "Alle Spiele" },
  { href: "/warenkorb", label: "Zum Warenkorb" },
] as const;

const LEGAL_LINKS = [
  { href: "/impressum", label: "Impressum" },
  { href: "/datenschutz", label: "Datenschutz" },
  { href: "/agb", label: "AGB" },
  { href: "/widerruf", label: "Widerrufsbelehrung" },
] as const;

export function SiteFooter() {
  return (
    // Always dark, in both color schemes – the border keeps it apart from a dark page.
    <footer className="mt-auto border-t border-white/10 bg-black text-white">
      <div className="mx-auto grid w-full max-w-6xl gap-8 px-4 py-10 sm:grid-cols-[2fr_1fr_1fr]">
        <div>
          <Image src="/brand/logo-wordmark.png" alt="GubbyCardz" width={800} height={350} className="h-14 w-auto" />
          <p className="mt-3 max-w-xs text-sm text-white/60">
            Einzelkarten, gegradete Karten, Booster, Displays und Zubehör – immer versichert verschickt.
          </p>
        </div>
        <FooterLinks title="Shop" links={SHOP_LINKS} />
        <FooterLinks title="Rechtliches" links={LEGAL_LINKS} />
      </div>
      <div className="border-t border-white/10">
        <p className="mx-auto w-full max-w-6xl px-4 py-4 text-sm text-white/60">© GubbyCardz</p>
      </div>
    </footer>
  );
}

function FooterLinks({ title, links }: { title: string; links: readonly { href: string; label: string }[] }) {
  return (
    <nav aria-label={title}>
      <h2 className="text-sm font-semibold uppercase tracking-wide">{title}</h2>
      <ul className="mt-3 flex flex-col gap-2 text-sm text-white/70">
        {links.map(({ href, label }) => (
          <li key={href}>
            <Link href={href} className="hover:text-brand-blue">
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
