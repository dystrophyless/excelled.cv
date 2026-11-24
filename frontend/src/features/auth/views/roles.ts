import type { IconName } from "@/components/icons";

/* 005: the two roles of sign-up (API values), shared by the role step and the account details step. */
export type SignUpRole = "student" | "employer";

export const ROLE_LABEL: Record<SignUpRole, string> = { student: "Student", employer: "HR Representative" };

export const ROLE_OPTIONS: { value: SignUpRole; label: string; description: string; icon: IconName }[] = [
  { value: "student", label: ROLE_LABEL.student, description: "Find internships, vacancies and research opportunities that fit your skills", icon: "education" },
  { value: "employer", label: ROLE_LABEL.employer, description: "Publish opportunities and present your company to students", icon: "company" },
];
