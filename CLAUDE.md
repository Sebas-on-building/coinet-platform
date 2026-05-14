# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repo shape

This is a **pnpm + Turbo monorepo** with workspaces declared in `pnpm-workspace.yaml`:

```
apps/*        services/*        packages/*
```

Several directories are **deliberately excluded** from the workspace and are managed independently:
`apps/mobile-client`, `apps/web-client`, `apps/user-experience`, `packages/api-client`. Don't add them
to root `pnpm` commands; cd into them or use their own package manager (e.g. `apps/client-web` uses
`bun`, plus npm scripts; it is also outside the workspace).

There are also two Next.js-shaped surfaces:
- The **repo root itself** is a Next.js 16 app (`next.config.js`, `src/`, `tsconfig.json`, `package.json` declares `next build`). The root `pnpm dev` / `pnpm build` operate on this.
- `apps/coinet-platform` is the **canonical backend** — an Express + Prisma service, not Next. This is what gets deployed to Railway and what the chat product actually runs on.

When in doubt about which surface a request applies to, ask. The repo also contains a lot of historical markdown (PHASE_*, OMNISCORE_*, DEPLOY_*, duplicated `.gitignore 4`/`.gitignore 5`, etc.); treat those as archival unless the user references them.

## Common commands

### Root (monorepo-wide, via Turbo)
```bash
pnpm dev:all      # turbo dev across workspace
pnpm build:turbo  # turbo build across workspace (root pnpm build is Next-only)
pnpm lint         # turbo lint
pnpm test         # turbo test (root jest config under jest.config.js)
pnpm typecheck    # turbo typecheck
```

Root-level Prisma helpers that delegate into `apps/coinet-platform`:
```bash
pnpm prisma:platform:generate
pnpm prisma:platform:push
```

### Backend — `apps/coinet-platform` (Express + Prisma, Vitest)
```bash
pnpm --filter coinet-platform dev:watch     # ts-node-dev auto-reload
pnpm --filter coinet-platform build         # tsc (skipLibCheck, errors tolerated)
pnpm --filter coinet-platform start         # node dist/index.js
pnpm --filter coinet-platform test          # vitest run (NOT jest)
pnpm --filter coinet-platform db:generate   # prisma generate
pnpm --filter coinet-platform db:migrate    # prisma migrate dev
pnpm --filter coinet-platform db:verify     # health-check current DATABASE_URL
pnpm --filter coinet-platform db:backup     # SQL dump of chat history
```

Single test: `pnpm --filter coinet-platform exec vitest run <path-or-pattern>`.

### Frontend — `apps/client-web` (Vite + React + shadcn/ui, deployed to Vercel)
Outside the workspace. Operate inside the directory:
```bash
cd apps/client-web && bun install && bun run dev
```

## Backend architecture (`apps/coinet-platform`)

Entry point: `apps/coinet-platform/src/index.ts`. Loads `.env` (cwd first, then app `.env` with override), runs `validateEnv()` and exits 1 on failure, then mounts route modules under `src/api/{chat,auth,feedback,portfolios,retention}/routes.ts`. Layer-2 connector init is best-effort.

### Chat request pipeline
Documented in `apps/coinet-platform/README.md` and lives in `src/api/chat/service.ts`. Roughly:

```
inbound message
  → symbol-detector (src/services/symbol-detector.ts)
  → parallel fetch: market-data (CoinGecko → CMC → DexScreener fallback),
                    whale-data (alchemy-whales), liquidation-service (Coinglass),
                    news-service, sentiment-service, user memory
  → context assembly
  → ai-service (Grok/xAI primary, OpenAI fallback)
  → SSE-streamed response with sources & chart hints
```

The AI provider chain (`XAI_API_KEY` primary, `OPENAI_API_KEY` fallback) is load-bearing; preserve it
when touching `src/services/ai-service.ts`. Multiple price APIs exist intentionally for reliability —
don't collapse them to one.

### L5–L13 layered architecture (under `apps/coinet-platform/src/l5` … `l13`)

