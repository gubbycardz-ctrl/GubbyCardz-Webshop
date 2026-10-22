import { z } from "zod";
import { slugSchema } from "./game";

// A product is *what* exists (e.g. "Charizard ex 199/165"). Price, stock,
// condition and language belong to the offers for that product.
const productBase = z.object({
  id: z.string().min(1),
  name: z.string().trim().min(1),
  slug: slugSchema,
});

const singleCardSchema = productBase.extend({
  kind: z.literal("single"),
  gameId: slugSchema,
  setId: z.string().min(1),
  collectorNumber: z.string().trim().min(1),
  // Free text: rarity names differ per game and change with every era.
  rarity: z.string().trim().min(1),
});

const sealedProductSchema = productBase.extend({
  kind: z.literal("sealed"),
  gameId: slugSchema,
  // Optional because some sealed products (e.g. collection boxes) span several sets.
  setId: z.string().min(1).optional(),
});

const accessorySchema = productBase.extend({
  kind: z.literal("accessory"),
  // Optional because most accessories (sleeves, binders) fit every game.
  gameId: slugSchema.optional(),
});

export const productSchema = z.discriminatedUnion("kind", [
  singleCardSchema,
  sealedProductSchema,
  accessorySchema,
]);

export type Product = z.infer<typeof productSchema>;
export type ProductKind = Product["kind"];
