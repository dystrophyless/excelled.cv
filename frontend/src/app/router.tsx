import type { ComponentType } from "react";
import { createBrowserRouter, Navigate, useLocation } from "react-router";
import { StyleguidePage } from "@/pages/styleguide/styleguide-page";
import { AuthTemplate } from "@/pages/styleguide/templates/auth";
import { BrowseTemplate } from "@/pages/styleguide/templates/browse";
import { CandidateTemplate } from "@/pages/styleguide/templates/candidate";
import { DashboardTemplate } from "@/pages/styleguide/templates/dashboard";
import { DetailTemplate } from "@/pages/styleguide/templates/detail";
import { FormTemplate } from "@/pages/styleguide/templates/form";
import { LandingTemplate } from "@/pages/styleguide/templates/landing";
import { PipelineTemplate } from "@/pages/styleguide/templates/pipeline";
import { ProfileTemplate } from "@/pages/styleguide/templates/profile";
import { TemplateRoute, TemplatesIndex } from "@/pages/styleguide/templates/registry";
import { SavedTemplate } from "@/pages/styleguide/templates/saved";
import { SettingsTemplate } from "@/pages/styleguide/templates/settings";
import { TableTemplate } from "@/pages/styleguide/templates/table";
import { TrackerTemplate } from "@/pages/styleguide/templates/tracker";
import { VacancyEditTemplate } from "@/pages/styleguide/templates/vacancy-edit";
import { WizardTemplate } from "@/pages/styleguide/templates/wizard";
import { PrototypeRoute } from "@/prototypes/prototype-route";

/*
 * DEMO ROUTES — until a feature ships, its real path (design-system/ia.md) shows the reference template,
 * so the whole app can be clicked through. When /speckit-implement delivers a page, replace its demo route
 * with the real <XxxPage /> (wrapped in its role layout).
 */
function Demo({ page: Page }: { page: ComponentType }) {
  const location = useLocation();
  // remount on path/state change so each state starts from its own initial data
  return <Page key={location.pathname + location.search} />;
}

const demo = (path: string, page: ComponentType) => ({ path, element: <Demo page={page} /> });

export const router = createBrowserRouter([
  // Public
  demo("/", LandingTemplate),
  demo("/employers", LandingTemplate),
  demo("/vacancies", BrowseTemplate),
  demo("/vacancies/:id", DetailTemplate),
  demo("/sign-in", AuthTemplate),
  { path: "/sign-up", element: <Navigate to="/sign-in?state=sign-up" replace /> },
  demo("/onboarding", WizardTemplate),
  // Student
  demo("/app", DashboardTemplate),
  demo("/app/vacancies", BrowseTemplate),
  demo("/app/vacancies/:id", DetailTemplate),
  demo("/app/applications", TrackerTemplate),
  demo("/app/saved", SavedTemplate),
  demo("/app/profile", ProfileTemplate),
  demo("/app/profile/edit", FormTemplate),
  demo("/app/settings", SettingsTemplate),
  // Employer
  { path: "/company", element: <Navigate to="/company/vacancies" replace /> },
  demo("/company/vacancies", TableTemplate),
  demo("/company/vacancies/new", VacancyEditTemplate),
  demo("/company/vacancies/:id", PipelineTemplate),
  demo("/company/vacancies/:id/edit", VacancyEditTemplate),
  demo("/company/candidates/:id", CandidateTemplate),
  demo("/company/profile", SettingsTemplate),
  demo("/company/settings", SettingsTemplate),

  // Design system
  { path: "/styleguide", element: <StyleguidePage /> },
  { path: "/styleguide/templates", element: <TemplatesIndex /> },
  { path: "/styleguide/templates/:name", element: <TemplateRoute /> },
  // Feature prototypes — entries live in src/prototypes/registry.ts
  { path: "/prototypes/:feature?/:screen?", element: <PrototypeRoute /> },
  { path: "*", element: <Navigate to="/" replace /> },
]);
