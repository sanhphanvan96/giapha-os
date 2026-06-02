# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
bun install        # install dependencies
bun run dev        # start dev server at localhost:3000
bun run build      # production build
bun run lint       # run eslint
```

This project uses **Bun** as the package manager. Do not use npm or yarn.

## Git

Never commit or push unless the user explicitly asks.

## Environment

Copy `.env.example` to `.env.local` and fill in the Supabase credentials:

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY=
SITE_NAME=         # optional display name
```

## Architecture

**GiaPha-OS** is a Vietnamese family tree management app built on Next.js 16 App Router with Supabase as the backend.

### Data model

Three core tables in Supabase:
- `persons` — family members with optional partial dates (year-only is valid), lunar death dates, `birth_order`, `generation`, `is_in_law`, `is_deceased`
- `relationships` — edges between persons: `marriage`, `biological_child`, or `adopted_child`. In parent-child edges, `person_a` is the parent and `person_b` is the child.
- `profiles` — extends `auth.users` with `role` (`admin`/`editor`/`member`) and `is_active`

Full schema is in [`docs/schema.sql`](docs/schema.sql); incremental migrations are in [`docs/migrations/`](docs/migrations/).

### Auth & roles

Auth is Supabase Auth. After login the dashboard layout (`app/dashboard/layout.tsx`) fetches the `profiles` row and blocks inactive accounts before rendering. The three roles control write access:
- **admin** — full access including user management
- **editor** — can create, edit, and delete members and relationships
- **member** — read-only

`utils/supabase/queries.ts` exports `getUser`, `getProfile`, and `getSupabase`, all wrapped in React `cache()` so they deduplicate within a single request.

### Data fetching pattern

Server components fetch data directly via `getSupabase()`. All mutations go through Next.js Server Actions in `app/actions/` (`member.ts`, `user.ts`, `data.ts`). Server actions check `profile.role` before writing.

### Tree visualization

`components/FamilyTree.tsx` renders the hierarchical tree using a custom recursive layout (not D3 layouts — D3 is used only for pan/zoom via `hooks/usePanZoom.ts`). Before rendering, `utils/treeHelpers.ts:buildAdjacencyLists()` converts the flat `relationships` array into `Map`-based adjacency lists for O(1) lookups. Children within each node are sorted by `birth_order` then `birth_year`.

`components/MindmapTree.tsx` renders an alternative radial mindmap view of the same data.

### Kinship calculator

`utils/kinshipHelpers.ts` implements a BFS traversal over the relationship graph to find the shortest path between two persons and maps it to Vietnamese kinship terminology (e.g., Bác, Chú, Cô, Dì).

### View state

`context/MemberListContext.tsx` (`MemberListProvider`) holds client-side view state for the members page: active modal, view mode (`tree`/`mindmap`/`bubble`/`list`, default `tree`), avatar visibility, tree root, and all filter toggles (`hideDaughtersInLaw`, `hideSonsInLaw`, `hideDaughters`, `hideSons`, `hideMales`, `hideFemales`, `hideExpandButtons`, `autoCollapseLevel`). Filter state lives in context so it persists when switching between views. State is synced to URL search params so links are shareable.

`components/UserProvider.tsx` exposes current user and profile via `useUser()` to client components.

### Import / export

`app/actions/data.ts` handles JSON, CSV (via papaparse), and GEDCOM backup/restore. `utils/gedcom.ts` and `utils/csv.ts` contain the format-specific serialization logic.

## UI / Design system

All UI work must follow [`DESIGN.md`](DESIGN.md) strictly — do not invent new tokens.

Key design tokens:
- **Colors:** primary `#1c1917`, secondary `#57534e`, tertiary/accent `#d97706` (amber), neutral bg `#fafaf9`, surface `#ffffff`, border `#e7e5e4`
- **Typography:** Be Vietnam Pro for all text (headings and body); single font, weights 400–800
- **Shapes:** `rounded-2xl`/`rounded-3xl` for cards; `rounded-full` only for avatars and icon buttons
- **Elevation:** achieved by stacking white (`bg-white/70 backdrop-blur-xl`) on the limestone neutral — avoid heavy drop shadows
