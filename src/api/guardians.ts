import { api } from "./client";
import type {
  GuardianAdminOperationResult,
  GuardianAdmissionOperationRequest,
  GuardianDetail,
  GuardianPasswordResetResult,
  GuardianSearchResult,
  GuardianWard
} from "../types/guardian";

type AnyObj = Record<string, unknown>;

function normKey(key: string): string {
  return key.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function getByNormalizedKey(raw: AnyObj, keys: string[]): unknown {
  const wanted = new Set(keys.map((key) => normKey(key)));
  for (const key of Object.keys(raw)) {
    if (wanted.has(normKey(key))) return raw[key];
  }
  return undefined;
}

function pickString(raw: AnyObj, keys: string[], fallback = ""): string {
  for (const key of keys) {
    const value = raw[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }

  const normalized = getByNormalizedKey(raw, keys);
  if (typeof normalized === "string" && normalized.trim()) return normalized.trim();
  return fallback;
}

function pickNumber(raw: AnyObj, keys: string[], fallback = 0): number {
  for (const key of keys) {
    const value = raw[key];
    if (value === null || value === undefined) continue;
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }

  const normalized = getByNormalizedKey(raw, keys);
  const parsed = Number(normalized ?? fallback);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function pickBool(raw: AnyObj, keys: string[], fallback = false): boolean {
  for (const key of keys) {
    const value = raw[key];
    if (typeof value === "boolean") return value;
    if (typeof value === "number") return value !== 0;
    if (typeof value === "string") {
      const text = value.trim().toLowerCase();
      if (text === "true" || text === "1" || text === "yes") return true;
      if (text === "false" || text === "0" || text === "no") return false;
    }
  }

  const normalized = getByNormalizedKey(raw, keys);
  if (typeof normalized === "boolean") return normalized;
  if (typeof normalized === "number") return normalized !== 0;
  if (typeof normalized === "string") {
    const text = normalized.trim().toLowerCase();
    if (text === "true" || text === "1" || text === "yes") return true;
    if (text === "false" || text === "0" || text === "no") return false;
  }
  return fallback;
}

function normalizeGuardianSearchResult(data: unknown): GuardianSearchResult {
  const raw = (data ?? {}) as AnyObj;
  return {
    guardianId: pickNumber(raw, ["guardianId", "GuardianId", "id", "Id"]),
    guardianCode: pickString(raw, ["guardianCode", "GuardianCode"]),
    guardianName: pickString(raw, ["guardianName", "GuardianName", "name", "Name"]),
    username: pickString(raw, ["username", "Username"]),
    mobile: pickString(raw, ["mobile", "Mobile"]),
    wardCount: pickNumber(raw, ["wardCount", "WardCount"]),
    isActive: pickBool(raw, ["isActive", "IsActive", "active", "Active"])
  };
}

function normalizeGuardianWard(data: unknown): GuardianWard {
  const raw = (data ?? {}) as AnyObj;
  return {
    admNo: pickNumber(raw, ["admNo", "AdmNo"]),
    studentName: pickString(raw, ["studentName", "StudentName"]),
    className: pickString(raw, ["className", "ClassName"]),
    sectionName: pickString(raw, ["sectionName", "SectionName"]),
    fatherName: pickString(raw, ["fatherName", "FatherName"]),
    motherName: pickString(raw, ["motherName", "MotherName"]),
    mobile: pickString(raw, ["mobile", "Mobile"]),
    isPrimary: pickBool(raw, ["isPrimary", "IsPrimary", "primary", "Primary"])
  };
}

function normalizeGuardianDetail(data: unknown): GuardianDetail {
  const raw = (data ?? {}) as AnyObj;
  const wardsRaw = getByNormalizedKey(raw, ["wards", "Wards"]);
  return {
    guardianId: pickNumber(raw, ["guardianId", "GuardianId", "id", "Id"]),
    guardianCode: pickString(raw, ["guardianCode", "GuardianCode"]),
    guardianName: pickString(raw, ["guardianName", "GuardianName", "name", "Name"]),
    username: pickString(raw, ["username", "Username"]),
    mobile: pickString(raw, ["mobile", "Mobile"]),
    fatherName: pickString(raw, ["fatherName", "FatherName"]),
    motherName: pickString(raw, ["motherName", "MotherName"]),
    email: pickString(raw, ["email", "Email"]),
    isActive: pickBool(raw, ["isActive", "IsActive", "active", "Active"]),
    wards: Array.isArray(wardsRaw) ? wardsRaw.map(normalizeGuardianWard) : []
  };
}

function normalizeGuardianAdminOperation(data: unknown): GuardianAdminOperationResult {
  const raw = (data ?? {}) as AnyObj;
  return {
    success: pickBool(raw, ["success", "Success"]),
    message: pickString(raw, ["message", "Message"]),
    guardianId: pickNumber(raw, ["guardianId", "GuardianId"]),
    guardianCode: pickString(raw, ["guardianCode", "GuardianCode"]),
    guardianName: pickString(raw, ["guardianName", "GuardianName", "name", "Name"]),
    username: pickString(raw, ["username", "Username"]),
    mobile: pickString(raw, ["mobile", "Mobile"]),
    createdAccount: pickBool(raw, ["createdAccount", "CreatedAccount"]),
    createdMapping: pickBool(raw, ["createdMapping", "CreatedMapping"]),
    temporaryPassword: pickString(raw, ["temporaryPassword", "TemporaryPassword"]) || null,
    wardCount: pickNumber(raw, ["wardCount", "WardCount"])
  };
}

function normalizeGuardianPasswordReset(data: unknown): GuardianPasswordResetResult {
  const raw = (data ?? {}) as AnyObj;
  return {
    success: pickBool(raw, ["success", "Success"]),
    message: pickString(raw, ["message", "Message"]),
    guardianId: pickNumber(raw, ["guardianId", "GuardianId"]),
    guardianCode: pickString(raw, ["guardianCode", "GuardianCode"]),
    username: pickString(raw, ["username", "Username"]),
    temporaryPassword: pickString(raw, ["temporaryPassword", "TemporaryPassword"]) || null
  };
}

export async function searchGuardians(filter: {
  q?: string;
  mobile?: string;
}): Promise<GuardianSearchResult[]> {
  const { data } = await api.get("/guardian/search", {
    params: {
      q: filter.q || undefined,
      mobile: filter.mobile || undefined
    }
  });

  if (!Array.isArray(data)) return [];
  return data.map(normalizeGuardianSearchResult);
}

export async function getGuardianDetail(guardianId: number): Promise<GuardianDetail> {
  const { data } = await api.get(`/guardian/${guardianId}`);
  return normalizeGuardianDetail(data);
}

export async function upsertGuardianByStudent(
  payload: GuardianAdmissionOperationRequest
): Promise<GuardianAdminOperationResult> {
  const { data } = await api.post("/guardian/upsert-by-student", payload);
  return normalizeGuardianAdminOperation(data);
}

export async function mapWardToGuardian(
  guardianId: number,
  payload: GuardianAdmissionOperationRequest
): Promise<GuardianAdminOperationResult> {
  const { data } = await api.post(`/guardian/${guardianId}/wards`, payload);
  return normalizeGuardianAdminOperation(data);
}

export async function resetGuardianPassword(guardianId: number): Promise<GuardianPasswordResetResult> {
  const { data } = await api.post(`/guardian/${guardianId}/reset-password`);
  return normalizeGuardianPasswordReset(data);
}
