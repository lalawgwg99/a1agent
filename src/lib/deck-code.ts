import { deckSchema, type Deck } from "@/domain/cards";

const DECK_CODE_PREFIX = "deck://v1/";

function bytesToBase64Url(bytes: Uint8Array): string {
  if (typeof window === "undefined") {
    return Buffer.from(bytes).toString("base64url");
  }

  const binary = Array.from(bytes)
    .map((byte) => String.fromCharCode(byte))
    .join("");
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/g, "");
}

function base64UrlToBytes(base64Url: string): Uint8Array {
  if (typeof window === "undefined") {
    return new Uint8Array(Buffer.from(base64Url, "base64url"));
  }

  const normalized = base64Url.replaceAll("-", "+").replaceAll("_", "/");
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
  const binary = atob(padded);
  return new Uint8Array(Array.from(binary).map((char) => char.charCodeAt(0)));
}

export function encodeDeck(deck: Deck): string {
  const validDeck = deckSchema.parse(deck);
  const payload = JSON.stringify(validDeck);
  const encoded = bytesToBase64Url(new TextEncoder().encode(payload));

  return `${DECK_CODE_PREFIX}${encoded}`;
}

export function decodeDeck(code: string): Deck {
  if (!code.startsWith(DECK_CODE_PREFIX)) {
    throw new Error("Invalid deck code prefix.");
  }

  const encoded = code.slice(DECK_CODE_PREFIX.length);
  const payload = new TextDecoder().decode(base64UrlToBytes(encoded));
  const parsed = JSON.parse(payload) as unknown;

  return deckSchema.parse(parsed);
}
