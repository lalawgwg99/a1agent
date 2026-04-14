import { DeckBuilder } from "@/features/builder/deck-builder";
import { starterDecks } from "@/domain/fixtures";

export default function Home() {
  const initialDeck = starterDecks[0];

  return (
    <main className="grid-overlay min-h-screen px-6 py-10 md:px-10">
      <div className="mx-auto flex w-full max-w-[1360px] flex-col gap-7">
        <header className="rounded-3xl border border-[var(--line)] bg-[var(--surface)] p-6 md:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--brand)]">a1agent step 4</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight md:text-5xl">Card Deck Builder</h1>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-[#4b5868] md:text-base">
            Build with drag-and-drop or tap-to-add cards, edit card fields, and preview compile outputs in real time.
            Step 4 adds diagnostics plus mobile-friendly controls.
          </p>
        </header>

        <DeckBuilder initialDeck={initialDeck} />
      </div>
    </main>
  );
}
