import { useMemo } from "react";
import { useLocation, useParams } from "react-router";
import { toast } from "@/components/ui";
import { todayKz } from "@/features/company-vacancies/hooks";
import { useProfileCatalog } from "@/features/profiles/hooks";
import { ApiError } from "@/lib/api";
import { LIST_PATH, toOpportunityCatalog } from "./OpportunitiesPage";
import { useOpportunity } from "./hooks";
import { EMPTY_CATALOG } from "./model";
import { OpportunityDetailsView, type OpportunityDetailsState } from "./views/OpportunityDetailsView";

/*
 * S2 — one opportunity. A non-numeric id is "unavailable" without a request (R9); a 404 is an answer, not an error.
 * Back returns to the list as the student left it: the card link carries the list's query in router state, else the plain list.
 */

/** The list address the card link passed (query string without "?"); anything else means the plain list. */
function backPath(state: unknown): string {
  const list = (state as { list?: unknown } | null)?.list;
  return typeof list === "string" && list && !/[#\s]/.test(list) ? `${LIST_PATH}?${list}` : LIST_PATH;
}

export function OpportunityPage() {
  const { id = "" } = useParams();
  const location = useLocation();
  const validId = /^\d{1,18}$/.test(id);
  const catalogQuery = useProfileCatalog();
  const catalog = useMemo(() => (catalogQuery.data ? toOpportunityCatalog(catalogQuery.data) : EMPTY_CATALOG), [catalogQuery.data]);
  const opportunity = useOpportunity(id, { enabled: validId });
  const today = useMemo(() => todayKz(), []);

  const unavailable = !validId || (opportunity.error instanceof ApiError && opportunity.error.status === 404);
  const data = opportunity.data;
  const failed = !data && ((opportunity.isError && !opportunity.isFetching) || (catalogQuery.isError && !catalogQuery.data && !catalogQuery.isFetching));
  const state: OpportunityDetailsState = unavailable ? "unavailable" : failed ? "error" : data && catalogQuery.data ? "ready" : "loading";

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast.success("Link copied");
    } catch {
      toast.error("Couldn't copy the link", { description: "Copy it from the address bar instead." });
    }
  };

  // a failed catalog never blocks a loaded opportunity forever: retry refetches whatever is missing
  const retry = () => {
    if (!catalogQuery.data) void catalogQuery.refetch();
    if (validId && !opportunity.data) void opportunity.refetch();
  };

  return (
    <OpportunityDetailsView
      state={state}
      opportunity={data}
      catalog={catalog}
      today={today}
      backTo={backPath(location.state)}
      onCopyLink={copyLink}
      onRetry={retry}
    />
  );
}
