import { useEffect, useRef, useState } from "react";
import { useBlocker, useNavigate, useParams } from "react-router";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "@/components/ui";
import { ApiError } from "@/lib/api";
import { get, vacancyKey } from "./api";
import { DEADLINE_ERROR, EMPTY_CATALOG, ROUTES, TITLE_ERROR, conflictVacancy, errorsFor, incompleteFields, isApiError, titleOk } from "./form";
import { useRestoreFocus } from "./focus";
import { todayKz, useCatalog, useSkillSuggestions, useUpdateVacancy, useVacancy, useVacancyStatusAction } from "./hooks";
import { TOASTS, toDraft, type DraftErrors, type VacancyDraft, type VacancyItem } from "./model";
import { VacancyEditView, type EditFormAlert } from "./views/VacancyEditView";

const noop = () => {};
const BLANK: VacancyDraft = {
  title: "", type: "", field: "", city: "", format: "", description: "", duration: "", salary: "", applyBy: "",
  requiredSkills: [], niceSkills: [],
};

/** S3 - Edit vacancy. Loads the vacancy and the catalog, then hands over to `EditForm`, which owns the form. */
export function EditVacancyPage() {
  const { id = "" } = useParams();
  const vacancy = useVacancy(id);
  const catalog = useCatalog();

  if (vacancy.data && catalog.data) {
    return <EditForm key={vacancy.data.id} loaded={vacancy.data} catalog={catalog.data} />;
  }

  const notFound = vacancy.error instanceof ApiError && (vacancy.error.code === "vacancy_not_found" || vacancy.error.status === 404);
  const state = notFound ? "not-found" : vacancy.isError || catalog.isError ? "error" : "loading";
  return (
    <VacancyEditView
      state={state}
      values={BLANK}
      dirty={false}
      catalog={EMPTY_CATALOG}
      skillOptions={[]}
      today={todayKz()}
      routes={ROUTES}
      onChange={noop}
      onSaveDraft={noop}
      onPublish={noop}
      onSave={noop}
      onDiscard={noop}
      onLeaveCancel={noop}
      onLeaveConfirm={noop}
      onRetry={() => {
        if (vacancy.isError) void vacancy.refetch();
        if (catalog.isError) void catalog.refetch();
      }}
    />
  );
}

type FormProps = { loaded: VacancyItem; catalog: NonNullable<ReturnType<typeof useCatalog>["data"]> };

