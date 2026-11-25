import type { Metadata } from "next";
import { OperatorAddress } from "../operator-address";
import { Placeholder } from "../placeholder";

export const metadata: Metadata = {
  title: "Widerrufsbelehrung",
  description: "Widerrufsbelehrung und Muster-Widerrufsformular von GubbyCardz.",
};

export default function WithdrawalPage() {
  return (
    <>
      <h1>Widerrufsbelehrung</h1>

      <h2>Widerrufsrecht</h2>
      <Placeholder>
        Amtliche Muster-Widerrufsbelehrung für Warenlieferungen (Anlage 1 zu Art. 246a § 1 Abs. 2 EGBGB) in der aktuellen
        Fassung.
      </Placeholder>

      <h2>Widerruf an</h2>
      <OperatorAddress />

      <h2>Muster-Widerrufsformular</h2>
      <Placeholder>Muster-Widerrufsformular (Anlage 2 zu Art. 246a § 1 Abs. 2 EGBGB).</Placeholder>
    </>
  );
}
