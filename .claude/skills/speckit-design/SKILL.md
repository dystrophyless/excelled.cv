---
name: speckit-design
description: Design step of the Novio SpecKit flow (runs after /speckit-plan via the after_plan hook, or manually). Has the ui-designer agent write ui-spec.md and build a prototype with every state, then runs the review loop with the product owner in chat until the design is approved.
argument-hint: "Optional: feature dir or notes for the designer"
user-invocable: true
---

# /speckit-design — design a feature and get it approved

You are the **orchestrator** in the main session. The ui-designer agent (Sonnet) does the design work; you talk to the
product owner, relay feedback, and record approval. Keep your own token use low: don't redo the designer's work.

## 1. Locate the feature
Run `.specify/scripts/powershell/check-prerequisites.ps1 -Json -PathsOnly` from the repo root and read `FEATURE_DIR`.
Require `spec.md` and `plan.md` there. If `ui-spec.md` already says `Approved`, tell the owner and stop
(unless they asked for a redesign).

## 2. Start the designer
Spawn the `ui-designer` agent (Agent tool, subagent_type `ui-designer`, give it a name like `designer-<NNN>`) with:
the absolute `FEATURE_DIR`, the feature id `<NNN-feature>`, any notes from `$ARGUMENTS`, and the instruction to follow its
agent steps 1–7. Wait for its report.

- `Status: No UI` → tell the owner in one line, done (the gate will let tasks through).
- `Status: NEW-ARCHETYPE` → show the owner the designer's reason and propose escalating to `design-architect` (Opus).
  On "yes", spawn `design-architect` with the escalation; when it is done, show its template for approval, then
  resume the designer (SendMessage) to continue the feature.

## 3. Present the design (owner reviews on localhost)
Tell the owner how to look: `cd frontend && npm run dev`, then the prototype links
(`http://localhost:5173/prototypes/<NNN-feature>/<screen>`, plus `?state=…`). Show the 2–4 most telling screenshots
(Read the PNGs from `FEATURE_DIR/design/screens/` so they appear in the conversation), list screens → archetypes, the
decisions worth a look, and the designer's open questions. Ask: approve, or what to change?

## 4. Review loop
- **Change requests** → SendMessage to the same designer agent with the owner's words verbatim (plus any clarification you
  got). When it reports back, present what changed (before → after) and the new screenshots. Repeat.
- If the owner rejects the same point a second time, offer a critique by `design-architect` (Opus) and pass its
  recommendation to the designer.
- Questions from the owner about the design → answer from ui-spec / design-system; don't change files yourself.

## 5. Approve
When the owner approves (explicitly): set `**Status**: Approved (<today>)` in `ui-spec.md`, fill section 7 (date,
screenshot folder), make sure `FEATURE_DIR/design/screens/` holds the final screenshots of every screen × state ×
desktop/mobile (ask the designer to re-snap if anything changed after the last round). Report: approved, next step
`/speckit-tasks`.

Never mark Approved without the owner's explicit approval in this conversation.
