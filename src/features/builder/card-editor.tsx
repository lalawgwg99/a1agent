"use client";

import { useMemo, useState, type ReactNode } from "react";
import type { Card, MemoryCard, ModelCard, SkillCard, SoulCard, ToolCard } from "@/domain/cards";

type CardEditorProps = {
  card: Card | null;
  onCardChange: (card: Card) => void;
  onCardRemove: (cardId: string) => void;
};

function toCsv(values: string[]): string {
  return values.join(", ");
}

function fromCsv(value: string): string[] {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

function baseInputClass(): string {
  return "mt-2 w-full rounded-lg border border-[var(--line)] bg-white px-3 py-2 text-sm";
}

function FieldLabel({ children }: { children: ReactNode }) {
  return <label className="text-xs font-semibold uppercase tracking-[0.12em] text-[#465261]">{children}</label>;
}

function updateCardTitle(card: Card, title: string): Card {
  return {
    ...card,
    title,
  };
}

function ModelCardForm({ card, onChange }: { card: ModelCard; onChange: (next: ModelCard) => void }) {
  return (
    <div className="space-y-4">
      <div>
        <FieldLabel>Provider</FieldLabel>
        <select
          value={card.provider}
          className={baseInputClass()}
          onChange={(event) => onChange({ ...card, provider: event.target.value as ModelCard["provider"] })}
        >
          <option value="openrouter">openrouter</option>
          <option value="openai">openai</option>
          <option value="anthropic">anthropic</option>
        </select>
      </div>
      <div>
        <FieldLabel>Model</FieldLabel>
        <input
          type="text"
          value={card.model}
          className={baseInputClass()}
          onChange={(event) => onChange({ ...card, model: event.target.value })}
        />
      </div>
      <div>
        <FieldLabel>Temperature</FieldLabel>
        <input
          type="number"
          min={0}
          max={2}
          step={0.1}
          value={card.temperature}
          className={baseInputClass()}
          onChange={(event) => onChange({ ...card, temperature: Number(event.target.value) || 0 })}
        />
      </div>
      <div>
        <FieldLabel>Max Tokens</FieldLabel>
        <input
          type="number"
          min={1}
          step={1}
          value={card.maxTokens}
          className={baseInputClass()}
          onChange={(event) => onChange({ ...card, maxTokens: Number(event.target.value) || 1 })}
        />
      </div>
    </div>
  );
}

function SkillCardForm({ card, onChange }: { card: SkillCard; onChange: (next: SkillCard) => void }) {
  const [configError, setConfigError] = useState<string>("");

  function applyConfigJson(raw: string): void {
    try {
      const parsed = JSON.parse(raw) as Record<string, string | number | boolean>;
      onChange({ ...card, config: parsed });
      setConfigError("");
    } catch {
      setConfigError("Config must be valid JSON object.");
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <FieldLabel>Skill ID</FieldLabel>
        <input
          type="text"
          value={card.skillId}
          className={baseInputClass()}
          onChange={(event) => onChange({ ...card, skillId: event.target.value })}
        />
      </div>
      <div>
        <FieldLabel>Visibility</FieldLabel>
        <select
          value={card.visibility}
          className={baseInputClass()}
          onChange={(event) => onChange({ ...card, visibility: event.target.value as SkillCard["visibility"] })}
        >
          <option value="private">private</option>
          <option value="team">team</option>
          <option value="public">public</option>
        </select>
      </div>
      <label className="flex items-center gap-2 text-sm text-[#26313f]">
        <input
          type="checkbox"
          checked={card.enabled}
          onChange={(event) => onChange({ ...card, enabled: event.target.checked })}
        />
        Enabled
      </label>
      <div>
        <FieldLabel>Config JSON</FieldLabel>
        <textarea
          key={card.id}
          defaultValue={JSON.stringify(card.config, null, 2)}
          className={`${baseInputClass()} min-h-36 font-mono text-xs`}
          onBlur={(event) => applyConfigJson(event.target.value)}
        />
        <p className="mt-1 text-xs text-[#5d6876]">Edit JSON and blur to apply.</p>
        {configError ? <p className="mt-1 text-xs text-red-600">{configError}</p> : null}
      </div>
    </div>
  );
}

function SoulCardForm({ card, onChange }: { card: SoulCard; onChange: (next: SoulCard) => void }) {
  const boundariesText = useMemo(() => toCsv(card.boundaries), [card.boundaries]);

  return (
    <div className="space-y-4">
      <div>
        <FieldLabel>Persona</FieldLabel>
        <input
          type="text"
          value={card.persona}
          className={baseInputClass()}
          onChange={(event) => onChange({ ...card, persona: event.target.value })}
        />
      </div>
      <div>
        <FieldLabel>Tone</FieldLabel>
        <select
          value={card.tone}
          className={baseInputClass()}
          onChange={(event) => onChange({ ...card, tone: event.target.value as SoulCard["tone"] })}
        >
          <option value="calm">calm</option>
          <option value="friendly">friendly</option>
          <option value="assertive">assertive</option>
        </select>
      </div>
      <div>
        <FieldLabel>Language</FieldLabel>
        <input
          type="text"
          value={card.language}
          className={baseInputClass()}
          onChange={(event) => onChange({ ...card, language: event.target.value })}
        />
      </div>
      <div>
        <FieldLabel>Safety Level</FieldLabel>
        <select
          value={card.safetyLevel}
          className={baseInputClass()}
          onChange={(event) => onChange({ ...card, safetyLevel: event.target.value as SoulCard["safetyLevel"] })}
        >
          <option value="strict">strict</option>
          <option value="normal">normal</option>
          <option value="playful">playful</option>
        </select>
      </div>
      <div>
        <FieldLabel>Boundaries (comma separated)</FieldLabel>
        <input
          type="text"
          value={boundariesText}
          className={baseInputClass()}
          onChange={(event) => onChange({ ...card, boundaries: fromCsv(event.target.value) })}
        />
      </div>
    </div>
  );
}

function ToolCardForm({ card, onChange }: { card: ToolCard; onChange: (next: ToolCard) => void }) {
  const scopeText = useMemo(() => toCsv(card.scope), [card.scope]);

  return (
    <div className="space-y-4">
      <div>
        <FieldLabel>Tool ID</FieldLabel>
        <input
          type="text"
          value={card.toolId}
          className={baseInputClass()}
          onChange={(event) => onChange({ ...card, toolId: event.target.value })}
        />
      </div>
      <div>
        <FieldLabel>Approval</FieldLabel>
        <select
          value={card.approval}
          className={baseInputClass()}
          onChange={(event) => onChange({ ...card, approval: event.target.value as ToolCard["approval"] })}
        >
          <option value="off">off</option>
          <option value="ask">ask</option>
          <option value="auto">auto</option>
        </select>
      </div>
      <div>
        <FieldLabel>Scope (comma separated)</FieldLabel>
        <input
          type="text"
          value={scopeText}
          className={baseInputClass()}
          onChange={(event) => onChange({ ...card, scope: fromCsv(event.target.value) })}
        />
      </div>
      <div>
        <FieldLabel>Rate Limit / Minute</FieldLabel>
        <input
          type="number"
          min={1}
          step={1}
          value={card.rateLimitPerMinute}
          className={baseInputClass()}
          onChange={(event) => onChange({ ...card, rateLimitPerMinute: Number(event.target.value) || 1 })}
        />
      </div>
    </div>
  );
}

function MemoryCardForm({ card, onChange }: { card: MemoryCard; onChange: (next: MemoryCard) => void }) {
  return (
    <div className="space-y-4">
      <div>
        <FieldLabel>Mode</FieldLabel>
        <select
          value={card.mode}
          className={baseInputClass()}
          onChange={(event) => onChange({ ...card, mode: event.target.value as MemoryCard["mode"] })}
        >
          <option value="off">off</option>
          <option value="session">session</option>
          <option value="persistent">persistent</option>
        </select>
      </div>
      <div>
        <FieldLabel>Retention Days</FieldLabel>
        <input
          type="number"
          min={0}
          step={1}
          value={card.retentionDays}
          className={baseInputClass()}
          onChange={(event) => onChange({ ...card, retentionDays: Number(event.target.value) || 0 })}
        />
      </div>
      <div>
        <FieldLabel>Token Limit</FieldLabel>
        <input
          type="number"
          min={1}
          step={100}
          value={card.tokenLimit}
          className={baseInputClass()}
          onChange={(event) => onChange({ ...card, tokenLimit: Number(event.target.value) || 1 })}
        />
      </div>
    </div>
  );
}

export function CardEditor({ card, onCardChange, onCardRemove }: CardEditorProps) {
  if (!card) {
    return (
      <div className="rounded-2xl border border-dashed border-[var(--line)] bg-white/80 p-4 text-sm text-[#5d6876]">
        Select a card in the deck to edit fields.
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#5d6876]">{card.type} card</p>
          <h3 className="mt-1 text-lg font-semibold">Card Editor</h3>
        </div>
        <button
          type="button"
          className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700"
          onClick={() => onCardRemove(card.id)}
        >
          Remove
        </button>
      </div>

      <div className="mt-4 space-y-4">
        <div>
          <FieldLabel>Title</FieldLabel>
          <input
            type="text"
            value={card.title}
            className={baseInputClass()}
            onChange={(event) => onCardChange(updateCardTitle(card, event.target.value))}
          />
        </div>

        {card.type === "model" ? <ModelCardForm card={card} onChange={onCardChange} /> : null}
        {card.type === "skill" ? <SkillCardForm card={card} onChange={onCardChange} /> : null}
        {card.type === "soul" ? <SoulCardForm card={card} onChange={onCardChange} /> : null}
        {card.type === "tool" ? <ToolCardForm card={card} onChange={onCardChange} /> : null}
        {card.type === "memory" ? <MemoryCardForm card={card} onChange={onCardChange} /> : null}
      </div>
    </div>
  );
}
