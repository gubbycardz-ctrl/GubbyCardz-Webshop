import Link from "next/link";
import { itemCount } from "@/modules/cart";
import { readCart } from "@/modules/cart/server";

const linkClass = "hover:text-brand-blue";

// Reads only the cookie (no database), so it is cheap on every page.
export async function CartLink() {
  const count = itemCount(await readCart());
  return (
    <Link href="/warenkorb" className={linkClass}>
      Warenkorb
      {count > 0 && (
        <span className="ml-1.5 rounded-full bg-brand-red px-1.5 py-0.5 text-xs font-semibold text-white">{count}</span>
      )}
    </Link>
  );
}

export function CartLinkFallback() {
  return (
    <Link href="/warenkorb" className={linkClass}>
      Warenkorb
    </Link>
  );
}