This is the platform's **governance / certification skeleton** and is unique to this codebase. Each
layer follows the same internal shape; common sub-directories include:

- `constitution/` — formal rules and audits for the layer (forbidden actions, boundary validation, capability/policy maps)
- `contracts/` — typed surface contracts between layers
- `invariants/` — runtime invariant checks
- `validation/` — input/output validators
- `certification/` — test suites that certify a layer is in spec
- `engine/` or `runtime/` — the actual processing logic
- `persistence/`, `read/`, `replay/`, `rollout/`, `registry/`, `repair/`, `materialization/`, `templates/`, `families/` — layer-specific machinery

Layer themes (current as of recent commits):
- **L5** — purpose, authority, envelope, topology, assurance, certification, coordination
- **L6–L8** — engine layers with families/runtime/completion/repair
- **L9** — Hypothesis Engine (lead-lag, change-point, decay, phase progression, ordered signal resolution)
- **L10** — Hypothesis assembly, confidence, ranking, evidence packs, contradiction/support resolvers; reliance governance (L10.7) and persistence constitution (L10.8)
- **L11** — Calibration, attribution, drift, modifiers, missing-data, repair
- **L12** — Materialization runtime with templates
- **L13** — Grounding, context, constitution

When changing one layer, **check its `constitution/` and `certification/` first** — those define the
contracts other layers expect. The "constitutional audit" files (e.g. `l9-final-audit.ts`,
`l9-boundary-validator.ts`) encode invariants and are the canonical reference for what a layer is
allowed to do.

### Database

- PostgreSQL via Prisma. Schema: `apps/coinet-platform/prisma/schema.prisma`.
- Hosted on Railway (`DATABASE_URL` env var). **Chat history lives in the DB, not the repo** — losing the database loses conversations. `pnpm --filter coinet-platform db:backup` is the backup path.
- Two Prisma client major versions coexist: root `package.json` uses `@prisma/client@^7`, `apps/coinet-platform/package.json` uses `@prisma/client@^5`. Don't unify these without intent — they pin to different schemas/workflows.

### Deployment

- Backend: Railway, **root directory must be set to `apps/coinet-platform`** (see `RAILWAY_ROOT_DIRECTORY_CRITICAL.md`). Health check: `/api/health`. Diagnostic: `/api/diagnostic?symbol=BTC`.
- Frontend (`apps/client-web`): Vercel.
- External Railway services the backend depends on: `MARKET_PRICES_URL` (services/market-prices), `ALCHEMY_WHALES_URL` (services/alchemy-whales).

## TypeScript / lint notes

- Root `tsconfig.json` and `tsconfig.base.json` are intentionally loose (`strict: false`), with `strictNullChecks: true` at root only. Don't tighten globally without checking — many services rely on the loose mode.
- `apps/coinet-platform/package.json`'s `build` script is `tsc --skipLibCheck || true` — **type errors do not fail the backend build**. CI/typecheck is the gating step, not build.
- Backend tests use **Vitest**; root and other services use **Jest** (`jest.config.js`, ts-jest with ESM). Don't mix runners in a single package.
- ESLint config (`eslint.config.js`, flat config) enumerates each package's `tsconfig.json` explicitly — when adding a new package with its own tsconfig, add it to the `parserOptions.project` list or `pnpm lint` will fail for that package.

## Environment

Node 20 (`.nvmrc`), pnpm ≥ 8 (declared 10.18.3 via `packageManager`). The repo has stray duplicate config files (`.gitignore 4`, `.nvmrc 3`, `.pnpmfile 4.cjs`, etc.) from previous merges — these are not active; the unsuffixed versions are the live ones.

Required env for backend: `DATABASE_URL`, plus at least one of `XAI_API_KEY` / `OPENAI_API_KEY`. Recommended: `COINGECKO_API_KEY`, `COINGLASS_API_KEY`, `CRYPTOPANIC_API_KEY`, `CMC_API_KEY`. Full list in `apps/coinet-platform/README.md` and `ENVIRONMENT_VARIABLES_GUIDE.md`.
