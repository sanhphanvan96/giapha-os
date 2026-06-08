# Plan: Trợ lý AI gia phả (MVP — Chat xưng hô & tra cứu)

> Trạng thái: **chưa quyết định làm hay không** (lưu để cân nhắc sau). Lập 2026-06-07.

## Context

App gia phả hiện tính xưng hô bằng `computeKinship` (deterministic, BFS trên đồ thị quan hệ) và hiển thị ở trang `/dashboard/kinship`. Người dùng phải tự chọn 2 người từ dropdown. Mục tiêu: thêm **trợ lý AI dạng chat** để hỏi tự nhiên bằng tiếng Việt — "ông A gọi bà B là gì?", "con của ông C là ai?", "tìm người tên Lan" — mà **hoàn toàn miễn phí** và **ổn định**.

Yêu cầu đã chốt với người dùng:
- **Provider:** Gemini free tier (chính) + OpenRouter free (fallback khi Gemini lỗi/hết quota).
- **Phase 1 (plan này):** Chat hỏi đáp xưng hô + tra cứu cơ bản. Read-only, mọi role dùng được.
- **Phase 2 (chưa làm, chỉ phác thảo cuối file):** AI thêm thành viên từ mô tả tự nhiên (chỉ editor/admin).

## Design decisions

1. **Lõi trả lời là deterministic, LLM chỉ điều phối.** Câu trả lời xưng hô đến từ `computeKinship`/`buildAdjacencyLists` (đã có sẵn, đã test), KHÔNG để LLM tự bịa. LLM chỉ làm: hiểu câu hỏi → khớp tên người → gọi tool → diễn đạt lại tiếng Việt. ⇒ độ ổn định cao dù model free yếu.

2. **1 adapter OpenAI-compatible cho cả 2 provider.** Gemini có endpoint OpenAI-compat (`https://generativelanguage.googleapis.com/v1beta/openai/`), OpenRouter native OpenAI-compat (`https://openrouter.ai/api/v1`). Cùng format `/chat/completions` + `tools` ⇒ chỉ cần 1 client + 2 config, fallback = thử Gemini, lỗi thì thử OpenRouter.

3. **Dùng Server Action, không phải route handler.** MVP không stream từng token (vòng lặp tool-calling vốn khó stream), chỉ cần "đang gõ…" + trả lời 1 lần. Server action `app/actions/ai.ts` có sẵn auth/role qua `getProfile()`, đồng nhất với phần còn lại của app. Nếu sau này cần streaming → tách `app/api/chat/route.ts` (mẫu duy nhất có sẵn: `app/api/check-setup/route.ts`).

4. **Chỉ expose dữ liệu công khai cho LLM.** Tools chỉ trả về slice `{id, full_name, gender, birth_year, generation}` — đúng projection của trang kinship, KHÔNG gồm phone/occupation/residence ⇒ không rò rỉ dữ liệu riêng tư cho người dùng role `member`.

5. **Phân quyền theo role:** đọc/hỏi xưng hô cho **mọi role đăng nhập** (member/editor/admin). Phase 2 (add-member) mới giới hạn editor/admin. Tính năng tự tắt nếu thiếu API key (`AI_ENABLED`).

6. **"Tôi" tự resolve về người dùng.** Nếu `profile.person_id` tồn tại, nạp vào context để hỏi "tôi gọi X là gì" hoạt động.

## Kiến trúc / luồng

```
[AIChatPanel.tsx]  ── messages ──>  [askFamilyAssistant() server action]
   (drawer UI)                          1. getUser/getProfile → check login + role
                                        2. nạp persons(projected) + relationships 1 lần
                                        3. agentic loop (max ~5 vòng):
                                           gọi provider /chat/completions với `tools`
                                           ↳ nếu tool_calls → chạy executor (deterministic) → append kết quả → lặp
                                           ↳ nếu text → trả về
                                        4. return { answer } | { error }
   <── answer ───
```

