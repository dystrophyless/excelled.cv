import { useEffect, useRef, useState } from "react";
import { useBlocker, useLocation, useNavigate } from "react-router";
import { StateSwitcher, useViewState } from "@/components/dev";
import { toast } from "@/components/ui";
import {
  CATALOG, COMPANY, COMPANY_NEWER, MOCK_EMAIL, ROUTES, STUDENT, STUDENT_MINIMAL, STUDENT_NEWER, STUDENT_PARTIAL,
} from "@/features/profiles/mocks";
import {
  COMPANY_STEPS, EMPTY_COMPANY, EMPTY_STUDENT, PROFILE_TOASTS, STUDENT_STEPS, emptyLanguage, firstStepWithError, sameValues, stepErrors,
  toCompanyValues, toStudentValues, validateCompany, validateStudent,
  type CompanyErrors, type CompanyValues, type LoadState, type ProfileFormAlert, type StudentErrors, type StudentField,
  type StudentValues, type WizardStep,
} from "@/features/profiles/model";
import { CompanyOnboardingView } from "@/features/profiles/views/CompanyOnboardingView";
import { CompanyProfileView } from "@/features/profiles/views/CompanyProfileView";
import { StudentOnboardingView } from "@/features/profiles/views/StudentOnboardingView";
import { StudentProfileEditView } from "@/features/profiles/views/StudentProfileEditView";
import { StudentProfileView } from "@/features/profiles/views/StudentProfileView";
import { CV_STORED } from "@/features/cv/mocks";
import { CV_LIMITS } from "@/features/cv/model";
import type { CvBlockProps } from "@/features/cv/views/CvBlock";

/* Prototype wiring for 003-profiles: each View rendered with mock props; ?state= picks the state. */

export const STUDENT_ONBOARDING_STATES = [
  "name", "name-error", "university", "university-picked", "university-typed", "university-error", "major", "major-error",
  "looking-for", "looking-for-exploring", "looking-for-fields", "looking-for-max", "looking-for-error", "about", "saving", "save-error", "loading", "error",
] as const;
export const COMPANY_ONBOARDING_STATES = [
  "name", "name-error", "industry", "industry-error", "size", "details", "website-error", "description", "saving", "save-error", "loading", "error",
] as const;
export const PROFILE_STATES = ["default", "partial", "minimal", "loading", "error"] as const;
export const EDIT_STATES = ["default", "dirty", "validation", "saving", "save-error", "conflict", "leave-confirm", "loading", "error"] as const;

type StudentOnboardingState = (typeof STUDENT_ONBOARDING_STATES)[number];
type CompanyOnboardingState = (typeof COMPANY_ONBOARDING_STATES)[number];
type EditState = (typeof EDIT_STATES)[number];

const loadState = (s: string): LoadState => (s === "loading" ? "loading" : s === "error" ? "error" : "ready");

/** After a refused step / save, focus the first invalid control (a fieldset hands focus to its first answer). */
function focusInvalid() {
  window.setTimeout(() => {
    const el = document.querySelector<HTMLElement>('form [aria-invalid="true"]');
    if (!el) return;
    const target = el.tagName === "FIELDSET" ? el.querySelector<HTMLElement>('[tabindex="0"], input, button') : el;
    target?.focus();
  }, 0);
}

/** A new step announces itself: focus its h1 (as 002's wizard page does). */
function focusHeading() {
  window.setTimeout(() => {
    const h1 = document.querySelector<HTMLElement>("h1");
    if (!h1) return;
    h1.tabIndex = -1;
    h1.focus();
    window.scrollTo({ top: 0 });
  }, 0);
}

/** Clears the error of each field the user changes (as the real pages do); a changed row list clears its rows' errors. */
function withoutErrorsFor<E extends object>(e: E | undefined, patch: object): E | undefined {
  if (!e) return e;
  const next = { ...e } as Record<string, unknown>;
  for (const k of Object.keys(patch)) {
    for (const key of Object.keys(next)) if (key === k || key.startsWith(k + ".")) delete next[key];
  }
  return Object.keys(next).length ? (next as E) : undefined;
}

type WizardStart<V, F extends string> = { step: number; values: V; errors?: Partial<Record<F, string>>; saving?: boolean; saveError?: boolean };

