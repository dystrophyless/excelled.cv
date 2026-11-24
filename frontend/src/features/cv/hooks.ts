import { useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { meKey, type Account } from "@/features/auth/api";
import { ApiError } from "@/lib/api";
import { cvKey, getCv } from "./api";

/**
 * Failures every CV request shares: 401 means the session ended (the account becomes null, so the guards send the user
 * to sign-in); 403 `student_profile_required` means the cached account is stale (like `profile_not_found`: the guard then
 * sends the student to onboarding). Returns true when it handled the error.
 */
export function handleSessionError(queryClient: QueryClient, error: unknown): boolean {
  if (!(error instanceof ApiError)) return false;
  if (error.status === 401) {
    queryClient.setQueryData<Account | null>(meKey, null);
    return true;
  }
  if (error.code === "student_profile_required") {
    queryClient.setQueryData<Account | null>(meKey, (me) => (me ? { ...me, has_profile: false } : me));
    return true;
  }
  return false;
}

/** The student's CV and the upload limits. Always fresh on mount (the response is no-store); separate from the profile. */
export function useCv() {
  const queryClient = useQueryClient();
  return useQuery({
    queryKey: cvKey,
    queryFn: ({ signal }) => getCv(signal).catch((error: unknown) => {
      handleSessionError(queryClient, error);
      throw error;
    }),
    staleTime: 0,
    retry: (count, error) => !(error instanceof ApiError && error.status < 500 && error.status > 0) && count < 1,
  });
}
