import { useMutation, useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { meKey, type Account } from "@/features/auth/api";
import { ApiError } from "@/lib/api";
import {
  companyProfileKey, createCompany, createStudent, getCompany, getStudent, profileCatalog, profileCatalogKey, studentProfileKey,
  updateCompany, updateStudent,
} from "./api";
import type { CompanyValues, StudentValues } from "./model";

const HOUR = 3_600_000;

/** Write `has_profile` into the cached account at once (no flash of the wrong guard), then confirm it with the server. */
function markHasProfile(queryClient: QueryClient, value: boolean) {
  queryClient.setQueryData<Account | null>(meKey, (me) => (me ? { ...me, has_profile: value } : me));
  void queryClient.invalidateQueries({ queryKey: meKey });
}

/** 404 `profile_not_found` on a role page means the cached account is stale: the guard then sends it to onboarding. */
const notFoundResetsMe = (queryClient: QueryClient) => (error: unknown) => {
  if (error instanceof ApiError && error.status === 404) markHasProfile(queryClient, false);
  throw error;
};

/** GET /api/catalog in the profile forms' shape (field descriptions, degree max years). Changes with releases only. */
export function useProfileCatalog() {
  return useQuery({ queryKey: profileCatalogKey, queryFn: profileCatalog, staleTime: 24 * HOUR, gcTime: 24 * HOUR });
}

/** The signed-in student's profile. `enabled: false` where no student is signed in (styleguide, prototypes). */
export function useStudentProfile({ enabled = true }: { enabled?: boolean } = {}) {
  const queryClient = useQueryClient();
  return useQuery({
    queryKey: studentProfileKey,
    queryFn: () => getStudent().catch(notFoundResetsMe(queryClient)),
    enabled,
    retry: (count, error) => !(error instanceof ApiError && error.status < 500 && error.status > 0) && count < 1,
  });
}

/** The signed-in employer's company profile (also the vacancy wizard preview and the account menu name). */
export function useCompanyProfile({ enabled = true }: { enabled?: boolean } = {}) {
  const queryClient = useQueryClient();
  return useQuery({
    queryKey: companyProfileKey,
    queryFn: () => getCompany().catch(notFoundResetsMe(queryClient)),
    enabled,
    retry: (count, error) => !(error instanceof ApiError && error.status < 500 && error.status > 0) && count < 1,
  });
}

/** POST: the new profile goes into the cache and the account now has a profile. */
export function useCreateStudentProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (values: StudentValues) => createStudent(values),
    onSuccess: (profile) => {
      queryClient.setQueryData(studentProfileKey, profile);
      markHasProfile(queryClient, true);
    },
  });
}

export function useUpdateStudentProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ values, version }: { values: StudentValues; version: number }) => updateStudent(values, version),
    onSuccess: (profile) => queryClient.setQueryData(studentProfileKey, profile),
  });
}

export function useCreateCompanyProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (values: CompanyValues) => createCompany(values),
    onSuccess: (profile) => {
      queryClient.setQueryData(companyProfileKey, profile);
      markHasProfile(queryClient, true);
    },
  });
}

/** PUT: the company name shows on the vacancy pages, so their queries refresh too. */
export function useUpdateCompanyProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ values, version }: { values: CompanyValues; version: number }) => updateCompany(values, version),
    onSuccess: (profile) => {
      queryClient.setQueryData(companyProfileKey, profile);
      void queryClient.invalidateQueries({ queryKey: ["vacancies"] });
      void queryClient.invalidateQueries({ queryKey: ["vacancy"] });
    },
  });
}

/** 409 `profile_exists` from a POST: the account has one already (another tab) — the guard then leaves onboarding. */
export function useProfileExists() {
  const queryClient = useQueryClient();
  return () => markHasProfile(queryClient, true);
}