/** Step-by-step onboarding: Continue checks the step, Save checks all and jumps back to the first wrong step. */
function useWizard<V extends object, F extends keyof V & string>(opts: {
  steps: WizardStep<F>[];
  start: WizardStart<V, F>;
  validate: (v: V) => Partial<Record<F, string>>;
  onSaved: () => void;
}) {
  const [step, setStep] = useState(opts.start.step);
  const [values, setValues] = useState<V>(opts.start.values);
  const [errors, setErrors] = useState<Partial<Record<F, string>> | undefined>(opts.start.errors);
  const [saving, setSaving] = useState(Boolean(opts.start.saving));
  const [saveError, setSaveError] = useState(Boolean(opts.start.saveError));
  const go = (s: number) => { setErrors(undefined); setStep(s); focusHeading(); };
  return {
    step, values, errors, saving, saveError,
    onChange: (patch: Partial<V>) => { setValues((v) => ({ ...v, ...patch })); setErrors((e) => withoutErrorsFor(e, patch)); },
    onBack: () => go(Math.max(0, step - 1)),
    onContinue: () => {
      const e = stepErrors(opts.steps[step], opts.validate(values));
      if (Object.keys(e).length) { setErrors(e); focusInvalid(); return; }
      go(step + 1);
    },
    onSave: () => {
      const all = opts.validate(values);
      const wrong = firstStepWithError(opts.steps, all);
      setSaveError(false);
      if (wrong >= 0) {
        setStep(wrong);
        setErrors(stepErrors(opts.steps[wrong], all));
        focusInvalid();
        return;
      }
      setSaving(true);
      window.setTimeout(opts.onSaved, 500);
    },
  };
}

/* ── S1 Student onboarding ───────────────────────────────── */

export function StudentOnboardingPrototype() {
  const state = useViewState(STUDENT_ONBOARDING_STATES);
  return (
    <>
      <StudentOnboardingInner key={state} state={state} />
      <StateSwitcher states={STUDENT_ONBOARDING_STATES} />
    </>
  );
}

const NAMED: StudentValues = { ...EMPTY_STUDENT, fullName: "Maya Akhmetova" };
const STUDIES = { university: "Satbayev University", degree: "bachelor", major: "Computer Science", studyYear: "3" };
const GOALS = { fieldChoice: "known" as const, fields: ["backend", "data_engineering"], positionTypes: ["internship"] };
const STUDENT_START: Record<StudentOnboardingState, WizardStart<StudentValues, StudentField>> = {
  name: { step: 0, values: EMPTY_STUDENT },
  "name-error": { step: 0, values: EMPTY_STUDENT, errors: { fullName: "Enter your full name" } },
  university: { step: 1, values: NAMED },
  "university-picked": { step: 1, values: { ...NAMED, university: "Satbayev University", degree: "bachelor" } },
  "university-typed": { step: 1, values: { ...NAMED, university: "Ekibastuz Engineering and Technical Institute", degree: "college" } },
  "university-error": { step: 1, values: NAMED, errors: { university: "Choose or enter your university", degree: "Choose your degree" } },
  major: { step: 2, values: { ...NAMED, ...STUDIES } },
  "major-error": { step: 2, values: { ...NAMED, ...STUDIES, studyYear: "" }, errors: { studyYear: "Choose your year of study" } },
  "looking-for": { step: 3, values: { ...NAMED, ...STUDIES } },
  "looking-for-exploring": { step: 3, values: { ...NAMED, ...STUDIES, fieldChoice: "unsure", positionTypes: ["internship", "full_time"] } },
  "looking-for-fields": { step: 3, values: { ...NAMED, ...STUDIES, ...GOALS } },
  "looking-for-max": {
    step: 3,
    values: { ...NAMED, ...STUDIES, fieldChoice: "known", fields: ["backend", "data_engineering", "devops"], positionTypes: ["internship", "part_time"] },
  },
  "looking-for-error": {
    step: 3,
    values: { ...NAMED, ...STUDIES },
    errors: { positionTypes: "Choose at least one position type", fieldChoice: "Choose one: I know which field, or I'm not sure yet" },
  },
  about: { step: 4, values: { ...NAMED, ...STUDIES, ...GOALS, city: "almaty" } },
  saving: { step: 4, values: { ...toStudentValues(STUDENT_MINIMAL), city: "almaty" }, saving: true },
  "save-error": { step: 4, values: { ...toStudentValues(STUDENT_MINIMAL), city: "almaty" }, saveError: true },
  loading: { step: 0, values: EMPTY_STUDENT },
  error: { step: 0, values: EMPTY_STUDENT },
};

