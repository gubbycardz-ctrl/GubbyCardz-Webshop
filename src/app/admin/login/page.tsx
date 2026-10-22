import type { Metadata } from "next";
import { GoogleSignInButton } from "./google-sign-in-button";

export const metadata: Metadata = { title: "Anmelden" };

export default function AdminLoginPage() {
  return (
    <main className="mx-auto flex max-w-sm flex-col items-center gap-6 py-16 text-center">
      <h1 className="text-2xl font-bold">Admin-Anmeldung</h1>
      <p className="text-foreground/60">Nur für das GubbyCardz-Team.</p>
      <GoogleSignInButton />
    </main>
  );
}
