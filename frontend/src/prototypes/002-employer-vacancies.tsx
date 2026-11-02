import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { StateSwitcher, useViewState } from "@/components/dev";
import { toast } from "@/components/ui";
import {
  BASE, CATALOG, COMPLETE_DRAFT, EMPTY_DRAFT, MOCK_COMPANY, MOCK_TODAY, PARTIAL_DRAFT, PAST_DEADLINE, ROUTES, SKILL_OPTIONS,
  SKILL_SUGGESTIONS, VACANCIES, byId, routesFor, countsOf, filterItems, missingFields, missingOf, withApplicants,
} from "@/features/company-vacancies/mocks";
import {
  DIALOG_ACTIONS, DRAFT_FIELD_LABEL, TOASTS, toDraft,
  type DraftErrors, type StatusFilter, type VacancyAction, type VacancyDraft, type VacancyItem, type VacancyNotice,
} from "@/features/company-vacancies/model";
import type { VacancyDialogState } from "@/features/company-vacancies/views/parts";
import { VacancyEditView, type EditFormAlert, type VacancyEditState } from "@/features/company-vacancies/views/VacancyEditView";
import { VacancyListView, type VacancyListState } from "@/features/company-vacancies/views/VacancyListView";
import { VacancyPageView, type VacancyPageState } from "@/features/company-vacancies/views/VacancyPageView";
import {
  VacancyWizardView, type VacancyWizardState, type WizardAlert, type WizardStep,
} from "@/features/company-vacancies/views/VacancyWizardView";

/* Prototype wiring for 002-employer-vacancies: each View rendered with mock props; ?state= picks the state. */

export const LIST_STATES = [
  "default", "with-applicants", "loading", "empty", "no-results", "error", "close-confirm", "reopen", "reopen-error", "delete-confirm", "refused",
] as const;
export const NEW_STATES = [
  "basics", "basics-error", "skills", "details", "details-error", "preview", "preview-incomplete", "publishing", "save-error", "loading", "error",
] as const;
export const EDIT_STATES = [
  "default", "draft", "closed", "dirty", "incomplete", "deadline-error", "saving", "conflict", "save-error", "leave-confirm", "loading", "not-found", "load-error",
] as const;
export const PAGE_STATES = [
  "default", "with-applicants", "draft", "paused", "closed-by-you", "closed-on-deadline", "loading", "not-found", "load-error",
  "close-confirm", "reopen", "reopen-error", "delete-confirm", "refused", "incomplete",
] as const;

/** Stands in for GET /api/skills?q=: prefix search on the mock list, with a short "Searching…" pause. */
function useMockSkills() {
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  const onSkillQuery = (query: string) => {
    window.clearTimeout(timer.current);
    setLoading(true);
    timer.current = window.setTimeout(() => { setQ(query); setLoading(false); }, 250);
  };
  const needle = q.trim().toLowerCase();
  const skillOptions = needle ? SKILL_OPTIONS.filter((o) => o.toLowerCase().startsWith(needle)) : SKILL_OPTIONS.slice(0, 12);
  return { skillOptions, onSkillQuery, skillsLoading: loading };
}

/* ── What a status action does (the server's job, faked) ─────────────────── */

function transition(v: VacancyItem, action: VacancyAction, applyBy?: string): VacancyItem {
  const next = { ...v, version: v.version + 1, updatedOn: MOCK_TODAY };
  switch (action) {
    case "publish":
    case "resume": return { ...next, status: "open" };
    case "pause": return { ...next, status: "paused" };
    case "close": return { ...next, status: "closed", closedOn: MOCK_TODAY, closedBy: "employer" };
    case "reopen": return { ...next, status: "open", applyBy: applyBy ?? v.applyBy, closedOn: null, closedBy: null };
    default: return next;
  }
}

/** Shared by the list and the vacancy page: actions, dialogs, toasts. */
function useLifecycle(initial: VacancyItem[], opts: { initialDialog?: VacancyDialogState; initialNotice?: VacancyNotice; onDeleted?: () => void }) {
  const navigate = useNavigate();
  const [items, setItems] = useState(initial);
  const [dialog, setDialog] = useState<VacancyDialogState>(opts.initialDialog ?? null);
  const [notice, setNotice] = useState<VacancyNotice | undefined>(opts.initialNotice);

  const apply = (action: VacancyAction, v: VacancyItem, applyBy?: string) => {
    setNotice(undefined);
    if (action === "delete") {
      setItems((all) => all.filter((x) => x.id !== v.id));
      toast.success(TOASTS.delete.title);
      opts.onDeleted?.();
      return;
    }
    const next = transition(v, action, applyBy);
    setItems((all) => all.map((x) => (x.id === v.id ? next : x)));
    toast.success(TOASTS[action].title, { description: TOASTS[action].description?.(next) });
  };

  const onAction = (action: VacancyAction, v: VacancyItem) => {
    if (DIALOG_ACTIONS.includes(action)) {
      setNotice(undefined);
      setDialog({ kind: action as "close" | "reopen" | "delete", vacancy: v });
      return;
    }
    if (action === "publish") {
      const { fields } = missingOf(v);
      if (fields.length) {
        toast.error("Can't publish yet", { description: `Finish the draft first: ${fields.map((f) => DRAFT_FIELD_LABEL[f]).join(", ")}.` });
        return;
      }
    }
    apply(action, v);
  };

  const onDialogConfirm = (kind: "close" | "reopen" | "delete", applyBy?: string) => {
    if (dialog) apply(kind, dialog.vacancy, applyBy);
    setDialog(null);
  };

  return { items, dialog, notice, setNotice, setDialog, onAction, onDialogCancel: () => setDialog(null), onDialogConfirm, navigate };
}

