import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router";
import { StateSwitcher, useViewState } from "@/components/dev";
import { Stack } from "@/components/layout";
import { Button, Modal, TextareaField, toast } from "@/components/ui";
import {
  CATALOG, DETAILS_PATH, LIST_PATH, LONG_SALARY, MINIMAL_DETAIL, MOCK_TODAY, OPPORTUNITIES, STUDENT_HAS, detailOf, previewScore, searchOpportunities,
} from "@/features/opportunities/mocks";
import { DEFAULT_QUERY, hasFilters, parseQuery, toSearchParams, type OpportunityItem, type OpportunityQuery } from "@/features/opportunities/model";
import { OpportunitiesListView, type OpportunitiesListState } from "@/features/opportunities/views/OpportunitiesListView";
import { OpportunityDetailsView, type OpportunityDetailsState } from "@/features/opportunities/views/OpportunityDetailsView";

/*
 * Prototype wiring for 004-student-opportunities: each View rendered with in-memory mocks; ?state= picks the state.
 * The list keeps its query in the address exactly as the real page will (R7), so search, filters, sort, paging and Back
 * all work. `with-match` previews the later Match / Apply / Save features; the application never passes those props.
 */

export const LIST_STATES = ["default", "loading", "updating", "none-yet", "no-results", "error", "filters-open", "with-match", "long-numbers"] as const;
export const DETAILS_STATES = ["default", "minimal", "loading", "unavailable", "error", "with-match", "long-numbers"] as const;

const LATENCY = 350;
const QUERY_KEYS = ["q", "type", "format", "city", "field", "sort", "page"];

/** A search that matches nothing, applied on first render of the `no-results` state. */
const NO_RESULTS: Partial<OpportunityQuery> = { q: "blockchain", type: "research" };

const sameQuery = (a: OpportunityQuery, b: OpportunityQuery) => toSearchParams(a).toString() === toSearchParams(b).toString();

/** The list's own address part (+ the preview state), so cards and Back carry it. */
function listSearch(params: URLSearchParams, preview: boolean) {
  const next = new URLSearchParams();
  for (const key of QUERY_KEYS) params.getAll(key).forEach((v) => next.append(key, v));
  if (preview) next.set("state", "with-match");
  return next.toString();
}

/* ── Browse ──────────────────────────────────────────────── */

export function OpportunitiesListPrototype() {
  const state = useViewState(LIST_STATES);
  return (
    <>
      <ListInner key={state} state={state} />
      <StateSwitcher states={LIST_STATES} />
    </>
  );
}

