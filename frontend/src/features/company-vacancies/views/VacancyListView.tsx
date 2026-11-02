import { Link, useNavigate } from "react-router";
import { EmployerLayout } from "@/app/layouts";
import { Cluster, PageBody, Show, Toolbar } from "@/components/layout";
import { Icon } from "@/components/icons";
import {
  Button, Card, Container, DataTable, DropdownMenu, EmptyState, PageHeader, SearchField, SegmentedControl, SelectField, Skeleton, Tag,
  type Column,
} from "@/components/ui";
import {
  STATUS_FILTERS, closedShort, formatDay, optionLabel, plural,
  type Catalog, type StatusCounts, type StatusFilter, type VacancyAction, type VacancyItem, type VacancyNotice, type VacancyRoutes,
} from "../model";
import { NoticeAlert, VacancyDialogs, VacancyStatusTag, vacancyMenuItems, type VacancyDialogState } from "./parts";
import styles from "./vacancies.module.css";

export type VacancyListState = "ready" | "loading" | "error";

export type VacancyListViewProps = {
  state: VacancyListState;
  /** Already filtered by status and search (the API does it) */
  items: VacancyItem[];
  /** Counts of every group; they ignore the search and the selected group */
  counts: StatusCounts;
  status: StatusFilter;
  query: string;
  catalog: Catalog;
  /** ISO date, the earliest deadline Reopen accepts */
  today: string;
  notice?: VacancyNotice;
  dialog?: VacancyDialogState;
  /** A status request is in flight (dialog confirm shows a spinner) */
  busy?: boolean;
  reopenError?: string;
  routes: VacancyRoutes;
  onStatusChange: (status: StatusFilter) => void;
  onQueryChange: (query: string) => void;
  onAction: (action: VacancyAction, vacancy: VacancyItem) => void;
  onRetry?: () => void;
  onDialogCancel: () => void;
  onDialogConfirm: (kind: "close" | "reopen" | "delete", applyBy?: string) => void;
};

const GROUP_EMPTY: Record<Exclude<StatusFilter, "all">, { title: string; description: string }> = {
  open: { title: "No open vacancies", description: "Publish a draft or reopen a closed vacancy to take applications." },
  draft: { title: "No drafts", description: "Save a vacancy as a draft and finish it later." },
  paused: { title: "No paused vacancies", description: "Pause an open vacancy to stop new applications for a while." },
  closed: { title: "No closed vacancies", description: "Vacancies you close, or that pass their deadline, appear here." },
};

