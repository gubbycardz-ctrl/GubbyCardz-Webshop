import { describe, expect, it } from "vitest";
import type { GetText } from "./fetchers";
import { fetchOnePieceSets, parsePreReleaseDate, parseProductList, parseProductTitle, toDisplayName } from "./onepiece-official";

const SITE = "https://en.onepiece-cardgame.com";

function listPage(entries: { cat: string; title: string; href?: string; date: string }[]) {
  const items = entries
    .map(
      ({ cat, title, href = "", date }) => `
      <li data-cat="${cat}">
        <a href="${href}" class="linkListColItem">
          <div class="linkListColDetail">
            <h4 class="linkListColTitle">${title}</h4>
            <p class="linkListColDate"><span class="head">Release Date</span><time class="newsDate" datetime="${date}">x</time></p>
          </div>
        </a>
      </li>`,
    )
    .join("");
  return `<html><body><ul>${items}</ul></body></html>`;
}

describe("parseProductTitle", () => {
  it.each([
    ["BOOSTER PACK -COME IN, WORLD- [OP-19]", "OP19", "COME IN, WORLD", false],
    ["BOOSTER PACK -ROMANCE DAWN- [OP-01]", "OP01", "ROMANCE DAWN", false],
    ["BOOSTER PACK -Awakening of the New Era- [OP-05]", "OP05", "Awakening of the New Era", false],
    ["BOOSTER PACK -THE AZURE SEA’S SEVEN- [OP14-EB04]", "OP14-EB04", "THE AZURE SEA’S SEVEN", false],
    ["EXTRA BOOSTER -EAST BLUE- [EB-06]", "EB06", "EAST BLUE", false],
    ["PREMIUM BOOSTER -ONE PIECE CARD THE BEST vol.2- [PRB-02]", "PRB02", "ONE PIECE CARD THE BEST vol.2", false],
    ["PREMIUM EXTRA BOOSTER -THE DRAWING OF YOUR DREAMS- [PEB-01]", "PEB01", "THE DRAWING OF YOUR DREAMS", false],
    ["STARTER DECK -Straw Hat Crew- [ST-01 PRE]", "ST01", "Straw Hat Crew", true],
    ["STARTER DECK ONE PIECE FILM edition【ST-05】", "ST05", "ONE PIECE FILM edition", false],
    ["STARTER DECK EX -GEAR5- [ST-21]", "ST21", "GEAR5", false],
    ["ULTRA DECK -The Three Captains- [ST-10]", "ST10", "The Three Captains", false],
    ["Set Sail Deck Set [SD-01]", "SD01", "Set Sail Deck Set", false],
  ])("reads %s", (title, code, name, preRelease) => {
    expect(parseProductTitle(title)).toEqual({ code, name, preRelease });
  });

  it("returns null for products without a set code", () => {
    expect(parseProductTitle("Treasure Boosters Set")).toBeNull();
    expect(parseProductTitle("Learn Together Deck Set")).toBeNull();
  });
});

describe("toDisplayName", () => {
  it("sets shouted names in normal capitals and leaves mixed-case names alone", () => {
    expect(toDisplayName("COME IN, WORLD")).toBe("Come in, World");
    expect(toDisplayName("500 YEARS IN THE FUTURE")).toBe("500 Years in the Future");
    expect(toDisplayName("THE AZURE SEA’S SEVEN")).toBe("The Azure Sea’s Seven");
    expect(toDisplayName("GREEN/YELLOW Yamato")).toBe("Green/Yellow Yamato");
    expect(toDisplayName("ONE PIECE CARD THE BEST vol.2")).toBe("One Piece Card the Best vol.2");
    expect(toDisplayName("Awakening of the New Era")).toBe("Awakening of the New Era");
    expect(toDisplayName("GEAR5")).toBe("GEAR5");
  });
});

describe("parsePreReleaseDate", () => {
  it("reads the date from the product page", () => {
    const html = "<dl><dt>Pre-Release Date</dt><dd>February 26, 2027</dd></dl><dl><dt>Release Date</dt><dd><p>March 5, 2027</p></dd></dl>";
    expect(parsePreReleaseDate(html)).toBe("2027-02-26");
  });

  it("returns null when there is none", () => {
    expect(parsePreReleaseDate("<dl><dt>Release Date</dt><dd>November 7, 2025</dd></dl>")).toBeNull();
  });
});

describe("parseProductList", () => {
  it("reads title, link and release date of every entry", () => {
    const html = listPage([{ cat: "boosters", title: "BOOSTER PACK -COME IN, WORLD- [OP-19]", href: `${SITE}/products/op19.html`, date: "2027-03-05" }]);
    expect(parseProductList(html)).toEqual([{ title: "BOOSTER PACK -COME IN, WORLD- [OP-19]", href: `${SITE}/products/op19.html`, releaseDate: "2027-03-05" }]);
  });
});

