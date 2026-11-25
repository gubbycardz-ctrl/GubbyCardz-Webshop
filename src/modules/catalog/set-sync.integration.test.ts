import { deleteApp, initializeApp, type App } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { CatalogRepository } from ".";
import { createFirestoreCatalogRepository } from "./firestore-catalog-repository";
import { previewSetSync, runSetSync } from "./set-sync-run";
import type { GetJson } from "./set-sources/tcgdex-pokemon";

const PROJECT_ID = "demo-gubbycardz";
const TODAY = "2026-11-25";

// What the source answers: five international sets, two Japanese ones, everything else empty.
const responses: Record<string, unknown> = {
  "en/series/sv": { name: "Scarlet & Violet", sets: [{ id: "sv01", name: "Scarlet & Violet" }, { id: "sv03.5", name: "151" }, { id: "svp", name: "SVP Black Star Promos" }] },
  "de/series/sv": { name: "Karmesin & Purpur", sets: [{ id: "sv01", name: "Karmesin & Purpur" }] },
  "ja/series/SV": { name: "SV", sets: [{ id: "SV1S", name: "スカーレットex" }] },
  "en/series/swsh": { name: "Sword & Shield", sets: [] },
  "de/series/swsh": { name: "Schwert & Schild", sets: [] },
  "ja/series/S": { name: "S", sets: [] },
  "en/series/me": { name: "Mega Evolution", sets: [{ id: "me01", name: "Mega Evolution" }] },
  "de/series/me": { name: "Mega-Entwicklung", sets: [] },
  "ja/series/M": { name: "M", sets: [] },
  "en/sets/sv01": { id: "sv01", name: "Scarlet & Violet", releaseDate: "2023-03-31", abbreviation: { official: "SVI" } },
  "en/sets/sv03.5": { id: "sv03.5", name: "151", releaseDate: "2023-09-22", abbreviation: { official: "MEW" } },
  "en/sets/svp": { id: "svp", name: "SVP Black Star Promos", releaseDate: "2023-03-31" },
  "en/sets/me01": { id: "me01", name: "Mega Evolution", releaseDate: "2027-03-05", abbreviation: { official: "MEG" } },
  "ja/sets/SV1S": { id: "SV1S", name: "スカーレットex", releaseDate: "2023-01-20" },
};
const getJson: GetJson = async (url) => {
  const key = url.replace("https://api.tcgdex.net/v2/", "");
  if (!(key in responses)) throw new Error(`unexpected request ${key}`);
  return responses[key];
};
const SET_COUNT = 5;

const op = (cat: string, title: string, date: string, href = "") =>
  `<li data-cat="${cat}"><a href="${href}"><h4 class="linkListColTitle">${title}</h4><time datetime="${date}">x</time></a></li>`;
const onePiecePages: Record<string, string> = {
  "boosters&page=1": `<ul>${op("boosters", "BOOSTER PACK -COME IN, WORLD- [OP-19]", "2027-03-05", "https://en.onepiece-cardgame.com/products/op19.html")}${op("boosters", "BOOSTER PACK -Awakening of the New Era- [OP-05]", "2023-12-08")}${op("boosters", "Treasure Boosters Set", "2024-08-30")}</ul>`,
  "boosters&page=2": "<ul></ul>",
  "decks&page=1": `<ul>${op("decks", "STARTER DECK -Egghead- [ST-29]", "2026-01-16")}</ul>`,
  "decks&page=2": "<ul></ul>",
};
const getText = async (url: string) => {
  if (url.endsWith("/products/op19.html")) return "<dl><dt>Pre-Release Date</dt><dd>February 26, 2027</dd></dl>";
  const page = url.match(/subcategory=(\w+&page=\d+)/)?.[1];
  if (!page || !(page in onePiecePages)) throw new Error(`unexpected request ${url}`);
  return onePiecePages[page];
};

let app: App;
let repository: CatalogRepository;

beforeAll(() => {
  if (!process.env.FIRESTORE_EMULATOR_HOST) {
    throw new Error("Firestore emulator not running – use `npm run test:integration`");
  }
  app = initializeApp({ projectId: PROJECT_ID }, "set-sync-integration-test");
  repository = createFirestoreCatalogRepository(getFirestore(app));
});

