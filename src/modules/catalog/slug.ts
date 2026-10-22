const GERMAN_LETTERS: Record<string, string> = { ä: "ae", ö: "oe", ü: "ue", ß: "ss" };

/** Builds a URL-safe slug, e.g. "Pokémon Glurak ex 199/165" → "pokemon-glurak-ex-199-165". */
export function toSlug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[äöüß]/g, (letter) => GERMAN_LETTERS[letter])
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
