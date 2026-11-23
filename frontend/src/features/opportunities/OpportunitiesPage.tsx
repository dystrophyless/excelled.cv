import { useEffect, useMemo, useRef } from "react";
import { useSearchParams } from "react-router";
import { todayKz } from "@/features/company-vacancies/hooks";
import { useProfileCatalog } from "@/features/profiles/hooks";
import type { ProfileCatalog } from "@/features/profiles/model";
import { useOpportunities } from "./hooks";
import { DEFAULT_QUERY, EMPTY_CATALOG, parseQuery, toSearchParams, type OpportunityCatalog, type OpportunityQuery } from "./model";
import { OpportunitiesListView, type OpportunitiesListState } from "./views/OpportunitiesListView";

/*
 * S1 — the student's list. The address is the only store for search, type, filters, sort and page (research R7); the query
 * result and the catalog come from TanStack Query. Pages never pass match / apply / save (research R11).
 */

export const LIST_PATH = "/app/opportunities";

/** The one catalog request (shared with the profile forms) in the shape the opportunities views read. */
export function toOpportunityCatalog(c: ProfileCatalog): OpportunityCatalog {
  return {
    types: c.types,
    fields: c.fields.map(({ value, label }) => ({ value, label })),
    cities: c.cities,
    formats: c.formats ?? [],
    industries: c.industries,
    companySizes: c.companySizes,
  };
}

/** Typing replaces the history entry; everything else pushes one (R7). */
const isTyping = (patch: Partial<OpportunityQuery>) => "q" in patch && Object.keys(patch).every((k) => k === "q" || k === "page");

export function OpportunitiesPage() {
  const [params, setParams] = useSearchParams();
  const catalogQuery = useProfileCatalog();
  const catalog = useMemo(() => (catalogQuery.data ? toOpportunityCatalog(catalogQuery.data) : EMPTY_CATALOG), [catalogQuery.data]);
  const catalogReady = Boolean(catalogQuery.data);
  // the debounced keystroke calls back from an older render: it must parse with the catalog as it is now
  const latestCatalog = useRef(catalog);
  useEffect(() => { latestCatalog.current = catalog; }, [catalog]);

  // unknown values are dropped once the catalog says which are known (R8); the request waits for it
  const query = useMemo(() => parseQuery(params, catalog), [params, catalog]);
  const list = useOpportunities(query, { enabled: catalogReady });
  const today = useMemo(() => todayKz(), []);

  // the server clamps a page past the last one: show the page it used, without adding a history entry
  const served = list.isPlaceholderData ? undefined : list.data;
  useEffect(() => {
    if (served && served.page !== query.page) {
      const now = new URLSearchParams(window.location.search);
      setParams(toSearchParams({ ...parseQuery(now, catalog), page: served.page }, now), { replace: true });
    }
  }, [served, query.page, catalog, setParams]);

  // data already shown stays shown: a failed refetch never hides it (only an error with nothing to show does)
  const data = catalogReady ? list.data : undefined;
  const failed = catalogQuery.isError && !catalogReady ? !catalogQuery.isFetching : !data && list.isError && !list.isFetching;
  const state: OpportunitiesListState = failed ? "error" : !data ? "loading" : list.isFetching ? "updating" : "ready";

  const onQueryChange = (patch: Partial<OpportunityQuery>) => {
    // The address as it is now, not the one this render saw: the debounced keystroke fires from an older render, after another
    // control may have changed the address (setSearchParams' own callback form would also see the old render's address).
    const now = new URLSearchParams(window.location.search);
    setParams(toSearchParams({ ...parseQuery(now, latestCatalog.current), ...patch }, now), { replace: isTyping(patch) });
  };

  // a failed catalog never started the list request: refetching it starts both
  const retry = () => void (catalogReady ? list.refetch() : catalogQuery.refetch());

  return (
    <OpportunitiesListView
      state={state}
      catalog={catalog}
      query={query}
      onQueryChange={onQueryChange}
      onClear={() => onQueryChange({ ...DEFAULT_QUERY, sort: query.sort })}
      data={state === "loading" || state === "error" ? undefined : data}
      today={today}
      detailHref={(id) => `${LIST_PATH}/${id}`}
      detailState={{ list: toSearchParams(query).toString() }}
      onRetry={retry}
    />
  );
}
