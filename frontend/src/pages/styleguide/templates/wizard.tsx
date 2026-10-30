import { useState } from "react";
import { Logo } from "@/components/ui/app-shell";
import { Cluster, Stack } from "@/components/layout";
import { SkillSuggestion } from "@/components/domain";
import { Button, Combobox, Container, Stepper, Tray } from "@/components/ui";
import { Icon } from "@/components/icons";
import { SKILL_OPTIONS } from "@/mocks/data";
import { StateSwitcher, useViewState } from "@/components/dev";
import styles from "./templates.module.css";

/*
 * TEMPLATE: Wizard — onboarding, posting a vacancy: a few ordered steps, one topic per step.
 * Minimal header (logo + "Skip for now" / "Save and exit"), Stepper, one question as the title,
 * one tray+card with the step's fields, footer row: Back (ghost) · Continue (primary). Width: form (560).
 * Every step after the first can be skipped unless the feature is unusable without it.
 */

const STEPS = ["University", "Skills", "Preferences", "CV"];
const STATES = ["default", "empty", "saving"] as const;

export function WizardTemplate() {
  const state = useViewState(STATES);
  const [skills, setSkills] = useState<string[]>(state === "empty" ? [] : ["Python", "SQL", "FastAPI", "Git"]);

  return (
    <div className={styles.wizardPage}>
      <Container width="form">
        <div className={styles.wizardBar}>
          <Logo to="/app" />
          <Button variant="ghost" size="sm">Skip for now</Button>
        </div>
        <div className={styles.wizardBody}>
          <Stepper steps={STEPS} current={1} />
          <div className={styles.wizardHead}>
            <h1 className={styles.authTitle}>What are you good at?</h1>
            <p className={styles.authSub}>Add at least 5 skills. We match you to vacancies by them.</p>
          </div>
          <Tray padding="lg" footer={<span>{skills.length} of 5 recommended</span>}>
            <Stack gap={16}>
              <Combobox
                label="Skills"
                multiple
                value={skills}
                onChange={setSkills}
                options={SKILL_OPTIONS}
                allowCreate
                placeholder="Start typing, e.g. Python"
                hint="Languages, tools and soft skills all count"
                data-testid="skills-input"
              />
              <Stack gap={8}>
                <span className={styles.rowMeta}>Popular with students in IT</span>
                <Cluster gap={6}>
                  {["Docker", "React", "English", "Linux"].filter((s) => !skills.includes(s)).map((s) => (
                    <SkillSuggestion key={s} name={s} onAdd={() => setSkills([...skills, s])} />
                  ))}
                </Cluster>
              </Stack>
            </Stack>
          </Tray>
          <div className={styles.wizardFoot}>
            <Button variant="ghost" icon={<Icon name="arrowLeft" />}>Back</Button>
            <Button iconRight={<Icon name="arrowRight" />} loading={state === "saving"}>Continue</Button>
          </div>
        </div>
      </Container>
      <StateSwitcher states={STATES} />
    </div>
  );
}