/* ── My vacancies ────────────────────────────────────────────────────────── */

export function VacancyListPrototype() {
  const state = useViewState(LIST_STATES);
  return (
    <>
      <ListInner key={state} state={state} />
      <StateSwitcher states={LIST_STATES} />
    </>
  );
}

function ListInner({ state }: { state: (typeof LIST_STATES)[number] }) {
  const stored = state === "empty" ? [] : state === "default" || state === "loading" || state === "error" ? VACANCIES : withApplicants(VACANCIES);
  const dialogFor = (): VacancyDialogState => {
    if (state === "close-confirm") return { kind: "close", vacancy: stored.find((v) => v.id === "v1")! };
    if (state === "reopen" || state === "reopen-error") return { kind: "reopen", vacancy: stored.find((v) => v.id === "v5")! };
    if (state === "delete-confirm") return { kind: "delete", vacancy: stored.find((v) => v.id === "v3")! };
    return null;
  };
  const closedOnDeadline = stored.find((v) => v.id === "v6");
  const life = useLifecycle(stored, {
    initialDialog: dialogFor(),
    initialNotice: state === "refused" && closedOnDeadline ? {
      tone: "warning",
      title: "Resume didn't apply",
      text: `“${closedOnDeadline.title}” is Closed — it closed on its deadline, 15 Oct — so it can't be resumed. Reopen it with a new deadline instead.`,
      action: { label: "Reopen", onClick: () => life.setDialog({ kind: "reopen", vacancy: closedOnDeadline }) },
    } : undefined,
  });
  const [status, setStatus] = useState<StatusFilter>("all");
  const [query, setQuery] = useState(state === "no-results" ? "data science" : "");
  const viewState: VacancyListState = state === "loading" ? "loading" : state === "error" ? "error" : "ready";

  return (
    <VacancyListView
      state={viewState}
      items={filterItems(life.items, status, query)}
      counts={countsOf(life.items)}
      status={status}
      query={query}
      catalog={CATALOG}
      today={MOCK_TODAY}
      notice={life.notice}
      dialog={life.dialog}
      reopenError={state === "reopen-error" ? "Choose today or a later date" : undefined}
      routes={routesFor(stored !== VACANCIES)}
      onStatusChange={setStatus}
      onQueryChange={setQuery}
      onAction={life.onAction}
      onRetry={() => life.navigate(`${BASE}/list`)}
      onDialogCancel={life.onDialogCancel}
      onDialogConfirm={life.onDialogConfirm}
    />
  );
}

/* ── One vacancy ─────────────────────────────────────────────────────────── */

export function VacancyPagePrototype() {
  const state = useViewState(PAGE_STATES);
  return (
    <>
      <PageInner key={state} state={state} />
      <StateSwitcher states={PAGE_STATES} />
    </>
  );
}

