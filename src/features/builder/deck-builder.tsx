"use client";

import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from "react";
import {
  DndContext,
  type DragEndEvent,
  type DragStartEvent,
  PointerSensor,
  TouchSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { stringify } from "yaml";
import type { CompileOutput, Card, Deck } from "@/domain/cards";
import { compileDeckWithDiagnostics } from "@/domain/compile";
import { cardTemplates } from "@/domain/library";
import { checkDeckCompatibility } from "@/lib/compatibility";
import { decodeDeck, encodeDeck } from "@/lib/deck-code";
import { CardEditor } from "@/features/builder/card-editor";

const LIBRARY_PREFIX = "library:";
const DECK_DROPPABLE_ID = "deck-dropzone";
const MAX_CARDS_PER_DECK = 12;
const LOCAL_DECKS_STORAGE_KEY = "a1agent.decks.v1";

type Notice = {
  tone: "info" | "success" | "error";
  message: string;
};

type StoredDeckEntry = {
  savedAt: string;
  deck: Deck;
};

type ApplySuccessResponse = {
  ok: true;
  backupDir: string;
  configPath: string;
  soulPath: string;
  checkMessage: string;
  warnings: string[];
};

type ApplyErrorResponse = {
  ok: false;
  error: string;
  details?: string[];
  warnings?: string[];
};

function nowIso(): string {
  return new Date().toISOString();
}

function toLibraryDragId(templateId: string): string {
  return `${LIBRARY_PREFIX}${templateId}`;
}

function fromLibraryDragId(dragId: string): string {
  return dragId.replace(LIBRARY_PREFIX, "");
}

function updateDeckCard(deck: Deck, cardId: string, nextCard: Card): Deck {
  return {
    ...deck,
    updatedAt: nowIso(),
    cards: deck.cards.map((card) => (card.id === cardId ? nextCard : card)),
  };
}

function removeDeckCard(deck: Deck, cardId: string): Deck {
  return {
    ...deck,
    updatedAt: nowIso(),
    cards: deck.cards.filter((card) => card.id !== cardId),
  };
}

function insertDeckCard(deck: Deck, card: Card, index: number): Deck {
  const nextCards = [...deck.cards];
  nextCards.splice(index, 0, card);

  return {
    ...deck,
    updatedAt: nowIso(),
    cards: nextCards,
  };
}

function getDropIndex(overId: string | null, cards: Card[]): number {
  if (!overId || overId === DECK_DROPPABLE_ID) {
    return cards.length;
  }

  const index = cards.findIndex((card) => card.id === overId);
  return index === -1 ? cards.length : index;
}

function moveCard(deck: Deck, cardId: string, direction: -1 | 1): Deck {
  const index = deck.cards.findIndex((card) => card.id === cardId);
  if (index === -1) {
    return deck;
  }

  const nextIndex = index + direction;
  if (nextIndex < 0 || nextIndex >= deck.cards.length) {
    return deck;
  }

  return {
    ...deck,
    updatedAt: nowIso(),
    cards: arrayMove(deck.cards, index, nextIndex),
  };
}

function getSelectedCard(deck: Deck, cardId: string | null): Card | null {
  if (!cardId) {
    return null;
  }

  return deck.cards.find((card) => card.id === cardId) ?? null;
}

function getCardIndex(deck: Deck, cardId: string | null): number {
  if (!cardId) {
    return -1;
  }

  return deck.cards.findIndex((card) => card.id === cardId);
}

function copyDeckCode(deck: Deck): Promise<void> {
  const code = encodeDeck(deck);
  if (typeof navigator === "undefined" || !navigator.clipboard) {
    return Promise.reject(new Error("Clipboard API unavailable."));
  }

  return navigator.clipboard.writeText(code);
}

function mergeMessages(messages: string[]): string[] {
  return Array.from(new Set(messages));
}

function loadStoredDecks(): StoredDeckEntry[] {
  if (typeof window === "undefined") {
    return [];
  }

  const raw = window.localStorage.getItem(LOCAL_DECKS_STORAGE_KEY);
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .map((item) => {
        const candidate = item as Partial<StoredDeckEntry>;
        if (!candidate.deck || !candidate.savedAt) {
          return null;
        }

        try {
          const validDeck = decodeDeck(encodeDeck(candidate.deck as Deck));
          return {
            savedAt: String(candidate.savedAt),
            deck: validDeck,
          } satisfies StoredDeckEntry;
        } catch {
          return null;
        }
      })
      .filter((item): item is StoredDeckEntry => item !== null)
      .sort((left, right) => right.savedAt.localeCompare(left.savedAt));
  } catch {
    return [];
  }
}

