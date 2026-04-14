import { describe, expect, it } from "vitest";
import { decodeDeck, encodeDeck } from "@/lib/deck-code";
import { starterDecks } from "@/domain/fixtures";

describe("deck-code", () => {
  it("round-trips a valid deck", () => {
    const sourceDeck = starterDecks[0];
    const code = encodeDeck(sourceDeck);
    const decoded = decodeDeck(code);

    expect(decoded).toEqual(sourceDeck);
  });

  it("throws on invalid code prefix", () => {
    expect(() => decodeDeck("invalid://payload")).toThrow("Invalid deck code prefix");
  });
});
