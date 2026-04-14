import { deckSchema, type Deck } from "@/domain/cards";

const DECK_CODE_PREFIX = "deck://v1/";

export function encodeDeck(deck: Deck): string {
  const validDeck = deckSchema.parse(deck);
  const payload = JSON.stringify(validDeck);
  const encoded = Buffer.from(payload, "utf-8").toString("base64url");

  return `${DECK_CODE_PREFIX}${encoded}`;
}

export function decodeDeck(code: string): Deck {
  if (!code.startsWith(DECK_CODE_PREFIX)) {
    throw new Error("Invalid deck code prefix.");
  }

  const encoded = code.slice(DECK_CODE_PREFIX.length);
  const payload = Buffer.from(encoded, "base64url").toString("utf-8");
  const parsed = JSON.parse(payload) as unknown;

  return deckSchema.parse(parsed);
}