function saveStoredDecks(entries: StoredDeckEntry[]): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(LOCAL_DECKS_STORAGE_KEY, JSON.stringify(entries));
}

function LibraryCard({
  templateId,
  label,
  description,
  onQuickAdd,
}: {
  templateId: string;
  label: string;
  description: string;
  onQuickAdd: (templateId: string) => void;
}) {
  const draggableId = toLibraryDragId(templateId);
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: draggableId,
    data: {
      source: "library",
    },
  });

  const style: CSSProperties = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.45 : 1,
  };

  return (
    <article ref={setNodeRef} style={style} className="deck-card rounded-xl p-4">
      <div
        className="cursor-grab rounded-lg border border-dashed border-[var(--line)] p-3 active:cursor-grabbing"
        {...attributes}
        {...listeners}
      >
        <p className="text-sm font-semibold">{label}</p>
        <p className="mt-2 text-xs leading-5 text-[#5d6876]">{description}</p>
      </div>

      <button
        type="button"
        className="mt-3 w-full rounded-lg border border-[var(--line)] bg-white px-3 py-2 text-xs font-semibold"
        onClick={() => onQuickAdd(templateId)}
      >
        Add Card
      </button>
    </article>
  );
}

function SortableDeckCard({
  card,
  selected,
  index,
  total,
  onSelect,
  onMove,
}: {
  card: Card;
  selected: boolean;
  index: number;
  total: number;
  onSelect: (cardId: string) => void;
  onMove: (cardId: string, direction: -1 | 1) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: card.id });
  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.45 : 1,
  };

  return (
    <article
      ref={setNodeRef}
      style={style}
      className={`deck-card rounded-xl border p-4 ${selected ? "border-[var(--brand)]" : "border-[var(--line)]"}`}
    >
      <div className="flex items-start justify-between gap-3">
        <button type="button" className="text-left" onClick={() => onSelect(card.id)}>
          <p className="text-sm font-semibold">{card.title}</p>
          <p className="mt-2 text-xs text-[#5d6876]">id: {card.id}</p>
        </button>

        <div className="flex items-center gap-2">
          <span className="rounded bg-[var(--surface-strong)] px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.1em]">
            {card.type}
          </span>
          <button
            type="button"
            className="rounded border border-[var(--line)] bg-white px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.1em]"
            aria-label="Drag card"
            {...attributes}
            {...listeners}
          >
            Drag
          </button>
        </div>
      </div>

      <div className="mt-3 flex gap-2 sm:hidden">
        <button
          type="button"
          className="rounded border border-[var(--line)] bg-white px-2 py-1 text-[11px] font-semibold disabled:opacity-40"
          disabled={index === 0}
          onClick={() => onMove(card.id, -1)}
        >
          Up
        </button>
        <button
          type="button"
          className="rounded border border-[var(--line)] bg-white px-2 py-1 text-[11px] font-semibold disabled:opacity-40"
          disabled={index === total - 1}
          onClick={() => onMove(card.id, 1)}
        >
          Down
        </button>
      </div>
    </article>
  );
}

function DeckDropzone({ children }: { children: ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id: DECK_DROPPABLE_ID });

  return (
    <div
      ref={setNodeRef}
      className={`min-h-80 rounded-2xl border border-dashed p-4 ${
        isOver ? "border-[var(--brand)] bg-white/80" : "border-[var(--line)] bg-white/50"
      }`}
    >
      {children}
    </div>
  );
}

