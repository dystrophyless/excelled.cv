import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { meKey, type Account } from "@/features/auth/api";
import { ApiError } from "@/lib/api";
import {
  catalog, catalogKey, changeStatus, create, get, kzDate, list, remove, skills, skillsKey, update, vacanciesKey, vacancyKey,
  type StatusBody,
} from "./api";
import type { StatusFilter, VacancyDraft, VacancyItem } from "./model";

const HOUR = 3_600_000;

/** Today's date in UTC+5 (ISO YYYY-MM-DD) — the Views' `today` prop. */
export const todayKz = (): string => kzDate(new Date());

/** The catalog changes with releases, not sessions. */
export function useCatalog() {
  return useQuery({ queryKey: catalogKey, queryFn: catalog, staleTime: 24 * HOUR, gcTime: 24 * HOUR });
}

function useDebounced<T>(value: T, ms: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return debounced;
}

/** Suggestions for the skills combobox; an empty `q` returns the most used skills. */
export function useSkillSuggestions(q: string) {
  const debounced = useDebounced(q.trim(), 250);
  return useQuery({ queryKey: skillsKey(debounced), queryFn: () => skills(debounced), staleTime: 5 * 60_000, placeholderData: (prev) => prev });
}

/**
 * 403 `company_profile_required` (003-profiles FR-015) from any vacancy call: the cached account is stale (no company
 * profile any more), so mark it — RequireRole then sends the employer to /company/onboarding?next=<this page>.
 */
function useProfileGate() {
  const queryClient = useQueryClient();
  return (error: unknown) => {
    if (error instanceof ApiError && error.code === "company_profile_required") {
      queryClient.setQueryData<Account | null>(meKey, (me) => (me ? { ...me, has_profile: false } : me));
    }
  };
}

/** A query function that applies the profile gate to its failure. */
function gated<T>(gate: (error: unknown) => void, fn: () => Promise<T>) {
  return () => fn().catch((error: unknown) => { gate(error); throw error; });
}

export function useVacancyList(status: StatusFilter, q: string) {
  const gate = useProfileGate();
  return useQuery({ queryKey: vacanciesKey(status, q), queryFn: gated(gate, () => list(status, q)), retry: false, placeholderData: keepPreviousData });
}

export function useVacancy(id: string) {
  const gate = useProfileGate();
  return useQuery({ queryKey: vacancyKey(id), queryFn: gated(gate, () => get(id)), retry: false });
}

/** Every successful write refreshes the lists and puts the server's copy (new `version`) in the vacancy cache. */
function useAfterWrite() {
  const queryClient = useQueryClient();
  return (item: VacancyItem) => {
    queryClient.setQueryData(vacancyKey(item.id), item);
    void queryClient.invalidateQueries({ queryKey: ["vacancies"] });
  };
}

export function useCreateVacancy() {
  const afterWrite = useAfterWrite();
  const gate = useProfileGate();
  return useMutation({
    mutationFn: ({ draft, publish }: { draft: VacancyDraft; publish: boolean }) => create(draft, publish),
    onSuccess: afterWrite,
    onError: gate,
  });
}

export function useUpdateVacancy() {
  const afterWrite = useAfterWrite();
  const gate = useProfileGate();
  return useMutation({
    mutationFn: ({ id, draft, version }: { id: string; draft: VacancyDraft; version: number }) => update(id, draft, version),
    onSuccess: afterWrite,
    onError: gate,
  });
}

export function useVacancyStatusAction() {
  const afterWrite = useAfterWrite();
  const gate = useProfileGate();
  return useMutation({
    mutationFn: ({ id, action, version, applyBy }: { id: string; action: StatusBody["action"]; version: number; applyBy?: string }) =>
      changeStatus(id, action, version, applyBy),
    onSuccess: afterWrite,
    onError: gate,
  });
}

/** Deleting a draft drops its cached copy and refreshes every list. */
export function useDeleteVacancy() {
  const queryClient = useQueryClient();
  const gate = useProfileGate();
  return useMutation({
    mutationFn: ({ id, version }: { id: string; version: number }) => remove(id, version),
    onError: gate,
    onSuccess: (_data, { id }) => {
      queryClient.removeQueries({ queryKey: vacancyKey(id) });
      void queryClient.invalidateQueries({ queryKey: ["vacancies"] });
    },
  });
}