function ListInner({ state }: { state: (typeof LIST_STATES)[number] }) {
  const [params, setParams] = useSearchParams();
  const query = useMemo(() => parseQuery(params, CATALOG), [params]);
  const [shown, setShown] = useState(query);
  const [busy, setBusy] = useState(state === "updating");
  const [saved, setSaved] = useState<ReadonlySet<string>>(new Set(["o2"]));
  const preview = state === "with-match";

  // `no-results` starts from a search that matches nothing, in the address like any other
  useEffect(() => {
    if (state === "no-results" && !hasFilters(query)) {
      const next = toSearchParams({ ...DEFAULT_QUERY, ...NO_RESULTS }, new URLSearchParams(params));
      setParams(next, { replace: true });
    }
    // only on first render of this state
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // stands in for the request: the old results stay for a moment, "Searching…" shows in the count
  useEffect(() => {
    if (sameQuery(shown, query) && state !== "updating") return;
    if (state === "no-results" && !hasFilters(query) && !hasFilters(shown)) return;
    setBusy(true);
    const t = window.setTimeout(() => { setShown(query); setBusy(false); }, state === "updating" && sameQuery(shown, query) ? 0 : LATENCY);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [toSearchParams(query).toString()]);

  const none = state === "none-yet";
  const stress = state === "long-numbers";
  // salary stress test: the longest range the form accepts on the first and the fourth card
  const data = useMemo(() => {
    const found = searchOpportunities(none ? [] : OPPORTUNITIES, shown);
    return stress ? { ...found, items: found.items.map((o) => (o.id === "o1" || o.id === "o4" ? { ...o, salary: LONG_SALARY } : o)) } : found;
  }, [none, stress, shown]);

  const viewState: OpportunitiesListState = state === "loading" ? "loading" : state === "error" ? "error" : busy ? "updating" : "ready";

  const onQueryChange = (patch: Partial<OpportunityQuery>) => {
    const next = { ...query, ...patch };
    const typingOnly = Object.keys(patch).every((k) => k === "q" || k === "page") && "q" in patch;
    setParams(toSearchParams(next, new URLSearchParams(params)), { replace: typingOnly });
  };
  const retry = () => {
    const next = new URLSearchParams(params);
    next.delete("state");
    setParams(next, { replace: true });
  };
  const here = listSearch(params, preview);

  const toggleSave = (o: OpportunityItem) => {
    const next = new Set(saved);
    if (next.has(o.id)) { next.delete(o.id); toast("Removed from saved"); }
    else { next.add(o.id); toast.success("Saved", { description: o.title }); }
    setSaved(next);
  };

  return (
    <OpportunitiesListView
      state={viewState}
      catalog={CATALOG}
      query={query}
      onQueryChange={onQueryChange}
      onClear={() => onQueryChange({ ...DEFAULT_QUERY, sort: query.sort })}
      data={viewState === "loading" || viewState === "error" ? undefined : data}
      today={MOCK_TODAY}
      detailHref={(id) => `${DETAILS_PATH}?id=${id}${here ? `&from=${encodeURIComponent(here)}` : ""}${preview ? "&state=with-match" : ""}`}
      onRetry={retry}
      initialFiltersOpen={state === "filters-open" && typeof window !== "undefined" && window.matchMedia("(max-width: 1023.98px)").matches}
      match={preview ? { have: STUDENT_HAS, scores: Object.fromEntries(OPPORTUNITIES.map((o) => [o.id, previewScore(o)])) } : undefined}
      save={preview ? { saved, onToggle: toggleSave } : undefined}
    />
  );
}

/* ── Details ─────────────────────────────────────────────── */

export function OpportunityDetailsPrototype() {
  const state = useViewState(DETAILS_STATES);
  return (
    <>
      <DetailsInner key={state} state={state} />
      <StateSwitcher states={DETAILS_STATES} />
    </>
  );
}

function DetailsInner({ state }: { state: (typeof DETAILS_STATES)[number] }) {
  const [params, setParams] = useSearchParams();
  const id = params.get("id") ?? "o1";
  const from = params.get("from");
  const preview = state === "with-match";
  const [saved, setSaved] = useState(id === "o2");
  const [applied, setApplied] = useState(false);
  const [applyOpen, setApplyOpen] = useState(false);

  const found = detailOf(id);
  const opportunity = state === "minimal" ? MINIMAL_DETAIL : state === "long-numbers" && found ? { ...found, salary: LONG_SALARY } : found;
  const viewState: OpportunityDetailsState =
    state === "loading" ? "loading" : state === "error" ? "error" : state === "unavailable" || !opportunity ? "unavailable" : "ready";

  const backTo = `${LIST_PATH}${from ? `?${from}` : preview ? "?state=with-match" : ""}`;
  const retry = () => {
    const next = new URLSearchParams(params);
    next.delete("state");
    setParams(next, { replace: true });
  };
  const copyLink = () => {
    void navigator.clipboard?.writeText(window.location.href);
    toast.success("Link copied");
  };

  return (
    <>
      <OpportunityDetailsView
        state={viewState}
        opportunity={opportunity}
        catalog={CATALOG}
        today={MOCK_TODAY}
        backTo={backTo}
        onCopyLink={copyLink}
        onRetry={retry}
        match={preview && opportunity ? { score: previewScore(opportunity), have: STUDENT_HAS } : undefined}
        apply={preview ? { applied, onApply: () => setApplyOpen(true) } : undefined}
        save={preview ? { saved, onToggle: () => { setSaved(!saved); toast(saved ? "Removed from saved" : "Saved"); } } : undefined}
      />
      {/* preview only: the apply dialog belongs to the later Apply feature */}
      <Modal
        open={applyOpen}
        onClose={() => setApplyOpen(false)}
        title={`Apply to ${opportunity?.company.name ?? "this company"}?`}
        description="Your profile and CV are sent with your application. You can add a short note."
        footer={
          <>
            <Button variant="secondary" size="sm" onClick={() => setApplyOpen(false)}>Cancel</Button>
            <Button size="sm" onClick={() => { setApplyOpen(false); setApplied(true); toast.success("Application sent", { description: opportunity?.title }); }}>Send application</Button>
          </>
        }
      >
        <Stack gap={12}>
          <TextareaField label="Note" optional placeholder="Why this opportunity?" />
        </Stack>
      </Modal>
    </>
  );
}
