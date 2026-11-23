# affect-ui audit (Light + Classic)

Phase 1 of the Novio design-system work. This file records what the affect-ui pack **actually contains**,
measured from its source, so later phases (tokens, primitives, agent rules) build on facts, not guesses.

- Source: `D:\Program\frontend\affect-ui\affectui-free` (free pack)
- Scope: 17 components (`components/*/Classic`), 2 blocks, 17 illustrations, 4 motion pieces — 40 docs
- Method: every doc's `## Code` section was parsed; all CSS rules and `--ui-*` custom properties were counted
  per theme (light vs `:where(.dark, [data-theme="dark"])`). Light screenshots were reviewed by eye.
- Date: 2026-10-30

---

## 1. How the pack is built

- Each component is **one self-contained React 19 `.tsx` file**. Its CSS lives in a template string
  (`const css = /* css */ \`...\``) and is injected with a `<style>` tag. No Tailwind, no CSS-in-JS library.
- Class names are BEM-like with a per-component prefix: `.ui-sr`, `.ui-sr__card`, `.ui-sr__btn--primary`.
- Every component declares **its own private palette** as custom properties on its root,
  e.g. `--ui-sr-tray`, `--ui-sr-ink`. The names follow shared *roles* (`tray`, `card`, `ink`, `text`, `muted`,
  `line`, `accent`, `focus`, `ease`…), and the values are nearly identical across components.
  → There is an implicit design system; it just was never extracted. That is our job in Phase 2.
- Dark mode: the same variables are overridden under `:where(.dark, [data-theme="dark"]) .ui-xx`.
- State is exposed through attributes (`data-open`, `data-error`, `data-status="verifying"`, `aria-expanded`,
  `aria-checked`) and styled from CSS — good for e2e selectors and a11y.
- Responsiveness is mostly **container queries** (`container-type: inline-size`, `@container (max-width: 420px)`),
  not viewport media queries.
- Every animated component honours `@media (prefers-reduced-motion: reduce)`.

## 2. The visual language in one paragraph

Neutral, quiet, "tool-like". Near-white page (`#fafafa`), content on **white cards with a 1px hairline and an
almost invisible shadow**, often nested inside a **light-gray tray** (`#f0f0f0`) that holds secondary info or the
action row. Text is near-black with two gray steps. **Weight 500 does the work** that bold usually does.
One saturated accent — blue `#2f6bff` — used sparingly (icons, progress, focus, small tags). The **primary button is a
dark graphite gradient** with an inner top highlight, not a coloured button. Radii are large and **nested**
(tray > card > control > chip). Motion is fast, soft and springy-out (`cubic-bezier(0.22, 1, 0.36, 1)`).

## 3. Signature patterns (seen across many components)

| Pattern | What it looks like | Where |
|---|---|---|
| **Tray + card** | Gray tray, `padding: 6px`, radius 22–24px; white card inside, radius 16–20px, 1px `#e5e5e5` border, `0 1px 2px rgba(0,0,0,.06)` | smart-recommendation, filter-menu, profile-menu, otp-input, decision-inbox, tips-panel |
| **Actions/meta in the tray** | Footer row *below* the card, directly on the tray: secondary info left, buttons right | smart-recommendation, profile-menu (setup progress), filter-menu (keyboard hints), otp-input (demo code) |
| **Header in the tray** | Status line *above* the card on the tray (e.g. warning-coloured "2 need your input") | decision-inbox |
| **Primary = graphite** | `linear-gradient(#323137, #201e25)`, ring `#0d0d0d`, `inset 0 1px 0 rgba(255,255,255,.12)` | button, smart-recommendation, decision-inbox, email-draft |
| **Secondary = white + ring** | White fill, `0 0 0 1px #e5e5e5` + tiny shadow | everywhere |
| **Hairlines via box-shadow** | `box-shadow: 0 0 0 1px <line>` or `inset 0 0 0 1px` instead of `border` (no layout shift) | buttons, chips, inputs, menus |
| **Soft pills & tags** | radius 999px, tinted bg + coloured text (`#eef3ff`/`#2f6bff`, `#f4f0ff`/`#7c4dff`, `#fff0f3`/`#e11d48`) | profile-menu "New", segmented "Save 20%", smart-rec tag |
| **Segmented pill** | Gray track, white raised thumb that glides | segmented-control |
| **Rows with hover fill** | 34–40px rows, radius 8–12px, hover `#f5f5f5`/`#f7f7f7` | filter-menu, profile-menu, menus |
| **Muted section labels** | Small (13–14px) gray label above a group | segmented-control, button demo |
| **Error = red edge, calm text** | Red borders/icon/halo, but the message text stays ink/text colour | otp-input |

