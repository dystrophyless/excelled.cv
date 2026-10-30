import { useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { StudentLayout } from "@/app/layouts";
import { Cluster, PageBody, Show, Stack, Toolbar, TwoColumn } from "@/components/layout";
import { VacancyCard, type VacancySummary } from "@/components/domain";
import { Icon } from "@/components/icons";
import {
  Button, Chip, Container, EmptyState, FilterMenu, Modal, PageHeader, Pagination, SearchField, SegmentedControl,
  SelectField, Skeleton, Tray, toast, type FilterGroup, type FilterValue,
} from "@/components/ui";
import { STUDENT_SKILLS, VACANCIES } from "@/mocks/data";
import { StateSwitcher, useViewState } from "@/components/dev";
import styles from "./templates.module.css";

/*
 * TEMPLATE: Browse — search a collection and open one item (vacancies, saved, companies).
 *
 * Toolbar (one row, all controls 36px): SearchField (grows) · SegmentedControl md (main split) · SelectField sm (sort).
 * TwoColumn side=start: aside 280 = affect FilterMenu (sticky, desktop); below 1024px a "Filters (n)" button opens the
 * same FilterMenu in a Modal. Results line: count · active filter chips (mobile only — on desktop the FilterMenu shows
 * them) · "Clear filters". Cards in one column → Pagination.
 * Everything filters live. In the real page keep q / type / sort / filters / page in the URL (useSearchParams).
 * States: loading = skeleton cards · empty = no matches + Clear filters · error = retry.
 */

const STATES = ["default", "loading", "empty", "error"] as const;
const PAGE_SIZE = 5;

const GROUPS: FilterGroup[] = [
  { id: "format", label: "Format", options: [{ id: "On-site", label: "On-site" }, { id: "Hybrid", label: "Hybrid" }, { id: "Remote", label: "Remote" }] },
  { id: "city", label: "City", options: [{ id: "Almaty", label: "Almaty" }, { id: "Astana", label: "Astana" }] },
  { id: "field", label: "Field", options: ["Backend", "Frontend", "Data", "QA", "Mobile", "Design"].map((f) => ({ id: f, label: f })) },
];

const SORTS = [
  { value: "match", label: "Best match" },
  { value: "new", label: "Newest" },
  { value: "salary", label: "Salary listed first" },
];

const TYPE_OF: Record<string, VacancySummary["type"][]> = {
  all: ["Internship", "Full-time", "Part-time"],
  intern: ["Internship"],
  jobs: ["Full-time", "Part-time"],
};

function matches(v: VacancySummary, q: string, type: string, f: FilterValue) {
  const text = `${v.title} ${v.company} ${v.skills.map((s) => s.name).join(" ")}`.toLowerCase();
  if (q && !text.includes(q.toLowerCase())) return false;
  if (!TYPE_OF[type].includes(v.type)) return false;
  if (f.format?.length && !f.format.includes(v.format)) return false;
  if (f.city?.length && !f.city.includes(v.location)) return false;
  if (f.field?.length && !f.field.includes(v.field ?? "")) return false;
  return true;
}

export function BrowseTemplate() {
  const state = useViewState(STATES);
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [type, setType] = useState("all");
  const [sort, setSort] = useState("match");
  const [filters, setFilters] = useState<FilterValue>(state === "empty" ? { field: ["Design"], city: ["Astana"] } : {});
  const [page, setPage] = useState(1);
  const [saved, setSaved] = useState<Set<string>>(new Set(["v2"]));
  const [filtersOpen, setFiltersOpen] = useState(false);

  const results = useMemo(() => {
    const list = VACANCIES.filter((v) => matches(v, q, type, filters));
    const order = VACANCIES.map((v) => v.id);
    return [...list].sort((a, b) =>
      sort === "match" ? (b.match ?? 0) - (a.match ?? 0)
        : sort === "salary" ? Number(Boolean(b.salary)) - Number(Boolean(a.salary))
        : order.indexOf(a.id) - order.indexOf(b.id),
    );
  }, [q, type, sort, filters]);

  const pageCount = Math.max(1, Math.ceil(results.length / PAGE_SIZE));
  const shown = results.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const active = Object.entries(filters).flatMap(([group, ids]) => ids.map((id) => ({ group, id })));
  const update = (next: FilterValue) => { setFilters(next); setPage(1); };
  const clearAll = () => { update({}); setQ(""); setType("all"); };

  const toggleSave = (v: VacancySummary) => {
    const next = new Set(saved);
    if (next.has(v.id)) { next.delete(v.id); toast("Removed from saved"); }
    else { next.add(v.id); toast.success("Saved", { description: v.title }); }
    setSaved(next);
  };

  const menu = <FilterMenu groups={GROUPS} value={filters} onChange={update} defaultOpen={["format", "field"]} hints={false} />;
  const loading = state === "loading";

  return (
    <StudentLayout>
      <Container>
        <PageHeader title="Vacancies" description="Internships and jobs, sorted by how well they match your skills." />
        <PageBody>
          <Toolbar
            start={
              <>
                <SearchField
                  label="Search vacancies"
                  placeholder="Title, company or skill"
                  value={q}
                  onChange={(value) => { setQ(value); setPage(1); }}
                />
                <Show below="lg">
                  <Button variant="secondary" icon={<Icon name="filter" />} onClick={() => setFiltersOpen(true)}>
                    Filters{active.length ? ` (${active.length})` : ""}
                  </Button>
                </Show>
              </>
            }
            end={
              <>
                <SegmentedControl
                  aria-label="Type"
                  value={type}
                  onChange={(value) => { setType(value); setPage(1); }}
                  options={[{ value: "all", label: "All" }, { value: "intern", label: "Internships" }, { value: "jobs", label: "Jobs" }]}
                />
                <SelectField label="Sort by" hideLabel size="sm" options={SORTS} value={sort} onChange={setSort} />
              </>
            }
          />

          <TwoColumn
            side="start"
            asideWidth={280}
            sticky
            hideAsideOnMobile
            aside={menu}
            main={
              <Stack gap={16}>
                {state !== "error" && (
                  <Cluster gap={8}>
                    <span className={styles.rowMeta} aria-live="polite">
                      {loading ? "Searching…" : `${results.length} ${results.length === 1 ? "vacancy" : "vacancies"}`}
                    </span>
                    <Show below="lg">
                      {active.map(({ group, id }) => (
                        <Chip key={`${group}-${id}`} onRemove={() => update({ ...filters, [group]: filters[group].filter((x) => x !== id) })}>{id}</Chip>
                      ))}
                    </Show>
                    {(active.length > 0 || q || type !== "all") && <Button variant="ghost" size="sm" onClick={clearAll}>Clear filters</Button>}
                  </Cluster>
                )}

                {loading && (
                  <Stack gap={12}>
                    {[1, 2, 3].map((i) => (
                      <Tray key={i}><Stack gap={10}><Skeleton width="55%" height={14} /><Skeleton width="30%" height={12} /><Skeleton width="80%" height={26} radius={8} /></Stack></Tray>
                    ))}
                  </Stack>
                )}

                {state === "error" && (
                  <Tray>
                    <EmptyState tone="error" title="Couldn't load vacancies" description="Check your connection and try again."
                      actions={<Button variant="secondary" size="sm" icon={<Icon name="retry" />}>Try again</Button>} />
                  </Tray>
                )}

                {!loading && state !== "error" && results.length === 0 && (
                  <Tray>
                    <EmptyState
                      icon={<Icon name="search" size={20} />}
                      title="No vacancies match these filters"
                      description="Try removing a filter or searching for a skill instead of a title."
                      actions={<Button variant="secondary" size="sm" onClick={clearAll}>Clear filters</Button>}
                    />
                  </Tray>
                )}

                {!loading && state !== "error" && results.length > 0 && (
                  <>
                    <Stack gap={12}>
                      {shown.map((v) => (
                        <VacancyCard
                          key={v.id}
                          vacancy={v}
                          have={STUDENT_SKILLS}
                          to={`/app/vacancies/${v.id}`}
                          actions={
                            <>
                              <Button
                                variant="secondary"
                                size="sm"
                                icon={<Icon name="saved" fill={saved.has(v.id) ? "currentColor" : "none"} />}
                                aria-label={saved.has(v.id) ? `Remove ${v.title} from saved` : `Save ${v.title}`}
                                aria-pressed={saved.has(v.id)}
                                onClick={() => toggleSave(v)}
                              />
                              <Button size="sm" onClick={() => navigate(`/app/vacancies/${v.id}`)}>Apply</Button>
                            </>
                          }
                        />
                      ))}
                    </Stack>
                    <Pagination page={page} pageCount={pageCount} onPageChange={setPage} />
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
        footer={<><Button variant="secondary" size="sm" onClick={() => update({})}>Clear all</Button><Button size="sm" onClick={() => setFiltersOpen(false)}>Show {results.length} vacancies</Button></>}
      >
        {menu}
      </Modal>
      <StateSwitcher states={STATES} />
    </StudentLayout>
  );
}
