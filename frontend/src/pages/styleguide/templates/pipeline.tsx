import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { EmployerLayout } from "@/app/layouts";
import { Cluster, PageBody, Stack, Toolbar } from "@/components/layout";
import { APPLICATION_STATUS, CandidateCard, MatchScore, StatusTag, type ApplicationStatus, type CandidateSummary } from "@/components/domain";
import { Icon, type IconName } from "@/components/icons";
import {
  Avatar, BackLink, Button, Container, Count, DataTable, DropdownMenu, EmptyState, PageHeader, SearchField, SegmentedControl,
  Skeleton, Tray, toast, type Column, type MenuItem,
} from "@/components/ui";
import { CANDIDATES } from "@/mocks/data";
import { StateSwitcher, useViewState } from "@/components/dev";
import styles from "./templates.module.css";

/*
 * TEMPLATE: Pipeline (board) — a team moves many items through stages (employer: applicants of one vacancy).
 * PageHeader (BackLink · vacancy · status line · Edit + ⋯) → Toolbar (view: Board · List · Not selected (n); search) →
 * Board: gray stage columns (title + Count) with white CandidateCards sorted by match; List: DataTable of the same
 * candidates; Not selected: the rejected ones with "Move back". Moving = card "⋯" menu → toast with Undo.
 * Columns scroll horizontally with snap on small screens (focusable region).
 */

const STATES = ["default", "loading", "empty"] as const;
const STAGES: ApplicationStatus[] = ["applied", "shortlisted", "interview", "offer"];
const STAGE_TITLE = (s: ApplicationStatus) => (s === "applied" ? "New" : APPLICATION_STATUS[s].label);
const MOVE: Record<string, { label: string; icon: IconName }> = {
  applied: { label: "Move to New", icon: "inbox" },
  shortlisted: { label: "Shortlist", icon: "check" },
  interview: { label: "Invite to interview", icon: "interview" },
  offer: { label: "Make an offer", icon: "offer" },
};

const REJECTED: CandidateSummary[] = [
  { id: "c7", name: "Ruslan Ibraimov", university: "KazNU", year: "2nd year", match: 41, skills: ["Python"], appliedAgo: "5 days ago", status: "rejected" },
  { id: "c8", name: "Alina Zhaksylyk", university: "Narxoz", year: "4th year", match: 37, skills: ["Excel"], appliedAgo: "1 week ago", status: "rejected" },
];

