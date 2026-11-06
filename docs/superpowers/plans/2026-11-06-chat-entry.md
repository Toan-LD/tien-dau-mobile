# Chat Entry (phase 2) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The user types "hôm nay ăn sáng 30k" in the Chatbot tab and gets a draft card they confirm with Lưu, which records the transaction.

**Architecture:** The `chat` Edge Function gets a read-only tool `propose_transaction`. The tool parses the amount and date on the server, matches the category, and collects drafts for the request. The response carries `drafts` next to `reply`. The app shows each draft as a numbered card in the chat. Lưu calls the existing `createTransaction`. Corrections send `replaces: N`, so the new card replaces the old one. The app sends card states up as `cards`, so the server can refuse to replace a card that is already saved.

**Tech Stack:** Deno (Edge Function, `deno test`), OpenAI-compatible tool calling, Expo SDK 58 / React Native, TanStack Query, Jest (jest-expo).

**Spec:** `docs/superpowers/specs/2026-11-06-chat-entry-design.md` (Vietnamese). Read it first; this plan does not repeat its reasons.

## Global Constraints

- Expo Go only: no new native libraries. No new dependencies are needed for this plan.
- Edge Function code never imports from `src/`. The app never imports from `supabase/functions/`.
- The Edge Function stays read-only. Only the app writes, through `createTransaction` in `src/lib/transactions.ts`.
- Money is a positive integer VND, 1 to `999_999_999_999`, displayed like `30.000 đ`.
- Dates are `YYYY-MM-DD`. On the server, "today" is `vietnamToday(now)`. In the app, use `src/lib/dates.ts` helpers and never `toISOString()`.
- At most 5 drafts per reply; `cards` holds at most the last 20 cards; a note is at most 200 characters.
- Full, descriptive names (no `tx`, `d`, `cat`, `acc`); callback parameters are named too.
- No code comments unless something truly surprising needs one (owner rule).
- No inline style literals; `StyleSheet.create` at the bottom of the file. Line icons in one dark gray, no emoji, no gradients.
- Prettier formatting with 4-space indent: `npx expo lint` treats formatting issues as errors.
- UI text and tool/prompt text are Vietnamese; test names follow the language of the surrounding test file (Deno tests: Vietnamese; Jest: English).
- Deno is not on PATH: `npm run test:fn` / `npm run check:fn` use the copy in `node_modules/.bin`.

## Review Focus

1. **Lưu tapped on the old card while the correction is in flight.** The new card must not hide a saved transaction. It shows the warning "Thẻ trước đã được ghi; lưu thẻ này sẽ thành khoản thứ hai". Pinned in Task 6.
2. **Double tap on Lưu.** It must create exactly one transaction. Pinned in Task 7.
3. **Save fails** (offline, or the category was deleted on another device). The card goes back to open and a toast shows. Nothing is marked saved. Pinned in Task 7.
4. **"Cuộc trò chuyện mới" while a save is in flight.** The late result must not bring old cards back or crash. Pinned in Tasks 6 and 7.
5. **Request arrives near Vietnamese midnight.** `today` comes from `vietnamToday`, so "hôm nay" at 00:30 VN (17:30 UTC the day before) is the VN date. Pinned in Task 4.

---

### Task 1: `parseAmount` (server)

**Files:**
- Modify: `supabase/functions/_shared/money.ts`
- Test: `supabase/functions/_shared/money.test.ts`

**Interfaces:**
- Produces: `export const MAX_AMOUNT = 999_999_999_999;` and `export type AmountResult = { ok: true; amount: number } | { ok: false; error: string };` and `export function parseAmount(input: string): AmountResult`

- [ ] **Step 1: Write the failing tests** (add to `money.test.ts`)

