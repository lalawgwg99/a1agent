import { z } from "zod";

export const cardTypeSchema = z.enum([
  "model",
  "skill",
  "soul",
  "tool",
  "memory",
]);

export const modelProviderSchema = z.enum(["openrouter", "openai", "anthropic"]);

export const modelCardSchema = z.object({
  type: z.literal("model"),
  id: z.string().min(1),
  title: z.string().min(1),
  provider: modelProviderSchema.default("openrouter"),
  model: z.string().min(1),
  temperature: z.number().min(0).max(2).default(0.7),
  maxTokens: z.number().int().positive().default(2048),
});

export const skillCardSchema = z.object({
  type: z.literal("skill"),
  id: z.string().min(1),
  title: z.string().min(1),
  skillId: z.string().min(1),
  enabled: z.boolean().default(true),
  visibility: z.enum(["public", "team", "private"]).default("private"),
  config: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).default({}),
});

export const soulCardSchema = z.object({
  type: z.literal("soul"),
  id: z.string().min(1),
  title: z.string().min(1),
  persona: z.string().min(1),
  tone: z.enum(["calm", "friendly", "assertive"]).default("friendly"),
  language: z.string().min(1).default("zh-TW"),
  safetyLevel: z.enum(["strict", "normal", "playful"]).default("normal"),
  boundaries: z.array(z.string().min(1)).default([]),
});

export const toolCardSchema = z.object({
  type: z.literal("tool"),
  id: z.string().min(1),
  title: z.string().min(1),
  toolId: z.string().min(1),
  approval: z.enum(["off", "ask", "auto"]).default("ask"),
  scope: z.array(z.string().min(1)).default([]),
  rateLimitPerMinute: z.number().int().positive().default(20),
});

export const memoryCardSchema = z.object({
  type: z.literal("memory"),
  id: z.string().min(1),
  title: z.string().min(1),
  mode: z.enum(["off", "session", "persistent"]).default("session"),
  retentionDays: z.number().int().min(0).default(7),
  tokenLimit: z.number().int().positive().default(4000),
});

export const cardSchema = z.discriminatedUnion("type", [
  modelCardSchema,
  skillCardSchema,
  soulCardSchema,
  toolCardSchema,
  memoryCardSchema,
]);

export const deckSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string().min(1),
  target: z.enum(["hermes", "openclaw"]).default("hermes"),
  version: z.string().min(1).default("1.0.0"),
  cards: z.array(cardSchema).max(12),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type ModelCard = z.infer<typeof modelCardSchema>;
export type SkillCard = z.infer<typeof skillCardSchema>;
export type SoulCard = z.infer<typeof soulCardSchema>;
export type ToolCard = z.infer<typeof toolCardSchema>;
export type MemoryCard = z.infer<typeof memoryCardSchema>;
export type Card = z.infer<typeof cardSchema>;
export type Deck = z.infer<typeof deckSchema>;

export const compileOutputSchema = z.object({
  effectivePrompt: z.string(),
  effectiveModel: z.object({
    provider: modelProviderSchema,
    model: z.string(),
    temperature: z.number(),
    maxTokens: z.number().int().positive(),
  }),
  effectiveTools: z.array(
    z.object({
      toolId: z.string(),
      approval: z.enum(["off", "ask", "auto"]),
      scope: z.array(z.string()),
      rateLimitPerMinute: z.number().int().positive(),
    }),
  ),
  configPatch: z.object({
    provider: z.string(),
    model: z.string(),
    modelSettings: z.object({
      temperature: z.number(),
      max_tokens: z.number().int().positive(),
    }),
    skills: z.record(z.string(), z.object({ enabled: z.boolean(), config: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])) })),
    tools: z.record(
      z.string(),
      z.object({
        approval: z.enum(["off", "ask", "auto"]),
        scope: z.array(z.string()),
        rate_limit_per_minute: z.number().int().positive(),
      }),
    ),
    memory: z.object({
      mode: z.enum(["off", "session", "persistent"]),
      retention_days: z.number().int().min(0),
      token_limit: z.number().int().positive(),
    }),
  }),
});

export type CompileOutput = z.infer<typeof compileOutputSchema>;
