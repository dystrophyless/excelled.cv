import type { ComponentType, ReactNode } from "react";
import { createBrowserRouter, Navigate, useLocation } from "react-router";
import { RedirectIfSignedIn, RequireOnboarding, RequireRole } from "@/features/auth/guards";
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
import { CompanyOnboardingPage } from "@/features/profiles/CompanyOnboardingPage";
import { CompanyProfilePage } from "@/features/profiles/CompanyProfilePage";
import { StudentOnboardingPage } from "@/features/profiles/StudentOnboardingPage";
import { StudentProfileEditPage } from "@/features/profiles/StudentProfileEditPage";
import { StudentProfilePage } from "@/features/profiles/StudentProfilePage";
import { StyleguidePage } from "@/pages/styleguide/styleguide-page";
import { BrowseTemplate } from "@/pages/styleguide/templates/browse";
import { CandidateTemplate } from "@/pages/styleguide/templates/candidate";
import { DashboardTemplate } from "@/pages/styleguide/templates/dashboard";
import { DetailTemplate } from "@/pages/styleguide/templates/detail";
import { LandingTemplate } from "@/pages/styleguide/templates/landing";
import { TemplateRoute, TemplatesIndex } from "@/pages/styleguide/templates/registry";
import { SavedTemplate } from "@/pages/styleguide/templates/saved";
import { SettingsTemplate } from "@/pages/styleguide/templates/settings";
import { TrackerTemplate } from "@/pages/styleguide/templates/tracker";
import { PrototypeRoute } from "@/prototypes/prototype-route";

/*
 * DEMO ROUTES — until a feature ships, its real path (design-system/ia.md) shows the reference template,
 * so the whole app can be clicked through. When /speckit-implement delivers a page, replace its demo route
 * with the real <XxxPage /> (wrapped in its role layout). Already real:
 *   - auth (001): sign-in, sign-up (+ verify), reset-password (+ verify, confirm);
 *   - company-vacancies (002): /company/vacancies, /new, /:id, /:id/edit;
 *   - profiles (003): /onboarding, /app/profile, /app/profile/edit, /company/onboarding, /company/profile.
 * Still demos (reference templates): /, /employers, /vacancies, /vacancies/:id, /app, /app/vacancies, /app/vacancies/:id,
 * /app/applications, /app/saved, /app/settings, /company/candidates/:id, /company/settings.
 * Every role page needs the account's profile: RequireRole sends an account without one to its onboarding (003 R3);
 * the onboarding pages sit behind RequireOnboarding (only accounts of their role without a profile).
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
  // S1: only for a signed-in student without a profile; the View has its own wizard bar
  { path: "/onboarding", element: <RequireOnboarding role="student"><StudentOnboardingPage /></RequireOnboarding> },
  // Student
  student("/app", DashboardTemplate),
  student("/app/vacancies", BrowseTemplate),
  student("/app/vacancies/:id", DetailTemplate),
  student("/app/applications", TrackerTemplate),
  student("/app/saved", SavedTemplate),
  // S2: the View renders StudentLayout itself
  { path: "/app/profile", element: <RequireRole role="student"><StudentProfilePage /></RequireRole> },
  // S3: the View renders StudentLayout itself
  { path: "/app/profile/edit", element: <RequireRole role="student"><StudentProfileEditPage /></RequireRole> },
  student("/app/settings", SettingsTemplate),
  // Employer
  { path: "/company", element: <RequireRole role="employer"><Navigate to="/company/vacancies" replace /></RequireRole> },
  // S4: only for a signed-in employer without a company profile; the View has its own wizard bar
  { path: "/company/onboarding", element: <RequireOnboarding role="employer"><CompanyOnboardingPage /></RequireOnboarding> },
  // 002 S1 and S4: the Views render EmployerLayout themselves
  { path: "/company/vacancies", element: <RequireRole role="employer"><VacanciesListPage /></RequireRole> },
  // the wizard has its own bar; the edit View renders EmployerLayout itself, so neither is wrapped here
  { path: "/company/vacancies/new", element: <RequireRole role="employer"><NewVacancyPage /></RequireRole> },
  { path: "/company/vacancies/:id", element: <RequireRole role="employer"><VacancyPage /></RequireRole> },
  { path: "/company/vacancies/:id/edit", element: <RequireRole role="employer"><EditVacancyPage /></RequireRole> },
  employer("/company/candidates/:id", CandidateTemplate),
  // S5: view + edit in one page; the View renders EmployerLayout itself
  { path: "/company/profile", element: <RequireRole role="employer"><CompanyProfilePage /></RequireRole> },
  employer("/company/settings", SettingsTemplate),

  // Design system
  { path: "/styleguide", element: <StyleguidePage /> },
  { path: "/styleguide/templates", element: <TemplatesIndex /> },
  { path: "/styleguide/templates/:name", element: <TemplateRoute /> },
  // Feature prototypes — entries live in src/prototypes/registry.ts
  { path: "/prototypes/:feature?/:screen?", element: <PrototypeRoute /> },
  { path: "*", element: <Navigate to="/" replace /> },
]);