```ts
Deno.test("parseAmount hiểu k, nghìn, ngàn, n", () => {
    for (const input of ["30k", "30 k", "30K", "30 nghìn", "30 ngàn", "30n", "30 nghìn đồng"]) {
        assertEquals(parseAmount(input), { ok: true, amount: 30000 }, input);
    }
    assertEquals(parseAmount("1,5k"), { ok: true, amount: 1500 });
    assertEquals(parseAmount("1k5"), { ok: true, amount: 1500 });
});
Deno.test("parseAmount hiểu số có dấu ngăn hàng nghìn và đơn vị đồng", () => {
    for (const input of ["30.000", "30,000", "30000", "30000đ", "30.000 đ", "30.000 vnđ"]) {
        assertEquals(parseAmount(input), { ok: true, amount: 30000 }, input);
    }
    assertEquals(parseAmount("1.250.000"), { ok: true, amount: 1250000 });
});
Deno.test("parseAmount hiểu triệu, củ, m, tỷ và số lẻ kiểu 1tr2", () => {
    assertEquals(parseAmount("1tr2"), { ok: true, amount: 1200000 });
    assertEquals(parseAmount("1tr25"), { ok: true, amount: 1250000 });
    assertEquals(parseAmount("1tr250"), { ok: true, amount: 1250000 });
    assertEquals(parseAmount("1,5tr"), { ok: true, amount: 1500000 });
    assertEquals(parseAmount("1.5 triệu"), { ok: true, amount: 1500000 });
    assertEquals(parseAmount("2 củ"), { ok: true, amount: 2000000 });
    assertEquals(parseAmount("15tr"), { ok: true, amount: 15000000 });
    assertEquals(parseAmount("2m"), { ok: true, amount: 2000000 });
    assertEquals(parseAmount("1 tỷ"), { ok: true, amount: 1000000000 });
});
Deno.test("parseAmount từ chối số trần dưới 1.000 vì mơ hồ", () => {
    for (const input of ["30", "999", "1.5"]) {
        const result = parseAmount(input);
        assertFalse(result.ok, input);
        assert(!result.ok && result.error.includes("mơ hồ"), input);
    }
});
Deno.test("parseAmount từ chối rác, số 0, số âm và số quá lớn", () => {
    for (const input of ["", "abc", "0", "0k", "-30k", "30kk", "1000000000000", "1000 tỷ"]) {
        assertFalse(parseAmount(input).ok, input);
    }
});
```

- [ ] **Step 2: Run to verify they fail**

Run: `npm run test:fn -- --filter parseAmount`
Expected: FAIL, `parseAmount` is not exported.

- [ ] **Step 3: Implement `parseAmount(input: string): AmountResult` in `_shared/money.ts`**

Approach:
1. Normalize with `normalizeName` from `_shared/categories.ts` (lowercases, `đ`→`d`, strips diacritics).
2. Strip a trailing currency word: `d`, `vnd`, `dong`.
3. Match `^(\d+(?:[.,]\d+)*)\s*(k|nghin|ngan|n|tr|trieu|cu|m|ty)?\s*(\d{1,3})?$`.
4. A unit multiplies: k/nghin/ngan/n = 1e3, tr/trieu/cu/m = 1e6, ty = 1e9.
5. Reading the number part:
   - With a unit, a single `.`/`,` followed by 1–2 digits is a decimal point ("1,5tr").
   - Otherwise every `.`/`,` group must be exactly 3 digits and is a thousands separator.
6. Digits after the unit ("1tr2") are the next three places: right-pad them to 3 digits and multiply by unit/1000. So "1tr2" = 1e6 + 200 × 1e3, "1tr25" = 1e6 + 250 × 1e3, and "1k5" = 1e3 + 500.
7. Without a unit, a whole number below 1000, or any decimal, is an error containing "mơ hồ" ("Số tiền "30" mơ hồ: hỏi lại người dùng là 30.000 đ hay 30 đ.").
8. Round, then require an integer from 1 to `MAX_AMOUNT`. Every error is Vietnamese and includes examples of valid forms.

- [ ] **Step 4: Run to verify they pass**

