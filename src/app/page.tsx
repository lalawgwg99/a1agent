import { compileDeckToHermesConfig, compileDeckToSoulMarkdown } from "@/domain/compile";
import { starterDecks } from "@/domain/fixtures";

function prettyJson(value: unknown): string {
  return JSON.stringify(value, null, 2);
}

export default function Home() {
  const selectedDeck = starterDecks[0];
  const compiled = compileDeckToHermesConfig(selectedDeck);
  const soulMarkdown = compileDeckToSoulMarkdown(selectedDeck);

  return (
    <main className="grid-overlay min-h-screen px-6 py-10 md:px-12">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
        <header className="rounded-3xl border border-[var(--line)] bg-[var(--surface)] p-6 md:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--brand)]">a1agent prototype</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight md:text-5xl">
            Build AI behavior with cards, not YAML.
          </h1>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-[#42505f] md:text-base">
            This scaffold already includes deck schema validation, Hermes compile output, and starter decks. Next,
            we wire drag-and-drop card editing and apply flow.
          </p>
        </header>

        <section className="grid gap-5 md:grid-cols-3">
          {starterDecks.map((deck) => (
            <article key={deck.id} className="deck-card rounded-2xl p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#4e5a63]">{deck.target}</p>
              <h2 className="mt-2 text-xl font-semibold">{deck.name}</h2>
              <p className="mt-3 text-sm leading-6 text-[#4e5a63]">{deck.description}</p>
              <p className="mt-4 text-sm font-medium">{deck.cards.length} cards</p>
            </article>
          ))}
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <article className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-5">
            <h3 className="text-lg font-semibold">Effective Prompt Preview</h3>
            <p className="mt-3 rounded-xl bg-[var(--surface-strong)] p-4 text-sm leading-7">{compiled.effectivePrompt}</p>
          </article>

          <article className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-5">
            <h3 className="text-lg font-semibold">Compile Result (Hermes Patch)</h3>
            <pre className="code-panel mt-3 overflow-auto rounded-xl p-4 text-xs leading-6 md:text-sm">
              {prettyJson(compiled.configPatch)}
            </pre>
          </article>
        </section>

        <section className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-5">
          <h3 className="text-lg font-semibold">SOUL.md Output</h3>
          <pre className="code-panel mt-3 overflow-auto rounded-xl p-4 text-xs leading-6 md:text-sm">{soulMarkdown}</pre>
        </section>
      </div>
    </main>
  );
}
