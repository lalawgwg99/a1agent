import type { Card } from "@/domain/cards";

export type CardTemplate = {
  templateId: string;
  label: string;
  description: string;
  createCard: () => Card;
};

function uniqueId(prefix: string): string {
  const randomPart =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID().slice(0, 8)
      : Math.random().toString(36).slice(2, 10);

  return `${prefix}-${randomPart}`;
}

function createModelCard(): Card {
  return {
    type: "model",
    id: uniqueId("model"),
    title: "General Model",
    provider: "openrouter",
    model: "openai/gpt-4.1-mini",
    temperature: 0.7,
    maxTokens: 2048,
  };
}

function createSkillCard(): Card {
  return {
    type: "skill",
    id: uniqueId("skill"),
    title: "Reusable Skill",
    skillId: "skill.example",
    enabled: true,
    visibility: "private",
    config: {
      mode: "default",
    },
  };
}

function createSoulCard(): Card {
  return {
    type: "soul",
    id: uniqueId("soul"),
    title: "Assistant Soul",
    persona: "a practical assistant",
    tone: "friendly",
    language: "zh-TW",
    safetyLevel: "normal",
    boundaries: ["Do not fabricate facts."],
  };
}

function createToolCard(): Card {
  return {
    type: "tool",
    id: uniqueId("tool"),
    title: "External Tool",
    toolId: "tool.example",
    approval: "ask",
    scope: ["default"],
    rateLimitPerMinute: 20,
  };
}

function createMemoryCard(): Card {
  return {
    type: "memory",
    id: uniqueId("memory"),
    title: "Memory Profile",
    mode: "session",
    retentionDays: 7,
    tokenLimit: 4000,
  };
}

export const cardTemplates: CardTemplate[] = [
  {
    templateId: "template-model-general",
    label: "Model Card",
    description: "Set provider, model, and sampling settings.",
    createCard: createModelCard,
  },
  {
    templateId: "template-skill-general",
    label: "Skill Card",
    description: "Enable a named reusable skill and config.",
    createCard: createSkillCard,
  },
  {
    templateId: "template-soul-general",
    label: "Soul Card",
    description: "Define persona, tone, language, and boundaries.",
    createCard: createSoulCard,
  },
  {
    templateId: "template-tool-general",
    label: "Tool Card",
    description: "Control tool approvals and scope.",
    createCard: createToolCard,
  },
  {
    templateId: "template-memory-general",
    label: "Memory Card",
    description: "Manage memory mode, retention, and token cap.",
    createCard: createMemoryCard,
  },
];
