import { SHIPPING_NOTE, TAX_NOTE } from "@/modules/pricing";

/** Legally required next to every price shown to consumers. */
export function PriceNote({ className = "" }: { className?: string }) {
  return (
    <p className={`text-sm text-foreground/60 ${className}`}>
      {TAX_NOTE} {SHIPPING_NOTE}.
    </p>
  );
}
