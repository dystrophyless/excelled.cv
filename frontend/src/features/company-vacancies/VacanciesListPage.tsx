import { useEffect, useState } from "react";
import { useSearchParams } from "react-router";
import { useVacancyActions } from "./actions";
import { EMPTY_CATALOG, ROUTES } from "./form";
import { todayKz, useCatalog, useVacancyList } from "./hooks";
import { STATUS_FILTERS, type StatusCounts, type StatusFilter } from "./model";
import { VacancyListView } from "./views/VacancyListView";

const NO_COUNTS: StatusCounts = { all: 0, open: 0, draft: 0, paused: 0, closed: 0 };
const SEARCH_DEBOUNCE_MS = 300;

const asStatus = (value: string | null): StatusFilter => STATUS_FILTERS.find((f) => f.value === value)?.value ?? "all";

/** S1 - My vacancies. The status group and the search live in the URL (?status=&q=), so reload and back keep them. */
export function VacanciesListPage() {
  const [params, setParams] = useSearchParams();
  const status = asStatus(params.get("status"));
  const urlQuery = params.get("q") ?? "";

  const setParam = (key: "status" | "q", value: string) =>
    setParams((p) => {
      const next = new URLSearchParams(p);
      if (value && !(key === "status" && value === "all")) next.set(key, value);
      else next.delete(key);
      return next;
    }, { replace: true });

  // the box shows what was typed at once; the URL (and so the request) follows after a pause
  const [text, setText] = useState(urlQuery);
  useEffect(() => {
    if (text === urlQuery) return;
    const t = setTimeout(() => setParam("q", text), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, urlQuery]);

  const list = useVacancyList(status, urlQuery.trim());
  const catalog = useCatalog();
  const actions = useVacancyActions();

  const state = list.isError || catalog.isError ? "error" : list.isPending || catalog.isPending ? "loading" : "ready";

  return (
    <VacancyListView
      state={state}
      items={list.data?.items ?? []}
      counts={list.data?.counts ?? NO_COUNTS}
      status={status}
      query={text}
      catalog={catalog.data ?? EMPTY_CATALOG}
      today={todayKz()}
      notice={actions.notice}
      dialog={actions.dialog}
      busy={actions.busy}
      reopenError={actions.reopenError}
      routes={ROUTES}
      onStatusChange={(s) => setParam("status", s)}
      onQueryChange={(q) => {
        setText(q);
        if (q === "") setParam("q", "");
      }}
      onAction={actions.onAction}
      onRetry={() => {
        if (list.isError) void list.refetch();
        if (catalog.isError) void catalog.refetch();
      }}
      onDialogCancel={actions.onDialogCancel}
      onDialogConfirm={actions.onDialogConfirm}
    />
  );
}
