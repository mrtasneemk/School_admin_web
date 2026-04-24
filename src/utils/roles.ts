export function formatRoleLabel(role: string | null | undefined): string {
  const value = String(role ?? "").trim();
  if (!value) return "";

  const normalized = value.toLowerCase();
  if (normalized === "class_teacher") return "Class Teacher";
  if (normalized === "subject_teacher") return "Subject Teacher";
  if (normalized === "academic_admin") return "Academic Administrator";

  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

export function formatRoleListLabel(roleText: string | null | undefined): string {
  const roles = String(roleText ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

  if (roles.length === 0) return "";
  return roles.map((role) => formatRoleLabel(role)).join(", ");
}