function EditForm({ loaded, catalog }: FormProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const update = useUpdateVacancy();
  const statusAction = useVacancyStatusAction();
  const today = todayKz();
  const [skillQuery, setSkillQuery] = useState("");
  const skills = useSkillSuggestions(skillQuery);
  const skillOptions = skills.data ?? [];
  const focus = useRestoreFocus();

  // `base` is the server copy the form was last in sync with; `version` always comes from it
  const [base, setBase] = useState(loaded);
  const [values, setValues] = useState<VacancyDraft>(() => toDraft(loaded));
  const [errors, setErrors] = useState<DraftErrors | undefined>();
  const [alert, setAlert] = useState<EditFormAlert | undefined>();
  const [saving, setSaving] = useState(false);
  const [latest, setLatest] = useState<VacancyItem | null>(null);

  const dirty = JSON.stringify(values) !== JSON.stringify(toDraft(base));

  // Leaving guard (FR-008): in-app navigation through the router blocker, reloads and tab closes through beforeunload.
  const allowLeave = useRef(false);
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) => dirty && !allowLeave.current && currentLocation.pathname !== nextLocation.pathname,
  );
  const leaveBlocked = blocker.state === "blocked";
  useEffect(() => {
    if (leaveBlocked) focus.remember();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leaveBlocked]);
  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);

  const leaveTo = (to: string) => {
    allowLeave.current = true;
    navigate(to);
  };

  const onChange = (patch: Partial<VacancyDraft>) => {
    setValues((v) => ({ ...v, ...patch }));
    setErrors((e) => {
      if (!e) return e;
      const next = { ...e };
      for (const key of Object.keys(patch)) delete next[key as keyof DraftErrors];
      return Object.keys(next).length ? next : undefined;
    });
    setAlert((a) => (a?.kind === "conflict" ? a : undefined));
  };

  /** Maps a failed write onto the form. `mode` names what the user was trying to do. */
  const fail = (error: unknown, mode: "publish" | "save") => {
    if (isApiError(error, "incomplete")) {
      const fields = incompleteFields(error);
      setErrors(errorsFor(fields));
      setAlert({ kind: "incomplete", mode, fields });
    } else if (isApiError(error, "apply_by_not_in_future")) {
      setErrors({ applyBy: DEADLINE_ERROR });
      setAlert(undefined);
    } else if (isApiError(error, "version_conflict")) {
      const current = conflictVacancy(error);
      if (current) {
        // keep what the user typed, but save against the newest version so a second save replaces it
        queryClient.setQueryData(vacancyKey(current.id), current);
        setBase(current);
        setLatest(current);
      }
      setAlert({ kind: "conflict" });
    } else {
      setAlert({ kind: "save-error" });
    }
  };

  /** PUT the form with the loaded version. Returns the saved vacancy, or null after showing why not. */
  const persist = async (mode: "publish" | "save"): Promise<VacancyItem | null> => {
    if (!titleOk(values.title)) {
      setErrors({ title: TITLE_ERROR });
      return null;
    }
    setErrors(undefined);
    setAlert(undefined);
    try {
      const saved = await update.mutateAsync({ id: base.id, draft: values, version: base.version });
      setBase(saved);
      return saved;
    } catch (error) {
      fail(error, mode);
      return null;
    }
  };

  const run = async (work: () => Promise<void>) => {
    setSaving(true);
    try {
      await work();
    } finally {
      setSaving(false);
    }
  };

  const onSaveDraft = () =>
    run(async () => {
      if (await persist("save")) toast.success("Draft saved");
    });

  // never publishes stale content: save first, then publish the version that save returned
  const onPublish = () =>
    run(async () => {
      const saved = await persist("publish");
      if (!saved) return;
      try {
        const published = await statusAction.mutateAsync({ id: saved.id, action: "publish", version: saved.version });
        setBase(published);
        toast.success(TOASTS.publish.title, { description: TOASTS.publish.description?.(published) });
        leaveTo(ROUTES.view(published.id));
      } catch (error) {
        fail(error, "publish");
      }
    });

  const onSave = () =>
    run(async () => {
      const saved = await persist("save");
      if (!saved) return;
      toast.success("Changes saved");
      leaveTo(ROUTES.view(saved.id));
    });

  const onDiscard = () => {
    setValues(toDraft(base));
    setErrors(undefined);
    setAlert(undefined);
  };

  // refetch the vacancy and reset the form to it; if the request fails, the copy the 409 carried is just as current
  const onLoadLatest = async () => {
    let fresh = latest;
    try {
      fresh = await queryClient.fetchQuery({ queryKey: vacancyKey(base.id), queryFn: () => get(base.id), staleTime: 0 });
    } catch {
      // keep the copy from the conflict response
    }
    if (!fresh) return;
    setBase(fresh);
    setValues(toDraft(fresh));
    setErrors(undefined);
    setAlert(undefined);
    setLatest(null);
    toast("Loaded the latest version");
  };

  return (
    <VacancyEditView
      state="ready"
      vacancy={base}
      values={values}
      dirty={dirty}
      errors={errors}
      formAlert={alert}
      saving={saving}
      leaveOpen={blocker.state === "blocked"}
      catalog={catalog}
      skillOptions={skillOptions}
      suggestions={skillOptions}
      skillsLoading={skills.isFetching}
      onSkillQuery={setSkillQuery}
      today={today}
      routes={ROUTES}
      onChange={onChange}
      onSaveDraft={() => void onSaveDraft()}
      onPublish={() => void onPublish()}
      onSave={() => void onSave()}
      onDiscard={onDiscard}
      onLeaveCancel={() => {
        if (blocker.state === "blocked") blocker.reset();
        focus.restore();
      }}
      onLeaveConfirm={() => {
        if (blocker.state !== "blocked") return;
        blocker.proceed();
        // this page unmounts: the page we land on gets focus on its heading instead of <body>
        focus.restore({ gone: true });
      }}
      onLoadLatest={() => void onLoadLatest()}
    />
  );
}
