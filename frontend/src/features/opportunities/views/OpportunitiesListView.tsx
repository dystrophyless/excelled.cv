import { useEffect, useRef, useState } from "react";
import { StudentLayout } from "@/app/layouts";
import { Cluster, PageBody, Show, Stack, Toolbar, TwoColumn } from "@/components/layout";
import { VacancyCard, type VacancySummary } from "@/components/domain";
import { Icon } from "@/components/icons";
import {
  Button, Chip, Container, EmptyState, FilterMenu, Modal, PageHeader, Pagination, SearchField, SegmentedControl, SelectField, Skeleton,
  Tray, type FilterGroup, type FilterValue,
} from "@/components/ui";
import {
  KIND_OPTIONS, SORT_OPTIONS, deadlineInfo, filterCount, hasFilters, pluralOpportunities, postedAgo,
  type OpportunityCatalog, type OpportunityItem, type OpportunityKind, type OpportunityPage, type OpportunityQuery, type OpportunitySort,
} from "../model";
import { optionLabel } from "@/features/company-vacancies/model";
import styles from "./opportunities.module.css";

/*
 * Browse archetype: the student's list of active opportunities.
 * Presentational: data, query and callbacks in, JSX out. The page (or the prototype) owns the address, the fetching and the
 * 250 ms debounce is here only for the typing itself. `match` and `save` are slots for the later matching and saving
 * features: the application never passes them, so the list is complete without them (research R11).
 */

export type OpportunitiesListState = "ready" | "loading" | "updating" | "error";

export type OpportunitiesListViewProps = {
  state: OpportunitiesListState;
  catalog: OpportunityCatalog;
  query: OpportunityQuery;
  /** Any change of search, type, filters or sort also resets the page to 1 (done here); a page change passes only `page` */
  onQueryChange: (patch: Partial<OpportunityQuery>) => void;
  onClear: () => void;
  /** Absent while loading / failed */
  data?: OpportunityPage;
  /** ISO date; deadlines are relative to it */
  today: string;
  detailHref: (id: string) => string;
  onRetry: () => void;
  /** Opens the mobile filters sheet on first render (prototype state) */
  initialFiltersOpen?: boolean;
  /** Later feature — match percent per opportunity and the skills the student has. Never passed by the application. */
  match?: { have: string[]; scores: Record<string, number> };
  /** Later feature — bookmark per card. Never passed by the application. */
  save?: { saved: ReadonlySet<string>; onToggle: (item: OpportunityItem) => void };
};

const SEARCH_DELAY = 250;

/** The search text is typed locally and sent after a short pause; an outside change (Clear filters) replaces it. */
function useSearchDraft(value: string, onCommit: (v: string) => void) {
  const [draft, setDraft] = useState(value);
  const [seen, setSeen] = useState(value);
  const timer = useRef<number | undefined>(undefined);
  // the address changed from outside (Clear filters, Back): show it
  if (seen !== value) {
    setSeen(value);
    setDraft(value);
  }
  useEffect(() => () => window.clearTimeout(timer.current), []);
  const change = (next: string) => {
    setDraft(next);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => onCommit(next), SEARCH_DELAY);
  };
  return [draft, change] as const;
}

function summaryOf(o: OpportunityItem, p: OpportunitiesListViewProps): VacancySummary {
  return {
    id: o.id,
    title: o.title,
    company: o.company.name,
    type: (optionLabel(p.catalog.types, o.type) ?? "Internship") as VacancySummary["type"],
    location: optionLabel(p.catalog.cities, o.city) ?? "",
    format: (optionLabel(p.catalog.formats, o.format) ?? "On-site") as VacancySummary["format"],
    duration: o.duration ?? undefined,
    salary: o.salary ?? undefined,
    postedAgo: postedAgo(o.publishedOn, p.today),
    // the list shows the Required skills; Nice to have are on the details page
    skills: o.requiredSkills.map((name) => ({ name, required: true })),
    match: p.match?.scores[o.id],
  };
}

