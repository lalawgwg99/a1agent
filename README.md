# a1agent

Card-based Agent Builder for beginners.

`a1agent` is a visual, game-like configuration app for AI agents.
Instead of editing YAML/JSON manually, users build an agent by plugging cards into a deck.

## Why this exists

Most current AI tools are either:
- chat-first (hard to control behavior consistently), or
- node/workflow-first (too complex for beginners).

`a1agent` takes a third approach:
- deck-first UX (Model card + Skill card + Soul card + Tool card + Memory card),
- instant preview of effective config/prompt,
- one-click export to runtime configs (first target: Hermes, then OpenClaw).

## Product goals

- Beginner-friendly: zero prompt engineering required.
- Predictable: users always see the final effective behavior before applying.
- Shareable: decks can be exported/imported as portable codes.
- Safe-by-default: approval gates and backup/rollback on config apply.

## MVP scope (v0.1)

### In scope

- Card deck editor (drag/drop + reorder)
- 5 card types:
  - `ModelCard`
  - `SkillCard`
  - `SoulCard`
  - `ToolCard`
  - `MemoryCard`
- Live preview panel:
  - effective model settings
  - effective tool permissions
  - compiled soul/system prompt
- Deck save/load (local)
- Deck share code (`deck://v1/...`)
- Compile to Hermes output:
  - `config.yaml` fragment
  - `SOUL.md`
- Apply flow with backup + rollback

### Out of scope (v0.1)

- Multi-user/team permissions
- Cloud sync
- Full marketplace
- Complex node-based workflow canvas

## Architecture (initial)

- Frontend: Next.js + TypeScript
- UI: shadcn/ui + dnd-kit
- State: Zustand
- Validation: Zod
- Backend API: Next.js route handlers
- Runtime adapters:
  - Hermes adapter (first)
  - OpenClaw adapter (next)

## Data model (draft)

- `Deck`
  - `id`, `name`, `target`, `version`, `cards[]`, `meta`
- `ModelCard`
  - `provider`, `model`, `temperature`, `maxTokens`
- `SkillCard`
  - `skillId`, `enabled`, `config`
- `SoulCard`
  - `persona`, `tone`, `language`, `boundaries[]`
- `ToolCard`
  - `toolId`, `approval`, `scope[]`, `rateLimit`
- `MemoryCard`
  - `mode`, `retentionDays`, `tokenLimit`
- `CompileOutput`
  - `effectivePrompt`, `effectiveModel`, `effectiveTools`, `configPatch`

## UX principles

- No-code first: no manual YAML/JSON editing in default path.
- Explainability: always show effective prompt/config.
- Guardrails: dangerous tool modes require explicit confirmation.
- Fast iteration: one-click test and compare decks.

## Quick start (planned)

```bash
# 1) install
pnpm install

# 2) run dev server
pnpm dev

# 3) open app
# http://localhost:3000
```

## Repo status

Current status: **bootstrapping** (this repository was initially empty).

## Next steps (what I will build next)

### Step 1: project scaffold

- Initialize Next.js + TypeScript project
- Add ESLint/Prettier and basic CI check
- Add base layout and theme tokens

### Step 2: core domain types

- Implement Zod schemas for all card types and deck
- Add compile pipeline interfaces
- Add fixtures for 3 starter decks

### Step 3: card builder UI

- Implement card library panel
- Implement deck slots with drag/drop
- Implement card property editor forms

### Step 4: preview + compiler

- Build live effective preview panel
- Compile deck to Hermes `config.yaml` + `SOUL.md`
- Add validation errors with actionable messages

### Step 5: persistence + sharing

- Local save/load decks
- Export/import `deck://v1` share code
- Add compatibility/version checks

### Step 6: safe apply flow

- Hermes config backup before apply
- Apply + verify
- Rollback on failure

## Definition of done for v0.1

- New user can create a deck from template in under 3 minutes
- User can preview effective behavior before apply
- User can export deck and import on another machine
- Hermes apply flow is recoverable (backup + rollback)

## Contribution

Before opening PR:
- run lint
- run tests
- ensure README examples still match implementation

---

If you are the project owner, the immediate priority is **Step 1 + Step 2** to make the app executable as soon as possible.
