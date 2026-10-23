import { SHOP_OPERATOR } from "@/modules/legal";

export function OperatorAddress() {
  const { name, street, postalCodeAndCity, country, email, phone } = SHOP_OPERATOR;
  return (
    <address className="mt-3 not-italic">
      {name}
      <br />
      {street}
      <br />
      {postalCodeAndCity}
      <br />
      {country}
      <br />
      <br />
      E-Mail: <a href={`mailto:${email}`}>{email}</a>
      <br />
      Telefon: {phone}
    </address>
  );
}