export function OpportunitiesListView(p: OpportunitiesListViewProps) {
  const { query, catalog } = p;
  const [filtersOpen, setFiltersOpen] = useState(Boolean(p.initialFiltersOpen));
  const [draft, setDraft] = useSearchDraft(query.q, (q) => p.onQueryChange({ q, page: 1 }));
  const loading = p.state === "loading";
  const updating = p.state === "updating";
  const total = p.data?.total ?? 0;
  const narrowed = hasFilters(query);

  const groups: FilterGroup[] = [
    { id: "format", label: "Format", options: catalog.formats.map((o) => ({ id: o.value, label: o.label })) },
    { id: "city", label: "City", options: catalog.cities.map((o) => ({ id: o.value, label: o.label })) },
    { id: "field", label: "Field", options: catalog.fields.map((o) => ({ id: o.value, label: o.label })) },
  ];
  const value: FilterValue = { format: query.format, city: query.city, field: query.field };
  const setFilters = (next: FilterValue) => p.onQueryChange({ format: next.format ?? [], city: next.city ?? [], field: next.field ?? [], page: 1 });
  const chips = groups.flatMap((g) => (value[g.id] ?? []).map((id) => ({ group: g.id, id, label: g.options.find((o) => o.id === id)?.label ?? id })));
  const picked = filterCount(query);
  // the sheet's own title says "Filters"; the menu's header reports the choice instead of repeating it
  const menu = (title?: string) => <FilterMenu groups={groups} value={value} onChange={setFilters} defaultOpen={["format", "city"]} hints={false} title={title} />;

  const pageCount = p.data ? Math.max(1, Math.ceil(p.data.total / p.data.pageSize)) : 1;
  const noneYet = p.state !== "loading" && p.state !== "error" && p.data && total === 0 && !narrowed;
  const noResults = p.state !== "loading" && p.state !== "error" && p.data && total === 0 && narrowed;

  // nothing exists yet: no controls to use, only the header and the message
  if (noneYet) {
    return (
      <StudentLayout>
        <Container>
          <PageHeader title="Opportunities" description="Internships, vacancies and research projects open for applications." />
          <PageBody>
            <Tray data-testid="opportunities-none-yet">
              <EmptyState
                icon={<Icon name="vacancy" size={20} />}
                title="No opportunities yet"
                description="Active internships, vacancies and research projects will appear here."
              />
            </Tray>
          </PageBody>
        </Container>
      </StudentLayout>
    );
  }

  return (
    <StudentLayout>
      <Container>
        <PageHeader title="Opportunities" description="Internships, vacancies and research projects open for applications." />
        <PageBody>
          <Toolbar
            start={
              <>
                <SearchField
                  label="Search opportunities"
                  placeholder="Title, company or skill"
                  value={draft}
                  onChange={setDraft}
                />
                <Show below="lg">
                  <Button variant="secondary" icon={<Icon name="filter" />} onClick={() => setFiltersOpen(true)}>
                    Filters{filterCount(query) ? ` (${filterCount(query)})` : ""}
                  </Button>
                </Show>
              </>
            }
            end={
              <>
                <SegmentedControl
                  aria-label="Type"
                  value={query.type}
                  onChange={(type) => p.onQueryChange({ type: type as OpportunityKind, page: 1 })}
                  options={KIND_OPTIONS}
                />
                <SelectField
                  label="Sort by"
                  hideLabel
                  size="sm"
                  options={SORT_OPTIONS}
                  value={query.sort}
                  onChange={(sort) => p.onQueryChange({ sort: sort as OpportunitySort, page: 1 })}
                />
              </>
            }
          />

          <TwoColumn
            side="start"
            asideWidth={280}
            sticky
            hideAsideOnMobile
            aside={menu()}
            main={
              <Stack gap={16} aria-busy={loading || updating || undefined}>
                {p.state !== "error" && (
                  <div className={styles.results}>
                    <span className={styles.count} aria-live="polite" data-testid="results-count">
                      {loading || updating ? "Searching…" : p.data ? pluralOpportunities(total) : ""}
                    </span>
                    <Show below="lg">
                      {chips.map((c) => (
                        <Chip key={`${c.group}-${c.id}`} onRemove={() => setFilters({ ...value, [c.group]: value[c.group].filter((x) => x !== c.id) })}>{c.label}</Chip>
                      ))}
                    </Show>
                    {narrowed && !noResults && <Button variant="ghost" size="sm" onClick={p.onClear}>Clear filters</Button>}
                  </div>
                )}

                {loading && (
                  <Stack gap={12} data-testid="opportunities-loading">
                    {[1, 2, 3].map((i) => (
                      <Tray key={i}>
                        <Stack gap={12}>
                          <Cluster gap={12} nowrap><Skeleton width={36} height={36} radius={10} /><Stack gap={6}><Skeleton width={220} height={14} /><Skeleton width={100} height={12} /></Stack></Cluster>
                          <Skeleton width="55%" height={12} />
                          <Cluster gap={6}><Skeleton width={64} height={26} radius={8} /><Skeleton width={52} height={26} radius={8} /><Skeleton width={72} height={26} radius={8} /></Cluster>
                        </Stack>
                      </Tray>
                    ))}
                  </Stack>
                )}

                {p.state === "error" && (
                  <Tray>
                    <EmptyState
                      tone="error"
                      title="Couldn't load opportunities"
                      description="Check your connection and try again. Your search and filters are kept."
                      actions={<Button variant="secondary" size="sm" icon={<Icon name="retry" />} onClick={p.onRetry}>Try again</Button>}
                    />
                  </Tray>
                )}

                {noResults && (
                  <Tray data-testid="opportunities-no-results">
                    <EmptyState
                      icon={<Icon name="search" size={20} />}
                      title="No opportunities match these filters"
                      description="Try removing a filter or searching for a skill instead of a title."
                      actions={<Button variant="secondary" size="sm" onClick={p.onClear}>Clear filters</Button>}
                    />
                  </Tray>
                )}

                {!loading && p.state !== "error" && p.data && total > 0 && (
                  <>
                    <Stack gap={12} data-testid="opportunities-list">
                      {p.data.items.map((o) => (
                        <VacancyCard
                          key={o.id}
                          vacancy={summaryOf(o, p)}
                          have={p.match?.have}
                          to={p.detailHref(o.id)}
                          deadline={deadlineInfo(o.applyBy, p.today)}
                          actions={
                            p.save && (
                              <Button
                                variant="secondary"
                                size="sm"
                                icon={<Icon name="saved" fill={p.save.saved.has(o.id) ? "currentColor" : "none"} />}
                                aria-label={p.save.saved.has(o.id) ? `Remove ${o.title} from saved` : `Save ${o.title}`}
                                aria-pressed={p.save.saved.has(o.id)}
                                onClick={() => p.save?.onToggle(o)}
                              />
                            )
                          }
                        />
                      ))}
                    </Stack>
                    <Pagination page={p.data.page} pageCount={pageCount} onPageChange={(page) => p.onQueryChange({ page })} />
                  </>
                )}
              </Stack>
            }
          />
        </PageBody>
      </Container>

      <Modal
        open={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        title="Filters"
        footer={
          <>
            <Button size="sm" onClick={() => setFiltersOpen(false)}>
              {p.data && !loading ? `Show ${pluralOpportunities(total)}` : "Show results"}
            </Button>
          </>
        }
      >
        {menu(picked ? `${picked} selected` : "None selected")}
      </Modal>
    </StudentLayout>
  );
}
