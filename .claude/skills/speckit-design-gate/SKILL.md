---
name: speckit-design-gate
description: Gate before /speckit-tasks (before_tasks hook) — blocks task generation for a feature with UI until its ui-spec.md is Approved by the product owner.
user-invocable: true
---

# /speckit-design-gate

1. Run `.specify/scripts/powershell/check-prerequisites.ps1 -Json -PathsOnly` from the repo root; read `FEATURE_DIR`.
2. Read `FEATURE_DIR/ui-spec.md`.
   - Missing → **BLOCK**: "This feature has no ui-spec yet. Run /speckit-design first." Stop the calling command.
   - `Status: No UI` → PASS.
   - `Status: Approved (…)` → PASS; also confirm `FEATURE_DIR/design/screens/` contains PNGs, otherwise WARN.
   - Anything else (Draft, In review, NEW-ARCHETYPE) → **BLOCK**: "Design not approved yet (status: …). Finish /speckit-design." Stop.
3. On PASS, remind the task generator: every UI task must reference `ui-spec.md`, the screen id (S1…), the approved View
   files to wire up, and include an e2e task per user story (see `design-system/quality.md`). UI tasks are for the
   `ui-builder` agent.