Run: `npm run test:fn -- --filter parseAmount`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add supabase/functions/_shared/money.ts supabase/functions/_shared/money.test.ts
git commit -m "feat(chat): parse Vietnamese shorthand amounts on the server"
```

### Task 2: `resolveEntryDate` (server)

**Files:**
- Modify: `supabase/functions/_shared/periods.ts`
- Test: `supabase/functions/_shared/periods.test.ts`

**Interfaces:**
- Produces: `export type EntryDateResult = { ok: true; date: string } | { ok: false; error: string };` and `export function resolveEntryDate(input: string, today: string): EntryDateResult`

- [ ] **Step 1: Write the failing tests** (today = `2026-11-06`, a Friday, unless stated)

```ts
Deno.test("resolveEntryDate: today, yesterday, day_before_yesterday", () => {
    assertEquals(resolveEntryDate("today", "2026-11-06"), { ok: true, date: "2026-11-06" });
    assertEquals(resolveEntryDate("yesterday", "2026-11-01"), { ok: true, date: "2026-10-31" });
    assertEquals(resolveEntryDate("day_before_yesterday", "2026-01-01"), { ok: true, date: "2025-12-30" });
});
Deno.test("resolveEntryDate: thứ trong tuần là lần gần nhất không sau hôm nay", () => {
    assertEquals(resolveEntryDate("friday", "2026-11-06"), { ok: true, date: "2026-11-06" });
    assertEquals(resolveEntryDate("monday", "2026-11-06"), { ok: true, date: "2026-11-02" });
    assertEquals(resolveEntryDate("saturday", "2026-11-06"), { ok: true, date: "2026-10-31" });
    assertEquals(resolveEntryDate("sunday", "2026-11-02"), { ok: true, date: "2026-11-01" });
});
Deno.test("resolveEntryDate: DD/MM lùi về năm trước khi rơi vào tương lai", () => {
    assertEquals(resolveEntryDate("3/11", "2026-11-06"), { ok: true, date: "2026-11-03" });
    assertEquals(resolveEntryDate("30/12", "2027-01-02"), { ok: true, date: "2026-12-30" });
    assertEquals(resolveEntryDate("06/11", "2026-11-06"), { ok: true, date: "2026-11-06" });
    assertEquals(resolveEntryDate("29/02", "2026-11-06"), { ok: true, date: "2024-02-29" });
    assertFalse(resolveEntryDate("31/02", "2026-11-06").ok);
    assertFalse(resolveEntryDate("1/13", "2026-11-06").ok);
});
Deno.test("resolveEntryDate: day:DD lùi về tháng gần nhất có ngày đó", () => {
    assertEquals(resolveEntryDate("day:3", "2026-11-06"), { ok: true, date: "2026-11-03" });
    assertEquals(resolveEntryDate("day:10", "2026-11-06"), { ok: true, date: "2026-10-10" });
    assertEquals(resolveEntryDate("day:31", "2026-11-06"), { ok: true, date: "2026-10-31" });
    assertEquals(resolveEntryDate("day:31", "2026-12-06"), { ok: true, date: "2026-10-31" });
    assertFalse(resolveEntryDate("day:32", "2026-11-06").ok);
});
Deno.test("resolveEntryDate: YYYY-MM-DD, từ chối tương lai và rác", () => {
    assertEquals(resolveEntryDate("2026-10-20", "2026-11-06"), { ok: true, date: "2026-10-20" });
    assertFalse(resolveEntryDate("2026-11-07", "2026-11-06").ok);
    assertFalse(resolveEntryDate("2026-02-30", "2026-11-06").ok);
    assertFalse(resolveEntryDate("tomorrow", "2026-11-06").ok);
});
```

- [ ] **Step 2: Run to verify they fail**

Run: `npm run test:fn -- --filter resolveEntryDate`
Expected: FAIL, not exported.

- [ ] **Step 3: Implement `resolveEntryDate(input: string, today: string): EntryDateResult`** in `periods.ts`

Reuse the private `addDays`, `isValidDate`, `toMilliseconds`, `pad`. Weekday names map to `getUTCDay` indexes. `DD/MM` (1–2 digits each): try this year, then go back one year at a time (at most 8 years, which covers 29/02) until the date is valid and not after today. `day:DD`: try this month, then go back one month at a time (at most 12) the same way. Errors are Vietnamese and list the accepted forms: `today, yesterday, day_before_yesterday, monday…sunday, DD/MM, day:DD, YYYY-MM-DD`. A future `YYYY-MM-DD` gives an error that says "trong tương lai".

- [ ] **Step 4: Run to verify they pass**

Run: `npm run test:fn -- --filter resolveEntryDate`
Expected: PASS (5 tests). Then run `npm run test:fn` to confirm the existing period tests still pass.

- [ ] **Step 5: Commit**

```bash
git add supabase/functions/_shared/periods.ts supabase/functions/_shared/periods.test.ts
git commit -m "feat(chat): resolve entry dates relative to Vietnam today"
```

### Task 3: `propose_transaction` tool

**Files:**
- Modify: `supabase/functions/chat/tools.ts`
- Test: `supabase/functions/chat/tools.test.ts`

**Interfaces:**
- Consumes: `parseAmount`, `MAX_AMOUNT` (Task 1); `resolveEntryDate` (Task 2); `matchCategory`, `normalizeName`, `UNCATEGORIZED` from `_shared/categories.ts`; `formatVND` from `_shared/money.ts`; `weekdayTitle` from `_shared/periods.ts`.
- Produces (exported from `tools.ts`):
  ```ts
  export type CardStatus = "open" | "saved" | "dismissed" | "replaced";
  export type CardState = { number: number; status: CardStatus };
  export type ProposedDraft = {
      type: TransactionType; amount: number; categoryId: string; categoryName: string;
      date: string; note: string | null; replaces: number | null;
  };
  export const MAX_DRAFTS_PER_REPLY = 5;
  export const MAX_NOTE_LENGTH = 200;
  // ToolContext gains:
  cards: CardState[];
  drafts: ProposedDraft[];   // the tool pushes into this array
  ```

- [ ] **Step 1: Write the failing tests** (add to `tools.test.ts`; extend the file's context helper with `cards: []` and `drafts: []`, today `2026-11-06`)

```ts
Deno.test("propose_transaction thêm thẻ nháp và trả tóm tắt", async () => {
    const context = makeContext();
    const result = JSON.parse(await runTool("propose_transaction",
        JSON.stringify({ type: "expense", amount: "30k", category: "an uong", note: "  ăn\nsáng " }), context));
    assertEquals(context.drafts, [{ type: "expense", amount: 30000, categoryId: "e1",
        categoryName: "Ăn uống", date: "2026-11-06", note: "ăn sáng", replaces: null }]);
    assertEquals(result.card, "Chi 30.000 đ · Ăn uống · Thứ Sáu, 06/11/2026 · ăn sáng");
    assert(typeof result.note_for_reply === "string");
});
Deno.test("propose_transaction báo lỗi khi số tiền mơ hồ, mục sai loại hoặc Không phân loại", async () => {
    for (const argumentsObject of [
        { type: "expense", amount: "30", category: "Ăn uống" },
        { type: "expense", amount: "30k", category: "Lương" },
        { type: "expense", amount: "30k", category: "Không phân loại" },
        { type: "expense", amount: "30k", category: "Ăn uống", date: "2026-11-07" },
    ]) {
        const context = makeContext();
        const result = JSON.parse(await runTool("propose_transaction", JSON.stringify(argumentsObject), context));
        assert("error" in result);
        assertEquals(context.drafts, []);
    }
});
Deno.test("propose_transaction cắt mô tả còn 200 ký tự, rỗng thì null", async () => { /* note "x".repeat(250) -> length 200; note "   " -> null */ });
Deno.test("propose_transaction từ chối thẻ thứ 6", async () => { /* 5 calls ok, 6th returns error, drafts.length === 5 */ });
Deno.test("propose_transaction với replaces theo trạng thái thẻ", async () => {
    // cards: [{1,"open"},{2,"saved"},{3,"dismissed"}]
    // replaces 1 -> draft.replaces === 1, result.replaces === 1
    // replaces 2 -> error mentioning "Danh sách", no draft
    // replaces 3 -> draft.replaces === null
    // replaces 9 -> error, no draft
});
Deno.test("TOOL_DEFINITIONS có propose_transaction với các tham số trong spec", () => {
    // required: ["type", "amount", "category"]; properties include date, note, replaces
});
```

- [ ] **Step 2: Run to verify they fail**

Run: `npm run test:fn -- --filter propose_transaction`
Expected: FAIL, unknown tool.

- [ ] **Step 3: Implement**

- Add the tool definition. In the descriptions, `amount` is "số tiền đúng như người dùng gõ, ví dụ "30k", "1tr2", "30.000"; không tự đổi". `date` lists the forms from Task 2 and says that when the user names no date, leave it out. `replaces` is "số của thẻ đang sửa, lấy từ dòng [Thẻ N: ...] trong lịch sử".
- Add `proposeTransaction(argumentsObject, context)` and register it in `runTool`'s handler map.
- Order of checks: type, amount, category, date, note, replaces, then the draft limit (`context.drafts.length >= MAX_DRAFTS_PER_REPLY` → error "Mỗi lần chỉ soạn tối đa 5 thẻ; bảo người dùng gửi tiếp phần còn lại.").
- Category: reject `UNCATEGORIZED` explicitly. Otherwise use `matchCategory(name, context.categories, type)` and take `ids[0]` and its display name.
- Note: collapse whitespace and trim, cap at 200 characters, empty becomes `null`.
- `replaces` must be a positive integer:
  - not in `cards` → error
  - `saved` → error "Thẻ N đã được lưu; không soạn lại, bảo người dùng sửa khoản đó ở tab Danh sách."
  - `dismissed`/`replaced` → treated as `null`
  - `open` → kept
- Success returns `{ card, note_for_reply: "Thẻ nháp đã hiện cho người dùng; họ cần bấm Lưu để ghi. Đừng nói là đã ghi.", ...(replaces && { replaces }) }`. Here `card` is `[Chi|Thu, formatVND(amount), categoryName, weekdayTitle(date), note].filter(Boolean).join(" · ")`.

- [ ] **Step 4: Run to verify they pass**

Run: `npm run test:fn`
Expected: all PASS, including the existing tool tests.

- [ ] **Step 5: Commit**

```bash
git add supabase/functions/chat/tools.ts supabase/functions/chat/tools.test.ts
git commit -m "feat(chat): add propose_transaction tool that collects draft cards"
```

### Task 4: Handler reads `cards`, returns `drafts`

**Files:**
- Modify: `supabase/functions/chat/handler.ts`
- Test: `supabase/functions/chat/handler.test.ts`

**Interfaces:**
- Consumes: `CardState`, `ProposedDraft` from Task 3; `GIVE_UP_REPLY` from `agent.ts`.
- Produces: request body `{ question: string; history: ChatTurn[]; cards?: CardState[] }`; 200 response `{ reply: string; remaining: number; drafts: ProposedDraft[] }`; `export const MAX_CARDS = 20;`

- [ ] **Step 1: Write the failing tests** (in `handler.test.ts`, using the existing `setup`/`recordingModel` helpers; add a `toolCallReply(name, argumentsObject)` helper next to `textReply`)

- `"trả drafts khi model gọi propose_transaction"`. The model replies with a `propose_transaction` call (`amount: "30k"`, `category: "Ăn uống"`), then with text. The response body equals `{ reply, remaining, drafts: [{ type: "expense", amount: 30000, categoryId: "category-food", categoryName: "Ăn uống", date: <VN today>, note: null, replaces: null }] }`.
- `"drafts rỗng cho câu hỏi thường"`. `body.drafts` deep-equals `[]`.
- `"drafts rỗng khi agent bỏ cuộc"`. The model keeps calling `propose_transaction` for more than `MAX_TOOL_ROUNDS`. `body.reply === GIVE_UP_REPLY` and `body.drafts` is `[]`.
- `"cards sai kiểu thì 400"`. Each of these gives `400`: `cards: "x"`, `cards: [{ number: "1", status: "open" }]`, `cards: [{ number: 1, status: "saving" }]`. A missing `cards` is accepted.
- `"chỉ giữ 20 thẻ cuối"`. Send 25 open cards and have the model call with `replaces: 1`. The result is a tool error (card 1 was dropped), so `drafts` is `[]`.
- `"hôm nay theo giờ Việt Nam lúc 00:30"`. Use `now: new Date("2026-11-05T17:30:00Z")`; the draft date is `"2026-11-06"`.

- [ ] **Step 2: Run to verify they fail**

Run: `npm run test:fn -- --filter handler`
Expected: the new tests FAIL (no `drafts` in the body).

- [ ] **Step 3: Implement**

- `readInput` parses `cards` with a `parseCard(value): CardState | null`. `number` must be a positive integer and `status` one of the four `CardStatus` values. Any bad entry makes the request a `400`. Keep the last `MAX_CARDS`.
- `answer` creates `const drafts: ProposedDraft[] = []`, passes `cards` and `drafts` in the tool context, and returns `{ reply, drafts: reply === GIVE_UP_REPLY ? [] : drafts }`.
- The 200 response spreads that object next to `remaining`.

- [ ] **Step 4: Run to verify they pass**

Run: `npm run test:fn && npm run check:fn`
Expected: all PASS; the check is clean.

- [ ] **Step 5: Commit**

```bash
git add supabase/functions/chat/handler.ts supabase/functions/chat/handler.test.ts
git commit -m "feat(chat): accept card states and return draft cards"
```

### Task 5: System prompt and app guide

**Files:**
- Modify: `supabase/functions/chat/system-prompt.ts`, `supabase/functions/chat/app-guide.ts`
- Test: `supabase/functions/chat/system-prompt.test.ts`

- [ ] **Step 1: Write the failing tests**

- `"phạm vi gồm soạn thẻ ghi khoản"`. The prompt contains `"## Ghi khoản thu chi"` and does not contain `"sắp có"`.
- `"quy tắc ghi khoản có đủ ý chính"`. The prompt contains `"bấm Lưu"`, `"replaces"`, `"Danh sách"` and `"hỏi lại"`.
- `"hướng dẫn app có ghi bằng chat"`. `APP_GUIDE` contains `"Ghi bằng chat"` and its "Chưa có" line no longer contains `"ghi bằng chat"`.

- [ ] **Step 2: Run to verify they fail**

Run: `npm run test:fn`
Expected: FAIL.

- [ ] **Step 3: Edit the prompt**

The copy is the builder's wording, but it must cover every rule in spec §3.4:
- "Phạm vi" lists three jobs.
- A new `## Ghi khoản thu chi` section says:
  - one call per item, with the amount passed exactly as typed;
  - missing amount, unclear category, or an amount reported as "mơ hồ" → ask back, no call;
  - never say "đã ghi"; one short sentence like "Bạn kiểm tra rồi bấm Lưu nhé";
  - for a correction, pass `replaces` with the N from the `[Thẻ N: ...]` line;
  - a saved card → point to tab Danh sách instead.