export function VacancyListView(p: VacancyListViewProps) {
  const navigate = useNavigate();
  const loading = p.state === "loading";
  const firstRun = p.state === "ready" && p.counts.all === 0;

  const columns: Column<VacancyItem>[] = [
    {
      key: "title", header: "Vacancy", sortValue: (v) => v.title.toLowerCase(),
      render: (v) => {
        const meta = [optionLabel(p.catalog.types, v.type), optionLabel(p.catalog.fields, v.field), optionLabel(p.catalog.cities, v.city)].filter(Boolean);
        return (
          <div className={styles.rowMain}>
            <span className={styles.rowTitle}><Link to={p.routes.view(v.id)}>{v.title}</Link></span>
            <span className={styles.rowMeta}>{meta.length ? meta.join(" · ") : "Not finished yet"}</span>
          </div>
        );
      },
    },
    {
      key: "status", header: "Status",
      render: (v) => (
        <div className={styles.statusCell}>
          <VacancyStatusTag status={v.status} />
          {closedShort(v) && <span className={styles.rowMeta}>{closedShort(v)}</span>}
        </div>
      ),
    },
    {
      key: "applicants", header: "Applicants", align: "end", sortValue: (v) => v.applicants,
      render: (v) => (
        <Cluster gap={6} justify="end" nowrap>
          {v.newApplicants > 0 && <Tag tone="accent">+{v.newApplicants} new</Tag>}
          <span className={styles.numeric}>{v.applicants}</span>
        </Cluster>
      ),
    },
    {
      key: "deadline", header: "Apply by", sortValue: (v) => v.applyBy ?? "",
      render: (v) => (v.applyBy ? formatDay(v.applyBy) : <span className={styles.dim}>—</span>),
    },
    {
      key: "actions", header: <span className="sr-only">Actions</span>, align: "end", width: "56px",
      render: (v) => (
        <DropdownMenu
          trigger={(t) => <Button {...t} variant="ghost" size="sm" icon={<Icon name="more" />} aria-label={`Actions for ${v.title}`} />}
          items={vacancyMenuItems(v, { editHref: p.routes.edit(v.id), onAction: p.onAction })}
        />
      ),
    },
  ];

  const clearFilters = () => { p.onQueryChange(""); p.onStatusChange("all"); };

  let empty;
  if (p.query || p.status === "all") {
    empty = (
      <EmptyState icon={<Icon name="search" size={20} />} title="No vacancies match"
        description={p.query ? "Try another word from the title, or another status." : "Try another status or search term."}
        actions={<Button variant="secondary" size="sm" onClick={clearFilters}>Clear filters</Button>} />
    );
  } else {
    const g = GROUP_EMPTY[p.status];
    empty = (
      <EmptyState icon={<Icon name="vacancy" size={20} />} title={g.title} description={g.description}
        actions={<Button variant="secondary" size="sm" onClick={() => p.onStatusChange("all")}>Show all vacancies</Button>} />
    );
  }

  return (
    <EmployerLayout>
      <Container>
        <PageHeader
          title="Vacancies"
          description="Post vacancies, change their status and review applicants ranked by skill match."
          actions={
            <Button variant={firstRun ? "secondary" : "primary"} icon={<Icon name="add" />} onClick={() => navigate(p.routes.create)}>
              Post a vacancy
            </Button>
          }
        />
        <PageBody>
          {p.notice && <NoticeAlert notice={p.notice} />}

          {p.state === "error" ? (
            <Card>
              <EmptyState
                tone="error"
                title="Couldn't load vacancies"
                description="Check your connection and try again."
                actions={<Button variant="secondary" size="sm" icon={<Icon name="retry" />} onClick={p.onRetry}>Try again</Button>}
              />
            </Card>
          ) : firstRun ? (
            <Card>
              <EmptyState
                icon={<Icon name="postVacancy" size={20} />}
                title="Post your first vacancy"
                description="Students see it as soon as you publish, ranked by how well their skills fit."
                actions={<Button size="sm" icon={<Icon name="add" />} onClick={() => navigate(p.routes.create)}>Post a vacancy</Button>}
              />
            </Card>
          ) : (
            <>
              <Toolbar
                start={<SearchField label="Search vacancies" placeholder="Search by title" value={p.query} onChange={p.onQueryChange} />}
                end={
                  <>
                    <Show above="lg">
                      <SegmentedControl
                        aria-label="Status"
                        value={p.status}
                        onChange={p.onStatusChange}
                        options={STATUS_FILTERS.map((f) => ({ value: f.value, label: f.label, count: loading ? undefined : p.counts[f.value] }))}
                      />
                    </Show>
                    <Show below="lg">
                      <SelectField
                        label="Status"
                        hideLabel
                        size="sm"
                        value={p.status}
                        onChange={(v) => p.onStatusChange(v as StatusFilter)}
                        options={STATUS_FILTERS.map((f) => ({ value: f.value, label: loading ? f.label : `${f.label} (${p.counts[f.value]})` }))}
                        data-testid="status-select"
                      />
                    </Show>
                  </>
                }
              />
              <Show above="lg">
                <DataTable
                  label="Your vacancies"
                  columns={columns}
                  rows={p.items}
                  getRowId={(v) => v.id}
                  loading={loading}
                  empty={empty}
                  onRowClick={(v) => navigate(p.routes.view(v.id))}
                  data-testid="vacancies-table"
                />
              </Show>
              <Show below="lg">
                <Card padding="sm" data-testid="vacancies-list" aria-busy={loading || undefined}>
                  {loading ? (
                    [1, 2, 3, 4].map((i) => (
                      <div key={i} className={styles.mRow}>
                        <div className={styles.mBody}><Skeleton width="60%" height={14} /><Skeleton width="40%" height={12} /><Skeleton width="50%" height={12} /></div>
                      </div>
                    ))
                  ) : p.items.length === 0 ? (
                    empty
                  ) : (
                    p.items.map((v) => <MobileRow key={v.id} v={v} p={p} />)
                  )}
                </Card>
              </Show>
            </>
          )}
        </PageBody>
      </Container>
      <VacancyDialogs dialog={p.dialog ?? null} today={p.today} busy={p.busy} reopenError={p.reopenError} onCancel={p.onDialogCancel} onConfirm={p.onDialogConfirm} />
    </EmployerLayout>
  );
}

/** Below 1024px the table becomes stacked rows in one card: nothing is cut off and "⋯" stays at the right. */
function MobileRow({ v, p }: { v: VacancyItem; p: VacancyListViewProps }) {
  const navigate = useNavigate();
  const meta = [optionLabel(p.catalog.types, v.type), optionLabel(p.catalog.fields, v.field), optionLabel(p.catalog.cities, v.city)].filter(Boolean);
  return (
    <div
      className={styles.mRow}
      data-testid="vacancy-row"
      data-id={v.id}
      onClick={(e) => { if (!(e.target as HTMLElement).closest("button, a")) navigate(p.routes.view(v.id)); }}
    >
      <div className={styles.mBody}>
        <span className={styles.rowTitle}><Link to={p.routes.view(v.id)}>{v.title}</Link></span>
        <span className={styles.rowMeta}>{meta.length ? meta.join(" · ") : "Not finished yet"}</span>
        <Cluster gap={8}>
          <VacancyStatusTag status={v.status} />
          {closedShort(v) && <span className={styles.rowMeta}>{closedShort(v)}</span>}
        </Cluster>
        <Cluster gap={6}>
          {v.newApplicants > 0 && <Tag tone="accent">+{v.newApplicants} new</Tag>}
          <span className={styles.rowMeta}>
            {plural(v.applicants, "applicant")} · {v.applyBy ? `Apply by ${formatDay(v.applyBy)}` : "No deadline yet"}
          </span>
        </Cluster>
      </div>
      <DropdownMenu
        trigger={(t) => <Button {...t} variant="ghost" size="sm" icon={<Icon name="more" />} aria-label={`Actions for ${v.title}`} />}
        items={vacancyMenuItems(v, { editHref: p.routes.edit(v.id), onAction: p.onAction })}
      />
    </div>
  );
}
