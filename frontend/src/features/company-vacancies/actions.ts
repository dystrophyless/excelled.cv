import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "@/components/ui";
import { ApiError } from "@/lib/api";
import { vacancyKey } from "./api";
import { useRestoreFocus } from "./focus";
import { DEADLINE_ERROR, ROUTES, incompleteFields, isApiError } from "./form";
import { useDeleteVacancy, useVacancyStatusAction } from "./hooks";
import { DRAFT_FIELD_LABEL, STATUS_META, TOASTS, type VacancyAction, type VacancyItem, type VacancyNotice, type VacancyStatus } from "./model";
import type { VacancyDialogState } from "./views/parts";

/*
 * The "⋯" menu actions of S1 (list) and S4 (vacancy page), shared so both behave the same.
 *  - publish / pause / resume act at once and confirm with a toast;
 *  - close (D1), reopen (D2: asks for a new Apply by date) and delete a draft (D3) open a dialog first.
 * Every refusal the server can give (invalid_transition, version_conflict, vacancy_not_found, not_a_draft) becomes a
 * `notice` and a refetch; network / 5xx errors become an error toast and leave an open dialog open.
 */

const WORDS: Record<VacancyAction, { label: string; done: string }> = {
  publish: { label: "Publish", done: "published" },
  pause: { label: "Pause", done: "paused" },
  resume: { label: "Resume", done: "resumed" },
  close: { label: "Close", done: "closed" },
  reopen: { label: "Reopen", done: "reopened" },
  delete: { label: "Delete", done: "deleted" },
};

const isStatus = (s: unknown): s is VacancyStatus => typeof s === "string" && s in STATUS_META;

export function useVacancyActions({ onDeleted }: { onDeleted?: () => void } = {}) {
  const queryClient = useQueryClient();
  const statusAction = useVacancyStatusAction();
  const deleteDraft = useDeleteVacancy();
  const [dialog, setDialog] = useState<VacancyDialogState>(null);
  const [notice, setNotice] = useState<VacancyNotice | undefined>();
  const [reopenError, setReopenError] = useState<string | undefined>();
  const focus = useRestoreFocus();

  const refetch = (id: string) => {
    void queryClient.invalidateQueries({ queryKey: ["vacancies"] });
    void queryClient.invalidateQueries({ queryKey: vacancyKey(id) });
  };

  /**
   * Maps a failed request onto the page. Returns true when the dialog should close because the server answered
   * (and the page now says why); false when nothing happened and the user may try again.
   */
  const fail = (error: unknown, action: VacancyAction, v: VacancyItem): boolean => {
    const what = WORDS[action];
    if (isApiError(error, "invalid_transition") || isApiError(error, "not_a_draft")) {
      const current = error.detail?.status;
      setNotice({
        tone: "warning",
        title: `${what.label} didn't apply`,
        text: isStatus(current)
          ? `“${v.title}” is ${STATUS_META[current].label} now, so it can't be ${what.done}.${action === "delete" ? " Only drafts can be deleted." : ""}`
          : `“${v.title}” can't be ${what.done} in its current status.`,
      });
      refetch(v.id);
      return true;
    }
    if (isApiError(error, "version_conflict")) {
      setNotice({
        tone: "warning",
        title: "This vacancy was changed elsewhere",
        text: `“${v.title}” has a newer version, maybe from another tab. It's refreshed, so check it and try again.`,
      });
      refetch(v.id);
      return true;
    }
    if (isApiError(error, "vacancy_not_found")) {
      setNotice({ tone: "warning", title: "Vacancy not found", text: `“${v.title}” may have been deleted.` });
      refetch(v.id);
      return true;
    }
    if (isApiError(error, "incomplete") && (action === "publish" || action === "reopen")) {
      const fields = incompleteFields(error).map((f) => DRAFT_FIELD_LABEL[f]);
      const missing = fields.length ? `Still missing: ${fields.join(", ")}.` : "It still has required fields to fill in.";
      if (action === "publish") {
        toast.error("Can't publish yet", { description: fields.length ? `Finish the draft first: ${fields.join(", ")}.` : "Finish the draft first." });
      } else {
        setNotice({ tone: "error", title: "Finish the vacancy to reopen it", text: missing, action: { label: "Edit vacancy", to: ROUTES.edit(v.id) } });
      }
      return true;
    }
    // network, 5xx, anything unexpected: nothing changed, an open dialog stays so the click can be repeated
    toast.error("Couldn't complete that", {
      description: error instanceof ApiError && error.status === 0 ? "Check your connection and try again." : "Something went wrong. Try again.",
    });
    return false;
  };

  const run = async (action: Exclude<VacancyAction, "delete">, v: VacancyItem, applyBy?: string): Promise<boolean> => {
    setNotice(undefined);
    try {
      const next = await statusAction.mutateAsync({ id: v.id, action, version: v.version, applyBy });
      toast.success(TOASTS[action].title, { description: TOASTS[action].description?.(next) });
      return true;
    } catch (error) {
      if (action === "reopen" && isApiError(error, "apply_by_not_in_future")) {
        // the dialog stays open with the date the user chose and shows the error in place
        setReopenError(DEADLINE_ERROR);
        return false;
      }
      return fail(error, action, v);
    }
  };

  const remove = async (v: VacancyItem): Promise<boolean> => {
    setNotice(undefined);
    try {
      await deleteDraft.mutateAsync({ id: v.id, version: v.version });
      toast.success(TOASTS.delete.title);
      onDeleted?.();
      return true;
    } catch (error) {
      return fail(error, "delete", v);
    }
  };

  const open = (kind: "close" | "reopen" | "delete", v: VacancyItem) => {
    setNotice(undefined);
    setReopenError(undefined);
    focus.remember();
    setDialog({ kind, vacancy: v });
  };

  const onAction = (action: VacancyAction, v: VacancyItem) => {
    if (action === "close" || action === "reopen" || action === "delete") open(action, v);
    else void run(action, v);
  };

  const onDialogConfirm = async (kind: "close" | "reopen" | "delete", applyBy?: string) => {
    if (!dialog) return;
    const v = dialog.vacancy;
    setReopenError(undefined);
    const done = kind === "close" ? await run("close", v) : kind === "reopen" ? await run("reopen", v, applyBy) : await remove(v);
    // a refused reopen date re-opens the dialog itself (see showReopenError)
    if (done) {
      setDialog(null);
      focus.restore({ gone: kind === "delete" });
    }
  };

  return {
    dialog,
    notice,
    reopenError,
    busy: statusAction.isPending || deleteDraft.isPending,
    onAction,
    onDialogCancel: () => {
      setDialog(null);
      setReopenError(undefined);
      focus.restore();
    },
    onDialogConfirm,
  };
}
