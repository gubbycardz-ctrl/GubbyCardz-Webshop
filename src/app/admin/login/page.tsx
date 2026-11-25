import type { Metadata } from "next";
import { GoogleSignInButton } from "./google-sign-in-button";

export const metadata: Metadata = { title: "Sign in" };

export default function AdminLoginPage() {
  return (
    <main lang="en" className="mx-auto flex max-w-sm flex-col items-center gap-6 py-16 text-center">
      <h1 className="text-2xl font-bold">Admin sign-in</h1>
      <p className="text-foreground/60">For the GubbyCardz team only.</p>
      <GoogleSignInButton />
    </main>
  );
}
