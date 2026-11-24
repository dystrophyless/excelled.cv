import { useNavigate } from "react-router";
import { Stack } from "@/components/layout";
import { BrandIcon, Icon, type IconName } from "@/components/icons";
import { Button, ExternalLink, Skeleton } from "@/components/ui";
import { contactRows, displayWebsite, formatGpa, optionLabel, type Option, type StudentContacts, type StudentProfile } from "../model";
import { findUniversity } from "../universities";
import styles from "./profiles.module.css";

/*
 * Blocks of S2 "My profile" (round 7 layout, extended in round 13). Each fact appears once on the page:
 * identity = name + "{Major} · {Degree}, {n} year" + city · Looking for = fields + position types ·
 * Education = university + its city, GPA on the right · Projects · Languages · Contacts.
 * Empty optional sections are not drawn in the card; the owner panel lists them with "Add" (About keeps its prompt).
 */

export type ProfileBlockProps = { profile: StudentProfile; editTo: string };

/** Education entry: 40px icon tile + title row (university · GPA on the right) + one meta line — 20 + 20 = 40. */
export function EducationEntry({ profile: pr }: { profile: StudentProfile }) {
  const uni = findUniversity(pr.university);
  return (
    <div className={styles.entry} data-testid="profile-education">
      <span className={styles.iconTile} aria-hidden="true"><Icon name="education" size={20} /></span>
      <span className={styles.entryText}>
        <span className={styles.entryHead}>
          <span className={styles.entryTitle}>{pr.university}</span>
          {pr.gpa && <span className={styles.entryAside} data-testid="profile-gpa">GPA <strong>{formatGpa(pr.gpa)}</strong></span>}
        </span>
        {uni && <span className={styles.entryMeta}>{uni.city}</span>}
      </span>
    </div>
  );
}

/**
 * Looking for: the same entry shape as Education — fields of work as the title, position types as the meta.
 * No field ("I'm not sure yet") reads as a choice, not a gap: "Open to any field" · "Still exploring · Internship".
 */
export function LookingForEntry({ profile: pr, fields, types }: { profile: StudentProfile; fields: Option[]; types: Option[] }) {
  // "Internship", "Internship or research", "Internship, full-time or research" (up to four types)
  const typeNames = pr.positionTypes.map((t) => optionLabel(types, t)).map((t, i) => (i === 0 ? t : t.toLowerCase()));
  const typeText = typeNames.length > 2 ? `${typeNames.slice(0, -1).join(", ")} or ${typeNames[typeNames.length - 1]}` : typeNames.join(" or ");
  const exploring = pr.lookingForFields.length === 0; // "I'm not sure yet"
  return (
    <div className={styles.entry} data-testid="profile-looking-for" data-exploring={exploring || undefined}>
      <span className={styles.iconTile} aria-hidden="true"><Icon name={exploring ? "search" : "vacancy"} size={20} /></span>
      <span className={styles.entryText}>
        <span className={styles.entryTitle}>
          {exploring ? "Open to any field" : pr.lookingForFields.map((f) => optionLabel(fields, f)).join(", ")}
        </span>
        <span className={styles.entryMeta}>{exploring ? `Still exploring · ${typeText}` : typeText}</span>
      </span>
    </div>
  );
}

/** Projects: one entry per project — title, what it does, link (shown without the scheme). */
export function ProjectList({ profile: pr }: { profile: StudentProfile }) {
  return (
    <Stack gap={16} data-testid="profile-projects">
      {pr.projects.map((p, i) => (
        <div key={i} className={styles.entry}>
          <span className={styles.iconTile} aria-hidden="true"><Icon name="project" size={20} /></span>
          <span className={styles.entryText}>
            <span className={styles.entryTitle}>{p.title}</span>
            {p.description && <p className={styles.entryBody}>{p.description}</p>}
            {p.url && (
              <ExternalLink className={`${styles.contactLink} ${styles.entryLink}`} href={p.url}>
                <span className={styles.contactValue}>{displayWebsite(p.url)}</span>
                <Icon name="external" size={14} className={styles.contactIcon} />
                <span className="sr-only"> (opens in a new tab)</span>
              </ExternalLink>
            )}
          </span>
        </div>
      ))}
    </Stack>
  );
}

export function LanguageList({ profile: pr, levels }: { profile: StudentProfile; levels: Option[] }) {
  return (
    <dl className={styles.pairs} data-lead="term" data-testid="profile-languages">
      {pr.languages.map((l) => (
        <div key={l.language} className={styles.pair}>
          <dt>{l.language}</dt>
          <dd>{optionLabel(levels, l.level)}</dd>
        </div>
      ))}
    </dl>
  );
}

/** Real logos for brand channels (BrandIcon, brand colour); Lucide for phone and website. */
function ContactGlyph({ id }: { id: keyof StudentContacts }) {
  switch (id) {
    case "whatsapp": return <BrandIcon name="whatsapp" size={20} />;
    case "telegram": return <BrandIcon name="telegram" size={20} />;
    case "linkedinUrl": return <BrandIcon name="linkedin" size={20} />;
    case "githubUrl": return <BrandIcon name="github" size={20} />;
    case "websiteUrl": return <Icon name="website" size={20} className={styles.contactLucide} />;
    default: return <Icon name="phone" size={20} className={styles.contactLucide} />;
  }
}

/**
 * Contacts as ONE block (round 15): a hairline-bordered list, one row per channel = logo · label · value · external
 * cue. The whole row is the link (hover fill, kit focus ring). Phone → tel: (same tab); WhatsApp → wa.me, Telegram →
 * t.me, LinkedIn / GitHub / website open in a new tab with a screen-reader cue. Below 640 the label sits above the value.
 */
