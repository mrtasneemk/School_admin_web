export function parseNumericId(value: string | null | undefined): number | null {
  if (!value) return null;
  const s = value.trim();
  if (!/^\d+$/.test(s)) return null;
  const n = Number(s);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export function getStaffEmpId(args: {
  role: string | null | undefined;
  userId: number | null | undefined;
  username: string | null | undefined;
}): number | null {
  // Per your system: for non-student roles, `username` holds the EmployeeId.
  if (args.role === "Student") return null;
  const fromUsername = parseNumericId(args.username);
  if (fromUsername) return fromUsername;
  return typeof args.userId === "number" && args.userId > 0 ? args.userId : null;
}