## 4. Measured values (token candidates)

### 4.1 Colour — neutrals (by role; count = how many component declarations use it)

| Role | Light | Dark | Notes |
|---|---|---|---|
| page bg | `#fafafa` | `#161618` / `#111113` | screenshot canvas, otp field bg |
| tray | `#f0f0f0` (9/9) | `#161618` | |
| card / surface | `#ffffff` (13) | `#232326` (10) | dark also uses `#19191b` |
| ink (primary text, headings) | `#171717` (20) | `#ededed` (24) | |
| text (body) | `#404040` (10) | `#c4c4c4` | |
| muted (secondary) | `#8f8f8f` (11), `#737373` (4) | `#8f8f8f` | **see §6.1 contrast** |
| faint (separators, disabled glyphs) | `#b5b5b5`, `#c4c4c8` | `#6b6b72` | |
| line (borders) | `#e5e5e5`, `#ececec`, `#e4e4e7` | `rgba(255,255,255,.08–.10)` | |
| line-strong | `#cfcfd4` | — | filled inputs |
| hover fill | `#f5f5f5`, `#f7f7f7` | `rgba(255,255,255,.06)`, `#2a2a2d` | |
| chip / control fill | `#f3f3f3`, `#f0f0f0` | `#2a2a2d` | |

### 4.2 Colour — accent & status

| Role | Light | Dark | Tint (bg) light |
|---|---|---|---|
| accent (blue) | `#2f6bff` | `#6b95ff` / `#6d8bff` | `#eef3ff`, `#f5f8ff`, `#e9f0ff` |
| success | `#1f8a4c`, `#2f9e5b`, `#18794e` | `#3dbb6f`, `#3fbf74` | `#e8f5e6` |
| danger | `#e5484d` (otp), `#ff0000` (button) | `#ff6369`, `#ff6b6b` | `#ffe6e9` |
| warning | `#c2570c` | `#fb9a4b` | `#fdeedd` |
| rose (badge "New") | `#e11d48` | `#fb7185` | `#fff0f3` |
| violet (pill) | `#7c4dff` | `#b49cff` | `#f4f0ff` |
| online dot | `#34c46a` | | |

### 4.3 Primary (graphite) button recipe

```
light: background linear-gradient(#323137, #201e25); hover linear-gradient(#3b3a41, #26242b)
       box-shadow 0 0 0 1px #0d0d0d, 0 2px 4px rgba(0,0,0,.1), inset 0 1px 0 rgba(255,255,255,.12)
       text #fafafa
dark:  inverted — linear-gradient(#f4f4f5, #e4e4e7), text #121213
```

### 4.4 Typography

- Family: `"Inter", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif` (24 of 25 roots).
  A mono family exists only in tool-call-card.
- **Weights:** 500 (60 uses) ≫ 600 (9) > 450 (2) > 400 (1). Body text inherits 400; anything emphasised is 500;
  titles 500–600.
- **Sizes (px):** 13 (35) · 14 (23) · 12.5 (18) · 15 (12) · 12 (11) · 11 / 16 (5) · 10.5 (4) · 13.5 / 11.5.
  → A dense UI scale: 11 · 12 · 12.5 · 13 · 14 · 15 · 16. Nothing larger than 16px inside components;
  page-level headings (24–32px) are **not covered by the pack** and must be designed by us.
- **Line-height:** 20px (19) dominant for 13–14px text; 18px for 12–12.5px; 21–22px for reading text.
- **Letter-spacing:** `-0.01em` on titles (11).
- `font-variant-numeric: tabular-nums` on counts and timers.
- `-webkit-font-smoothing: antialiased` on every root.

### 4.5 Radius (nested scale)

| Use | Value |
|---|---|
| tray / outer shell | 22px, 24px |
| card inside tray | 16px, 20px |
| menu / popover | 12px |
| button md / row | 12px (sm 10px, lg 14px) |
| chip / small control / option | 8–10px |
| tiny (checkbox, kbd, inner) | 6–7px |
| pill / badge / avatar | 999px / 50% |

Rule observed: **inner radius ≈ outer radius − padding** (e.g. segmented thumb uses `calc(r - pad)`).

