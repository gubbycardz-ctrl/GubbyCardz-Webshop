import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { SHIPPING_COUNTRIES } from "@/modules/shipping";
import { SITE_URL } from "@/shared/site-url";
import { CartLink, CartLinkFallback } from "./cart-link";
import { SiteFooter } from "./site-footer";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  // Lets pages give canonical and Open Graph URLs as plain paths.
  metadataBase: new URL(SITE_URL),
  title: {
    default: "GubbyCardz – Trading Cards & Merchandise",
    template: "%s | GubbyCardz",
  },
  description: "Pokémon- und One-Piece-Karten: Einzelkarten, Booster, Displays und Zubehör.",
  openGraph: {
    siteName: "GubbyCardz",
    locale: "de_DE",
    type: "website",
  },
};

const SHIPPING_COUNTRY_NAMES = Object.values(SHIPPING_COUNTRIES)
  .map((country) => country.label)
  .join(" & ");

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="de"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans">
        <p className="bg-black px-4 py-2 text-center text-xs font-medium tracking-wide text-white sm:text-sm">
          Versicherter Versand · {SHIPPING_COUNTRY_NAMES}
        </p>
        <header className="sticky top-0 z-10 border-b border-foreground/10 bg-background/95 backdrop-blur">
          <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-2">
            <Link href="/" aria-label="GubbyCardz Startseite">
              <Image src="/brand/logo-wordmark.png" alt="GubbyCardz" width={800} height={350} className="h-12 w-auto sm:h-14" priority />
            </Link>
            <nav className="flex items-center gap-3 text-sm font-semibold sm:gap-5">
              <Link href="/spiele" className="uppercase tracking-wide hover:text-brand-blue">
                Spiele
              </Link>
              <Suspense fallback={<CartLinkFallback />}>
                <CartLink />
              </Suspense>
            </nav>
          </div>
        </header>
        {children}
        <SiteFooter />
      </body>
    </html>
  );
}
