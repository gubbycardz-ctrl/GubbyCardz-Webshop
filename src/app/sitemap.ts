import type { MetadataRoute } from "next";
import { connection } from "next/server";
import type { Product } from "@/modules/catalog";
import { getAccessories, getGames, getProductsOfGame } from "@/modules/catalog/server";
import { absoluteUrl } from "@/shared/site-url";

// Lists the same products the shop pages link to; reads go through the catalog cache.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Catalog data is read at request time, so `next build` never touches the database.
  await connection();
  const games = await getGames();
  const [accessories, ...productsPerGame] = await Promise.all([
    getAccessories(),
    ...games.map((game) => getProductsOfGame(game.id)),
  ]);

  return [
    { url: absoluteUrl("/") },
    { url: absoluteUrl("/spiele") },
    ...games.map((game) => ({ url: absoluteUrl(`/spiele/${game.id}`) })),
    ...uniqueSlugs([...productsPerGame.flat(), ...accessories]).map((slug) => ({
      url: absoluteUrl(`/produkte/${slug}`),
    })),
  ];
}

// Accessories for one game show up both in its list and among all accessories.
function uniqueSlugs(products: Product[]) {
  return [...new Set(products.map((product) => product.slug))];
}