function PageInner({ state }: { state: (typeof PAGE_STATES)[number] }) {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const numbers = state === "with-applicants" || params.get("applicants") === "1";
  const routes = routesFor(numbers);
  const id = params.get("id") ?? ({ draft: "v3", paused: "v4", "closed-by-you": "v5", "closed-on-deadline": "v6", "delete-confirm": "v3", reopen: "v5", "reopen-error": "v5", refused: "v6", incomplete: "v3" } as Record<string, string>)[state] ?? "v1";
  const v0 = numbers ? withApplicants([byId(id)])[0] : byId(id);
  const dialog: VacancyDialogState =
    state === "close-confirm" ? { kind: "close", vacancy: v0 }
      : state === "reopen" || state === "reopen-error" ? { kind: "reopen", vacancy: v0 }
        : state === "delete-confirm" ? { kind: "delete", vacancy: v0 } : null;
  const missing = missingOf(v0).fields.map((f) => DRAFT_FIELD_LABEL[f]).join(", ");
  const notice: VacancyNotice | undefined =
    state === "refused"
      ? { tone: "warning", title: "Resume didn't apply", text: "This vacancy is Closed — it closed on its deadline, 15 Oct — so it can't be resumed. Reopen it with a new deadline instead.", action: { label: "Reopen", onClick: () => life.setDialog({ kind: "reopen", vacancy: v0 }) } }
      : state === "incomplete"
        ? { tone: "error", title: "Finish the draft to publish it", text: `Still missing: ${missing}.`, action: { label: "Edit draft", to: routes.edit(v0.id) } }
        : undefined;
  const life = useLifecycle([v0], { initialDialog: dialog, initialNotice: notice, onDeleted: () => navigate(routes.list) });
  const v = life.items[0];
  const viewState: VacancyPageState = state === "loading" ? "loading" : state === "not-found" ? "not-found" : state === "load-error" ? "error" : "ready";

  return (
    <VacancyPageView
      state={viewState}
      vacancy={v}
      catalog={CATALOG}
      today={MOCK_TODAY}
      notice={life.notice}
      dialog={life.dialog}
      reopenError={state === "reopen-error" ? "Choose today or a later date" : undefined}
      routes={routes}
      onAction={life.onAction}
      onRetry={() => navigate(`${BASE}/vacancy`)}
      onDialogCancel={life.onDialogCancel}
      onDialogConfirm={life.onDialogConfirm}
    />
  );
}

/* ── Edit ────────────────────────────────────────────────────────────────── */

export function VacancyEditPrototype() {
  const state = useViewState(EDIT_STATES);
  return (
    <>
      <EditInner key={state} state={state} />
      <StateSwitcher states={EDIT_STATES} />
    </>
  );
}

function EditInner({ state }: { state: (typeof EDIT_STATES)[number] }) {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const vacancy = byId(params.get("id") ?? (state === "draft" || state === "incomplete" ? "v3" : state === "closed" ? "v5" : "v1"));
  const loaded = toDraft(vacancy);
  const startValues: VacancyDraft =
    state === "dirty" || state === "saving" || state === "conflict" || state === "save-error" || state === "leave-confirm"
      ? { ...loaded, title: "Backend Intern (Python, Payments team)", requiredSkills: [...loaded.requiredSkills, "Redis"].filter((s, i, a) => a.indexOf(s) === i).slice(0, 5) }
      : state === "deadline-error" ? { ...loaded, applyBy: PAST_DEADLINE }
        : loaded;
  const [values, setValues] = useState<VacancyDraft>(startValues);
  const [errors, setErrors] = useState<DraftErrors | undefined>(() => {
    if (state === "deadline-error") return { applyBy: "Choose today or a later date" };
    if (state === "incomplete") return missingFields(loaded).errors;
    return undefined;
  });
  const [alert, setAlert] = useState<EditFormAlert | undefined>(() => {
    if (state === "incomplete") return { kind: "incomplete", mode: "publish", fields: missingFields(loaded).fields };
    if (state === "conflict") return { kind: "conflict" };
    if (state === "save-error") return { kind: "save-error" };
    return undefined;
  });
  const [leaveOpen, setLeaveOpen] = useState(state === "leave-confirm");
  const dirty = JSON.stringify(values) !== JSON.stringify(loaded);
  const viewState: VacancyEditState = state === "loading" ? "loading" : state === "not-found" ? "not-found" : state === "load-error" ? "error" : "ready";
  const back = () => navigate(ROUTES.view(vacancy.id));
  const skills = useMockSkills();

  const checkAndSave = (publish: boolean) => {
    const { fields, errors: e } = missingFields(values);
    const needs = publish || vacancy.status === "open" || vacancy.status === "paused";
    if (needs && fields.length) {
      setErrors(e);
      setAlert({ kind: "incomplete", mode: publish ? "publish" : "save", fields });
      return;
    }
    setErrors(undefined);
    setAlert(undefined);
    toast.success(publish ? TOASTS.publish.title : "Changes saved");
    back();
  };

  return (
    <VacancyEditView
      state={viewState}
      vacancy={vacancy}
      values={values}
      dirty={dirty}
      errors={errors}
      formAlert={alert}
      saving={state === "saving"}
      leaveOpen={leaveOpen}
      catalog={CATALOG}
      skillOptions={skills.skillOptions}
      suggestions={SKILL_SUGGESTIONS}
      onSkillQuery={skills.onSkillQuery}
      skillsLoading={skills.skillsLoading}
      today={MOCK_TODAY}
      routes={ROUTES}
      onChange={(patch) => { setValues((x) => ({ ...x, ...patch })); setErrors(undefined); setAlert(undefined); }}
      onSaveDraft={() => {
        if (values.title.trim().length < 3) { setErrors({ title: "Enter a title of 3–120 characters" }); return; }
        setErrors(undefined);
        toast.success("Draft saved");
      }}
      onPublish={() => checkAndSave(true)}
      onSave={() => checkAndSave(false)}
      onDiscard={() => { setValues(loaded); setErrors(undefined); setAlert(undefined); }}
      onLeaveCancel={() => setLeaveOpen(false)}
      onLeaveConfirm={back}
      onLoadLatest={() => { setValues(loaded); setAlert(undefined); toast("Loaded the latest version"); }}
      onRetry={() => navigate(ROUTES.edit(vacancy.id))}
    />
  );
}