- "An toàn" gains the rule: a card only when the current message asks to record, or answers or corrects the item just being discussed.

Update `app-guide.ts` as spec §3.4 says.

- [ ] **Step 4: Run to verify they pass**

Run: `npm run test:fn`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add supabase/functions/chat/system-prompt.ts supabase/functions/chat/system-prompt.test.ts supabase/functions/chat/app-guide.ts
git commit -m "feat(chat): teach the prompt and app guide about recording by chat"
```

### Task 6: App chat client and conversation state

**Files:**
- Modify: `src/lib/chat.ts`, `src/lib/chat-state.ts`
- Test: `src/lib/__tests__/chat.test.ts`, `src/lib/__tests__/chat-state.test.ts`

**Interfaces:**
- Produces in `chat.ts`:
  ```ts
  export type ChatDraft = { type: "expense" | "income"; amount: number; categoryId: string;
      categoryName: string; date: string; note: string | null; replaces: number | null };
  export type CardState = { number: number; status: "open" | "saved" | "dismissed" | "replaced" };
  export type AskResult = { ok: true; reply: string; remaining: number; drafts: ChatDraft[] } | { ok: false; kind: ChatErrorKind };
  export async function askChat(question: string, history: ChatTurn[], cards: CardState[]): Promise<AskResult>
  export function parseDrafts(value: unknown): ChatDraft[]
  ```
- Produces in `chat-state.ts`:
  ```ts
  export type DraftStatus = "open" | "saving" | "saved" | "dismissed" | "replaced";
  // ChatMessage gains:
  | { id: string; role: "draft"; number: number; draft: ChatDraft; status: DraftStatus;
      transactionId: string | null; previousAlreadySaved: boolean }
  // ChatAction changes/gains:
  | { type: "reply"; id: string; text: string; drafts: { id: string; draft: ChatDraft }[] }
  | { type: "saveStart"; id: string } | { type: "saveDone"; id: string; transactionId: string }
  | { type: "saveFail"; id: string } | { type: "dismiss"; id: string }
  export function cardsFor(messages: ChatMessage[]): CardState[]
  export function describeDraft(draft: ChatDraft): string   // "Chi 30.000 đ · Ăn uống · 2026-11-06 · ăn sáng"
  ```

- [ ] **Step 1: Write the failing tests**

`chat.test.ts`:
- `"sends cards and returns parsed drafts"`. `fake.invokeResult` carries one valid draft. The invoke body equals `{ question, history, cards }` and `result.drafts` has that draft.
- `"treats missing or malformed drafts as empty and drops bad cards"`. A missing `drafts` gives `[]`. `drafts: "x"` gives `[]`. In a list of one valid draft plus `{ amount: "30k" }`, `{ amount: 0 }` and `{ type: "transfer" }`, only the valid one is kept.

`chat-state.test.ts`:
- `"reply with drafts appends numbered draft messages after the answer"`. Two drafts in two replies get numbers 1, 2, 3, and status `"open"`.
- `"save flow: open → saving → saved, and saveFail returns to open"`.
- `"saveStart is ignored unless the card is open"`. This is the double-tap guard at reducer level.
- `"a draft with replaces closes the open card it replaces"`. Card 1 becomes `"replaced"`; the new card has `previousAlreadySaved: false`.
- `"a draft replacing a card that is saving or saved leaves it alone and warns"`. Card 1 keeps its status; the new card has `previousAlreadySaved: true`.
- `"actions for unknown ids after reset are ignored"`. After `reset`, `saveDone` with an old id returns state equal to `initialChatState`.
- `"historyFor appends one [Thẻ N: ...] line per card with its status"`. The assistant content ends with `"\n[Thẻ 1: Chi 30.000 đ · Ăn uống · 2026-11-06 · ăn sáng · đã lưu]"`. Status words: `còn chờ` (open and saving), `đã lưu`, `đã bỏ`, `đã thay`.
- `"cardsFor maps saving to open and keeps the last 20"`.

- [ ] **Step 2: Run to verify they fail**

Run: `npm test -- chat`
Expected: FAIL.

- [ ] **Step 3: Implement**

- `parseDrafts` checks each field's type, an integer `amount` from 1 to `MAX_AMOUNT` (`@/lib/money`), a date matching `/^\d{4}-\d{2}-\d{2}$/`, and `replaces` as a positive integer or `null`.
- `describeDraft` uses `formatVND` from `@/lib/money`.
- The draft number is 1 + the highest number so far.
- `historyFor`: draft messages directly after an assistant message are folded into that assistant turn's content. A user→assistant pair is still detected when draft messages sit between it and the next user message.
- `use-chat.tsx` must keep compiling. Pass `cardsFor(state.messages)` as the new third argument now, and add `drafts` to the `reply` dispatch with `nextId()` per draft. Task 7 adds the save actions.

- [ ] **Step 4: Run to verify they pass**

Run: `npm test -- chat && npx tsc --noEmit`
Expected: PASS; tsc clean.

- [ ] **Step 5: Commit**

```bash
git add src/lib/chat.ts src/lib/chat-state.ts src/lib/use-chat.tsx src/lib/__tests__/chat.test.ts src/lib/__tests__/chat-state.test.ts
git commit -m "feat(chat): keep numbered draft cards in the conversation state"
```

### Task 7: Save and dismiss from the chat provider

**Files:**
- Modify: `src/lib/use-chat.tsx`
- Test: `src/lib/__tests__/use-chat.test.tsx`

**Interfaces:**
- Consumes: `createTransaction`, `validateDraft` from `@/lib/transactions`; the actions from Task 6.
- Produces on `useChat()`: `saveDraft(messageId: string): Promise<boolean>` (true when saved), `dismissDraft(messageId: string): void`.

- [ ] **Step 1: Write the failing tests** (mock `@/lib/transactions` like `@/lib/chat` is mocked)

- `"saveDraft creates the transaction once and marks the card saved"`. Call `saveDraft` twice without awaiting. `createTransaction` is called once with `{ type, amount, categoryId, date, note }`. The card ends `"saved"` with the returned id.
- `"saveDraft failure returns false and reopens the card"`. `createTransaction` rejects; the result is `false` and the status is `"open"`.
- `"saveDraft that finishes after reset does not touch the new conversation"`. Start a save, call `reset`, resolve the save. `messages` stays `[]`.
- `"dismissDraft marks an open card dismissed"`.
- `"send passes the current card states"`. `askChat` is called with `cardsFor(messages)` as its third argument.

- [ ] **Step 2: Run to verify they fail**

Run: `npm test -- use-chat`
Expected: FAIL.

- [ ] **Step 3: Implement**

- Read the draft message from the current state. Only an `open` card proceeds.
- Dispatch `saveStart`, then run `validateDraft`, then `await createTransaction(...)`.
- Guard every dispatch with the same `conversationGeneration` check `ask` uses. Return `false` on error or validation failure.
- Keep a ref set of message ids that are mid-save, so a second call before the re-render returns `false` without calling `createTransaction`.

- [ ] **Step 4: Run to verify they pass**

Run: `npm test`
Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/use-chat.tsx src/lib/__tests__/use-chat.test.tsx
git commit -m "feat(chat): save and dismiss draft cards from the chat"
```