function StudentOnboardingInner({ state }: { state: StudentOnboardingState }) {
  const navigate = useNavigate();
  const w = useWizard<StudentValues, StudentField>({
    steps: STUDENT_STEPS,
    start: STUDENT_START[state],
    validate: (v) => validateStudent(v) as Partial<Record<StudentField, string>>,
    onSaved: () => { toast.success(PROFILE_TOASTS.studentCreated); navigate(ROUTES.profile); },
  });
  return (
    <StudentOnboardingView
      state={loadState(state)}
      step={w.step}
      values={w.values}
      errors={w.errors}
      saveError={w.saveError}
      saving={w.saving}
      catalog={CATALOG}
      home="/app"
      onChange={w.onChange}
      onBack={w.onBack}
      onContinue={w.onContinue}
      onSave={w.onSave}
      onSignOut={() => navigate(ROUTES.signIn)}
      onRetry={() => navigate(ROUTES.studentOnboarding)}
    />
  );
}

/* ── S4 Company onboarding ───────────────────────────────── */

export function CompanyOnboardingPrototype() {
  const state = useViewState(COMPANY_ONBOARDING_STATES);
  return (
    <>
      <CompanyOnboardingInner key={state} state={state} />
      <StateSwitcher states={COMPANY_ONBOARDING_STATES} />
    </>
  );
}

const CO: CompanyValues = { ...EMPTY_COMPANY, name: "Kaspi.kz" };
const COMPANY_START: Record<CompanyOnboardingState, WizardStart<CompanyValues, keyof CompanyValues>> = {
  name: { step: 0, values: EMPTY_COMPANY },
  "name-error": { step: 0, values: { ...EMPTY_COMPANY, name: "K" }, errors: { name: "Enter at least 2 characters" } },
  industry: { step: 1, values: { ...CO, industry: "finance" } },
  "industry-error": { step: 1, values: CO, errors: { industry: "Choose an industry" } },
  size: { step: 2, values: { ...CO, industry: "finance", size: "1000_plus" } },
  details: { step: 3, values: { ...CO, industry: "finance", size: "1000_plus", website: "kaspi.kz", city: "almaty" } },
  "website-error": {
    step: 3,
    values: { ...CO, industry: "finance", size: "1000_plus", website: "kaspi kz" },
    errors: { website: "Enter a website like kaspi.kz or https://kaspi.kz" },
  },
  description: { step: 4, values: { ...CO, industry: "finance", size: "1000_plus", website: "kaspi.kz", city: "almaty" } },
  saving: { step: 4, values: toCompanyValues(COMPANY), saving: true },
  "save-error": { step: 4, values: toCompanyValues(COMPANY), saveError: true },
  loading: { step: 0, values: EMPTY_COMPANY },
  error: { step: 0, values: EMPTY_COMPANY },
};

function CompanyOnboardingInner({ state }: { state: CompanyOnboardingState }) {
  const navigate = useNavigate();
  const w = useWizard<CompanyValues, keyof CompanyValues>({
    steps: COMPANY_STEPS,
    start: COMPANY_START[state],
    validate: validateCompany,
    onSaved: () => { toast.success(PROFILE_TOASTS.companyCreated); navigate(ROUTES.vacancies); },
  });
  return (
    <CompanyOnboardingView
      state={loadState(state)}
      step={w.step}
      values={w.values}
      errors={w.errors}
      saveError={w.saveError}
      saving={w.saving}
      catalog={CATALOG}
      home="/company"
      onChange={w.onChange}
      onBack={w.onBack}
      onContinue={w.onContinue}
      onSave={w.onSave}
      onSignOut={() => navigate(ROUTES.signIn)}
      onRetry={() => navigate(ROUTES.companyOnboarding)}
    />
  );
}

/* ── S2 Own profile ──────────────────────────────────────── */

