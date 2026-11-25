// Rarity is free text per game (see Projektentscheidungen), so the shop can only *estimate* how
// special a card is. The tier only drives decoration (frame color); nothing else depends on it.
export type RarityTier = "common" | "rare" | "epic";

// Order matters: the first matching group wins, so "Special Illustration Rare" is epic, not rare.
const EPIC_WORDS = ["secret", "special illustration", "hyper", "ultra", "gold", "alt art", "alternate art", "manga", "special art", "enchanted", "legendary"];
const RARE_WORDS = ["rare", "holo", "illustration", "super", "leader", "foil"];

export function rarityTier(rarity: string): RarityTier {
  const text = rarity.toLowerCase();
  // "Uncommon" contains "common" but no rarity word, so it falls through to common on purpose.
  if (EPIC_WORDS.some((word) => text.includes(word))) return "epic";
  if (RARE_WORDS.some((word) => text.includes(word))) return "rare";
  return "common";
}