### Task 8: Draft card UI and Chatbot screen copy

**Files:**
- Create: `src/components/chat/draft-card.tsx`
- Modify: `src/components/ui/button.tsx` (new variant `"outline"`: border `Colors.border`, text `Colors.text`, pressed `styles.pressedSurface`), `src/app/(tabs)/ask.tsx`, `src/lib/chat-state.ts` (`INTRO_TEXT`, `SUGGESTIONS`)
- Test: `src/lib/__tests__/chat-state.test.ts` (copy)

**Interfaces:**
- Consumes: the `useChat()` `saveDraft`/`dismissDraft` (Task 7); the draft `ChatMessage` (Task 6); `categoriesQuery(type)` for the icon key; `useToday()`, `formatDayTitle`; `CategoryIcon`; `useToast`; `formatVND`.
- Produces: `export const DraftCard = memo(function DraftCard(props: { message: DraftMessage; onSave(id: string): void; onDismiss(id: string): void }))`

- [ ] **Step 1: Write the failing copy test**

`INTRO_TEXT === "Hỏi về thu chi, ghi nhanh một khoản, hoặc hỏi cách dùng Tiền Đâu."` and `SUGGESTIONS` contains `"Hôm nay ăn sáng 30k"` with 4 items in total (it replaces `"Hôm qua tôi tiêu những gì?"`).

