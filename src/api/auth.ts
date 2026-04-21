import { api } from "./client";
import type { LoginRequest, LoginResponse, ResetEmployeePasswordResponse } from "../types/auth";

function pickString(raw: Record<string, unknown>, keyA: string, keyB: string): string {
  const value = raw[keyA] ?? raw[keyB];
  return typeof value === "string" ? value.trim() : "";
}

function pickNumber(raw: Record<string, unknown>, keyA: string, keyB: string): number {
  const value = raw[keyA] ?? raw[keyB];
  return typeof value === "number" ? value : Number(value ?? 0);
}

function pickBool(raw: Record<string, unknown>, keyA: string, keyB: string): boolean {
  const value = raw[keyA] ?? raw[keyB];
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;
  const text = String(value ?? "").trim().toLowerCase();
  return text === "true" || text === "1" || text === "yes";
}

function normKey(k: string): string {
  return k.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function getByNormalizedKey(raw: Record<string, unknown>, keys: string[]): unknown {
  const wanted = new Set(keys.map((key) => normKey(key)));
  for (const key of Object.keys(raw)) {
    if (wanted.has(normKey(key))) return raw[key];
  }
  return undefined;
}

function pickStringAny(raw: Record<string, unknown>, keys: string[]): string {
  for (const key of keys) {
    const value = raw[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }

  const normalized = getByNormalizedKey(raw, keys);
  if (typeof normalized === "string" && normalized.trim()) return normalized.trim();
  return "";
}

function pickNumberAny(raw: Record<string, unknown>, keys: string[]): number {
  for (const key of keys) {
    const value = raw[key];
    if (value === null || value === undefined) continue;
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }

  const normalized = getByNormalizedKey(raw, keys);
  const parsed = Number(normalized ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeLoginResponse(data: unknown): LoginResponse {
  const raw = (data ?? {}) as Record<string, unknown>;

  return {
    userId: pickNumber(raw, "userId", "UserId"),
    username: pickString(raw, "username", "Username"),
    roleId: pickNumber(raw, "roleId", "RoleId"),
    roleCode: pickString(raw, "roleCode", "RoleCode"),
    roleName: pickString(raw, "roleName", "RoleName"),
    token: pickString(raw, "token", "Token")
  };
}

function normalizeResetPasswordResponse(data: unknown): ResetEmployeePasswordResponse {
  const raw = (data ?? {}) as Record<string, unknown>;
  return {
    success: pickBool(raw, "success", "Success"),
    message: pickString(raw, "message", "Message"),
    password: pickString(raw, "password", "Password"),
    updatedUsers: pickNumber(raw, "updatedUsers", "UpdatedUsers")
  };
}

export async function login(payload: LoginRequest): Promise<LoginResponse> {
  const { data } = await api.post("/auth/login", payload);
  return normalizeLoginResponse(data);
}

export async function changePassword(payload: {
  currentPassword: string;
  newPassword: string;
}): Promise<string> {
  const { data } = await api.post("/auth/change-password", payload);
  // API returns a string message today.
  return typeof data === "string" ? data : "Password changed.";
}

export async function resetEmployeePassword(empId: number): Promise<ResetEmployeePasswordResponse> {
  const { data } = await api.post(`/auth/employees/${empId}/reset-password`);
  return normalizeResetPasswordResponse(data);
}

export type AuthSession = {
  userId?: number;
  username?: string;
  role?: string;
  empId?: number;
  admNo?: number;
};

export function normalizeAuthSession(data: unknown): AuthSession {
  const raw = (data ?? {}) as Record<string, unknown>;

  return {
    userId: pickNumberAny(raw, ["userId", "UserId", "id", "Id"]) || undefined,
    username: pickStringAny(raw, ["username", "Username", "userName", "UserName"]) || undefined,
    role: pickStringAny(raw, ["role", "Role", "roleName", "RoleName", "roleCode", "RoleCode"]) || undefined,
    empId:
      pickNumberAny(raw, ["empId", "EmpId", "employeeId", "EmployeeId", "emp_ID", "EMP_ID"]) || undefined,
    admNo: pickNumberAny(raw, ["admNo", "AdmNo", "serialNumber", "SerialNumber"]) || undefined
  };
}

export async function getAuthSession(): Promise<AuthSession> {
  const { data } = await api.get("/auth/session");
  return normalizeAuthSession(data);
}
