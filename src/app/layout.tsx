import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { SITE_URL } from "@/shared/site-url";
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
        {children}
      </body>
    </html>
  );
}
