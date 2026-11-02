import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
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

export function useVacancyList(status: StatusFilter, q: string) {
  return useQuery({ queryKey: vacanciesKey(status, q), queryFn: () => list(status, q), retry: false, placeholderData: keepPreviousData });
}

export function useVacancy(id: string) {
  return useQuery({ queryKey: vacancyKey(id), queryFn: () => get(id), retry: false });
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
  return useMutation({
    mutationFn: ({ draft, publish }: { draft: VacancyDraft; publish: boolean }) => create(draft, publish),
    onSuccess: afterWrite,
  });
}

export function useUpdateVacancy() {
  const afterWrite = useAfterWrite();
  return useMutation({
    mutationFn: ({ id, draft, version }: { id: string; draft: VacancyDraft; version: number }) => update(id, draft, version),
    onSuccess: afterWrite,
  });
}

export function useVacancyStatusAction() {
  const afterWrite = useAfterWrite();
  return useMutation({
    mutationFn: ({ id, action, version, applyBy }: { id: string; action: StatusBody["action"]; version: number; applyBy?: string }) =>
      changeStatus(id, action, version, applyBy),
    onSuccess: afterWrite,
  });
}

/** Deleting a draft drops its cached copy and refreshes every list. */
export function useDeleteVacancy() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, version }: { id: string; version: number }) => remove(id, version),
    onSuccess: (_data, { id }) => {
      queryClient.removeQueries({ queryKey: vacancyKey(id) });
      void queryClient.invalidateQueries({ queryKey: ["vacancies"] });
    },
  });
}