### 4.6 Size & spacing

- **Control heights:** buttons sm/md/lg = **32 / 40 / 48** (font 13/14/15, padding-x 12/16/20, icon 16/18/20);
  rows 34–36px; chips 30px; small inline buttons 22–28px; OTP box 48px wide.
- **Gaps:** 8px (18) · 2px (14) · 6px (12) · 12px (11) · 10px (10) · 4–5px · 14px.
  Spacing is a loose **2-px grid** (2, 4, 6, 8, 10, 12, 14, 16, 20) rather than a strict 4/8 scale.
- **Tray padding:** 6px. **Card padding:** 16px (filter-menu), 6–8px when rows have their own padding.
- **Max widths of components:** 320–520px (440px most common). Components are cards, not pages.

### 4.7 Elevation

| Level | Value |
|---|---|
| hairline | `0 0 0 1px #e5e5e5` |
| raised (card, secondary button) | `0 1px 2px rgba(0,0,0,.06)` (+ hairline) |
| soft panel | `0 1px 2px rgba(0,0,0,.03), 0 8px 24px rgba(0,0,0,.035)` |
| popover / menu | `0 0 0 1px <line>, 0 12px 30px -8px rgba(0,0,0,.2)` |
| floating (dialog-like) | `0 0 0 1px <line>, 0 10px 30px rgba(0,0,0,.1)` |
| dark theme | same shapes, alpha ×4–6 (`rgba(0,0,0,.4–.5)`) |

### 4.8 Focus

- Neutral ring: `outline: 2px solid rgba(23,23,23,.22); outline-offset: 2px` (button, otp).
- Accent ring: `outline: 2px solid #2f6bff` (filter-menu, smart-recommendation).
- Inputs: `inset 0 0 0 1.5px ink` + halo `0 0 0 4px rgba(23,23,23,.07)`.
- Only on `:focus-visible`. → **Inconsistent (neutral vs blue); decide one in Phase 2.**

### 4.9 Motion

- **Main easing:** `cubic-bezier(0.22, 1, 0.36, 1)` (ease-out-quint-like) — 26 of ~50 uses, the declared
  `--ui-*-ease` in 22 components.
- Spring/overshoot for "pop" moments: `cubic-bezier(0.34, 1.56, 0.64, 1)`.
- **Durations:** hover colour/background **140–160ms ease**; opacity fades 200–300ms;
  expand/collapse & layout 260–360ms with main easing; menus drop in 180ms (`translateY(4px) scale(.98)` → none).
- Press: `scale(0.97–0.98)`.
- Content swap: fade + `translateY(2px)` or soft blur-in.
- Expand/collapse via `grid-template-rows: 0fr → 1fr`.
- Reduced motion: animations off, transitions instant.

## 5. Component catalogue and fit for Novio

Relevance: ★★★ use as-is · ★★ adapt · ★ unlikely to need.

| Component | What it is | Novio use | Fit |
|---|---|---|---|
| button | primary / secondary / ghost / destructive, sm/md/lg, loading shimmer | everywhere | ★★★ |
| otp-input | code field with focus ring, paste, error shake, verified morph | email verification at sign-up / login | ★★★ |
| segmented-control | 2–6 views, pill or underline, counts & badges | Internships / Jobs, list/grid, profile tabs | ★★★ |
| filter-menu | grouped checkbox filters, removable chips, Clear all | vacancy search filters (field, format, city, level) | ★★★ |
| profile-menu | avatar dropdown + profile-setup progress | header account menu; "complete your profile" nudge | ★★★ |
| progress-tracker | onboarding checklist with animated bar | student onboarding (add skills, CV, university) | ★★★ |
| smart-recommendation | suggestion card with confidence signal + alternatives | "Strong match" vacancy suggestion, skill-gap tips | ★★★ |
| decision-inbox | open decisions with two quick answers | interview invites / offers (accept / decline) | ★★ |
| notification-stack | stacked dismissible notices | announcements, application status updates | ★★ |
| tips-panel | grid of tips with one action each | getting-started on dashboard | ★★ |
| change-summary | metrics with coloured trend | profile stats ("12 views this week") | ★★ |
| reaction-bar | like/comment/share with counters | save/bookmark vacancy (adapt to one toggle) | ★ |
| thinking-loader | AI working pill with phases | "Matching your skills…" while the matcher runs | ★★ |
| tool-call-card, message-actions, comment-thread, email-draft | AI-agent / chat UI | not in scope now (maybe a career-assistant chat later) | ★ |
| motion/shimmer-loader | skeleton blocks + shimmering text | **all loading states** | ★★★ |
| motion/number-ticker | rolling digits | match % / counters | ★★ |
| motion/text-reveal | word-by-word reveal | landing hero only | ★ |
| motion/grid-background | drifting line grid | landing / auth background | ★★ |
| illustrations/empty-calendar, side-folder, ghosted-chat, team-invite | animated spot illustrations | **empty states** (no applications, no saved, no messages) | ★★ |
| blocks/logo-marquee, testimonial-wall | landing sections | public landing ("students hired at…") | ★ (later) |
| other illustrations (agent-team, model-wheel, region-dach, …) | AI/marketing visuals | not relevant | ★ |

