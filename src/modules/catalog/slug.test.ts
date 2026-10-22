import { describe, expect, it } from "vitest";
import { slugSchema } from "./game";
import { toSlug } from "./slug";

describe("toSlug", () => {
  it.each([
    ["Glurak ex 199/165", "glurak-ex-199-165"],
    ["Pokémon", "pokemon"],
    ["One Piece", "one-piece"],
    ["Größe & Übersicht", "groesse-uebersicht"],
    ["  Monkey D. Luffy – OP05-119  ", "monkey-d-luffy-op05-119"],
  ])("turns %j into %j", (input, slug) => {
    expect(toSlug(input)).toBe(slug);
  });

  it("always produces valid slugs for non-empty latin input", () => {
    expect(slugSchema.safeParse(toSlug("Display OP-05 (JP)")).success).toBe(true);
  });

  it("returns an empty string when nothing usable is left", () => {
    expect(toSlug("ポケモン")).toBe("");
  });
});
