import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import { meKey, type Account } from "@/features/auth/api";
import { ApiError } from "@/lib/api";
import { getOpportunity, listOpportunities, opportunitiesKey, opportunityKey } from "./api";
import type { OpportunityQuery } from "./model";

/**
 * 403 `student_profile_required`: the cached account is stale (no profile any more), so mark it — RequireRole then sends
 * the student to /onboarding?next=<this page>.
 */
function useProfileGate() {
  const queryClient = useQueryClient();
  return (error: unknown): never => {
    if (error instanceof ApiError && error.code === "student_profile_required") {
      queryClient.setQueryData<Account | null>(meKey, (me) => (me ? { ...me, has_profile: false } : me));
    }
    throw error;
  };
}

/** One page of the list. The previous results stay while the next ones load; an outdated request is aborted. */
export function useOpportunities(query: OpportunityQuery, { enabled = true }: { enabled?: boolean } = {}) {
  const gate = useProfileGate();
  return useQuery({
    queryKey: opportunitiesKey(query),
    queryFn: ({ signal }) => listOpportunities(query, signal).catch(gate),
    placeholderData: keepPreviousData,
    retry: false,
    enabled,
  });
}

/** One opportunity; 404 `opportunity_unavailable` is an answer, not a failure to retry. */
export function useOpportunity(id: string, { enabled = true }: { enabled?: boolean } = {}) {
  const gate = useProfileGate();
  return useQuery({
    queryKey: opportunityKey(id),
    queryFn: ({ signal }) => getOpportunity(id, signal).catch(gate),
    retry: false,
    enabled,
  });
}