export function ContactList({ profile: pr }: { profile: StudentProfile }) {
  return (
    <ul className={styles.contacts} data-testid="profile-contacts">
      {contactRows(pr.contacts).map((c) => {
        const external = c.id !== "phone";
        return (
          <li key={c.id} className={styles.contactItem}>
            <a
              className={styles.contactRow}
              href={c.href}
              {...(external ? { target: "_blank", rel: "noreferrer" } : {})}
              data-testid={`contact-${c.id}`}
            >
              <span className={styles.contactGlyph} aria-hidden="true"><ContactGlyph id={c.id} /></span>
              <span className={styles.contactLabel}>{c.label}<span className="sr-only">: </span></span>
              <span className={styles.contactValue}>{c.value}</span>
              {external && (
                <>
                  <Icon name="external" size={14} className={styles.contactIcon} />
                  <span className="sr-only"> (opens in a new tab)</span>
                </>
              )}
            </a>
          </li>
        );
      })}
    </ul>
  );
}

export const hasContacts = (pr: StudentProfile) => contactRows(pr.contacts).length > 0;

/** About me, or a prompt that reads as an invitation, not as a hole. */
export function AboutBlock({ profile: pr, editTo }: ProfileBlockProps) {
  const navigate = useNavigate();
  if (pr.about) return <p className={styles.about} data-testid="profile-about">{pr.about}</p>;
  return (
    <div className={styles.emptyPrompt} data-testid="profile-about-empty">
      <p className={styles.emptyText}>Say what you study, what you enjoy and what you're looking for. Two or three sentences are enough.</p>
      <Button variant="secondary" size="sm" icon={<Icon name="add" />} onClick={() => navigate(`${editTo}#about`)}>Write about yourself</Button>
    </div>
  );
}

/**
 * Optional items the student can add on the profile page, in card order. Required facts are always there, so they
 * don't count. `section` = the Edit profile section the "Add" button opens (`#id`).
 */
export const optionalItems = (pr: StudentProfile) => [
  { id: "city", label: "City", aria: "Add city", section: "city", done: Boolean(pr.city) },
  { id: "about", label: "About me", aria: "Add about me", section: "about", done: Boolean(pr.about) },
  { id: "gpa", label: "GPA", aria: "Add GPA", section: "gpa", done: Boolean(pr.gpa) },
  { id: "projects", label: "Projects", aria: "Add projects", section: "projects", done: pr.projects.length > 0 },
  { id: "languages", label: "Languages", aria: "Add languages", section: "languages", done: pr.languages.length > 0 },
  { id: "contacts", label: "Contacts", aria: "Add contacts", section: "contacts", done: hasContacts(pr) },
];

/** Features that don't exist yet: listed so the student knows what's next, never as working controls. */
const COMING: { id: string; label: string; detail: string; icon: IconName }[] = [
  { id: "cv", label: "CV", detail: "Apply to vacancies in one step", icon: "cv" },
  { id: "skills", label: "Skills", detail: "Get matched with vacancies", icon: "skill" },
];

/**
 * Owner panel content: "Complete your profile · n of 6 added" + every optional item (added = muted with a check,
 * missing = "Add" → its Edit profile section) while anything is missing. A finished profile shows no completeness
 * block at all (FR-006a) — only "Coming soon".
 */
export function ProfileChecklist({ profile, editTo }: ProfileBlockProps) {
  const navigate = useNavigate();
  const items = optionalItems(profile);
  const done = items.filter((i) => i.done).length;
  const complete = done === items.length;
  return (
    <Stack gap={16} data-testid="profile-checklist">
      {!complete && (
        <>
          <Stack gap={8} data-testid="profile-completeness">
            <p className={styles.checkHead}>
              <span>Complete your profile</span>
              <span className={styles.rowMeta}>{done} of {items.length} added</span>
            </p>
            <ul className={styles.checkList}>
              {items.map((i) => (
                <li key={i.id} className={styles.checkRow} data-done={i.done || undefined}>
                  <span className={styles.lineIcon} data-tone={i.done ? "success" : undefined} aria-hidden="true">
                    <Icon name={i.done ? "success" : "add"} size={16} />
                  </span>
                  <span className={styles.checkLabel}>
                    {i.label}
                    {i.done && <span className="sr-only"> (added)</span>}
                  </span>
                  {!i.done && (
                    <Button variant="ghost" size="sm" onClick={() => navigate(`${editTo}#${i.section}`)} aria-label={i.aria}>Add</Button>
                  )}
                </li>
              ))}
            </ul>
          </Stack>
          <div className={styles.divider} />
        </>
      )}
      <Stack gap={12}>
        <span className={styles.groupLabel}>Coming soon</span>
        <ul className={styles.soonList}>
          {COMING.map((c) => (
            <li key={c.id} className={styles.soonRow}>
              <span className={styles.lineIcon} aria-hidden="true"><Icon name={c.icon} size={16} /></span>
              <span className={styles.entryText}>
                <span className={styles.soonTitle}>{c.label}</span>
                <span className={styles.entryMeta}>{c.detail}</span>
              </span>
            </li>
          ))}
        </ul>
      </Stack>
    </Stack>
  );
}

/** The privacy line on the owner panel header. */
export function PrivateNote() {
  return <span className={styles.trayLabel}><Icon name="lock" size={14} />Only you can see your profile for now</span>;
}

export function LinesSkeleton({ lines = 3 }: { lines?: number }) {
  return (
    <Stack gap={10}>
      {Array.from({ length: lines }, (_, i) => <Skeleton key={i} height={14} width={i === lines - 1 ? "60%" : "100%"} />)}
    </Stack>
  );
}
