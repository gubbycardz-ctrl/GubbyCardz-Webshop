import Image from "next/image";

/** Stands in for a product photo – products have no images yet. */
export function ProductImagePlaceholder({ className = "" }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={`flex items-center justify-center bg-gradient-to-br from-brand-blue/15 via-foreground/5 to-brand-red/15 ${className}`}
    >
      <Image src="/brand/logo-emblem.png" alt="" width={512} height={489} className="h-2/3 w-auto opacity-70" />
    </div>
  );
}