function PreviewPanel({
  errors,
  warnings,
  output,
  soulMarkdown,
}: {
  errors: string[];
  warnings: string[];
  output: CompileOutput | null;
  soulMarkdown: string | null;
}) {
  const configYaml = useMemo(() => {
    if (!output) {
      return "";
    }

    return stringify(output.configPatch);
  }, [output]);

  return (
    <article className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-4">
      <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-[#5d6876]">Compile Preview</h3>

      {errors.length > 0 ? (
        <div className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">
          <p className="font-semibold">Errors</p>
          <ul className="mt-2 space-y-1">
            {errors.map((error) => (
              <li key={error}>- {error}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {warnings.length > 0 ? (
        <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
          <p className="font-semibold">Warnings</p>
          <ul className="mt-2 space-y-1">
            {warnings.map((warning) => (
              <li key={warning}>- {warning}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {output ? (
        <div className="mt-4 space-y-3">
          <details open>
            <summary className="cursor-pointer text-sm font-semibold">Effective Prompt</summary>
            <pre className="code-panel mt-2 overflow-auto rounded-xl p-3 text-xs leading-6">{output.effectivePrompt}</pre>
          </details>

          <details>
            <summary className="cursor-pointer text-sm font-semibold">Hermes config.yaml</summary>
            <pre className="code-panel mt-2 overflow-auto rounded-xl p-3 text-xs leading-6">{configYaml}</pre>
          </details>

          <details>
            <summary className="cursor-pointer text-sm font-semibold">SOUL.md</summary>
            <pre className="code-panel mt-2 overflow-auto rounded-xl p-3 text-xs leading-6">{soulMarkdown}</pre>
          </details>
        </div>
      ) : (
        <p className="mt-3 text-sm text-[#5d6876]">Fix compile errors to generate runtime outputs.</p>
      )}
    </article>
  );
}

export function DeckBuilder({ initialDeck }: { initialDeck: Deck }) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 120, tolerance: 8 } }),
  );

  const [deck, setDeck] = useState<Deck>(initialDeck);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(deck.cards[0]?.id ?? null);
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [savedDecks, setSavedDecks] = useState<StoredDeckEntry[]>([]);
  const [loadDeckId, setLoadDeckId] = useState<string>("");
  const [deckCodeInput, setDeckCodeInput] = useState<string>("");
  const [isApplying, setIsApplying] = useState<boolean>(false);

  const selectedCard = useMemo(() => getSelectedCard(deck, selectedCardId), [deck, selectedCardId]);
  const selectedCardIndex = useMemo(() => getCardIndex(deck, selectedCardId), [deck, selectedCardId]);
  const diagnostics = useMemo(() => compileDeckWithDiagnostics(deck), [deck]);
  const compatibility = useMemo(() => checkDeckCompatibility(deck), [deck]);
  const allErrors = useMemo(() => mergeMessages([...compatibility.errors, ...diagnostics.errors]), [compatibility.errors, diagnostics.errors]);
  const allWarnings = useMemo(
    () => mergeMessages([...compatibility.warnings, ...diagnostics.warnings]),
    [compatibility.warnings, diagnostics.warnings],
  );

  const canMoveUp = selectedCardIndex > 0;
  const canMoveDown = selectedCardIndex !== -1 && selectedCardIndex < deck.cards.length - 1;
  const canApply = allErrors.length === 0 && diagnostics.output !== null && diagnostics.soulMarkdown !== null && !isApplying;

  useEffect(() => {
    const entries = loadStoredDecks();
    setSavedDecks(entries);
    if (entries.length > 0) {
      setLoadDeckId(entries[0].deck.id);
    }
  }, []);

  function showNotice(tone: Notice["tone"], message: string): void {
    setNotice({ tone, message });
  }

  function addTemplateCard(templateId: string, overId: string | null): void {
    if (deck.cards.length >= MAX_CARDS_PER_DECK) {
      showNotice("error", `Deck limit reached (${MAX_CARDS_PER_DECK} cards).`);
      return;
    }

    const template = cardTemplates.find((item) => item.templateId === templateId);
    if (!template) {
      showNotice("error", "Template not found.");
      return;
    }

    const nextCard = template.createCard();
    const insertIndex = getDropIndex(overId, deck.cards);
    const nextDeck = insertDeckCard(deck, nextCard, insertIndex);
    setDeck(nextDeck);
    setSelectedCardId(nextCard.id);
    showNotice("success", `Added ${template.label}.`);
  }

  function handleDragStart(event: DragStartEvent): void {
    setActiveDragId(String(event.active.id));
    setNotice(null);
  }

  function handleDragEnd(event: DragEndEvent): void {
    setActiveDragId(null);

    const activeId = String(event.active.id);
    const overId = event.over ? String(event.over.id) : null;
    if (!overId) {
      return;
    }

    if (activeId.startsWith(LIBRARY_PREFIX)) {
      const templateId = fromLibraryDragId(activeId);
      addTemplateCard(templateId, overId);
      return;
    }

    if (overId === DECK_DROPPABLE_ID) {
      return;
    }

    const activeIndex = deck.cards.findIndex((card) => card.id === activeId);
    const overIndex = deck.cards.findIndex((card) => card.id === overId);

    if (activeIndex === -1 || overIndex === -1 || activeIndex === overIndex) {
      return;
    }

    setDeck({
      ...deck,
      updatedAt: nowIso(),
      cards: arrayMove(deck.cards, activeIndex, overIndex),
    });
  }

  function handleCardChange(nextCard: Card): void {
    setDeck((prevDeck) => updateDeckCard(prevDeck, nextCard.id, nextCard));
  }

  function handleCardRemove(cardId: string): void {
    const nextDeck = removeDeckCard(deck, cardId);
    setDeck(nextDeck);
    setSelectedCardId((prevId) => {
      if (prevId !== cardId) {
        return prevId;
      }

      return nextDeck.cards[0]?.id ?? null;
    });
    showNotice("info", "Card removed.");
  }

  function handleMoveCard(cardId: string, direction: -1 | 1): void {
    setDeck((prevDeck) => moveCard(prevDeck, cardId, direction));
  }

  function handleMoveSelected(direction: -1 | 1): void {
    if (!selectedCardId) {
      return;
    }

    setDeck((prevDeck) => moveCard(prevDeck, selectedCardId, direction));
  }

  function handleSaveLocalDeck(): void {
    const nextEntry: StoredDeckEntry = {
      savedAt: nowIso(),
      deck,
    };

    const nextEntries = [nextEntry, ...savedDecks.filter((entry) => entry.deck.id !== deck.id)].slice(0, 30);
    setSavedDecks(nextEntries);
    saveStoredDecks(nextEntries);
    setLoadDeckId(deck.id);
    showNotice("success", "Deck saved to local storage.");
  }

  function handleLoadLocalDeck(): void {
    const entry = savedDecks.find((item) => item.deck.id === loadDeckId);
    if (!entry) {
      showNotice("error", "Select a saved deck first.");
      return;
    }

    const restoredDeck: Deck = {
      ...entry.deck,
      updatedAt: nowIso(),
    };
    setDeck(restoredDeck);
    setSelectedCardId(restoredDeck.cards[0]?.id ?? null);
    showNotice("success", `Loaded local deck: ${restoredDeck.name}.`);
  }

  async function handleCopyDeckCode(): Promise<void> {
    try {
      await copyDeckCode(deck);
      showNotice("success", "Deck code copied to clipboard.");
    } catch {
      showNotice("error", "Clipboard unavailable. Use compatible browser context.");
    }
  }

  function handleImportDeckCode(): void {
    try {
      const importedDeck = decodeDeck(deckCodeInput.trim());
      const report = checkDeckCompatibility(importedDeck);
      if (report.errors.length > 0) {
        showNotice("error", report.errors.join(" "));
        return;
      }

      setDeck({
        ...importedDeck,
        updatedAt: nowIso(),
      });
      setSelectedCardId(importedDeck.cards[0]?.id ?? null);
      setDeckCodeInput("");

      if (report.warnings.length > 0) {
        showNotice("info", `Deck imported with warnings: ${report.warnings.join(" ")}`);
        return;
      }

      showNotice("success", `Deck imported: ${importedDeck.name}.`);
    } catch {
      showNotice("error", "Invalid deck code. Check `deck://v1/...` format.");
    }
  }

  async function handleApplyHermes(): Promise<void> {
    if (!canApply) {
      showNotice("error", "Resolve compile errors before applying Hermes config.");
      return;
    }

    setIsApplying(true);
    setNotice(null);

    try {
      const response = await fetch("/api/hermes/apply", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ deck }),
      });

      const payload = (await response.json()) as ApplySuccessResponse | ApplyErrorResponse;
      if (!payload.ok) {
        const details = payload.details ? ` ${payload.details.join(" ")}` : "";
        showNotice("error", `${payload.error}${details}`.trim());
        return;
      }

      const warningSummary = payload.warnings.length > 0 ? ` Warnings: ${payload.warnings.join(" ")}` : "";
      showNotice("success", `Applied to Hermes. Backup: ${payload.backupDir}.${warningSummary}`);
    } catch {
      showNotice("error", "Apply request failed. Check local server and Hermes setup.");
    } finally {
      setIsApplying(false);
    }
  }

  const noticeClass =
    notice?.tone === "success"
      ? "text-emerald-700"
      : notice?.tone === "error"
        ? "text-red-700"
        : "text-[var(--brand)]";

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="grid gap-6 xl:grid-cols-[280px_minmax(0,1fr)_420px]">
        <section className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-4">
          <h2 className="text-lg font-semibold">Card Library</h2>
          <p className="mt-1 text-xs text-[#5d6876]">Drag to deck or tap add (mobile-friendly).</p>
          <div className="mt-4 space-y-3">
            {cardTemplates.map((template) => (
              <LibraryCard
                key={template.templateId}
                templateId={template.templateId}
                label={template.label}
                description={template.description}
                onQuickAdd={(templateId) => addTemplateCard(templateId, null)}
              />
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold">Deck Slots</h2>
              <p className="text-xs text-[#5d6876]">
                {deck.cards.length} / {MAX_CARDS_PER_DECK} cards
              </p>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              className="rounded-lg bg-[var(--brand)] px-3 py-2 text-xs font-semibold text-white"
              onClick={handleCopyDeckCode}
            >
              Copy Deck Code
            </button>
            <button
              type="button"
              className="rounded-lg border border-[var(--line)] bg-white px-3 py-2 text-xs font-semibold"
              onClick={handleSaveLocalDeck}
            >
              Save Local
            </button>
            <button
              type="button"
              className="rounded-lg border border-[var(--line)] bg-white px-3 py-2 text-xs font-semibold disabled:opacity-40"
              onClick={handleApplyHermes}
              disabled={!canApply}
            >
              {isApplying ? "Applying..." : "Apply Hermes"}
            </button>
          </div>

          <div className="mt-3 grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
            <select
              className="rounded-lg border border-[var(--line)] bg-white px-3 py-2 text-xs"
              value={loadDeckId}
              onChange={(event) => setLoadDeckId(event.target.value)}
            >
              <option value="">Select saved deck</option>
              {savedDecks.map((entry) => (
                <option key={`${entry.deck.id}-${entry.savedAt}`} value={entry.deck.id}>
                  {entry.deck.name} ({new Date(entry.savedAt).toLocaleString()})
                </option>
              ))}
            </select>
            <button
              type="button"
              className="rounded-lg border border-[var(--line)] bg-white px-3 py-2 text-xs font-semibold"
              onClick={handleLoadLocalDeck}
            >
              Load Local
            </button>
          </div>

          <div className="mt-3">
            <label className="text-xs font-semibold uppercase tracking-[0.12em] text-[#5d6876]">Import deck code</label>
            <textarea
              className="mt-2 min-h-20 w-full rounded-lg border border-[var(--line)] bg-white p-3 font-mono text-xs"
              placeholder="deck://v1/..."
              value={deckCodeInput}
              onChange={(event) => setDeckCodeInput(event.target.value)}
            />
            <button
              type="button"
              className="mt-2 rounded-lg border border-[var(--line)] bg-white px-3 py-2 text-xs font-semibold"
              onClick={handleImportDeckCode}
            >
              Import Code
            </button>
          </div>

          <div className="mt-4">
            <DeckDropzone>
              <SortableContext items={deck.cards.map((card) => card.id)} strategy={verticalListSortingStrategy}>
                <div className="space-y-3">
                  {deck.cards.map((card, index) => (
                    <SortableDeckCard
                      key={card.id}
                      card={card}
                      selected={selectedCardId === card.id}
                      index={index}
                      total={deck.cards.length}
                      onSelect={setSelectedCardId}
                      onMove={handleMoveCard}
                    />
                  ))}
                </div>
              </SortableContext>
            </DeckDropzone>
          </div>

          <div className="mt-3 flex gap-2 sm:hidden">
            <button
              type="button"
              className="rounded border border-[var(--line)] bg-white px-3 py-2 text-xs font-semibold disabled:opacity-40"
              disabled={!canMoveUp}
              onClick={() => handleMoveSelected(-1)}
            >
              Move Selected Up
            </button>
            <button
              type="button"
              className="rounded border border-[var(--line)] bg-white px-3 py-2 text-xs font-semibold disabled:opacity-40"
              disabled={!canMoveDown}
              onClick={() => handleMoveSelected(1)}
            >
              Move Selected Down
            </button>
          </div>

          {notice ? <p className={`mt-3 text-xs font-medium ${noticeClass}`}>{notice.message}</p> : null}
          {activeDragId ? <p className="mt-2 text-xs text-[#5d6876]">Dragging: {activeDragId}</p> : null}
        </section>

        <section className="space-y-4 xl:max-h-[calc(100vh-180px)] xl:overflow-auto xl:pr-1">
          <CardEditor card={selectedCard} onCardChange={handleCardChange} onCardRemove={handleCardRemove} />
          <PreviewPanel
            errors={allErrors}
            warnings={allWarnings}
            output={diagnostics.output}
            soulMarkdown={diagnostics.soulMarkdown}
          />
        </section>
      </div>
    </DndContext>
  );
}