const noop = () => {};
/** 003 shows the profile only: the CV block is a stored CV whose actions do nothing (the 006-cv prototype is the clickable one). */
const STORED_CV: CvBlockProps = {
  state: "ready", cv: CV_STORED, limits: CV_LIMITS,
  onChoose: noop, onUpload: noop, onCancelPending: noop, onConfirmReplace: noop,
  onAskRemove: noop, onConfirmRemove: noop, onCancelRemove: noop, onDownload: noop,
};

export function StudentProfilePrototype() {
  const state = useViewState(PROFILE_STATES);
  const navigate = useNavigate();
  return (
    <>
      <StudentProfileView
        state={loadState(state)}
        profile={state === "minimal" ? STUDENT_MINIMAL : state === "partial" ? STUDENT_PARTIAL : STUDENT}
        email={MOCK_EMAIL}
        catalog={CATALOG}
        routes={{ edit: ROUTES.edit }}
        onRetry={() => navigate(ROUTES.profile)}
        cv={STORED_CV}
      />
      <StateSwitcher states={PROFILE_STATES} />
    </>
  );
}

/* ── Shared edit behaviour (dirty · validation · conflict · leave dialog) ── */

function useEditForm<V extends object, E extends object>(opts: {
  state: EditState;
  loaded: V;
  newer: V;
  dirtyPatch: Partial<V>;
  invalidPatch: Partial<V>;
  validate: (v: V) => E;
  onSaved: (before: V, after: V) => void;
}) {
  const { state } = opts;
  const startDirty = state === "dirty" || state === "saving" || state === "save-error" || state === "conflict" || state === "leave-confirm";
  const [loaded, setLoaded] = useState<V>(opts.loaded);
  const [values, setValues] = useState<V>(
    startDirty ? { ...opts.loaded, ...opts.dirtyPatch } : state === "validation" ? { ...opts.loaded, ...opts.invalidPatch } : opts.loaded,
  );
  const [errors, setErrors] = useState<E | undefined>(state === "validation" ? opts.validate({ ...opts.loaded, ...opts.invalidPatch }) : undefined);
  const [alert, setAlert] = useState<ProfileFormAlert | undefined>(state === "conflict" ? "conflict" : state === "save-error" ? "save-error" : undefined);
  const [saving, setSaving] = useState(state === "saving");
  /** The server's version moved on (another tab); the first save is refused, a second one after the warning replaces it. */
  const stale = useRef(false);
  const [leaveOpen, setLeaveOpen] = useState(state === "leave-confirm");
  const dirty = !sameValues(values, loaded);
  const blocker = useBlocker(({ currentLocation, nextLocation }) => dirty && !saving && currentLocation.pathname !== nextLocation.pathname);
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  const save = () => {
    const e = opts.validate(values);
    if (Object.keys(e).length) { setErrors(e); setAlert(undefined); focusInvalid(); return; }
    setErrors(undefined);
    setAlert(undefined);
    setSaving(true);
    timer.current = window.setTimeout(() => {
      setSaving(false);
      if (stale.current) { stale.current = false; setAlert("conflict"); return; }
      const before = loaded;
      setLoaded(values);
      opts.onSaved(before, values);
    }, 500);
  };

  return {
    values, errors, alert, saving, dirty,
    leaveOpen: leaveOpen || blocker.state === "blocked",
    onChange: (patch: Partial<V>) => { setValues((v) => ({ ...v, ...patch })); setErrors((e) => withoutErrorsFor(e, patch)); },
    onSave: save,
    onDiscard: () => { setValues(loaded); setErrors(undefined); setAlert(undefined); },
    onLoadLatest: () => { setLoaded(opts.newer); setValues(opts.newer); setErrors(undefined); setAlert(undefined); toast(PROFILE_TOASTS.latestLoaded); },
    onLeaveCancel: () => { setLeaveOpen(false); if (blocker.state === "blocked") blocker.reset(); },
    /** returns true when a blocked navigation was resumed */
    onLeaveConfirm: () => {
      setLeaveOpen(false);
      if (blocker.state === "blocked") { blocker.proceed(); return true; }
      return false;
    },
  };
}

/* ── S3 Edit profile ─────────────────────────────────────── */

export function StudentEditPrototype() {
  const state = useViewState(EDIT_STATES);
  return (
    <>
      <StudentEditInner key={state} state={state} />
      <StateSwitcher states={EDIT_STATES} />
    </>
  );
}

