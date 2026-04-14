import {
  type CompileOutput,
  compileOutputSchema,
  deckSchema,
  type Deck,
  type MemoryCard,
  type ModelCard,
  type SkillCard,
  type SoulCard,
  type ToolCard,
} from "@/domain/cards";

function pickFirstModelCard(deck: Deck): ModelCard {
  const modelCard = deck.cards.find((card) => card.type === "model");
  if (!modelCard) {
    throw new Error("Deck must include one ModelCard.");
  }

  return modelCard;
}

function pickFirstSoulCard(deck: Deck): SoulCard | null {
  return deck.cards.find((card) => card.type === "soul") ?? null;
}

function pickSkillCards(deck: Deck): SkillCard[] {
  return deck.cards.filter((card) => card.type === "skill");
}

function pickToolCards(deck: Deck): ToolCard[] {
  return deck.cards.filter((card) => card.type === "tool");
}

function pickMemoryCard(deck: Deck): MemoryCard {
  const memoryCard = deck.cards.find((card) => card.type === "memory");
  if (!memoryCard) {
    return {
      type: "memory",
      id: "memory-default",
      title: "Memory",
      mode: "session",
      retentionDays: 7,
      tokenLimit: 4000,
    };
  }

  return memoryCard;
}

function buildEffectivePrompt(soulCard: SoulCard | null): string {
  if (!soulCard) {
    return "You are a reliable assistant. Use concise and actionable responses.";
  }

  const boundaries =
    soulCard.boundaries.length > 0
      ? soulCard.boundaries.join("; ")
      : "Do not fabricate facts. Ask clarifying questions when uncertain.";

  return [
    `You are ${soulCard.persona}.`,
    `Primary language: ${soulCard.language}.`,
    `Tone: ${soulCard.tone}.`,
    `Safety level: ${soulCard.safetyLevel}.`,
    `Boundaries: ${boundaries}.`,
  ].join(" ");
}

export function compileDeckToHermesConfig(rawDeck: unknown): CompileOutput {
  const deck = deckSchema.parse(rawDeck);
  const modelCard = pickFirstModelCard(deck);
  const soulCard = pickFirstSoulCard(deck);
  const skillCards = pickSkillCards(deck);
  const toolCards = pickToolCards(deck);
  const memoryCard = pickMemoryCard(deck);

  const compiled: CompileOutput = {
    effectivePrompt: buildEffectivePrompt(soulCard),
    effectiveModel: {
      provider: modelCard.provider,
      model: modelCard.model,
      temperature: modelCard.temperature,
      maxTokens: modelCard.maxTokens,
    },
    effectiveTools: toolCards.map((toolCard) => ({
      toolId: toolCard.toolId,
      approval: toolCard.approval,
      scope: toolCard.scope,
      rateLimitPerMinute: toolCard.rateLimitPerMinute,
    })),
    configPatch: {
      provider: modelCard.provider,
      model: modelCard.model,
      modelSettings: {
        temperature: modelCard.temperature,
        max_tokens: modelCard.maxTokens,
      },
      skills: Object.fromEntries(
        skillCards.map((skillCard) => [
          skillCard.skillId,
          {
            enabled: skillCard.enabled,
            config: skillCard.config,
          },
        ]),
      ),
      tools: Object.fromEntries(
        toolCards.map((toolCard) => [
          toolCard.toolId,
          {
            approval: toolCard.approval,
            scope: toolCard.scope,
            rate_limit_per_minute: toolCard.rateLimitPerMinute,
          },
        ]),
      ),
      memory: {
        mode: memoryCard.mode,
        retention_days: memoryCard.retentionDays,
        token_limit: memoryCard.tokenLimit,
      },
    },
  };

  return compileOutputSchema.parse(compiled);
}

export function compileDeckToSoulMarkdown(rawDeck: unknown): string {
  const deck = deckSchema.parse(rawDeck);
  const soulCard = pickFirstSoulCard(deck);
  const prompt = buildEffectivePrompt(soulCard);

  return [
    "# SOUL",
    "",
    prompt,
    "",
    "## Runtime Rule",
    "- Ask before any risky tool action.",
    "- Keep answers concise and verifiable.",
  ].join("\n");
}