/* ── Post a vacancy (wizard) ─────────────────────────────────────────────── */

export function VacancyNewPrototype() {
  const state = useViewState(NEW_STATES);
  return (
    <>
      <NewInner key={state} state={state} />
      <StateSwitcher states={NEW_STATES} />
    </>
  );
}

const START_STEP: Record<(typeof NEW_STATES)[number], WizardStep> = {
  basics: 0, "basics-error": 0, skills: 1, details: 2, "details-error": 2, preview: 3, "preview-incomplete": 3, publishing: 3, "save-error": 1, loading: 0, error: 0,
};

function NewInner({ state }: { state: (typeof NEW_STATES)[number] }) {
  const navigate = useNavigate();
  const [step, setStep] = useState<WizardStep>(START_STEP[state]);
  const [values, setValues] = useState<VacancyDraft>(() => {
    switch (state) {
      case "basics": case "basics-error": case "loading": case "error": return EMPTY_DRAFT;
      case "skills": case "save-error": return { ...PARTIAL_DRAFT, requiredSkills: ["Python", "SQL"], niceSkills: [] };
      case "details": return { ...PARTIAL_DRAFT, format: "hybrid", requiredSkills: ["Python", "SQL", "FastAPI"], niceSkills: ["Docker"] };
      case "details-error": return { ...COMPLETE_DRAFT, applyBy: PAST_DEADLINE };
      case "preview-incomplete": return PARTIAL_DRAFT;
      default: return COMPLETE_DRAFT;
    }
  });
  const [errors, setErrors] = useState<DraftErrors | undefined>(() => {
    if (state === "basics-error") return { title: "Enter a title of 3–120 characters" };
    if (state === "details-error") return { applyBy: "Choose today or a later date" };
    return undefined;
  });
  const [alert, setAlert] = useState<WizardAlert | undefined>(() => {
    if (state === "preview-incomplete") return { kind: "incomplete", fields: missingFields(PARTIAL_DRAFT).fields };
    if (state === "save-error") return { kind: "save-error" };
    return undefined;
  });
  const [busy, setBusy] = useState<"save" | "publish" | undefined>(state === "publishing" ? "publish" : undefined);
  const viewState: VacancyWizardState = state === "loading" ? "loading" : state === "error" ? "error" : "ready";
  const titleOk = values.title.trim().length >= 3;
  const skills = useMockSkills();

  return (
    <VacancyWizardView
      state={viewState}
      step={step}
      values={values}
      errors={errors}
      formAlert={alert}
      busy={busy}
      company={MOCK_COMPANY}
      catalog={CATALOG}
      skillOptions={skills.skillOptions}
      suggestions={SKILL_SUGGESTIONS}
      onSkillQuery={skills.onSkillQuery}
      skillsLoading={skills.skillsLoading}
      today={MOCK_TODAY}
      home="/company"
      onChange={(patch) => { setValues((x) => ({ ...x, ...patch })); setErrors(undefined); setAlert(undefined); }}
      onBack={() => { setErrors(undefined); setStep((s) => Math.max(0, s - 1) as WizardStep); }}
      onContinue={() => {
        if (step === 0 && !titleOk) { setErrors({ title: "Enter a title of 3–120 characters" }); return; }
        setErrors(undefined);
        setStep((s) => Math.min(3, s + 1) as WizardStep);
      }}
      onGoToStep={(s) => { setAlert(undefined); setErrors(missingFields(values).errors); setStep(s); }}
      onSaveExit={() => {
        if (!titleOk) { setStep(0); setErrors({ title: "Add a title to save a draft" }); return; }
        setBusy("save");
        window.setTimeout(() => { toast.success("Draft saved"); navigate(ROUTES.list); }, 300);
      }}
      onPublish={() => {
        const { fields } = missingFields(values);
        if (fields.length) { setAlert({ kind: "incomplete", fields }); return; }
        setBusy("publish");
        window.setTimeout(() => { toast.success(TOASTS.publish.title, { description: TOASTS.publish.description?.(byId("v1")) }); navigate(ROUTES.list); }, 500);
      }}
      onRetry={() => navigate(ROUTES.create)}
    />
  );
}