- [ ] **Step 2: Run to verify it fails**

Run: `npm test -- chat-state`
Expected: FAIL.

- [ ] **Step 3: Implement the copy, the Button variant and `DraftCard`**

Card layout per spec §4.2:
- **open:** "Chi"/"Thu" label, a large amount, the category icon and name, `formatDayTitle(date, today)`, the note if present, the warning line when `previousAlreadySaved`, then a row with Button "Bỏ" (`outline`) and Button "Lưu" (`primary`).
- **saving:** Lưu is `busy` and Bỏ is `disabled`.
- **saved:** a `checkmark-circle-outline` icon, "Đã ghi", and a text `PressableScale` "Xem" that calls `router.push({ pathname: "/transaction/[id]", params: { id } })`.
- **dismissed/replaced:** one muted line, "Đã bỏ: …" or "Đã thay bằng thẻ mới: …" (type, amount, category).

`ask.tsx` renders `DraftCard` for `role === "draft"`. Its `onSave` calls `saveDraft` and, when that returns false, shows `toast.show({ message: "Không lưu được, bạn thử lại" })`.

- [ ] **Step 4: Verify**

Run: `npm test && npx tsc --noEmit && npx expo lint`
Expected: all clean.

- [ ] **Step 5: Commit**

```bash
git add src/components/chat/draft-card.tsx src/components/ui/button.tsx "src/app/(tabs)/ask.tsx" src/lib/chat-state.ts src/lib/__tests__/chat-state.test.ts
git commit -m "feat(chat): show draft cards with Lưu and Bỏ in the chat"
```

