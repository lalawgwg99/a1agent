import { describe, expect, it } from "vitest";
import { checkDeckCompatibility } from "@/lib/compatibility";
import { starterDecks } from "@/domain/fixtures";

describe("compatibility", () => {
  it("returns no errors for baseline deck", () => {
    const report = checkDeckCompatibility(starterDecks[0]);

    expect(report.errors).toEqual([]);
    expect(report.warnings).toEqual([]);
  });

  it("returns error for unsupported major version", () => {
    const report = checkDeckCompatibility({
      ...starterDecks[0],
      version: "2.0.0",
    });

    expect(report.errors.length).toBe(1);
  });

  it("warns when target is not hermes", () => {
    const report = checkDeckCompatibility({
      ...starterDecks[0],
      target: "openclaw",
    });

    expect(report.errors).toEqual([]);
    expect(report.warnings.some((warning) => warning.includes("openclaw"))).toBe(true);
  });
});
