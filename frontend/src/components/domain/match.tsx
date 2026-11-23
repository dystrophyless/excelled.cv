import { Icon } from "@/components/icons";
import styles from "./domain.module.css";

/*
 * Matching vocabulary (design-system/ia.md § Matching):
 * score 0–100 → Strong ≥ 75 · Good 50–74 · Partial < 50, shown with affect's 3-bar signal.
 * Skills have no levels; vacancy skills are Required or Nice to have.
 */

export type MatchLevel = 1 | 2 | 3;

export function matchLevel(score: number): MatchLevel {
  return score >= 75 ? 3 : score >= 50 ? 2 : 1;
}

export const MATCH_LABEL: Record<MatchLevel, string> = { 3: "Strong match", 2: "Good match", 1: "Partial match" };

export type MatchScoreProps = {
  score: number;
  /** sm: inline in cards and footers · lg: big number on detail pages */
  size?: "sm" | "lg";
  /** Hide the "Strong match" words (e.g. in table cells) */
  compact?: boolean;
  className?: string;
};

export function MatchScore({ score, size = "sm", compact, className }: MatchScoreProps) {
  const level = matchLevel(score);
  return (
    <span
      className={[styles.score, className].filter(Boolean).join(" ")}
      data-level={level}
      data-size={size}
      data-testid="match-score"
      data-score={score}
    >
      <span className={styles.bars} aria-hidden="true">
        {[1, 2, 3].map((n) => (
          <span key={n} data-on={n <= level || undefined} />
        ))}
      </span>
      <span className={styles.pct}>{score}%</span>
      {compact ? <span className="sr-only">{MATCH_LABEL[level]}</span> : <span>{MATCH_LABEL[level]}</span>}
    </span>
  );
}

export type VacancySkill = { name: string; required: boolean };

export type SkillChipProps = {
  name: string;
  /** matched: the person has it · missing: they don't · neutral: just a skill (profile lists) */
  state?: "matched" | "missing" | "neutral";
  nice?: boolean;
};

export function SkillChip({ name, state = "neutral", nice }: SkillChipProps) {
  return (
    <span className={styles.skill} data-state={state} data-nice={nice || undefined}>
      {state === "matched" && <Icon name="check" size={12} />}
      {name}
      {state === "missing" && <span className="sr-only"> (missing)</span>}
    </span>
  );
}

/** Compact row of a vacancy's skills against the viewer's skills — for cards. Required first. Without `have` (guests) chips are neutral. */
export function SkillMatchRow({ skills, have, max = 6 }: { skills: VacancySkill[]; have?: string[]; max?: number }) {
  const owned = new Set((have ?? []).map((s) => s.toLowerCase()));
  const ordered = [...skills].sort((a, b) => Number(b.required) - Number(a.required));
  const shown = ordered.slice(0, max);
  return (
    <div className={styles.skills} aria-label="Skills">
      {shown.map((s) => (
        <SkillChip key={s.name} name={s.name} state={!have ? "neutral" : owned.has(s.name.toLowerCase()) ? "matched" : "missing"} nice={!s.required} />
      ))}
      {ordered.length > max && <SkillChip name={`+${ordered.length - max}`} />}
    </div>
  );
}

/** Full breakdown for a detail page: Required x of y · Nice to have x of y · the most useful missing skill. */
export function SkillBreakdown({ skills, have, subject = "you" }: { skills: VacancySkill[]; have: string[]; subject?: "you" | "candidate" }) {
  const owned = new Set(have.map((s) => s.toLowerCase()));
  const required = skills.filter((s) => s.required);
  const nice = skills.filter((s) => !s.required);
  const count = (list: VacancySkill[]) => list.filter((s) => owned.has(s.name.toLowerCase())).length;
  const firstMissing = required.find((s) => !owned.has(s.name.toLowerCase())) ?? nice.find((s) => !owned.has(s.name.toLowerCase()));

  const group = (title: string, list: VacancySkill[]) =>
    list.length > 0 && (
      <div className={styles.group}>
        <div className={styles.groupHead}>
          <span>{title}</span>
          <span><strong>{count(list)}</strong> of {list.length}</span>
        </div>
        <div className={styles.skills}>
          {list.map((s) => (
            <SkillChip key={s.name} name={s.name} state={owned.has(s.name.toLowerCase()) ? "matched" : "missing"} nice={!s.required} />
          ))}
        </div>
      </div>
    );

  return (
    <div className={styles.breakdown} data-testid="skill-breakdown">
      {group("Required", required)}
      {group("Nice to have", nice)}
      {firstMissing && subject === "you" && (
        <p className={styles.tip}>
          <Icon name="recommendation" size={16} />
          <span>Add <strong>{firstMissing.name}</strong> to your profile if you know it — it raises your match the most.</span>
        </p>
      )}
    </div>
  );
}

/** "+ Docker" — a suggested skill the person can add with one click. */
export function SkillSuggestion({ name, onAdd }: { name: string; onAdd: () => void }) {
  return (
    <button type="button" className={styles.suggest} onClick={onAdd} aria-label={`Add ${name}`}>
      <Icon name="add" size={12} />
      {name}
    </button>
  );
}