**Tools cung cấp cho LLM** (mọi tool chạy trên dữ liệu đã nạp, in-memory):
- `search_person(query)` → `[{id, full_name, gender, birth_year, generation}]` — fuzzy match tên (chuẩn hoá bỏ dấu). Trả birth_year/generation để LLM phân biệt người trùng tên.
- `compute_kinship(personIdA, personIdB)` → `{aCallsB, bCallsA, description, pathLabels}` — bọc `computeKinship`.
- `get_relatives(personId)` → `{spouses[], children[], parents[]}` (tên + id) — bọc `buildAdjacencyLists` + tra parent từ relationships.

**Agentic loop:** system prompt tiếng Việt ("Bạn là trợ lý gia phả, chỉ trả lời dựa trên tool, không bịa. Nếu nhiều người trùng tên, hỏi lại để làm rõ."). Giới hạn số vòng để chống loop vô hạn của model free.

## Files to change

| File | Thay đổi |
|---|---|
| `utils/ai/provider.ts` | **Mới.** Client OpenAI-compat (raw `fetch`): `chatComplete({messages, tools})`. Config Gemini + OpenRouter, logic fallback. Đọc key từ `process.env`. |
| `utils/ai/kinshipTools.ts` | **Mới.** Định nghĩa JSON-schema 3 tool + executor bọc `computeKinship` / `buildAdjacencyLists` / search. Nhận `persons`, `relationships` đã nạp. |
| `utils/ai/index.ts` | **Mới.** `runAssistant(messages, ctx)` — vòng lặp tool-calling, ráp provider + tools. |
| `app/actions/ai.ts` | **Mới.** `"use server"` — `askFamilyAssistant(messages)`: auth qua `getProfile()`, nạp data (projection giống `app/dashboard/kinship/page.tsx`), gọi `runAssistant`, trả `{answer}`/`{error}`. |
| `components/AIChatPanel.tsx` | **Mới.** Drawer chat (framer-motion + DESIGN.md tokens), mẫu theo `components/modal/CustomEventModal.tsx`. State: `messages`, `loading`. Render markdown câu trả lời. |
| Nút mở chat | Floating button / mục header dashboard (vd. trong `app/dashboard/layout.tsx` hoặc topbar). Ẩn nếu `!AI_ENABLED`. |
| `app/config.ts` | Thêm `aiEnabled = !!process.env.GEMINI_API_KEY` (+ model overrides) để bật/tắt UI. |
| `.env.example` | Thêm `GEMINI_API_KEY=`, `OPENROUTER_API_KEY=`, optional `GEMINI_MODEL=`, `OPENROUTER_MODEL=`. |
| `package.json` | Thêm `react-markdown` (render câu trả lời). KHÔNG cần SDK LLM — dùng raw `fetch`. |
| `utils/ai/kinshipTools.test.ts` | **Mới.** `bun:test` — test executor (search, compute_kinship, get_relatives) trên dataset nhỏ. |

**Tái sử dụng (không viết lại):**
- `utils/kinshipHelpers.ts` → `computeKinship`, `PersonNode`, `RelEdge`.
- `utils/treeHelpers.ts` → `buildAdjacencyLists`.
- `utils/supabase/queries.ts` → `getProfile`, `getSupabase`.
- Projection persons/relationships: copy `select` từ `app/dashboard/kinship/page.tsx`.
- UI shell: `components/modal/CustomEventModal.tsx` (framer-motion drawer pattern).

## API signatures

```ts
// utils/ai/provider.ts
export interface ChatMessage { role: "system"|"user"|"assistant"|"tool"; content: string; tool_call_id?: string; tool_calls?: ToolCall[]; }
export interface ToolDef { name: string; description: string; parameters: object; }
export async function chatComplete(opts: {
  messages: ChatMessage[]; tools: ToolDef[];
}): Promise<ChatMessage>;            // tự fallback Gemini → OpenRouter

// utils/ai/kinshipTools.ts
export function buildKinshipTools(persons: PersonNode[], relationships: RelEdge[]): {
  defs: ToolDef[];
  execute(name: string, args: any): unknown;   // deterministic
};

// utils/ai/index.ts
export async function runAssistant(
  messages: ChatMessage[],
  ctx: { persons: PersonNode[]; relationships: RelEdge[]; currentPersonId?: string | null },
): Promise<string>;                  // trả câu trả lời cuối, max ~5 vòng tool

// app/actions/ai.ts
export async function askFamilyAssistant(
  messages: { role: "user"|"assistant"; content: string }[],
): Promise<{ answer: string } | { error: string }>;
```

