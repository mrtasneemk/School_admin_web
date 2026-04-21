import { api } from "./client";
import type { AxiosError } from "axios";
import { getAuthSession } from "./auth";
import { getStaffEmpId } from "../auth/identity";

type AnyObj = Record<string, unknown>;

function pickString(raw: AnyObj, ...keys: string[]): string {
  for (const k of keys) {
    const v = raw[k];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return "";
}

export type StudentProfile = {
  PICURL: string;
  SNAME: string;
};

export type EmployeeProfile = {
  PICURL: string;
  NAME: string;
  EMAIL: string;
  MOBILE: string;
  DISGNATION: string;
};

export async function getStudentProfile(): Promise<StudentProfile> {
  const { data } = await api.get("/student/profile");
  const raw = (data ?? {}) as AnyObj;
  return {
    PICURL: pickString(raw, "PICURL", "picurl", "PicUrl", "IMAGEURL", "imageurl", "ImageUrl"),
    SNAME: pickString(raw, "SNAME", "sname", "name")
  };
}

export async function getEmployeeProfile(empId: number): Promise<EmployeeProfile> {
  // Preferred source: overview payload, because some deployments expose image URL there.
  try {
    const { data } = await api.get(`/employee/${empId}/overview`);
    const raw = (data ?? {}) as AnyObj;
    const profile = ((raw["Profile"] ?? raw["profile"] ?? {}) as AnyObj);

    return {
      PICURL: pickString(profile, "PICURL", "picurl", "PicUrl", "IMAGEURL", "imageurl", "ImageUrl"),
      NAME: pickString(profile, "NAME", "name"),
      EMAIL: pickString(profile, "EMAIL", "email"),
      MOBILE: pickString(profile, "MOBILE", "mobile"),
      DISGNATION: pickString(profile, "DISGNATION", "disgnation", "designation")
    };
  } catch (e) {
    const err = e as AxiosError;
    if (err.response?.status && err.response.status !== 404) throw e;
  }

  const { data } = await api.get(`/employee/${empId}/profile`);
  const raw = (data ?? {}) as AnyObj;
  return {
    PICURL: pickString(raw, "PICURL", "picurl", "PicUrl", "IMAGEURL", "imageurl", "ImageUrl"),
    NAME: pickString(raw, "NAME", "name"),
    EMAIL: pickString(raw, "EMAIL", "email"),
    MOBILE: pickString(raw, "MOBILE", "mobile"),
    DISGNATION: pickString(raw, "DISGNATION", "disgnation", "designation")
  };
}

export async function getCurrentStaffProfile(args: {
  role: string | null | undefined;
  userId: number | null | undefined;
  username: string | null | undefined;
}): Promise<EmployeeProfile | null> {
  let resolvedEmpId: number | null = null;

  try {
    const session = await getAuthSession();
    if (typeof session.empId === "number" && session.empId > 0) {
      resolvedEmpId = session.empId;
    }
  } catch {
    // Fall back to legacy token inference for older deployments or restricted roles.
  }

  if (!resolvedEmpId) {
    resolvedEmpId = getStaffEmpId(args);
  }

  if (!resolvedEmpId || resolvedEmpId <= 0) return null;
  return getEmployeeProfile(resolvedEmpId);
}
