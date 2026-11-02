import { useNavigate, useParams } from "react-router";
import { useVacancyActions } from "./actions";
import { EMPTY_CATALOG, ROUTES, isNotFound } from "./form";
import { todayKz, useCatalog, useVacancy } from "./hooks";
import { VacancyPageView } from "./views/VacancyPageView";

/** S4 - Vacancy page. The cached vacancy is replaced by the server's copy after every action (see the mutation hooks). */
export function VacancyPage() {
  const { id = "" } = useParams();
  const vacancy = useVacancy(id);
  const catalog = useCatalog();
  const navigate = useNavigate();
  const actions = useVacancyActions({ onDeleted: () => navigate(ROUTES.list) });

  const state = isNotFound(vacancy.error)
    ? "not-found"
    : vacancy.data && catalog.data
      ? "ready"
      : vacancy.isError || catalog.isError
        ? "error"
        : "loading";

  return (
    <VacancyPageView
      state={state}
      vacancy={vacancy.data}
      catalog={catalog.data ?? EMPTY_CATALOG}
      today={todayKz()}
      notice={actions.notice}
      dialog={actions.dialog}
      busy={actions.busy}
      reopenError={actions.reopenError}
      routes={ROUTES}
      onAction={actions.onAction}
      onRetry={() => {
        if (vacancy.isError) void vacancy.refetch();
        if (catalog.isError) void catalog.refetch();
      }}
      onDialogCancel={actions.onDialogCancel}
      onDialogConfirm={actions.onDialogConfirm}
    />
  );
}
