import { useNavigate } from "react-router";
import { StudentLayout } from "@/app/layouts";
import { Fragment, type ReactNode } from "react";
import { PageBody, Section, Stack, TwoColumn } from "@/components/layout";
import { FactList, type Fact } from "@/components/domain";
import { Icon } from "@/components/icons";
import { Avatar, Button, Card, Container, EmptyState, PageHeader, Skeleton, Tray } from "@/components/ui";
import { CvBlock, CvJump, type CvBlockProps } from "@/features/cv/views/CvBlock";
import { formatDate, optionLabel, studyHeadline, type LoadState, type ProfileCatalog, type StudentProfile } from "../model";
import {
  AboutBlock, ContactList, EducationEntry, LanguageList, LinesSkeleton, LookingForEntry, PrivateNote, ProfileChecklist, ProjectList,
  hasContacts,
} from "./profile-parts";
import styles from "./profiles.module.css";

export type StudentProfileViewProps = {
  state: LoadState;
  profile?: StudentProfile;
  /** The account's sign-in email (GET /api/auth/me). Kept in the contract; not shown (account info lives in Settings) */
  email?: string;
  /** Labels: cities, degrees, fields, types, language levels */
  catalog: ProfileCatalog;
  routes: { edit: string };
  onRetry?: () => void;
  /** 006: the CV block of the owner panel. Without it the panel keeps "Coming soon: CV". */
  cv?: CvBlockProps;
};

/** The line under the name: "{Major} · {Degree}, {n} year" + the student's city. University and GPA live in Education. */
function identityFacts(pr: StudentProfile, catalog: ProfileCatalog): Fact[] {
  const city = optionLabel(catalog.cities, pr.city);
  return [
    { icon: "education", label: studyHeadline(pr, catalog.degrees) },
    ...(city ? [{ icon: "location" as const, label: city }] : []),
  ];
}

/** The card's sections under the identity, in order; empty optional ones are left out (the owner panel lists them). */
function profileSections(pr: StudentProfile, catalog: ProfileCatalog, editTo: string): ReactNode[] {
  // Languages and Contacts are separate full-width sections (owner, round 14)
  const languages = pr.languages.length > 0 && (
    <Section key="languages" title="Languages"><LanguageList profile={pr} levels={catalog.languageLevels} /></Section>
  );
  const contacts = hasContacts(pr) && <Section key="contacts" title="Contacts"><ContactList profile={pr} /></Section>;
  return [
    <Section key="looking-for" title="Looking for"><LookingForEntry profile={pr} fields={catalog.fields} types={catalog.types} /></Section>,
    <Section key="about" title="About"><AboutBlock profile={pr} editTo={editTo} /></Section>,
    <Section key="education" title="Education"><EducationEntry profile={pr} /></Section>,
    pr.projects.length > 0 && <Section key="projects" title="Projects"><ProjectList profile={pr} /></Section>,
    languages,
    contacts,
  ].filter(Boolean);
}

/**
 * S2 — /app/profile. Archetype: Detail (own profile), reference /styleguide/templates/profile (variant A, chosen in round 7).
 * PageHeader "My profile" + the one primary "Edit profile" (aligned with the h1) · TwoColumn end 360 sticky ·
 * main Card = the profile (identity · Looking for · About · Education · Projects · Languages | Contacts; each fact once;
 * empty optional sections are not drawn) · aside Tray = owner panel (header: privacy · card: "Complete your profile" with
 * Add while something optional is missing — nothing when all is filled — + "Coming soon" · footer: "Updated …").
 * Below 1024 the owner panel follows the profile card (the profile is what the page is about).
 */
export function StudentProfileView(p: StudentProfileViewProps) {
  const navigate = useNavigate();
  const pr = p.profile;
  const loading = p.state === "loading" || (p.state === "ready" && !pr);

  return (
    <StudentLayout>
      <Container width="page">
        <PageHeader
          title="My profile"
          actions={p.state === "error" ? undefined : (
            <Button size="sm" icon={<Icon name="edit" />} disabled={loading} onClick={() => navigate(p.routes.edit)}>Edit profile</Button>
          )}
        />
        <PageBody>
          {p.state === "error" ? (
            <Card>
              <EmptyState
                tone="error"
                title="Couldn't load your profile"
                description="Check your connection and try again."
                actions={<Button variant="secondary" size="sm" icon={<Icon name="retry" />} onClick={p.onRetry}>Try again</Button>}
              />
            </Card>
          ) : (
            <TwoColumn
              sticky
              aside={
                <Tray
                  data-testid="owner-panel"
                  aria-busy={loading || undefined}
                  header={<PrivateNote />}
                  footer={loading || !pr ? <Skeleton width={140} height={12} /> : <span>Updated {formatDate(pr.updatedAt)}</span>}
                >
                  {loading || !pr ? <LinesSkeleton lines={4} /> : <ProfileChecklist profile={pr} editTo={p.routes.edit} cv={p.cv && <CvBlock {...p.cv} />} />}
                </Tray>
              }
              main={
                <Card padding="lg" data-testid="student-profile" aria-busy={loading || undefined}>
                  {loading || !pr ? (
                    <Stack gap={24}>
                      <div className={styles.identity}>
                        <Skeleton width={56} circle />
                        <span className={styles.identityText}>
                          <Skeleton width="60%" height={24} />
                          <Skeleton width="80%" height={14} />
                        </span>
                      </div>
                      {/* the content's order (round 16): Looking for tile · About lines · Education tile */}
                      {(["tile", "lines", "tile"] as const).map((kind, i) => (
                        <Fragment key={i}>
                          <div className={styles.divider} />
                          {kind === "lines" ? (
                            <Stack gap={16}>
                              <Skeleton width={64} height={16} />
                              <LinesSkeleton />
                            </Stack>
                          ) : (
                            <Stack gap={16}>
                              <Skeleton width={i === 0 ? 96 : 88} height={16} />
                              <div className={styles.entry}>
                                <Skeleton width={40} height={40} radius="var(--radius-control)" />
                                <span className={styles.entryText}>
                                  <Skeleton width="70%" height={14} />
                                  <Skeleton width="50%" height={12} />
                                </span>
                              </div>
                            </Stack>
                          )}
                        </Fragment>
                      ))}
                    </Stack>
                  ) : (
                    <Stack gap={24}>
                      <div className={styles.identity} data-testid="profile-identity">
                        <Avatar name={pr.fullName} size="lg" />
                        <span className={styles.identityText}>
                          <span className={styles.identityName}>{pr.fullName}</span>
                          <FactList
                            facts={identityFacts(pr, p.catalog)}
                            trailing={p.cv && <CvJump state={p.cv.state} hasCv={Boolean(p.cv.cv)} />}
                          />
                        </span>
                      </div>
                      {profileSections(pr, p.catalog, p.routes.edit).map((block, i) => (
                        <Fragment key={i}>
                          <div className={styles.divider} />
                          {block}
                        </Fragment>
                      ))}
                    </Stack>
                  )}
                </Card>
              }
            />
          )}
        </PageBody>
      </Container>
    </StudentLayout>
  );
}
