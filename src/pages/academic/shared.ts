import type { AxiosError } from "axios";

export function getApiErrorMessage(error: unknown): string {
  const axiosErr = error as AxiosError<{ message?: string; title?: string }>;
  const status = axiosErr.response?.status;
  const bodyMessage = axiosErr.response?.data?.message ?? axiosErr.response?.data?.title;
  if (bodyMessage) return status ? `(${status}) ${bodyMessage}` : bodyMessage;
  if (axiosErr.message) return status ? `(${status}) ${axiosErr.message}` : axiosErr.message;
  return "Unknown API error.";
}

export function splitRoles(roleText: string | undefined): string[] {
  return (roleText ?? "")
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
}

export function hasAnyRole(roleText: string | undefined, roles: string[]): boolean {
  const actual = splitRoles(roleText).map((x) => x.toLowerCase());
  return roles.some((role) => actual.includes(role.toLowerCase()));
}

export const MANAGEABLE_TEACHER_ROLES = ["Teacher", "Class_Teacher", "Subject_Teacher"] as const;
export const SUBJECT_ASSIGNMENT_ROLES = ["Teacher", "Class_Teacher", "Subject_Teacher"] as const;