## 6. Problems found

### 6.1 Contrast (WCAG AA needs 4.5:1 for normal text)

| Pair | Ratio | Verdict |
|---|---|---|
| ink `#171717` on white | 17.9 | ✅ |
| text `#404040` on white | 10.4 | ✅ |
| `#737373` on white | 4.74 | ✅ |
| **muted `#8f8f8f` on white** | **3.23** | ❌ small text |
| **muted `#8f8f8f` on tray `#f0f0f0`** | **2.84** | ❌ |
| `#737373` on tray | 4.16 | ❌ (barely) |
| accent `#2f6bff` on white | 4.50 | ⚠️ exactly at the limit; fails on tray (3.95) |
| danger `#e5484d` on white | 3.91 | ❌ as text — OK for icons/borders |
| success `#1f8a4c` on white | 4.38 | ❌ as small text |
| dark: `#8f8f8f` on `#232326` | 4.85 | ✅ |

affect uses `#8f8f8f` for real information (emails, counts, "Clear all", hints). Fine in a demo, but our
e2e-ready / a11y rule requires readable secondary text. **Phase 2 decision:** muted text token = `#737373`
on white and a darker step on tray; `#8f8f8f` only for placeholder/decorative glyphs; status colours used for
icons, borders and tints — text next to them stays `text`/`ink` (the otp-input pattern), or uses a darker
"-text" variant.

### 6.2 Inconsistencies to normalise

- Danger red: `#ff0000` (button) vs `#e5484d` (otp). → pick one family.
- Success green: 4 different values. → one.
- Focus ring: neutral grey vs accent blue. → one rule.
- Line colour: `#e5e5e5` / `#ececec` / `#e4e4e7` / `#e7e7e7`. → `line` + `line-strong`.
- Muted: `#8f8f8f` vs `#737373` vs `#8a8a8a`. → see 6.1.
- Card radius 16 vs 20, tray radius 22 vs 24. → define pairs (compact 22/16, roomy 24/20).

## 7. Gaps — what Novio needs that the pack does not have

**Form primitives:** TextField (text/email/password with show/hide), Textarea, Select / Combobox,
**SkillInput** (tag/multi-select with autocomplete), Checkbox (recipe exists inside filter-menu), Radio, Switch,
Field label + hint + error message, Form layout, file upload (CV).

**Layout:** App shell (header + optional sidebar), page header (title 24–32px, description, actions),
section, responsive grid, container widths. **Page-level type scale (h1–h3) is missing entirely.**

**Display:** Card (generic, from tray+card), Badge/Tag/Chip (static), Avatar (+ company logo), Table / list rows,
**Vacancy card**, **Match score** indicator (%, skill overlap), Skill chip (matched / missing state),
Empty state (illustration + text + action), Skeleton (from shimmer-loader), Pagination / load more.

**Overlays & feedback:** Modal/Dialog, Dropdown menu (generic, from profile-menu), Tooltip, Toast (from
notification-stack), inline Alert/Banner, Tabs (can map to segmented-control underline variant).

**Navigation:** Link styles, breadcrumbs, nav items, stepper (multi-step forms — progress-tracker says it is not one).

## 8. Inputs for Phase 2

1. Turn §4 into `tokens.css` (primitive values → semantic roles, Light + Dark), resolving §6.
2. Write the type scale up to page headings (extrapolate from 16px with Inter, weight 500–600, `-0.01/-0.02em`).
3. Write composition recipes for §3 patterns, so new UI is assembled the same way.
4. Port the ★★★/★★ components onto shared tokens; build §7 primitives on the same recipes.
5. Build `/styleguide` that renders tokens, components and patterns — the visual reference for agents.