## Ước lượng (độ khó / ổn định / effort)

| Hạng mục | Độ khó | Độ ổn định | Effort |
|---|---|---|---|
| Adapter OpenAI-compat + fallback | Thấp | Cao (format chuẩn) | ~0.5 ngày |
| Tools deterministic (bọc hàm có sẵn) | Thấp | **Rất cao** (không phụ thuộc LLM) | ~0.5 ngày |
| Agentic loop tool-calling | Trung bình | Trung bình–cao | ~0.5 ngày |
| UI drawer chat + markdown | Thấp–TB | Cao | ~1 ngày |
| Wiring role/env/config + test | Thấp | Cao | ~0.5 ngày |
| **MVP tổng** | **Trung bình** | **Cao** | **~3 ngày** |

**Rủi ro & giảm thiểu:**
- *Model free hết quota / chậm:* fallback OpenRouter + thông báo lỗi thân thiện; lõi xưng hô vẫn đúng vì deterministic.
- *Tên trùng:* tool trả birth_year/generation, system prompt yêu cầu hỏi lại.
- *Function-calling của model free yếu:* chọn model free có hỗ trợ tools tốt (Gemini 2.5 Flash; OpenRouter: Llama 3.3 70B / DeepSeek V3). Nếu model bỏ qua tool → có thể thêm fallback "1 tool bắt buộc" hoặc giảm về luồng deterministic (NER tên → computeKinship) cho câu hỏi xưng hô 2 người.
- *Chi phí:* $0 — cả 2 provider free tier. Thêm throttle đơn giản theo user (optional) để khỏi vượt 15 req/phút của Gemini.

## Verification

```bash
bun test utils/ai/kinshipTools.test.ts   # executor đúng trên dataset nhỏ
bun run lint
bun run build                            # type-check
```
Checklist thủ công (cần `GEMINI_API_KEY` trong `.env.local`, `bun run dev`):
- [ ] Mở drawer chat từ dashboard; ẩn khi không có key.
- [ ] Hỏi "ông A gọi bà B là gì?" → trả lời khớp với trang `/dashboard/kinship`.
- [ ] Hỏi "con của X là ai?" → đúng danh sách con (so với cây).
- [ ] Hỏi tên trùng → trợ lý hỏi lại để phân biệt.
- [ ] "Tôi gọi X là gì?" hoạt động khi tài khoản có `person_id`.
- [ ] Tắt mạng Gemini (đổi key sai) → fallback OpenRouter trả lời được.
- [ ] Role `member` dùng được; không thấy phone/occupation trong câu trả lời.
- [ ] Mobile ~375px: drawer full-screen, gõ & cuộn ổn.

## Phase 2 (phác thảo — chưa làm)

AI thêm thành viên từ mô tả: LLM sinh `{persons[], relationships[]}` (schema theo skill `giapha-generator`), **bắt buộc preview** (bảng người + cạnh quan hệ) trước khi ghi. Cần **action insert non-destructive mới** (`addMembersBatch`) mirror `sanitizePerson`/`sanitizeRelationship` trong `app/actions/data.ts` — KHÔNG dùng `importData` (nó xoá sạch cây). Gate editor/admin. Rủi ro cao hơn (AI bịa quan hệ/UUID) ⇒ preview + validate là bắt buộc.

## Progress log

- 2026-06-07: Lập plan, chốt hướng (Gemini+OpenRouter fallback, MVP chat xưng hô+tra cứu, server action, tools deterministic). Chưa code — chờ quyết định.
