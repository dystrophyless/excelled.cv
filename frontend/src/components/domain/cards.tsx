import type { ReactNode } from "react";
import { Link } from "react-router";
import { Icon, type IconName } from "@/components/icons";
import { Avatar, Card, Tag, Tray, type TagTone } from "@/components/ui";
import { MatchScore, SkillMatchRow, type VacancySkill } from "./match";
import styles from "./domain.module.css";

/* ── Application statuses (both sides) ───────────────────── */

export type ApplicationStatus = "applied" | "viewed" | "shortlisted" | "interview" | "offer" | "hired" | "rejected" | "withdrawn";

export const APPLICATION_STATUS: Record<ApplicationStatus, { label: string; tone: TagTone }> = {
  applied: { label: "Applied", tone: "neutral" },
  viewed: { label: "Viewed", tone: "accent" },
  shortlisted: { label: "Shortlisted", tone: "violet" },
  interview: { label: "Interview", tone: "warning" },
  offer: { label: "Offer", tone: "success" },
  hired: { label: "Hired", tone: "success" },
  rejected: { label: "Not selected", tone: "neutral" },
  withdrawn: { label: "Withdrawn", tone: "neutral" },
};

/** The one way to show an application status. Rejections stay neutral ("Not selected") — never red. */
export function StatusTag({ status }: { status: ApplicationStatus }) {
  const s = APPLICATION_STATUS[status];
  return <Tag tone={s.tone} data-testid="status-tag" data-status={status}>{s.label}</Tag>;
}

/* ── Facts ──────────────────────────────────────────────── */

export type Fact = { icon: IconName; label: ReactNode };

/** Vacancy / profile facts with icons. inline: meta line in cards · list: detail-page aside. */
export function FactList({ facts, layout = "inline" }: { facts: Fact[]; layout?: "inline" | "list" }) {
  return (
    <ul className={styles.facts} data-layout={layout}>
      {facts.map((f, i) => (
        <li key={i}>
          <Icon name={f.icon} size={layout === "list" ? 16 : 14} />
          {f.label}
        </li>
      ))}
    </ul>
  );
}

/* ── Vacancy card ────────────────────────────────────────── */

export type VacancySummary = {
  id: string;
  title: string;
  company: string;
  type: "Internship" | "Full-time" | "Part-time";
  location: string;
  format: "On-site" | "Hybrid" | "Remote";
  duration?: string;
  salary?: string;
  postedAgo: string;
  /** Backend · Frontend · Data · QA · Design … */
  field?: string;
  skills: VacancySkill[];
  /** Viewer's match; absent for guests */
  match?: number;
};

export type VacancyCardProps = {
  vacancy: VacancySummary;
  /** Skills of the viewer, to colour the chips; omit for guests */
  have?: string[];
  to: string;
  /** Right side of the tray footer: Save / Apply buttons */
  actions?: ReactNode;
};

/**
 * The vacancy as a tray + card: identity and facts in the card, match + actions on the tray.
 * The title is the link; the whole card is clickable through it.
 */
export function VacancyCard({ vacancy: v, have, to, actions }: VacancyCardProps) {
  return (
    <Tray
      className={styles.clickable}
      data-testid="vacancy-card"
      footer={
        (v.match !== undefined || actions) && (
          <>
            {v.match !== undefined ? <MatchScore score={v.match} /> : <span>{v.postedAgo}</span>}
            {actions && <div className={styles.footActions}>{actions}</div>}
          </>
        )
      }
    >
      <div className={styles.vacancyHead}>
        <Avatar name={v.company} shape="square" />
        <div className={styles.vacancyMain}>
          <div className={styles.titleRow}>
            <h3 className={styles.title}>
              <Link to={to} className={styles.titleLink}>{v.title}</Link>
            </h3>
            <Tag tone={v.type === "Internship" ? "accent" : "neutral"}>{v.type}</Tag>
          </div>
          <span className={styles.company}>{v.company}</span>
        </div>
      </div>
      <div className={styles.cardBody}>
        <FactList
          facts={[
            { icon: v.format === "Remote" ? "remote" : "location", label: v.format === "Remote" ? "Remote" : `${v.location} · ${v.format}` },
            ...(v.duration ? [{ icon: "duration" as const, label: v.duration }] : []),
            ...(v.salary ? [{ icon: "salary" as const, label: v.salary }] : []),
          ]}
        />
        <SkillMatchRow skills={v.skills} have={have} />
      </div>
    </Tray>
  );
}

/* ── Candidate card (employer pipeline) ───────────────────── */

export type CandidateSummary = {
  id: string;
  name: string;
  university: string;
  year: string;
  match: number;
  skills: string[];
  appliedAgo: string;
  status: ApplicationStatus;
};

/**
 * Compact candidate card for pipeline columns (which are already gray trays — so this is a plain
 * white Card, never a Tray). Name is the link; match + "⋯" actions on the bottom row.
 */
export function CandidateCard({ candidate: c, to, actions }: { candidate: CandidateSummary; to: string; actions?: ReactNode }) {
  return (
    <Card padding="sm" className={`${styles.clickable} ${styles.candidate}`} data-testid="candidate-card">
      <div className={`${styles.vacancyHead} ${styles.candidateHead}`}>
        <Avatar name={c.name} size="sm" />
        <div className={styles.vacancyMain}>
          <h3 className={`${styles.title} ${styles.candidateName}`}>
            <Link to={to} className={styles.titleLink}>{c.name}</Link>
          </h3>
          <span className={styles.company}>{c.university} · {c.year}</span>
        </div>
      </div>
      <div className={styles.candidateFoot}>
        <MatchScore score={c.match} compact />
        {actions ?? <span className={styles.company}>{c.appliedAgo}</span>}
      </div>
    </Card>
  );
}
