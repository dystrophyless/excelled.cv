# Foundations

Values live in `frontend/src/styles/tokens.css`. This file says **how to use them**. Measured origin: `audit.md`.

## 1. Principles

1. **Calm and neutral.** Greys and white do the work; colour is a signal, not decoration.
2. **Content sits in trays.** The white-card-on-gray-tray is the signature container; secondary info and actions live on the tray.
3. **Compact.** UI text is 13–15px, controls 32–40px. Big type is only for page titles and the landing hero.
4. **One primary action per view.** The graphite button appears once per card / modal / page header.
5. **Every state is designed.** Loading, empty, error and success are part of the design, not afterthoughts.
6. **Fidelity to affect-ui.** Copy its values 1:1 (including the light muted grey). Don't "improve" contrast or invent colours.

## 2. Colour

| Token | Use for | Never for |
|---|---|---|
| `--color-page` | app background | cards |
| `--color-tray` | tray shells, segmented track, ghost hover, pipeline columns | page background |
| `--color-surface` | cards, menus, modals, filled inputs, secondary buttons | large page areas outside cards |
| `--color-fill` / `-hover` | chips, icon tiles, counts | text backgrounds |
| `--color-ink` | headings, labels, primary values, checked controls | body paragraphs |
| `--color-text` | body text, descriptions, list items | headings |
| `--color-muted` | secondary meta (company, dates, counts), placeholders, hints | the only copy of important info |
| `--color-muted-strong` | icons, ghost buttons, inactive nav | body text |
| `--color-faint` | disabled text, separators glyphs | anything readable |
| `--color-line` / `-subtle` / `-strong` | card borders / dividers inside cards / filled inputs | thick borders (always 1px) |
| `--color-accent` (+ `-tint`) | small signals: info icon, progress bar, "Internship" tag, focus on links, recommendation sparkle | buttons, large fills, headings |
| `--color-success` (+ tint) | matched skills, Offer / Hired, "Saved" confirmations | decoration |
| `--color-warning` (+ tint) | needs attention: interview soon, draft, closing soon | errors |
| `--color-danger` | field-error edge + icon, error alert icon | error message text (stays `--color-text`) |
| `--color-destructive` (+ tint) | destructive button and menu item text | field errors |
| `--color-rose` / `--color-violet` (+ tints) | "New" badge / special pills (Shortlisted, Beta) | status of applications other than Shortlisted |

The brand mark (header logo, favicon) uses its own `--brand-*` tokens — accent-blue tile, white star — and is the one large accent surface allowed.

Proportions on any screen: ≈ 90% neutrals, accent ≤ 5%, status colours only where a status is shown.
Application rejection is **never red** — it is neutral ("Not selected").

## 3. Typography

Inter (400 / 500 / 600 — never 700). Sentence case everywhere.

| Token | px / line | Weight | Where |
|---|---|---|---|
| `--text-hero` | 44 / 52 | 600 | landing hero ≥ 768px only |
| `--text-display` | 32 / 40 | 600 | landing hero on mobile, marketing h1 |
| `--text-h1` | 24 / 32 | 600 | page title (`PageHeader`) — exactly one per page |
| `--text-h2` | 20 / 28 | 600 | auth / wizard question, big numbers in decision panels |
| `--text-h3` | 16 / 24 | 600 | section titles (`Section`, `FormSection`), modal title |
| `--text-title` | 15 / 22 | 500 | card titles, list item titles |
| `--text-body` | 14 / 20 | 400 | default UI text, inputs, buttons md |
| `--text-reading` | 14 / 21 | 400 | paragraphs (vacancy description) |
| `--text-sm` | 13 / 20 | 400 | secondary UI: meta, hints, footers, labels |
| `--text-caption` | 12.5 / 18 | 500 | skill chips, table headers |
| `--text-xs` | 12 / 16 | 400–500 | counts, timestamps |
| `--text-tag` | 11.5 / 16 | 500 | tags |

Rules: emphasis = weight 500 or `--color-ink`, never italics or underline. Numbers that change or align use
`font-variant-numeric: tabular-nums`. Prose max 60–75ch. Headings use the `--tracking-*` token of their size.
Semantic level ≠ visual size: `Section` renders an `<h2>` at h3 size — keep the heading order h1 → h2 → h3.

## 4. Layout

**Breakpoints (mobile first):** 640 `sm` · 768 `md` · **1024 `lg`** · 1280 `xl`.
`lg` is the big switch: header nav ↔ menu sheet, `TwoColumn` ↔ one column, filters aside ↔ filters modal.