export function PipelineTemplate() {
  const state = useViewState(STATES);
  const navigate = useNavigate();
  const [people, setPeople] = useState<CandidateSummary[]>(state === "empty" ? [] : [...CANDIDATES, ...REJECTED]);
  const [view, setView] = useState("board");
  const [q, setQ] = useState("");

  const visible = people.filter((c) => `${c.name} ${c.university} ${c.skills.join(" ")}`.toLowerCase().includes(q.toLowerCase()));
  const inPipeline = visible.filter((c) => STAGES.includes(c.status));
  const rejected = visible.filter((c) => c.status === "rejected");
  const loading = state === "loading";

  const move = (c: CandidateSummary, to: ApplicationStatus) => {
    const before = people;
    setPeople(people.map((x) => (x.id === c.id ? { ...x, status: to } : x)));
    toast(to === "rejected" ? `${c.name} · Not selected` : `${c.name} → ${STAGE_TITLE(to)}`, {
      action: { label: "Undo", onClick: () => setPeople(before) },
    });
  };

  const moveItems = (c: CandidateSummary): MenuItem[] => [
    ...STAGES.filter((s) => s !== c.status).map((s) => ({ id: s, ...MOVE[s], onSelect: () => move(c, s) })),
    "separator",
    c.status === "rejected"
      ? { id: "back", label: "Move back to New", icon: "retry", onSelect: () => move(c, "applied") }
      : { id: "reject", label: "Not selected", icon: "rejected", danger: true, onSelect: () => move(c, "rejected") },
  ];

  const menu = (c: CandidateSummary) => (
    <DropdownMenu
      trigger={(p) => <Button {...p} variant="ghost" size="sm" icon={<Icon name="more" />} aria-label={`Move ${c.name}`} />}
      items={moveItems(c)}
    />
  );

  const columns: Column<CandidateSummary>[] = [
    {
      key: "name", header: "Candidate", sortValue: (c) => c.name,
      render: (c) => (
        <Cluster gap={10} nowrap>
          <Avatar name={c.name} size="sm" decorative />
          <div className={styles.rowMain}>
            <span className={styles.rowTitle}><Link to={`/company/candidates/${c.id}`}>{c.name}</Link></span>
            <span className={styles.rowMeta}>{c.university} · {c.year}</span>
          </div>
        </Cluster>
      ),
    },
    { key: "match", header: "Match", sortValue: (c) => c.match, render: (c) => <MatchScore score={c.match} compact /> },
    { key: "stage", header: "Stage", render: (c) => <StatusTag status={c.status} /> },
    { key: "applied", header: "Applied", render: (c) => c.appliedAgo },
    { key: "actions", header: <span className="sr-only">Actions</span>, align: "end", width: "56px", render: menu },
  ];

  return (
    <EmployerLayout>
      <Container>
        <PageHeader
          eyebrow={<BackLink to="/company/vacancies">Vacancies</BackLink>}
          title="Backend Intern (Python)"
          description={`Open · ${people.length} applicants · closes 30 Nov`}
          actions={
            <Cluster gap={8}>
              <Button variant="secondary" size="sm" icon={<Icon name="edit" />} onClick={() => navigate("/company/vacancies/v1/edit")}>Edit vacancy</Button>
              <DropdownMenu
                trigger={(p) => <Button {...p} variant="secondary" size="sm" icon={<Icon name="more" />} aria-label="More actions" />}
                items={[
                  { id: "public", label: "View public page", icon: "external", to: "/app/vacancies/v1" },
                  { id: "close", label: "Close vacancy", icon: "lock", danger: true, onSelect: () => toast("Vacancy closed", { description: "Students can no longer apply.", action: { label: "Undo", onClick: () => toast("Vacancy reopened") } }) },
                ]}
              />
            </Cluster>
          }
        />
        <PageBody>
          <Toolbar
            start={<SearchField label="Search candidates" placeholder="Name, university or skill" value={q} onChange={setQ} />}
            end={
              <SegmentedControl
                aria-label="View"
                value={view}
                onChange={setView}
                options={[
                  { value: "board", label: "Board" },
                  { value: "list", label: "List" },
                  { value: "rejected", label: "Not selected", count: people.filter((c) => c.status === "rejected").length },
                ]}
              />
            }
          />

          {view === "board" && (
            <div className={styles.board} data-testid="pipeline-board" role="region" aria-label="Applicants by stage" tabIndex={0}>
              {STAGES.map((stage) => {
                const items = inPipeline.filter((c) => c.status === stage).sort((a, b) => b.match - a.match);
                return (
                  <section key={stage} className={styles.column} aria-label={STAGE_TITLE(stage)}>
                    <div className={styles.columnHead}>
                      <span>{STAGE_TITLE(stage)}</span>
                      <Count>{loading ? "…" : items.length}</Count>
                    </div>
                    {loading &&
                      [1, 2].map((i) => <Tray key={i} padding="sm"><Cluster gap={8}><Skeleton circle width={28} height={28} /><Skeleton width={120} height={12} /></Cluster></Tray>)}
                    {!loading && items.length === 0 && (
                      <p className={styles.columnEmpty}>{stage === "applied" ? "New applicants appear here" : "No one here yet"}</p>
                    )}
                    {!loading && items.map((c) => <CandidateCard key={c.id} candidate={c} to={`/company/candidates/${c.id}`} actions={menu(c)} />)}
                  </section>
                );
              })}
            </div>
          )}

          {view === "list" && (
            <DataTable
              label="Applicants"
              columns={columns}
              rows={inPipeline}
              getRowId={(c) => c.id}
              loading={loading}
              defaultSort={{ key: "match", direction: "desc" }}
              onRowClick={(c) => navigate(`/company/candidates/${c.id}`)}
              empty={<EmptyState icon={<Icon name="candidates" size={20} />} title={q ? "No candidates match your search" : "No applicants yet"} description={q ? "Try a name, university or skill." : "Share the vacancy — applicants appear here, ranked by match."} />}
            />
          )}

          {view === "rejected" && (
            <Stack gap={12}>
              <p className={styles.rowMeta}>Candidates you marked “Not selected”. They were notified politely and can be moved back.</p>
              <DataTable
                label="Not selected"
                columns={columns}
                rows={rejected}
                getRowId={(c) => c.id}
                onRowClick={(c) => navigate(`/company/candidates/${c.id}`)}
                empty={<EmptyState icon={<Icon name="success" size={20} />} title="No one here" description="Candidates you mark “Not selected” appear here." />}
              />
            </Stack>
          )}
        </PageBody>
      </Container>
      <StateSwitcher states={STATES} />
    </EmployerLayout>
  );
}
