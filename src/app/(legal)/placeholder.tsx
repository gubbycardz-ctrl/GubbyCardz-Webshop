// Marks text the shop owner (or a legal text service) still has to supply – nothing marked like this may go live.
export function Placeholder({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-lg border border-dashed border-brand-red/60 px-4 py-3 text-sm text-brand-red">
      Platzhalter: {children}
    </p>
  );
}
