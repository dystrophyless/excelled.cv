import { useMe } from "@/features/auth/hooks";
import { EMPTY_PROFILE_CATALOG } from "./api";
import { ROUTES } from "./form";
import { useProfileCatalog, useStudentProfile } from "./hooks";
import type { LoadState } from "./model";
import { StudentProfileView } from "./views/StudentProfileView";

/** S2 — /app/profile: the student's own profile (profile + catalog labels). The View renders StudentLayout itself. */
export function StudentProfilePage() {
  const me = useMe();
  const profile = useStudentProfile();
  const catalog = useProfileCatalog();

  const state: LoadState = profile.isPending || catalog.isPending ? "loading" : profile.isError || catalog.isError ? "error" : "ready";

  return (
    <StudentProfileView
      state={state}
      profile={profile.data}
      email={me.data?.email}
      catalog={catalog.data ?? EMPTY_PROFILE_CATALOG}
      routes={{ edit: ROUTES.studentEdit }}
      onRetry={() => {
        if (profile.isError) void profile.refetch();
        if (catalog.isError) void catalog.refetch();
      }}
    />
  );
}
