import type { ReactNode } from "react";
import { ShopFrame } from "./shop-frame";

export default function ShopLayout({ children }: { children: ReactNode }) {
  return <ShopFrame>{children}</ShopFrame>;
}
