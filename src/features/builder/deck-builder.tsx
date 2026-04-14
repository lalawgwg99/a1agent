"use client";

import { useMemo, useState, type CSSProperties, type ReactNode } from "react";
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
import type { Card, Deck } from "@/domain/cards";
import { compileDeckWithDiagnostics, type DeckCompileDiagnostics } from "@/domain/compile";
import { cardTemplates } from "@/domain/library";
import { encodeDeck } from "@/lib/deck-code";
import { CardEditor } from "@/features/builder/card-editor";

const LIBRARY_PREFIX = "library:";
const DECK_DROPPABLE_ID = "deck-dropzone";
const MAX_CARDS_PER_DECK = 12;

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

function PreviewPanel({ diagnostics }: { diagnostics: DeckCompileDiagnostics }) {
  const configYaml = useMemo(() => {
    if (!diagnostics.output) {
      return "";
    }

    return stringify(diagnostics.output.configPatch);
  }, [diagnostics.output]);

  return (
    <article className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-4">
      <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-[#5d6876]">Compile Preview</h3>

      {diagnostics.errors.length > 0 ? (
        <div className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">
          <p className="font-semibold">Errors</p>
          <ul className="mt-2 space-y-1">
            {diagnostics.errors.map((error) => (
              <li key={error}>- {error}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {diagnostics.warnings.length > 0 ? (
        <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
          <p className="font-semibold">Warnings</p>
          <ul className="mt-2 space-y-1">
            {diagnostics.warnings.map((warning) => (
              <li key={warning}>- {warning}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {diagnostics.output ? (
        <div className="mt-4 space-y-3">
          <details open>
            <summary className="cursor-pointer text-sm font-semibold">Effective Prompt</summary>
            <pre className="code-panel mt-2 overflow-auto rounded-xl p-3 text-xs leading-6">{diagnostics.output.effectivePrompt}</pre>
          </details>

          <details>
            <summary className="cursor-pointer text-sm font-semibold">Hermes config.yaml</summary>
            <pre className="code-panel mt-2 overflow-auto rounded-xl p-3 text-xs leading-6">{configYaml}</pre>
          </details>

          <details>
            <summary className="cursor-pointer text-sm font-semibold">SOUL.md</summary>
            <pre className="code-panel mt-2 overflow-auto rounded-xl p-3 text-xs leading-6">{diagnostics.soulMarkdown}</pre>
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
  const [notice, setNotice] = useState<string>("");

  const selectedCard = useMemo(() => getSelectedCard(deck, selectedCardId), [deck, selectedCardId]);
  const selectedCardIndex = useMemo(() => getCardIndex(deck, selectedCardId), [deck, selectedCardId]);
  const compileDiagnostics = useMemo(() => compileDeckWithDiagnostics(deck), [deck]);

  function addTemplateCard(templateId: string, overId: string | null): void {
    if (deck.cards.length >= MAX_CARDS_PER_DECK) {
      setNotice(`Deck limit reached (${MAX_CARDS_PER_DECK} cards).`);
      return;
    }

    const template = cardTemplates.find((item) => item.templateId === templateId);
    if (!template) {
      setNotice("Template not found.");
      return;
    }

    const nextCard = template.createCard();
    const insertIndex = getDropIndex(overId, deck.cards);
    const nextDeck = insertDeckCard(deck, nextCard, insertIndex);
    setDeck(nextDeck);
    setSelectedCardId(nextCard.id);
    setNotice(`Added ${template.label}.`);
  }

  function handleDragStart(event: DragStartEvent): void {
    setActiveDragId(String(event.active.id));
    setNotice("");
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
    setNotice("Card removed.");
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

  async function handleCopyDeckCode(): Promise<void> {
    try {
      await copyDeckCode(deck);
      setNotice("Deck code copied to clipboard.");
    } catch {
      setNotice("Clipboard unavailable. Use compatible browser context.");
    }
  }

  const canMoveUp = selectedCardIndex > 0;
  const canMoveDown = selectedCardIndex !== -1 && selectedCardIndex < deck.cards.length - 1;

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
            <button
              type="button"
              className="rounded-lg bg-[var(--brand)] px-3 py-2 text-xs font-semibold text-white"
              onClick={handleCopyDeckCode}
            >
              Copy Deck Code
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

          {notice ? <p className="mt-3 text-xs font-medium text-[var(--brand)]">{notice}</p> : null}
          {activeDragId ? <p className="mt-2 text-xs text-[#5d6876]">Dragging: {activeDragId}</p> : null}
        </section>

        <section className="space-y-4 xl:max-h-[calc(100vh-180px)] xl:overflow-auto xl:pr-1">
          <CardEditor card={selectedCard} onCardChange={handleCardChange} onCardRemove={handleCardRemove} />
          <PreviewPanel diagnostics={compileDiagnostics} />
        </section>
      </div>
    </DndContext>
  );
}
