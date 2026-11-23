import { useQueryClient } from "@tanstack/react-query";
import { toast } from "@/components/ui";
import { EMPTY_PROFILE_CATALOG, companyProfileKey, toCompanyProfile, type ApiCompanyProfile } from "./api";
import { useEditForm } from "./edit";
import { companyErrorsFrom, isApiError } from "./form";
import { useCompanyProfile, useProfileCatalog, useUpdateCompanyProfile } from "./hooks";
import {
  EMPTY_COMPANY, PROFILE_TOASTS, toCompanyValues, validateCompany,
  type CompanyErrors, type CompanyProfile, type CompanyValues, type ProfileCatalog,
} from "./model";
import { CompanyProfileView } from "./views/CompanyProfileView";

const noop = () => {};

/** S5 — /company/profile: the company profile shown in its form and edited in place (view + edit in one page). */
export function CompanyProfilePage() {
  const profile = useCompanyProfile();
  const catalog = useProfileCatalog();

  if (profile.data && catalog.data) return <EditForm loaded={profile.data} catalog={catalog.data} />;

  return (
    <CompanyProfileView
      state={profile.isError || catalog.isError ? "error" : "loading"}
      values={EMPTY_COMPANY}
      dirty={false}
      catalog={EMPTY_PROFILE_CATALOG}
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

function EditForm({ loaded, catalog }: { loaded: CompanyProfile; catalog: ProfileCatalog }) {
  const queryClient = useQueryClient();
  const update = useUpdateCompanyProfile();
  const f = useEditForm<CompanyProfile, CompanyValues, CompanyErrors>({
    loaded,
    toValues: toCompanyValues,
    validate: validateCompany,
    // the mutation puts the result in ["company-profile"] (wizard preview, account menu) and refreshes the vacancy queries
    save: (values, version) => update.mutateAsync({ values, version }),
    conflictProfile: (error) => {
      const current = isApiError(error) ? (error.detail?.profile as ApiCompanyProfile | undefined) : undefined;
      if (!current) return undefined;
      const p = toCompanyProfile(current);
      queryClient.setQueryData(companyProfileKey, p);
      return p;
    },
    serverErrors: companyErrorsFrom,
    // stays on the page: the form now shows the saved values and the header the new date
    onSaved: (before, after) => {
      const renamed = before.name.trim() !== after.name.trim();
      toast.success(PROFILE_TOASTS.saved, renamed ? { description: PROFILE_TOASTS.renamed(after.name) } : undefined);
    },
  });

  return (
    <CompanyProfileView
      state="ready"
      values={f.values}
      updatedAt={f.base.updatedAt}
      dirty={f.dirty}
      errors={f.errors}
      formAlert={f.alert}
      saving={f.saving}
      leaveOpen={f.leaveOpen}
      catalog={catalog}
      onChange={f.onChange}
      onSave={f.onSave}
      onDiscard={f.onDiscard}
      onLeaveCancel={f.onLeaveCancel}
      onLeaveConfirm={f.onLeaveConfirm}
      onLoadLatest={f.onLoadLatest}
    />
  );
}