**Containers** (`Container width=…`): `page` 1120 (default) · `content` 760 (detail, tracker, forms in a card) ·
`form` 560 (wizards) · auth column 400. Side gutter 16 (mobile) / 32 (≥ 768).

**Page rhythm:**

| Gap | Value |
|---|---|
| header → page title | `PageHeader` handles it (32 top, 24 bottom) |
| between page blocks (`PageBody`) | 32 |
| between sections in a column (`Stack`) | 40 |
| section title → content | 16 (`Section`) |
| cards in a grid / list | 12–16 |
| inside a card | 16 (sm 8, lg 24) |
| fields in a form | 14 |
| label → field | 6 |
| list rows | 12 vertical padding, 1px `--color-line-subtle` dividers |

Spacing uses only `--space-*` (2px grid: 2 4 6 8 10 12 14 16 20 24 32 40 48 64), via layout props (`gap={16}`) or tokens.

**Columns:** `TwoColumn` asides — filters 280 (start), settings nav 220 (start), decision / summary panel 360 (end, sticky).
Card grids — `Grid min={300}` for vacancy cards in previews, a single column of wide cards (`min={560}`) for search results.

**Density:** controls `md` (40px) in forms and headers; `sm` (32px) buttons inside cards, tray footers, tables;
toolbars 36px (`--control-toolbar`: SearchField / SelectField `size="sm"`, SegmentedControl md);
`lg` (48px) only for the single submit of auth / wizard steps and landing CTAs.

## 5. Shape and elevation

Radii nest: **tray 22 › card 16** (roomy: 24 › 20) with 6px tray padding; controls 12 (sm 10, lg 14); chips 8–10;
checkbox / small icon buttons 6; pills and avatars round.

| Container | When |
|---|---|
| **Tray** (`Tray`) | a self-contained unit with secondary info or actions: auth card, vacancy card, decision panel, filters, CTA |
| **Card** (`Card`) | page sections, lists of rows, forms, items inside a gray area (pipeline column) |
| **Popover** | menus, combobox lists, account menu (`--shadow-popover`) |
| **Floating** | modal, toast, sticky bar (`--shadow-floating`) |

Never nest a tray in a tray or a card in a card. A card may sit on a tray (that *is* the tray pattern) or on the page.
Borders are 1px hairlines; shadows stay barely visible (`--shadow-raised`).

## 6. Iconography

- **Family: Lucide**, the same as affect-ui. Always through `<Icon name="…" />` from `@/components/icons`.
- **Stroke rule:** the wrapper keeps the rendered line at ≈ 1.3px (20px → 1.5, 16 → 2, 14 → 2.25). Never pass a custom `strokeWidth` except checkmarks inside 20px boxes.
- **Sizes:** 14 inline meta (`FactList`), **16 default** (buttons, menus, rows), 18 toolbar / header icon buttons, 20 nav sheet, empty-state tiles, menu rows in ProfileMenu.
- **Semantic names:** use the dictionary (`ICONS` in `icons.tsx`): `vacancy`, `company`, `application`, `saved`, `skill`, `match`, `interview`, `offer`, `location`, `remote`, `salary`, … The same concept always uses the same glyph. Need a new concept? Add it to `ICONS` first.
- Icons are decorative (`aria-hidden`); icon-only buttons need `aria-label` and a `Tooltip`.
- Colour: `--color-muted-strong` by default, `currentColor` inside buttons, status colours only for status icons.
- No filled icons (one exception: a toggled-on Save/bookmark fills with `currentColor`), no emoji in UI, no second icon family.

## 7. Illustration and imagery

- Empty / first-run states use a 44px **icon tile** (`EmptyState icon`) by default.
- affect-ui illustrations (`empty-calendar`, `side-folder`, `ghosted-chat`, `team-invite` in the pack under `illustrations/`) may be ported for a specific first-run state — at most one per page, never decorative elsewhere.
- Company logos: `Avatar shape="square"` (initials fallback). People: round `Avatar`. No stock photos.

## 8. Motion

- Hover / colour: `--duration-fast` (160ms) `ease`. Menus enter: `--duration-menu` with `--ease-out`, from `translateY(4px) scale(.98)`.
- Layout, expand/collapse, modals: `--duration-slow` with `--ease-out`. Checks / pops: `--ease-spring`.
- Press: `scale(var(--press-scale))` on buttons only.
- Every animation has a `prefers-reduced-motion: reduce` override. No looping motion except loaders.
- affect motion pieces (`ShimmerText`, `Skeleton`, `NumberTicker`, `ThinkingLoader`) are the only "special" motion.
