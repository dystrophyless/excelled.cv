import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router";
import { toast } from "@/components/ui";
import { EMPTY_PROFILE_CATALOG, studentProfileKey, toStudentProfile, updateStudent, type ApiStudentProfile } from "./api";
import { useEditForm, useSectionFromHash } from "./edit";
import { ROUTES, isApiError, studentErrorsFrom } from "./form";
import { useProfileCatalog, useStudentProfile } from "./hooks";
import {
  EMPTY_STUDENT, PROFILE_TOASTS, toStudentValues, validateStudent,
  type ProfileCatalog, type StudentErrors, type StudentProfile, type StudentValues,
} from "./model";
import { StudentProfileEditView } from "./views/StudentProfileEditView";

const noop = () => {};

/** S3 — /app/profile/edit. Loads the profile and the catalog, then hands over to `EditForm`, which owns the form. */
export function StudentProfileEditPage() {
  const profile = useStudentProfile();
  const catalog = useProfileCatalog();
  useSectionFromHash(Boolean(profile.data && catalog.data));

  if (profile.data && catalog.data) return <EditForm loaded={profile.data} catalog={catalog.data} />;

  return (
    <StudentProfileEditView
      state={profile.isError || catalog.isError ? "error" : "loading"}
      values={EMPTY_STUDENT}
      dirty={false}
      catalog={EMPTY_PROFILE_CATALOG}
      routes={{ profile: ROUTES.studentProfile }}
      onChange={noop}
      onSave={noop}
      onDiscard={noop}
      onLeaveCancel={noop}
      onLeaveConfirm={noop}
      onRetry={() => {
        if (profile.isError) void profile.refetch();
        if (catalog.isError) void catalog.refetch();
      }}
    />
  );
}

function EditForm({ loaded, catalog }: { loaded: StudentProfile; catalog: ProfileCatalog }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const f = useEditForm<StudentProfile, StudentValues, StudentErrors>({
    loaded,
    toValues: toStudentValues,
    validate: validateStudent,
    save: async (values, version) => {
      const saved = await updateStudent(values, version);
      queryClient.setQueryData(studentProfileKey, saved);
      return saved;
    },
    conflictProfile: (error) => {
      const current = isApiError(error) ? (error.detail?.profile as ApiStudentProfile | undefined) : undefined;
      if (!current) return undefined;
      const p = toStudentProfile(current);
      queryClient.setQueryData(studentProfileKey, p);
      return p;
    },
    serverErrors: studentErrorsFrom,
    onSaved: (_before, _after, leave) => {
      toast.success(PROFILE_TOASTS.saved);
      leave();
      navigate(ROUTES.studentProfile);
    },
  });

  return (
    <StudentProfileEditView
      state="ready"
      values={f.values}
      dirty={f.dirty}
      errors={f.errors}
      formAlert={f.alert}
      saving={f.saving}
      leaveOpen={f.leaveOpen}
      catalog={catalog}
      routes={{ profile: ROUTES.studentProfile }}
      onChange={f.onChange}
      onSave={f.onSave}
      onDiscard={f.onDiscard}
      onLeaveCancel={f.onLeaveCancel}
      onLeaveConfirm={f.onLeaveConfirm}
      onLoadLatest={f.onLoadLatest}
    />
  );
}
