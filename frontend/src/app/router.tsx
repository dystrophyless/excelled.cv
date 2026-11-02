import type { ComponentType, ReactNode } from "react";
import { createBrowserRouter, Navigate, useLocation } from "react-router";
import { RedirectIfSignedIn, RequireRole } from "@/features/auth/guards";
import { ResetConfirmPage } from "@/features/auth/ResetConfirmPage";
import { ResetRequestPage } from "@/features/auth/ResetRequestPage";
import { ResetVerifyPage } from "@/features/auth/ResetVerifyPage";
import { SignInPage } from "@/features/auth/SignInPage";
import { SignUpPage } from "@/features/auth/SignUpPage";
import { VerifyEmailPage } from "@/features/auth/VerifyEmailPage";
import { EditVacancyPage } from "@/features/company-vacancies/EditVacancyPage";
import { NewVacancyPage } from "@/features/company-vacancies/NewVacancyPage";
import { VacanciesListPage } from "@/features/company-vacancies/VacanciesListPage";
import { VacancyPage } from "@/features/company-vacancies/VacancyPage";
import { StyleguidePage } from "@/pages/styleguide/styleguide-page";
import { BrowseTemplate } from "@/pages/styleguide/templates/browse";
import { CandidateTemplate } from "@/pages/styleguide/templates/candidate";
import { DashboardTemplate } from "@/pages/styleguide/templates/dashboard";
import { DetailTemplate } from "@/pages/styleguide/templates/detail";
import { FormTemplate } from "@/pages/styleguide/templates/form";
import { LandingTemplate } from "@/pages/styleguide/templates/landing";
import { ProfileTemplate } from "@/pages/styleguide/templates/profile";
import { TemplateRoute, TemplatesIndex } from "@/pages/styleguide/templates/registry";
import { SavedTemplate } from "@/pages/styleguide/templates/saved";
import { SettingsTemplate } from "@/pages/styleguide/templates/settings";
import { TrackerTemplate } from "@/pages/styleguide/templates/tracker";
import { WizardTemplate } from "@/pages/styleguide/templates/wizard";
import { PrototypeRoute } from "@/prototypes/prototype-route";

/*
 * DEMO ROUTES — until a feature ships, its real path (design-system/ia.md) shows the reference template,
 * so the whole app can be clicked through. When /speckit-implement delivers a page, replace its demo route
 * with the real <XxxPage /> (wrapped in its role layout). Already real: sign-in, sign-up (+ verify) and
 * reset-password (+ verify, confirm) in the auth feature, and all of /company/vacancies* (list, new, :id, :id/edit) in the company-vacancies feature;
 * every other path below is still a demo.
 */
function Demo({ page: Page }: { page: ComponentType }) {
  const location = useLocation();
  // remount on path/state change so each state starts from its own initial data
  return <Page key={location.pathname + location.search} />;
}

const demo = (path: string, page: ComponentType) => ({ path, element: <Demo page={page} /> });

// Role-guarded demo page. The reference templates already render their own role layout (StudentLayout / EmployerLayout),
// so the guard does not wrap another one.
const guarded = (role: "student" | "employer", path: string, page: ComponentType) => ({
  path,
  element: <RequireRole role={role}><Demo page={page} /></RequireRole>,
});
const student = (path: string, page: ComponentType) => guarded("student", path, page);
const employer = (path: string, page: ComponentType) => guarded("employer", path, page);

const publicOnly = (path: string, page: ReactNode) => ({ path, element: <RedirectIfSignedIn>{page}</RedirectIfSignedIn> });

export const router = createBrowserRouter([
  // Public
  demo("/", LandingTemplate),
  demo("/employers", LandingTemplate),
  demo("/vacancies", BrowseTemplate),
  demo("/vacancies/:id", DetailTemplate),
  publicOnly("/sign-in", <SignInPage />),
  publicOnly("/sign-up", <SignUpPage />),
  publicOnly("/sign-up/verify", <VerifyEmailPage />),
  publicOnly("/reset-password", <ResetRequestPage />),
  publicOnly("/reset-password/verify", <ResetVerifyPage />),
  publicOnly("/reset-password/confirm", <ResetConfirmPage />),
  demo("/onboarding", WizardTemplate),
  // Student
  student("/app", DashboardTemplate),
  student("/app/vacancies", BrowseTemplate),
  student("/app/vacancies/:id", DetailTemplate),
  student("/app/applications", TrackerTemplate),
  student("/app/saved", SavedTemplate),
  student("/app/profile", ProfileTemplate),
  student("/app/profile/edit", FormTemplate),
  student("/app/settings", SettingsTemplate),
  // Employer
  { path: "/company", element: <RequireRole role="employer"><Navigate to="/company/vacancies" replace /></RequireRole> },
  // S1 and S4: the Views render EmployerLayout themselves
  { path: "/company/vacancies", element: <RequireRole role="employer"><VacanciesListPage /></RequireRole> },
  // the wizard has its own bar; the edit View renders EmployerLayout itself, so neither is wrapped here
  { path: "/company/vacancies/new", element: <RequireRole role="employer"><NewVacancyPage /></RequireRole> },
  { path: "/company/vacancies/:id", element: <RequireRole role="employer"><VacancyPage /></RequireRole> },
  { path: "/company/vacancies/:id/edit", element: <RequireRole role="employer"><EditVacancyPage /></RequireRole> },
  employer("/company/candidates/:id", CandidateTemplate),
  employer("/company/profile", SettingsTemplate),
  employer("/company/settings", SettingsTemplate),

  // Design system
  { path: "/styleguide", element: <StyleguidePage /> },
  { path: "/styleguide/templates", element: <TemplatesIndex /> },
  { path: "/styleguide/templates/:name", element: <TemplateRoute /> },
  // Feature prototypes — entries live in src/prototypes/registry.ts
  { path: "/prototypes/:feature?/:screen?", element: <PrototypeRoute /> },
  { path: "*", element: <Navigate to="/" replace /> },
]);
