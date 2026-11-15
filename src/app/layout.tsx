import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
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

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="de"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans">
        <p className="bg-brand-blue px-4 py-1.5 text-center text-xs font-semibold text-white">
          Immer versichert verschickt · Versand nach Deutschland und in die Niederlande
        </p>
        <header className="sticky top-0 z-40 border-b border-foreground/10 bg-background/80 backdrop-blur">
          <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-2.5">
            <Link href="/" aria-label="GubbyCardz Startseite">
              <Image src="/brand/logo-wordmark.png" alt="GubbyCardz" width={800} height={350} className="h-12 w-auto" priority />
            </Link>
            <nav className="flex items-center gap-3 text-sm font-medium sm:gap-5">
              <Link href="/spiele" className="px-1 py-2 hover:text-brand-blue">
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
