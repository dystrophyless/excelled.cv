import { useState } from "react";
import { useNavigate } from "react-router";
import { EmployerLayout } from "@/app/layouts";
import { Cluster, PageBody, Toolbar } from "@/components/layout";
import { Icon } from "@/components/icons";
import {
  Button, Container, DataTable, DropdownMenu, EmptyState, Modal, PageHeader, SearchField, SegmentedControl, Tag, toast,
  type Column, type MenuItem,
} from "@/components/ui";
import { EMPLOYER_VACANCIES, type EmployerVacancy } from "@/mocks/data";
import { StateSwitcher, useViewState } from "@/components/dev";
import styles from "./templates.module.css";

/*
 * TEMPLATE: Table — the owner manages records compared by columns (employer: my vacancies).
 * PageHeader with the page's one primary action → Toolbar (search · status SegmentedControl with live counts) →
 * DataTable: name + secondary line, status Tag, numbers right-aligned, "⋯" last column, row click opens the record.
 * Row actions: Edit → edit page · Duplicate → new Draft + toast Undo · Close / Reopen → reversible, toast Undo ·
 * Delete → irreversible, confirmation Modal naming the consequence. Empty = EmptyState with the primary action.
 */

const STATES = ["default", "loading", "empty"] as const;

const STATUS_TAG: Record<EmployerVacancy["status"], { label: string; tone: "success" | "neutral" | "warning" }> = {
  open: { label: "Open", tone: "success" },
  draft: { label: "Draft", tone: "warning" },
  closed: { label: "Closed", tone: "neutral" },
};