beforeEach(async () => {
  await fetch(
    `http://${process.env.FIRESTORE_EMULATOR_HOST}/emulator/v1/projects/${PROJECT_ID}/databases/(default)/documents`,
    { method: "DELETE" },
  );
});

afterAll(async () => {
  await deleteApp(app);
});

const deps = () => ({ repository, getJson, today: TODAY });

describe("set sync", () => {
  it("previews without writing, then creates game and sets, and a repeat run changes nothing", async () => {
    const preview = await previewSetSync("pokemon", deps());
    expect(preview).toMatchObject({ ok: true, newGame: true });
    expect(preview.ok && preview.rows.map((row) => row.status)).toEqual(Array(SET_COUNT).fill("create"));
    expect(await repository.listGames()).toEqual([]);

    const applied = await runSetSync("pokemon", deps());
    expect(applied).toMatchObject({ ok: true, written: { sets: SET_COUNT, failures: [] } });
    expect(await repository.listGames()).toEqual([{ id: "pokemon", name: "Pokémon" }]);

    const sets = await repository.listCardSets("pokemon");
    expect(sets).toHaveLength(SET_COUNT);
    expect(sets.find((set) => set.id === "pokemon-sv01")).toMatchObject({
      code: "SVI",
      nameEn: "Scarlet & Violet",
      nameDe: "Karmesin & Purpur",
      era: "Scarlet & Violet",
      setType: "main",
      region: "international",
      status: "released",
      source: "tcgdex",
      verifiedAt: TODAY,
    });
    // A set that is not out yet is kept as announced, so the shop can prepare for it.
    expect(sets.find((set) => set.id === "pokemon-me01")).toMatchObject({ status: "announced", releaseDate: "2027-03-05" });
    expect(sets.find((set) => set.id === "pokemon-jp-sv1s")).toMatchObject({ region: "japan", nameJa: "スカーレットex", code: "SV1S" });

    const again = await runSetSync("pokemon", deps());
    expect(again).toMatchObject({ ok: true, newGame: false, written: { sets: 0, failures: [] } });
    expect(again.ok && again.rows.every((row) => row.status === "unchanged")).toBe(true);
    expect(await repository.listCardSets("pokemon")).toHaveLength(SET_COUNT);
  }, 30_000);

  it("completes a hand-made set without touching its name, its products or its stock", async () => {
    await repository.saveGame({ id: "pokemon", name: "pokemon" });
    await repository.saveCardSet({ id: "pokemon-svi", gameId: "pokemon", name: "Karmesin & Purpur", code: "SVI", releaseDate: "2023-03-31" });
    await repository.saveProduct({ id: "p1", kind: "sealed", category: "tin", name: "Tin", slug: "tin", gameId: "pokemon", setId: "pokemon-svi" });
    await repository.saveOffer({ id: "o1", productId: "p1", type: "sealed", language: "de", priceCents: 1999, stock: 3, taxScheme: "standard" });

    const applied = await runSetSync("pokemon", deps());
    expect(applied).toMatchObject({ ok: true, newGame: false, written: { failures: [] } });

    const sets = await repository.listCardSets("pokemon");
    // The existing set took the place of sv01 – no duplicate.
    expect(sets).toHaveLength(SET_COUNT);
    const mine = sets.find((set) => set.id === "pokemon-svi");
    expect(mine).toMatchObject({ name: "Karmesin & Purpur", code: "SVI", era: "Scarlet & Violet", nameEn: "Scarlet & Violet", sourceId: "tcgdex:en/sv01" });
    expect(mine).not.toHaveProperty("source");
    expect(await repository.getProductById("p1")).toMatchObject({ setId: "pokemon-svi" });
    expect((await repository.getOffersByIds(["o1"]))[0].stock).toBe(3);
    expect((await repository.listGames())[0].name).toBe("pokemon");
    expect(await repository.countProductsBySet(["pokemon-svi", "pokemon-sv03-5"])).toEqual(new Map([["pokemon-svi", 1], ["pokemon-sv03-5", 0]]));
  }, 30_000);

  it("does not write sets the source contradicts itself about", async () => {
    const twins = {
      ...responses,
      "ja/series/SV": { name: "SV", sets: [{ id: "SV1S", name: "スカーレットex" }, { id: "CS1a", name: "ダブル" }, { id: "CS1b", name: "ダブル" }] },
      "ja/sets/CS1a": { id: "CS1a", name: "ダブル", releaseDate: "2024-04-26" },
      "ja/sets/CS1b": { id: "CS1b", name: "ダブル", releaseDate: "2024-04-26" },
    };
    const twinJson: GetJson = async (url) => {
      const key = url.replace("https://api.tcgdex.net/v2/", "");
      if (!(key in twins)) throw new Error(`unexpected request ${key}`);
      return (twins as Record<string, unknown>)[key];
    };
    const applied = await runSetSync("pokemon", { repository, getJson: twinJson, today: TODAY });
    expect(applied).toMatchObject({ ok: true, written: { sets: SET_COUNT, failures: [] } });
    expect(applied.ok && applied.rows.filter((row) => row.status === "conflict").map((row) => row.code).sort()).toEqual(["CS1a", "CS1b"]);
    expect((await repository.listCardSets("pokemon")).map((set) => set.code)).not.toContain("CS1a");
  }, 30_000);

  it("syncs One Piece next to an existing TCG and hand-made set, keeping both and creating no twins", async () => {
    await repository.saveGame({ id: "one-piece", name: "One Piece" });
    await repository.saveCardSet({ id: "op05", gameId: "one-piece", name: "Awakening of the New Era", code: "OP-05", releaseDate: "2023-12-08" });

    const applied = await runSetSync("one-piece", { repository, getJson, getText, today: TODAY });
    expect(applied).toMatchObject({ ok: true, newGame: false, written: { failures: [] } });

    const sets = await repository.listCardSets("one-piece");
    expect(sets.map((set) => set.code).sort()).toEqual(["OP-05", "OP19", "ST29"]);
    expect(await repository.listGames()).toEqual([{ id: "one-piece", name: "One Piece" }]);
    expect(sets.find((set) => set.code === "OP19")).toMatchObject({ status: "announced", releaseDate: "2027-03-05", preReleaseDate: "2027-02-26", era: "Booster Packs" });
    expect(sets.find((set) => set.code === "ST29")).toMatchObject({ setType: "starter", era: "Starter Decks", status: "released" });
    // The hand-made set was completed, not replaced and not adopted by the source.
    const mine = sets.find((set) => set.id === "op05");
    expect(mine).toMatchObject({ name: "Awakening of the New Era", code: "OP-05", era: "Booster Packs", setType: "main" });
    expect(mine).not.toHaveProperty("source");
    expect(applied.ok && applied.rows.filter((row) => row.status === "skipped").map((row) => row.name)).toEqual(["Treasure Boosters Set"]);

    const again = await runSetSync("one-piece", { repository, getJson, getText, today: TODAY });
    expect(again).toMatchObject({ ok: true, written: { sets: 0 } });
  }, 30_000);

  it("recognizes a TCG that exists under another spelling instead of creating a twin", async () => {
    await repository.saveGame({ id: "disney-lorcana", name: "Disney Lorcana" });
    const lorcast = { results: [{ name: "The First Chapter", code: "1", released_at: "2023-08-18", prereleased_at: "2023-08-18" }] };
    const result = await runSetSync("lorcana", { repository, getJson: async () => lorcast, today: TODAY });
    expect(result).toMatchObject({ ok: true, newGame: false, written: { sets: 1 } });
    expect(await repository.listGames()).toEqual([{ id: "disney-lorcana", name: "Disney Lorcana" }]);
    expect((await repository.listCardSets("disney-lorcana")).map((set) => set.name)).toEqual(["The First Chapter"]);
  }, 30_000);

  it("writes nothing and says so when the source is not reachable", async () => {
    const failing = async () => Promise.reject(new Error("HTTP 503"));
    const result = await runSetSync("pokemon", { repository, getJson: failing, today: TODAY });
    expect(result).toMatchObject({ ok: false });
    expect(!result.ok && result.error).toContain("Nothing was changed");
    expect(await repository.listGames()).toEqual([]);
  });
});
