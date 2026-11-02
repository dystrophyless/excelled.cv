import { useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { StudentLayout } from "@/app/layouts";
import { PageBody, Stack, Toolbar } from "@/components/layout";
import { VacancyCard, type VacancySummary } from "@/components/domain";
import { Icon } from "@/components/icons";
import { Button, Container, EmptyState, PageHeader, SearchField, SelectField, Skeleton, Tag, Tray, toast } from "@/components/ui";
import { STUDENT_SKILLS, VACANCIES } from "@/mocks/data";
import { StateSwitcher, useViewState } from "@/components/dev";
import styles from "./templates.module.css";

/*
 * TEMPLATE: Browse (saved) — the student's own bookmarked vacancies. Same archetype as Browse, smaller:
 * PageHeader → Toolbar (search · sort) → one column of VacancyCards. No filter aside — the list is short and personal.
 * The bookmark button is filled (saved); pressing it removes the vacancy immediately with Undo.
 * Closed vacancies stay in the list, greyed, with a "Closed" tag and no Apply — so nothing silently disappears.
 * States: loading · empty (nothing saved yet → Browse vacancies) · no results for the search.
 */

const STATES = ["default", "loading", "empty"] as const;

type SavedItem = { vacancy: VacancySummary; savedAgo: string; order: number; closed?: boolean };

const INITIAL: SavedItem[] = [
  { vacancy: VACANCIES[0], savedAgo: "Saved today", order: 1 },
  { vacancy: VACANCIES[5], savedAgo: "Saved 2 days ago", order: 2 },
  { vacancy: VACANCIES[3], savedAgo: "Saved 4 days ago", order: 3 },
  { vacancy: VACANCIES[2], savedAgo: "Saved 2 weeks ago", order: 4, closed: true },
];

const SORTS = [
  { value: "recent", label: "Recently saved" },
  { value: "match", label: "Best match" },
];

export function SavedTemplate() {
  const state = useViewState(STATES);
  const navigate = useNavigate();
  const [items, setItems] = useState<SavedItem[]>(state === "empty" ? [] : INITIAL);
  const [q, setQ] = useState("");
  const [sort, setSort] = useState("recent");

  const shown = useMemo(() => {
    const text = q.toLowerCase();
    return items
      .filter((i) => `${i.vacancy.title} ${i.vacancy.company}`.toLowerCase().includes(text))
      .sort((a, b) =>
        Number(Boolean(a.closed)) - Number(Boolean(b.closed)) ||
        (sort === "match" ? (b.vacancy.match ?? 0) - (a.vacancy.match ?? 0) : a.order - b.order),
      );
  }, [items, q, sort]);

  const remove = (item: SavedItem) => {
    const before = items;
    setItems(items.filter((i) => i !== item));
    toast("Removed from saved", { description: item.vacancy.title, action: { label: "Undo", onClick: () => setItems(before) } });
  };

  const loading = state === "loading";

  return (
    <StudentLayout>
      <Container width="content">
        <PageHeader
          title="Saved"
          description={loading ? <Skeleton width={260} height={14} /> : items.length ? `${items.length} saved ${items.length === 1 ? "vacancy" : "vacancies"} · they stay here until you remove them` : "Vacancies you bookmark appear here."}
        />
        <PageBody>
          {items.length > 0 && (
            <Toolbar
              start={<SearchField label="Search saved vacancies" placeholder="Title or company" value={q} onChange={setQ} />}
              end={<SelectField label="Sort by" hideLabel size="sm" options={SORTS} value={sort} onChange={setSort} />}
            />
          )}

          {loading ? (
            <Stack gap={12}>
              {[1, 2, 3].map((i) => (
                <Tray key={i}><Stack gap={10}><Skeleton width="55%" height={14} /><Skeleton width="30%" height={12} /><Skeleton width="80%" height={26} radius={8} /></Stack></Tray>
              ))}
            </Stack>
          ) : items.length === 0 ? (
            <Tray>
              <EmptyState
                icon={<Icon name="saved" size={20} />}
                title="Nothing saved yet"
                description="Tap the bookmark on any vacancy to keep it here for later."
                actions={<Button size="sm" icon={<Icon name="search" />} onClick={() => navigate("/app/vacancies")}>Browse vacancies</Button>}
              />
            </Tray>
          ) : shown.length === 0 ? (
            <Tray>
              <EmptyState icon={<Icon name="search" size={20} />} title="No saved vacancies match" description="Try another title or company."
                actions={<Button variant="secondary" size="sm" onClick={() => setQ("")}>Clear search</Button>} />
            </Tray>
          ) : (
            <Stack gap={12} data-testid="saved-list">
              {shown.map((item) => (
                <div key={item.vacancy.id} className={item.closed ? styles.closedCard : undefined}>
                  <VacancyCard
                    vacancy={item.closed ? { ...item.vacancy, match: undefined, postedAgo: "Closed · applications ended 28 Oct" } : item.vacancy}
                    have={STUDENT_SKILLS}
                    to={`/app/vacancies/${item.vacancy.id}`}
                    actions={
                      <>
                        {item.closed && <Tag>Closed</Tag>}
                        <Button
                          variant="secondary"
                          size="sm"
                          icon={<Icon name="saved" fill="currentColor" />}
                          aria-label={`Remove ${item.vacancy.title} from saved`}
                          onClick={() => remove(item)}
                        />
                        {!item.closed && <Button size="sm" onClick={() => navigate(`/app/vacancies/${item.vacancy.id}`)}>Apply</Button>}
                      </>
                    }
                  />
                </div>
              ))}
            </Stack>
          )}
        </PageBody>
      </Container>
      <StateSwitcher states={STATES} />
    </StudentLayout>
  );
}
