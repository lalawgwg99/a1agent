import { describe, expect, it } from "vitest";
import { compileDeckWithDiagnostics } from "@/domain/compile";
import { starterDecks } from "@/domain/fixtures";

describe("compileDeckWithDiagnostics", () => {
  it("returns valid output for starter deck", () => {
    const result = compileDeckWithDiagnostics(starterDecks[0]);

    expect(result.isValid).toBe(true);
    expect(result.errors).toEqual([]);
    expect(result.output?.effectiveModel.model).toBeTruthy();
    expect(result.soulMarkdown?.includes("# SOUL")).toBe(true);
  });

  it("returns errors when model card is missing", () => {
    const deckWithoutModel = {
      ...starterDecks[0],
      cards: starterDecks[0].cards.filter((card) => card.type !== "model"),
    };

    const result = compileDeckWithDiagnostics(deckWithoutModel);

    expect(result.isValid).toBe(false);
    expect(result.errors.some((error) => error.includes("Model card"))).toBe(true);
    expect(result.output).toBeNull();
  });

  it("returns warning when multiple model cards exist", () => {
    const deckWithTwoModels = {
      ...starterDecks[0],
      cards: [...starterDecks[0].cards, { ...starterDecks[0].cards[0], id: "model-duplicate" }],
    };

    const result = compileDeckWithDiagnostics(deckWithTwoModels);

    expect(result.isValid).toBe(true);
    expect(result.warnings.some((warning) => warning.includes("Multiple Model"))).toBe(true);
  });
});
