// Shared frame for Impressum, Datenschutz, AGB and Widerruf. The route group keeps their URLs short (/impressum …).
export default function LegalLayout({ children }: LayoutProps<"/">) {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-10 [&_a]:text-brand-blue [&_a]:underline [&_h1]:text-3xl [&_h1]:font-bold [&_h2]:mt-8 [&_h2]:text-xl [&_h2]:font-semibold [&_li]:mt-1 [&_p]:mt-3 [&_ul]:mt-3 [&_ul]:list-disc [&_ul]:pl-6">
      {/* Remove once every <Placeholder> has been replaced by the final legal texts. */}
      <p role="note" className="mb-8 rounded-lg bg-brand-red/10 px-4 py-3 text-sm">
        <strong>Entwurf:</strong> Diese Seite wird gerade vervollständigt. Rot markierte Stellen sind noch Platzhalter.
      </p>
      {children}
    </main>
  );
}
