import type { Metadata } from "next";
import { OperatorAddress } from "../operator-address";
import { Placeholder } from "../placeholder";

export const metadata: Metadata = {
  title: "Impressum",
  description: "Anbieterkennzeichnung von GubbyCardz.",
};

export default function ImprintPage() {
  return (
    <>
      <h1>Impressum</h1>

      <h2>Angaben gemäß § 5 DDG</h2>
      <OperatorAddress />

      <h2>Verbraucherstreitbeilegung</h2>
      <Placeholder>
        Hinweis nach § 36 VSBG, ob wir an Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle teilnehmen.
      </Placeholder>
    </>
  );
}
