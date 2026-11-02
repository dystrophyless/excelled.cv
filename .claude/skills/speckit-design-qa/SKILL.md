---
name: speckit-design-qa
description: Design QA after /speckit-implement (after_implement hook) or on demand — the design-qa agent checks the implemented UI against the approved ui-spec, screenshots and design-system checklist and writes qa-report.md.
user-invocable: true
---

# /speckit-design-qa

1. Run `.specify/scripts/powershell/check-prerequisites.ps1 -Json -PathsOnly`; read `FEATURE_DIR`.
   If `ui-spec.md` says `No UI`, report "No UI — skipped" and stop.
2. Spawn the `design-qa` agent with the absolute `FEATURE_DIR` and feature id. Wait for its verdict.
3. Show the owner: verdict, the top fixes, path to `FEATURE_DIR/design/qa-report.md`, and 1–2 screenshots of the most
   visible differences (Read the PNGs).
4. On FAIL: offer to send the fixes to a `ui-builder` agent, then run this QA again. Do not fix UI yourself.
