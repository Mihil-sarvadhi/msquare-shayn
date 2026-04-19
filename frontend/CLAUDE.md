# Frontend — Claude Code Rules

See root `CLAUDE.md` for monorepo commands.

## Tech Stack

React 19 · TypeScript 5.9 · Vite 7 · Tailwind CSS 3.4 · Redux Toolkit + redux-persist · React Query · React Hook Form + Zod · React Router DOM 7 · Axios · Lucide React · Vitest + Testing Library + MSW

## Quick Start

```bash
npm run local    # dev server at http://localhost:5000
npm run dev      # dev server at http://localhost:5001
npm run build    # tsc -b + vite build
npm run lint     # ESLint --max-warnings 0
npm run test:run # Vitest run all tests
```

## Architecture

| Concern | Location |
|---------|----------|
| API calls | `src/services/{feature}/{feature}.api.ts` |
| Mutations | `src/services/{feature}/{feature}.query.ts` |
| Redux slices | `src/store/slices/{feature}Slice.ts` |
| Pages | `src/pages/{feature}/page.tsx` |
| Shared UI | `src/components/shared/` |
| Layout | `src/components/layout/` |

## Path Aliases

```
@/            → src/
@components/* → src/components/*
@pages/*      → src/pages/*
@store/*      → src/store/*
@services/*   → src/services/*
@utils/*      → src/utils/*
@lib/*        → src/lib/*
@app/types/*  → src/types/*
```

## Key Rules

- Named exports only — no `export default` (except slice reducers)
- `useAppSelector` / `useAppDispatch` from `src/store/hooks.ts` — never raw hooks
- `import type` for all type-only imports (`verbatimModuleSyntax: true`)
- All Zod schemas in `src/utils/validations/index.ts`
- `API_ENDPOINTS` from `src/utils/constants/api.constant.ts` — never hardcode URLs
- `logger` from `src/lib/logger.ts` — never `console.log`
- `cn()` from `src/lib/utils.ts` for conditional Tailwind classes
- Always PUT for updates, never PATCH