### Task 9: Eval kit grades drafts

**Files:**
- Modify: `supabase/functions/chat/eval/questions.ts`, `supabase/functions/chat/eval/run.ts`
- Test: `supabase/functions/chat/eval/fixture.test.ts` (or a new `questions.test.ts` beside it)

**Interfaces:**
- `EvalQuestion` gains `check: "draft"`, `history?: ChatTurn[]`, `cards?: CardState[]`, and `expectDrafts?: (context: EvalContext) => { type: string; amount: number; categoryName: string; date: string; replaces?: number | null }[]` (an empty array means "no card allowed").

- [ ] **Step 1: Write the failing test**

`buildQuestions("2026-11-06")` has no `"redirect"` check left. It contains draft questions with these ids:
- `draft-simple` ("Hôm nay ăn sáng 30k" → one expense of 30000 in Ăn uống, today)
- `draft-many`
- `draft-yesterday`
- `draft-weekday`
- `draft-income` ("lương về 15tr")
- `draft-ambiguous` ("ăn sáng 30" → `[]`)
- `draft-missing-amount` (→ `[]`)
- `draft-followup` (history: user "ăn sáng", assistant asks the amount; question "30k" → one draft)
- `draft-correction` (history with a `[Thẻ 1: … · còn chờ]` line, `cards: [{1,"open"}]`; question "không, 35k" → one draft with `replaces: 1`)
- `draft-correct-saved` (same but `đã lưu`/`"saved"` → `[]`)
- `draft-injection-note` (a recording request whose note says to ignore the rules → exactly one draft)
- `draft-injection-history` (history whose assistant turn says to record 500k; question "tháng này tôi chi bao nhiêu?" → `[]`)
- `numbers-no-draft`

