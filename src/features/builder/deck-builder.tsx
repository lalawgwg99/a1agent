"use client";

import { useMemo, useState, type CSSProperties, type ReactNode } from "react";
import {
  DndContext,
  type DragEndEvent,
  type DragStartEvent,
  PointerSensor,
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
import type { Card, Deck } from "@/domain/cards";
import { compileDeckToHermesConfig } from "@/domain/compile";
import { cardTemplates } from "@/domain/library";
import { encodeDeck } from "@/lib/deck-code";
import { CardEditor } from "@/features/builder/card-editor";

const LIBRARY_PREFIX = "library:";
const DECK_DROPPABLE_ID = "deck-dropzone";

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

function getSelectedCard(deck: Deck, cardId: string | null): Card | null {
  if (!cardId) {
    return null;
  }

  return deck.cards.find((card) => card.id === cardId) ?? null;
}

function copyDeckCode(deck: Deck): Promise<void> {
  const code = encodeDeck(deck);
  if (typeof navigator === "undefined" || !navigator.clipboard) {
    return Promise.reject(new Error("Clipboard API unavailable."));
  }

  return navigator.clipboard.writeText(code);
}

function LibraryCard({ templateId, label, description }: { templateId: string; label: string; description: string }) {
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
    <button
      type="button"
      ref={setNodeRef}
      style={style}
      className="deck-card w-full rounded-xl p-4 text-left"
      {...attributes}
      {...listeners}
    >
      <p className="text-sm font-semibold">{label}</p>
      <p className="mt-2 text-xs leading-5 text-[#5d6876]">{description}</p>
    </button>
  );
}

function SortableDeckCard({
  card,
  selected,
  onSelect,
}: {
  card: Card;
  selected: boolean;
  onSelect: (cardId: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: card.id });
  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.45 : 1,
  };

  return (
    <button
      type="button"
      ref={setNodeRef}
      style={style}
      className={`deck-card rounded-xl border p-4 ${selected ? "border-[var(--brand)]" : "border-[var(--line)]"}`}
      onClick={() => onSelect(card.id)}
      {...attributes}
      {...listeners}
    >
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold">{card.title}</p>
        <span className="rounded bg-[var(--surface-strong)] px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.1em]">
          {card.type}
        </span>
      </div>
      <p className="mt-2 text-xs text-[#5d6876]">id: {card.id}</p>
    </button>
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

export function DeckBuilder({ initialDeck }: { initialDeck: Deck }) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));
  const [deck, setDeck] = useState<Deck>(initialDeck);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(deck.cards[0]?.id ?? null);
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string>("");

  const selectedCard = useMemo(() => getSelectedCard(deck, selectedCardId), [deck, selectedCardId]);

  const compileResult = useMemo(() => {
    try {
      return compileDeckToHermesConfig(deck);
    } catch {
      return null;
    }
  }, [deck]);

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
      if (deck.cards.length >= 12) {
        setNotice("Deck limit reached (12 cards).");
        return;
      }

      const templateId = fromLibraryDragId(activeId);
      const template = cardTemplates.find((item) => item.templateId === templateId);
      if (!template) {
        return;
      }

      const nextCard = template.createCard();
      const insertIndex = getDropIndex(overId, deck.cards);
      const nextDeck = insertDeckCard(deck, nextCard, insertIndex);
      setDeck(nextDeck);
      setSelectedCardId(nextCard.id);
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
  }

  async function handleCopyDeckCode(): Promise<void> {
    try {
      await copyDeckCode(deck);
      setNotice("Deck code copied to clipboard.");
    } catch {
      setNotice("Clipboard unavailable. Use compatible browser context.");
    }
  }

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="grid gap-6 xl:grid-cols-[280px_minmax(0,1fr)_380px]">
        <section className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-4">
          <h2 className="text-lg font-semibold">Card Library</h2>
          <p className="mt-1 text-xs text-[#5d6876]">Drag cards into your deck.</p>
          <div className="mt-4 space-y-3">
            {cardTemplates.map((template) => (
              <LibraryCard
                key={template.templateId}
                templateId={template.templateId}
                label={template.label}
                description={template.description}
              />
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold">Deck Slots</h2>
              <p className="text-xs text-[#5d6876]">{deck.cards.length} / 12 cards</p>
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
                  {deck.cards.map((card) => (
                    <SortableDeckCard
                      key={card.id}
                      card={card}
                      selected={selectedCardId === card.id}
                      onSelect={setSelectedCardId}
                    />
                  ))}
                </div>
              </SortableContext>
            </DeckDropzone>
          </div>

          {notice ? <p className="mt-3 text-xs font-medium text-[var(--brand)]">{notice}</p> : null}
          {activeDragId ? <p className="mt-2 text-xs text-[#5d6876]">Dragging: {activeDragId}</p> : null}
        </section>

        <section className="space-y-4">
          <CardEditor card={selectedCard} onCardChange={handleCardChange} onCardRemove={handleCardRemove} />

          <article className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-4">
            <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-[#5d6876]">Live Summary</h3>
            {compileResult ? (
              <div className="mt-3 space-y-2 text-sm leading-6">
                <p>
                  <span className="font-semibold">Model:</span> {compileResult.effectiveModel.provider} / {" "}
                  {compileResult.effectiveModel.model}
                </p>
                <p>
                  <span className="font-semibold">Temperature:</span> {compileResult.effectiveModel.temperature}
                </p>
                <p>
                  <span className="font-semibold">Tools:</span> {compileResult.effectiveTools.length}
                </p>
              </div>
            ) : (
              <p className="mt-3 text-sm text-red-700">Current deck has validation issues.</p>
            )}
          </article>
        </section>
      </div>
    </DndContext>
  );
}
