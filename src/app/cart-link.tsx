import Link from "next/link";
import { itemCount } from "@/modules/cart";
import { readCart } from "@/modules/cart/server";

const linkClass =
  "inline-flex items-center gap-2 rounded-full border border-foreground/15 px-4 py-2 transition-colors hover:border-brand-blue hover:text-brand-blue";

// Reads only the cookie (no database), so it is cheap on every page.
export async function CartLink() {
  const count = itemCount(await readCart());
  return (
    <Link href="/warenkorb" className={linkClass}>
      <CartIcon />
      Warenkorb
      {count > 0 && (
        <span className="rounded-full bg-brand-red px-1.5 py-0.5 text-xs font-semibold text-white">{count}</span>
      )}
    </Link>
  );
}

export function CartLinkFallback() {
  return (
    <Link href="/warenkorb" className={linkClass}>
      <CartIcon />
      Warenkorb
    </Link>
  );
}

function CartIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9" cy="20" r="1.5" />
      <circle cx="18" cy="20" r="1.5" />
      <path d="M2 3h3l2.6 12.2a1 1 0 0 0 1 .8h9.3a1 1 0 0 0 1-.8L20.5 7H6" />
    </svg>
  );
}