const fmt = (iso: string) => (iso === "—" ? "—" : new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" }));

export function TableTemplate() {
  const state = useViewState(STATES);
  const navigate = useNavigate();
  const [rows, setRows] = useState<EmployerVacancy[]>(state === "empty" ? [] : EMPLOYER_VACANCIES);
  const [status, setStatus] = useState("all");
  const [q, setQ] = useState("");
  const [toDelete, setToDelete] = useState<EmployerVacancy | null>(null);

  const count = (s: string) => rows.filter((r) => s === "all" || r.status === s).length;
  const visible = rows.filter((r) => (status === "all" || r.status === status) && r.title.toLowerCase().includes(q.toLowerCase()));

  const withUndo = (next: EmployerVacancy[], title: string, description?: string) => {
    const before = rows;
    setRows(next);
    toast(title, { description, action: { label: "Undo", onClick: () => setRows(before) } });
  };

  const actions = (r: EmployerVacancy): MenuItem[] => [
    { id: "edit", label: "Edit", icon: "edit", to: `/company/vacancies/${r.id}/edit` },
    {
      id: "duplicate", label: "Duplicate", icon: "copy",
      onSelect: () => withUndo(
        [{ ...r, id: `${r.id}-copy-${rows.length}`, title: `${r.title} (copy)`, status: "draft", applicants: 0, newApplicants: 0, postedAt: "—", deadline: "—" }, ...rows],
        "Vacancy duplicated", "Saved as a draft",
      ),
    },
    "separator",
    r.status === "open"
      ? { id: "close", label: "Close vacancy", icon: "lock", onSelect: () => withUndo(rows.map((x) => (x.id === r.id ? { ...x, status: "closed" } : x)), "Vacancy closed", "Students can no longer apply") }
      : r.status === "closed"
        ? { id: "reopen", label: "Reopen", icon: "retry", onSelect: () => withUndo(rows.map((x) => (x.id === r.id ? { ...x, status: "open" } : x)), "Vacancy reopened") }
        : { id: "publish", label: "Publish", icon: "postVacancy", onSelect: () => withUndo(rows.map((x) => (x.id === r.id ? { ...x, status: "open" } : x)), "Vacancy published") },
    { id: "delete", label: "Delete", icon: "delete", danger: true, onSelect: () => setToDelete(r) },
  ];

  const columns: Column<EmployerVacancy>[] = [
    {
      key: "title", header: "Vacancy", sortValue: (r) => r.title,
      render: (r) => (
        <div className={styles.rowMain}>
          <span className={styles.rowTitle}>{r.title}</span>
          <span className={styles.rowMeta}>{r.type}</span>
        </div>
      ),
    },
    { key: "status", header: "Status", render: (r) => <Tag tone={STATUS_TAG[r.status].tone}>{STATUS_TAG[r.status].label}</Tag> },
    {
      key: "applicants", header: "Applicants", align: "end", sortValue: (r) => r.applicants,
      render: (r) => (
        <Cluster gap={6} justify="end" nowrap>
          {r.newApplicants > 0 && <Tag tone="accent">+{r.newApplicants} new</Tag>}
          <span>{r.applicants}</span>
        </Cluster>
      ),
    },
    { key: "deadline", header: "Deadline", sortValue: (r) => r.deadline, render: (r) => fmt(r.deadline) },
    {
      key: "actions", header: <span className="sr-only">Actions</span>, align: "end", width: "56px",
      render: (r) => (
        <DropdownMenu
          trigger={(p) => <Button {...p} variant="ghost" size="sm" icon={<Icon name="more" />} aria-label={`Actions for ${r.title}`} />}
          items={actions(r)}
        />
      ),
    },
  ];

  return (
    <EmployerLayout>
      <Container>
        <PageHeader
          title="Vacancies"
          description="Post vacancies and review applicants ranked by skill match."
          actions={<Button icon={<Icon name="add" />} onClick={() => navigate("/company/vacancies/new")}>Post a vacancy</Button>}
        />
        <PageBody>
          <Toolbar
            start={<SearchField label="Search vacancies" placeholder="Search by title" value={q} onChange={setQ} />}
            end={
              <SegmentedControl
                aria-label="Status"
                value={status}
                onChange={setStatus}
                options={[
                  { value: "all", label: "All", count: count("all") },
                  { value: "open", label: "Open", count: count("open") },
                  { value: "draft", label: "Drafts", count: count("draft") },
                  { value: "closed", label: "Closed", count: count("closed") },
                ]}
              />
            }
          />
          <DataTable
            label="Your vacancies"
            columns={columns}
            rows={visible}
            getRowId={(r) => r.id}
            loading={state === "loading"}
            defaultSort={{ key: "applicants", direction: "desc" }}
            onRowClick={(r) => navigate(`/company/vacancies/${r.id}`)}
            empty={
              rows.length === 0 ? (
                <EmptyState icon={<Icon name="postVacancy" size={20} />} title="Post your first vacancy"
                  description="Students see it right away, ranked by how well their skills fit."
                  actions={<Button size="sm" icon={<Icon name="add" />} onClick={() => navigate("/company/vacancies/new")}>Post a vacancy</Button>} />
              ) : (
                <EmptyState icon={<Icon name="search" size={20} />} title="No vacancies match"
                  description="Try another status or search term."
                  actions={<Button variant="secondary" size="sm" onClick={() => { setQ(""); setStatus("all"); }}>Clear filters</Button>} />
              )
            }
            data-testid="vacancies-table"
          />
        </PageBody>
      </Container>

      <Modal
        open={toDelete !== null}
        onClose={() => setToDelete(null)}
        title="Delete this vacancy?"
        description={
          toDelete && toDelete.applicants > 0
            ? `“${toDelete.title}” and its ${toDelete.applicants} applications will be deleted. Applicants will be told the vacancy was closed. This can't be undone.`
            : `“${toDelete?.title}” will be deleted. This can't be undone.`
        }
        footer={
          <>
            <Button variant="secondary" size="sm" onClick={() => setToDelete(null)}>Keep vacancy</Button>
            <Button variant="destructive" size="sm" onClick={() => {
              setRows(rows.filter((r) => r.id !== toDelete!.id));
              toast("Vacancy deleted");
              setToDelete(null);
            }}>Delete vacancy</Button>
          </>
        }
      />
      <StateSwitcher states={STATES} />
    </EmployerLayout>
  );
}