describe("fetchOnePieceSets", () => {
  const op19 = { cat: "boosters", title: "BOOSTER PACK -COME IN, WORLD- [OP-19]", href: `${SITE}/products/op19.html`, date: "2027-03-05" };
  const op13 = { cat: "boosters", title: "BOOSTER PACK -CARRYING ON HIS WILL- [OP-13]", date: "2025-11-07" };
  const op01 = { cat: "boosters", title: "BOOSTER PACK -ROMANCE DAWN- [OP-01]", href: `${SITE}/products/boosters/op01.php`, date: "2022-12-02" };
  const combined = { cat: "boosters", title: "BOOSTER PACK -THE AZURE SEA’S SEVEN- [OP14-EB04]", date: "2026-01-16" };
  const treasure = { cat: "boosters", title: "Treasure Boosters Set", date: "2024-08-30" };
  const st01pre = { cat: "decks", title: "STARTER DECK -Straw Hat Crew- [ST-01 PRE]", date: "2022-09-30" };
  const st01 = { cat: "decks", title: "STARTER DECK -Straw Hat Crew- [ST-01]", date: "2022-12-02" };
  const st38 = { cat: "decks", title: "STARTER DECK -Baroque Works- [ST-38]", href: `${SITE}/products/st38.html`, date: "2026-12-18" };

  const pages: Record<string, string> = {
    "boosters&page=1": listPage([op19, op13, treasure, combined]),
    "boosters&page=2": listPage([op01]),
    "boosters&page=3": listPage([op01]),
    "decks&page=1": listPage([st38, st01, st01pre]),
    "decks&page=2": "<html><body><ul></ul></body></html>",
  };
  const products: Record<string, string> = {
    [`${SITE}/products/op19.html`]: "<dl><dt>Pre-Release Date</dt><dd>February 26, 2027</dd></dl>",
    [`${SITE}/products/st38.html`]: "<dl><dt>Release Date</dt><dd>December 18, 2026</dd></dl>",
  };

  function source() {
    const calls: string[] = [];
    const getText: GetText = async (url) => {
      calls.push(url);
      const list = url.match(/subcategory=(\w+&page=\d+)/)?.[1];
      const body = list ? pages[list] : products[url];
      if (body === undefined) throw new Error(`unexpected request ${url}`);
      return body;
    };
    return { getText, calls };
  }

  it("collects boosters and decks over all pages, newest first (same day: by code), with line, type and codes", async () => {
    const { sets } = await fetchOnePieceSets(source().getText, { today: "2026-11-25" });
    expect(sets.map((set) => set.code)).toEqual(["OP19", "ST38", "OP14-EB04", "OP13", "OP01", "ST01", "ST01-PRE"]);
    expect(sets.find((set) => set.code === "OP19")).toEqual({
      id: "one-piece-op19",
      gameId: "one-piece",
      source: "onepiece",
      sourceId: "onepiece:OP19",
      region: "international",
      code: "OP19",
      name: "Come in, World",
      nameEn: "Come in, World",
      era: "Booster Packs",
      setType: "main",
      releaseDate: "2027-03-05",
      preReleaseDate: "2027-02-26",
    });
    expect(sets.find((set) => set.code === "ST38")).toMatchObject({ era: "Starter Decks", setType: "starter" });
  });

  it("keeps a combined release as one set under its official code", async () => {
    const { sets } = await fetchOnePieceSets(source().getText, { today: "2026-11-25" });
    expect(sets.find((set) => set.code === "OP14-EB04")).toMatchObject({ id: "one-piece-op14-eb04", setType: "main", era: "Booster Packs", name: "The Azure Sea’s Seven" });
  });

  it("lists the pre-release edition of a starter deck apart from the normal one", async () => {
    const { sets } = await fetchOnePieceSets(source().getText, { today: "2026-11-25" });
    expect(sets.find((set) => set.code === "ST01-PRE")).toMatchObject({ name: "Straw Hat Crew (Pre-Release Version)", releaseDate: "2022-09-30" });
    expect(sets.find((set) => set.code === "ST01")).toMatchObject({ name: "Straw Hat Crew", releaseDate: "2022-12-02" });
  });

  it("leaves out products without a set code and says so", async () => {
    const { skipped } = await fetchOnePieceSets(source().getText, { today: "2026-11-25" });
    expect(skipped).toEqual([{ name: "Treasure Boosters Set", reason: "No set code in the title" }]);
  });

  it("asks for product pages only for new or upcoming sets, and stops at the last list page", async () => {
    const { getText, calls } = source();
    await fetchOnePieceSets(getText, { today: "2026-11-25" });
    expect(calls.filter((url) => !url.includes("subcategory"))).toEqual([`${SITE}/products/op19.html`, `${SITE}/products/st38.html`].sort((a, b) => calls.indexOf(a) - calls.indexOf(b)));
    expect(calls.some((url) => url.includes("op01.php"))).toBe(false);
    expect(calls.some((url) => url.includes("boosters&page=4"))).toBe(false);
  });

  it("fails loudly when the site layout no longer matches", async () => {
    const getText: GetText = async () => "<html><body>maintenance</body></html>";
    await expect(fetchOnePieceSets(getText, { today: "2026-11-25" })).rejects.toThrow("Unexpected data for the boosters list");
  });
});