/** The profile page's "Add" buttons open `edit#<section>`: scroll there and focus its first field (the real page does the same). */
function useSectionFromHash() {
  const { hash } = useLocation();
  useEffect(() => {
    if (!hash) return;
    const t = window.setTimeout(() => {
      const el = document.getElementById(hash.slice(1));
      if (!el) return;
      el.scrollIntoView({ block: "start" });
      (el.querySelector<HTMLElement>("input:not([type=hidden]), textarea") ?? el.querySelector<HTMLElement>("button"))?.focus({ preventScroll: true });
    }, 0);
    return () => window.clearTimeout(t);
  }, [hash]);
}

function StudentEditInner({ state }: { state: EditState }) {
  const navigate = useNavigate();
  useSectionFromHash();
  const loaded = toStudentValues(STUDENT);
  const f = useEditForm<StudentValues, StudentErrors>({
    state,
    loaded,
    newer: toStudentValues(STUDENT_NEWER),
    dirtyPatch: { studyYear: "4", languages: [...loaded.languages, { ...emptyLanguage(), language: "Turkish", level: "basic" }] },
    invalidPatch: {
      fullName: "",
      projects: loaded.projects.map((p, i) => (i === 1 ? { ...p, url: "github maya" } : p)),
      languages: [...loaded.languages, { ...emptyLanguage(), language: "English", level: "fluent" }],
    },
    validate: validateStudent,
    onSaved: () => { toast.success(PROFILE_TOASTS.saved); window.setTimeout(() => navigate(ROUTES.profile), 0); },
  });

  return (
    <StudentProfileEditView
      state={loadState(state)}
      values={f.values}
      dirty={f.dirty}
      errors={f.errors}
      formAlert={f.alert}
      saving={f.saving}
      leaveOpen={f.leaveOpen}
      catalog={CATALOG}
      routes={{ profile: ROUTES.profile }}
      onChange={f.onChange}
      onSave={f.onSave}
      onDiscard={f.onDiscard}
      onLeaveCancel={f.onLeaveCancel}
      onLeaveConfirm={() => { if (!f.onLeaveConfirm()) navigate(ROUTES.profile); }}
      onLoadLatest={f.onLoadLatest}
      onRetry={() => navigate(ROUTES.edit)}
    />
  );
}

/* ── S5 Company profile ──────────────────────────────────── */

export function CompanyProfilePrototype() {
  const state = useViewState(EDIT_STATES);
  return (
    <>
      <CompanyProfileInner key={state} state={state} />
      <StateSwitcher states={EDIT_STATES} />
    </>
  );
}

function CompanyProfileInner({ state }: { state: EditState }) {
  const navigate = useNavigate();
  const [updatedAt, setUpdatedAt] = useState(COMPANY.updatedAt);
  const f = useEditForm<CompanyValues, CompanyErrors>({
    state,
    loaded: toCompanyValues(COMPANY),
    newer: toCompanyValues(COMPANY_NEWER),
    dirtyPatch: { name: "Kaspi Bank", size: "1000_plus" },
    invalidPatch: { name: "", industry: "", website: "kaspi kz" },
    validate: validateCompany,
    onSaved: (before, after) => {
      setUpdatedAt("2026-11-22T07:30:00Z");
      const renamed = before.name.trim() !== after.name.trim();
      toast.success(PROFILE_TOASTS.saved, renamed ? { description: PROFILE_TOASTS.renamed(after.name.trim()) } : undefined);
    },
  });

  return (
    <CompanyProfileView
      state={loadState(state)}
      values={f.values}
      updatedAt={updatedAt}
      dirty={f.dirty}
      errors={f.errors}
      formAlert={f.alert}
      saving={f.saving}
      leaveOpen={f.leaveOpen}
      catalog={CATALOG}
      onChange={f.onChange}
      onSave={f.onSave}
      onDiscard={f.onDiscard}
      onLeaveCancel={f.onLeaveCancel}
      onLeaveConfirm={() => { if (!f.onLeaveConfirm()) navigate(ROUTES.vacancies); }}
      onLoadLatest={f.onLoadLatest}
      onRetry={() => navigate(ROUTES.company)}
    />
  );
}
