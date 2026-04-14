import type { Deck } from "@/domain/cards";

export type CompatibilityReport = {
  errors: string[];
  warnings: string[];
};

function parseMajorVersion(version: string): number | null {
  const match = version.trim().match(/^(\d+)/);
  if (!match) {
    return null;
  }

  return Number(match[1]);
}

export function checkDeckCompatibility(deck: Deck): CompatibilityReport {
  const errors: string[] = [];
  const warnings: string[] = [];

  const majorVersion = parseMajorVersion(deck.version);
  if (majorVersion === null) {
    warnings.push(`Deck version \`${deck.version}\` is not standard semver.`);
  } else if (majorVersion > 1) {
    errors.push(`Deck version \`${deck.version}\` is newer than supported major version 1.`);
  }

  if (deck.target !== "hermes") {
    warnings.push(`Deck target is \`${deck.target}\`. Current runtime apply flow uses Hermes.`);
  }

  return { errors, warnings };
}