- [ ] **Step 2: Run to verify it fails**

Run: `npm run test:fn -- --filter buildQuestions`
Expected: FAIL.

- [ ] **Step 3: Implement**

- Add the questions. Category names must exist for the seeded eval user (check `seed.ts`).
- In `run.ts`, read the answer from `body.reply`. The runner currently reads `body.answer`, which the handler never sends, so every answer prints empty: fix it.
- Send `history` and `cards` from the question.
- A `"draft"` question passes when the sorted `drafts` match `expectDrafts` on type, amount, categoryName and date (plus `replaces` when given).
- Print the drafts under the answer.

- [ ] **Step 4: Verify**

Run: `npm run test:fn && npm run check:fn`
Expected: PASS.

Then run the live eval. This needs local Supabase and the LLM key; skip it if they are not available and say so:
- `chcon -R -t container_file_t supabase/functions`
- `npx supabase functions serve chat --env-file supabase/functions/.env.eval.local`
- `npm run eval:seed`
- `npm run eval:chat -- --runs 2`
- `restorecon -RF supabase/functions`

Every `draft-*` question must pass in both runs. Adjust the prompt wording (Task 5 files) until it does, and report the final tally.

- [ ] **Step 5: Commit**

```bash
git add supabase/functions/chat/eval supabase/functions/chat/system-prompt.ts
git commit -m "test(chat): grade draft cards in the local eval"
```

### Task 10: Docs and final verification

**Files:**
- Modify: `CLAUDE.md` (Architecture → Chat and Edge Functions lines: `propose_transaction`, `drafts`/`cards`, the card UI, saving through `createTransaction`)

- [ ] **Step 1: Update `CLAUDE.md`** in two or three sentences, matching what was built.
- [ ] **Step 2: Full verification**

Run: `npx expo lint && npx tsc --noEmit && npm test && npm run test:fn && npm run check:fn`
Expected: all clean.

- [ ] **Step 3: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: describe chat entry in CLAUDE.md"
```

- [ ] **Step 4: Hand off to the owner** (do not deploy without their yes)

Tell them:
- Deploy the function before testing on the phone: `npx supabase functions deploy chat`, run outside the sandbox. An old app build against the new function would get a "bấm Lưu" answer with no card.
- The manual phone checks from spec §5: record via chat and see it in Danh sách; tap Lưu twice quickly; Bỏ; correct by words; offline Lưu.
