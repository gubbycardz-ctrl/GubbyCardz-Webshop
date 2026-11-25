import Link from "next/link";
import { itemCount } from "@/modules/cart";
import { readCart } from "@/modules/cart/server";
import { CartIcon } from "./icons";

const linkClass =
  "flex items-center gap-2 rounded-full border border-foreground/15 px-4 py-2 transition-colors hover:border-brand-blue hover:text-brand-blue";

// Reads only the cookie (no database), so it is cheap on every page.
export async function CartLink() {
  const count = itemCount(await readCart());
  return (
    <Link href="/warenkorb" className={linkClass}>
      <CartIcon className="size-5" />
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
      <CartIcon className="size-5" />
      Warenkorb
    </Link>
  );
}
