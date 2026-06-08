# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## MCP Tools

Two MCP servers are active. Prefer them over built-in tools when applicable — they are faster and cheaper.

**Serena** — semantic, symbol-aware code navigation. Call `initial_instructions` before any coding task.
- `find_symbol` / `get_symbols_overview` → understand structure without reading whole files
- `find_referencing_symbols` / `find_implementations` → replace `grep -rn` for symbols
- `get_diagnostics_for_file` → quick TypeScript check without running `bun build`
- `find_declaration` → jump to where a type/function is defined

**fast-filesystem** — text/pattern-based file operations, complements Serena.
- `fast_read_multiple_files` → read many files in one call (vs N `Read` calls)
- `fast_search_code` → code search without Bash
- `fast_get_directory_tree` → explore directory structure
- `fast_edit_multiple_blocks` → apply multiple edits in one file in a single call
- `fast_extract_lines` → read exact line ranges efficiently

## Commands

```bash
bun install        # install dependencies
bun run dev        # start dev server at localhost:3000
bun run build      # production build
bun run lint       # run eslint
bun test           # chạy unit tests (logic/utils/server actions) — dùng bun:test
bun run test       # chạy component tests (React/RTL) — dùng Vitest + jsdom
bun run test:watch # Vitest watch mode khi dev
```

This project uses **Bun** as the package manager. Do not use npm or yarn.

## Testing

Hai test runner song song, **không được trộn lẫn**:

| Runner | Command | File pattern | Dùng cho |
|---|---|---|---|
| `bun:test` | `bun test` | `*.test.ts` | Pure logic, utils, server actions |
| Vitest + RTL | `bun run test` | `*.test.tsx` | React components, jsdom |

**Quy tắc khi viết test mới:**
- Test logic thuần (helpers, actions) → đặt file `*.test.ts`, dùng `import { describe, it, expect } from "bun:test"`
- Test React component → đặt file `*.test.tsx`, dùng `import { describe, it, expect, vi } from "vitest"` + `@testing-library/react`
- Không đặt JSX trong `*.test.ts` và không dùng `bun:test` trong `*.test.tsx`

Config phân tách: `bunfig.toml` dùng `pathIgnorePatterns` để bun bỏ qua `*.test.tsx`; `vitest.config.ts` dùng `include: ["**/*.test.tsx"]` để Vitest bỏ qua `*.test.ts`.

## Git

**Never** `git add`, `git commit`, or `git push` unless the user explicitly asks. This rule has no exceptions — do not stage or commit even documentation, plans, or config files without being asked.

## Environment

