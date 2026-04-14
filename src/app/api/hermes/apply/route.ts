import { NextResponse } from "next/server";
import { deckSchema } from "@/domain/cards";
import { compileDeckWithDiagnostics } from "@/domain/compile";
import { checkDeckCompatibility } from "@/lib/compatibility";
import { applyDeckToHermes } from "@/lib/hermes-apply";

export const runtime = "nodejs";

type ApplyRequestBody = {
  deck?: unknown;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as ApplyRequestBody;
    const parsedDeck = deckSchema.safeParse(body.deck);
    if (!parsedDeck.success) {
      return NextResponse.json(
        {
          ok: false,
          error: "Invalid deck payload.",
          details: parsedDeck.error.issues.map((issue) => issue.message),
        },
        { status: 400 },
      );
    }

    const compatibility = checkDeckCompatibility(parsedDeck.data);
    if (compatibility.errors.length > 0) {
      return NextResponse.json(
        {
          ok: false,
          error: "Deck is not compatible with current runtime.",
          details: compatibility.errors,
          warnings: compatibility.warnings,
        },
        { status: 400 },
      );
    }

    const diagnostics = compileDeckWithDiagnostics(parsedDeck.data);
    if (!diagnostics.isValid || !diagnostics.output || !diagnostics.soulMarkdown) {
      return NextResponse.json(
        {
          ok: false,
          error: "Deck compile failed. Resolve compile issues before apply.",
          details: diagnostics.errors,
          warnings: [...compatibility.warnings, ...diagnostics.warnings],
        },
        { status: 400 },
      );
    }

    const applyResult = await applyDeckToHermes({
      configPatch: diagnostics.output.configPatch,
      soulMarkdown: diagnostics.soulMarkdown,
    });

    return NextResponse.json({
      ok: true,
      backupDir: applyResult.backupDir,
      configPath: applyResult.configPath,
      soulPath: applyResult.soulPath,
      checkMessage: applyResult.checkMessage,
      warnings: [...compatibility.warnings, ...diagnostics.warnings, ...applyResult.warnings],
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown apply error.";
    return NextResponse.json(
      {
        ok: false,
        error: message,
      },
      { status: 500 },
    );
  }
}
