# UI spec: [FEATURE NAME]

**Feature**: `[NNN-feature-name]` · **Spec**: [spec.md](./spec.md) · **Plan**: [plan.md](./plan.md)
**Status**: Draft | In review (round N) | Approved (YYYY-MM-DD) | No UI | NEW-ARCHETYPE
**Designer**: ui-designer · **Prototype**: `/prototypes/[NNN-feature-name]`

<!--
  Written by the ui-designer during /speckit-design. Rules: design-system/README.md (read first).
  Every screen uses ONE archetype from design-system/templates.md and copies its reference template.
  Fill every section; write "—" when a section truly does not apply. Exact copy goes here, not "TBD".
-->

## 1. Screens

| # | Screen | Route | Role / layout | Archetype | Reference template | User stories (spec.md) |
|---|---|---|---|---|---|---|
| S1 | [Sign in] | `/sign-in` | Public / none | Auth | `/styleguide/templates/auth` | US1 |

## 2. Screen details

### S1 — [Screen name]

**Goal**: [what the user achieves here, one sentence]

**Layout** (regions top → bottom; name the components):
```
PageHeader: eyebrow "…" · title "…" · description "…" · actions [Secondary "…"]
TwoColumn side=end 360 sticky
  main:  Card padding=lg → …
  aside: Tray (header … · card: MatchScore lg, SkillBreakdown · footer: "…" + Button primary "…")
```

**Copy** (exact strings):
| Element | Text |
|---|---|
| Title | … |
| Primary button | … |
| Empty title / description / action | … |
| Error | … |
| Toast on success | … |

**States**:
| State (`?state=`) | What the user sees | Trigger in the real page |
|---|---|---|
| default | … | data loaded |
| loading | skeleton of … | query pending |
| empty | EmptyState: … | no items |
| error | EmptyState tone=error: … + Try again | query error |

**Interactions**:
- [Click "Apply now" → Modal "…" (fields …) → submit → toast "Application sent" → status Applied]
- Keyboard / focus notes: …

**Responsive** (390 / 1024 / 1440): [what moves, hides, stacks]

**Test hooks**: roles/labels to use; `data-testid`: …

## 3. Components

- Existing (kit / layout / domain): …
- **New components** (only if nothing fits — name, purpose, recipe from patterns.md, where it goes in /styleguide): —

## 4. Data contract for views

```ts
// props each <Screen>View receives (the implementation fills them from the API)
type SignInViewProps = { state: "default" | "submitting" | "error"; onSubmit: (v: { email: string; password: string }) => void };
```

## 5. Open questions

- …

## 6. Revision log

| Round | Date | Feedback (user) | Changes made |
|---|---|---|---|
| 1 | … | — (first review) | — |

## 7. Approval

- Approved by the product owner on: …
- Approved screenshots: `design/screens/` (screen × state × desktop/mobile)