Copy `.env.example` to `.env.local` and fill in the Supabase credentials:

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY=
SITE_NAME=         # optional display name
```

## Database Migrations

Files in `supabase/migrations/`. Dùng `supabase migration new <name>` để tạo (tự sinh timestamp 14 chữ số).

```bash
supabase migration up   # apply lên local — không mất data
supabase db push        # apply lên production — không mất data
```

## Database — Quy tắc tuyệt đối

Các lệnh sau **TUYỆT ĐỐI KHÔNG ĐƯỢC CHẠY** trừ khi user nói rõ ràng:

- `supabase db reset` / `supabase db reset --local` — xóa toàn bộ data local
- `supabase db push` — ghi lên production
- `DROP TABLE`, `TRUNCATE`, `DELETE` không có `WHERE`
- Bất kỳ lệnh nào ảnh hưởng đến database (local hoặc production) mà không có lệnh rõ ràng

Sự cố 2026-06-07: chạy `supabase db reset --local` làm mất toàn bộ data nhập tay. Phải mất nhiều giờ khôi phục từ production.

## Database Backup

```bash
./scripts/backup-prod.sh   # dump schema + data từ production, giữ 7 bản gần nhất
```

Bản backup lưu tại `backups/` (gitignored). Script dùng `supabase db dump --linked` — cần Docker chạy và `supabase login`.

First-time setup (login, link, pull baseline): xem [`docs/runbook-migrations.md`](docs/runbook-migrations.md).

## Plans

Every non-trivial feature or fix must have a **full plan** saved in `docs/plans/<feature-slug>.md` before coding begins, and kept up to date throughout. Plans live in the repo (not in agent-local paths) so any future coding session or agent can pick up where the previous one left off.

A complete plan file must include:
- **Context** — why the change is being made, what problem it solves
- **Design decisions** — key choices and trade-offs
- **Architecture / solution approach** — how it works, data flow
- **Files to change** — table of file → what changes
- **API signatures** — new or modified function/type signatures
- **Verification** — test commands + manual browser checklist with `- [ ]` boxes
- **Progress log** — date + commit + notes after each session

Update `- [ ]` → `- [x]` as steps are completed. Never leave the plan as checklist-only without the full plan context.

## Architecture

**GiaPha-OS** is a Vietnamese family tree management app built on Next.js 16 App Router with Supabase as the backend.

### Data model

Three core tables in Supabase:
- `persons` — family members with optional partial dates (year-only is valid), lunar death dates, `birth_order`, `generation`, `is_in_law`, `is_deceased`
- `relationships` — edges between persons: `marriage`, `biological_child`, or `adopted_child`. In parent-child edges, `person_a` is the parent and `person_b` is the child.
- `profiles` — extends `auth.users` with `role` (`admin`/`editor`/`member`) and `is_active`

Full schema is in [`docs/schema.sql`](docs/schema.sql); incremental migrations are in [`supabase/migrations/`](supabase/migrations/).

### Auth & roles

Auth is Supabase Auth. After login the dashboard layout (`app/dashboard/layout.tsx`) fetches the `profiles` row and blocks inactive accounts before rendering. The three roles control write access:
- **admin** — full access including user management
- **editor** — can create, edit, and delete members and relationships
- **member** — read-only

`utils/supabase/queries.ts` exports `getUser`, `getProfile`, and `getSupabase`, all wrapped in React `cache()` so they deduplicate within a single request.

### Data fetching pattern

Server components fetch data directly via `getSupabase()`. All mutations go through Next.js Server Actions in `app/actions/` (`member.ts`, `user.ts`, `data.ts`). Server actions check `profile.role` before writing.

### Tree visualization

`components/FamilyTree.tsx` — custom recursive layout (D3 chỉ dùng cho pan/zoom qua `hooks/usePanZoom.ts`). `utils/treeHelpers.ts:buildAdjacencyLists()` build Map adjacency lists trước khi render. `components/MindmapTree.tsx` — radial mindmap view.

### Kinship calculator

`utils/kinshipHelpers.ts` — BFS trên relationship graph, map sang xưng hô tiếng Việt. Exports: `computeKinship` (pairwise), `computeEgoLabels` (batch).

### View state

`context/MemberListContext.tsx` (`MemberListProvider`) — view mode, filter toggles, `viewAsPersonId`, synced to URL params. `components/UserProvider.tsx` — expose user + profile qua `useUser()`.

### Import / export

`app/actions/data.ts` — JSON, CSV (papaparse), GEDCOM. Logic ở `utils/gedcom.ts` và `utils/csv.ts`.

Chi tiết: [`docs/architecture.md`](docs/architecture.md).

## UI / Design system

All UI work must follow [`DESIGN.md`](DESIGN.md) strictly — do not invent new tokens.

### Mobile-first

All UI must work on mobile (~375px) before desktop. Use Tailwind responsive prefixes (`sm:`, `md:`) to enhance upward — never assume a wide viewport as the base. Key patterns already in use:
- Flex rows: `flex-col sm:flex-row`
- Widths: `w-full sm:w-72` for selectors/inputs
- Text: hide labels on mobile with `hidden sm:inline`, keep icons always visible
- Touch targets: minimum `size-10` (40px) for interactive elements
- Truncate long text with `truncate` + `title` attribute for full value on hover
