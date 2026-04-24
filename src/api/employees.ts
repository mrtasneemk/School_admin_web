import { api } from "./client";
import type {
  AssignClassDto,
  AssignSubjectDto,
  CreateEmployeeDto,
  EmployeeDetailDto,
  EmployeeListFilter,
  EmployeeListItem,
  EmployeeOverviewDto,
  AssignEmployeeRoleResult,
  UpdateEmployeeDto
} from "../types/employee";
import type { AxiosError } from "axios";

type EmployeeListRaw = Record<string, unknown>;
type ClassSectionTeacherRaw = Record<string, unknown>;

function normKey(k: string): string {
  return k.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function getByNormalizedKey(raw: Record<string, unknown>, normalizedKeys: string[]): unknown {
  const wanted = new Set(normalizedKeys.map((k) => normKey(k)));
  for (const key of Object.keys(raw)) {
    if (wanted.has(normKey(key))) return raw[key];
  }
  return undefined;
}

function pickStringAny(raw: Record<string, unknown>, keys: string[], fallback = ""): string {
  for (const k of keys) {
    const v = raw[k];
    if (v === null || v === undefined) continue;
    const s = String(v).trim();
    if (s.length > 0) return s;
  }

  const v2 = getByNormalizedKey(raw, keys);
  if (v2 !== null && v2 !== undefined) {
    const s = String(v2).trim();
    if (s.length > 0) return s;
  }

  return fallback;
}

function pickNumberAny(raw: Record<string, unknown>, keys: string[], fallback = 0): number {
  for (const k of keys) {
    const v = raw[k];
    if (v === null || v === undefined) continue;
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }

  const v2 = getByNormalizedKey(raw, keys);
  if (v2 !== null && v2 !== undefined) {
    const n = Number(v2);
    if (Number.isFinite(n)) return n;
  }

  return fallback;
}

function pickBoolAny(raw: Record<string, unknown>, keys: string[], fallback = false): boolean {
  for (const k of keys) {
    const v = raw[k];
    if (v === null || v === undefined) continue;
    if (typeof v === "boolean") return v;
    if (typeof v === "number") return v !== 0;
    const s = String(v).trim().toLowerCase();
    if (s === "true" || s === "1" || s === "yes") return true;
    if (s === "false" || s === "0" || s === "no") return false;
  }

  const v2 = getByNormalizedKey(raw, keys);
  if (v2 !== null && v2 !== undefined) {
    if (typeof v2 === "boolean") return v2;
    if (typeof v2 === "number") return v2 !== 0;
    const s = String(v2).trim().toLowerCase();
    if (s === "true" || s === "1" || s === "yes") return true;
    if (s === "false" || s === "0" || s === "no") return false;
  }

  return fallback;
}

function toEmployeeListItem(raw: EmployeeListRaw): EmployeeListItem {
  return {
    EMP_ID: pickNumberAny(
      raw,
      [
        "EMP_ID",
        "EmpId",
        "EMPID",
        "EmpID",
        "empId",
        "emp_ID",
        "Emp_Id",
        "EmployeeId",
        "employeeId",
        "employee_id",
        "id",
        "Id",
        "ID"
      ],
      0
    ),
    NAME: pickStringAny(raw, ["NAME", "Name", "name", "EmpName", "empName", "employeeName"], ""),
    DISGNATION: pickStringAny(raw, ["DISGNATION", "Disgnation", "disgnation", "Designation", "designation"], ""),
    ROLE: pickStringAny(raw, ["ROLE", "Role", "role", "RoleName", "roleName"], ""),
    ACTIVE: pickBoolAny(raw, ["ACTIVE", "Active", "active", "IsActive", "isActive", "status"], false)
  };
}

function toTeacherListItems(rawItems: unknown[]): EmployeeListItem[] {
  const byId = new Map<number, EmployeeListItem>();

  for (const item of rawItems) {
    const raw = (item ?? {}) as ClassSectionTeacherRaw;
    const empId = pickNumberAny(raw, ["empId", "EmpId", "EMP_ID", "employeeId", "id"], 0);
    if (empId <= 0) continue;

    const current = byId.get(empId);
    const subjectName = pickStringAny(raw, ["subjectName", "SubjectName"], "");
    const isClassTeacher = pickBoolAny(raw, ["IsClassteacer", "IsClassTeacher", "isClassteacer", "isClassTeacher"], false);
    const nextRoleParts = new Set<string>(current?.ROLE?.split(",").map((x) => x.trim()).filter(Boolean) ?? []);

    if (subjectName) nextRoleParts.add("Subject_Teacher");
    if (isClassTeacher) nextRoleParts.add("Class_Teacher");
    if (nextRoleParts.size === 0) nextRoleParts.add("Teacher");

    byId.set(empId, {
      EMP_ID: empId,
      NAME: pickStringAny(raw, ["name", "Name", "NAME"], current?.NAME ?? ""),
      DISGNATION: current?.DISGNATION ?? "",
      ROLE: Array.from(nextRoleParts).join(", "),
      ACTIVE: current?.ACTIVE ?? true
    });
  }

  return Array.from(byId.values()).sort((a, b) => a.NAME.localeCompare(b.NAME));
}

export async function getEmployees(filter: EmployeeListFilter): Promise<EmployeeListItem[]> {
  const { data } = await api.get("/employee", {
    params: {
      search: filter.search || undefined,
      active: filter.active,
      page: filter.page,
      pageSize: filter.pageSize
    }
  });

  if (!Array.isArray(data)) return [];
  return data.map((x) => toEmployeeListItem(x as EmployeeListRaw));
}

export async function getTeachers(filter?: {
  className?: string;
  sectionName?: string;
}): Promise<EmployeeListItem[]> {
  const className = filter?.className?.trim() || undefined;
  const sectionName = filter?.sectionName?.trim() || undefined;

  if (className && sectionName) {
    const { data } = await api.get(
      `/employee/class/${encodeURIComponent(className)}/section/${encodeURIComponent(sectionName)}/teachers`
    );

    if (!Array.isArray(data)) return [];
    return toTeacherListItems(data);
  }

  return getEmployees({
    search: "",
    active: true,
    page: 1,
    pageSize: 100
  });
}

type EmployeeDetailRaw = Record<string, unknown>;

function pickString(raw: EmployeeDetailRaw, keys: string[], fallback = ""): string {
  for (const k of keys) {
    const v = raw[k];
    if (v === null || v === undefined) continue;
    const s = String(v);
    if (s.length > 0) return s;
  }
  return fallback;
}

function pickNumber(raw: EmployeeDetailRaw, keys: string[], fallback = 0): number {
  for (const k of keys) {
    const v = raw[k];
    if (v === null || v === undefined) continue;
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  return fallback;
}

function pickBool(raw: EmployeeDetailRaw, keys: string[], fallback = false): boolean {
  for (const k of keys) {
    const v = raw[k];
    if (v === null || v === undefined) continue;
    if (typeof v === "boolean") return v;
    if (typeof v === "number") return v !== 0;
    const s = String(v).trim().toLowerCase();
    if (s === "true" || s === "1" || s === "yes") return true;
    if (s === "false" || s === "0" || s === "no") return false;
  }
  return fallback;
}

function toEmployeeDetailDto(raw: EmployeeDetailRaw): EmployeeDetailDto {
  const iso = (v: unknown) => String(v ?? "").slice(0, 10);
  return {
    EMP_ID: pickNumber(raw, ["EMP_ID", "EmpId", "empId", "emp_ID"]),
    NAME: pickString(raw, ["NAME", "Name", "name"]),
    FATHER: pickString(raw, ["FATHER", "Father", "father"]),
    DOB: iso(raw.DOB ?? raw.Dob ?? raw.dob),
    PAREA: pickString(raw, ["PAREA", "Parea", "parea"]),
    PPOST: pickString(raw, ["PPOST", "Ppost", "ppost"]),
    PDIST: pickString(raw, ["PDIST", "Pdist", "pdist"]),
    AREA: pickString(raw, ["AREA", "Area", "area"]),
    POST: pickString(raw, ["POST", "Post", "post"]),
    DIST: pickString(raw, ["DIST", "Dist", "dist"]),
    PHONE: pickString(raw, ["PHONE", "Phone", "phone"]),
    MOBILE: pickString(raw, ["MOBILE", "Mobile", "mobile"]),
    DISGNATION: pickString(raw, ["DISGNATION", "Disgnation", "disgnation"]),
    DOJ: iso(raw.DOJ ?? raw.Doj ?? raw.doj),
    EMAIL: pickString(raw, ["EMAIL", "Email", "email"]),
    CASTE: pickString(raw, ["CASTE", "Caste", "caste"]),
    RELIGION: pickString(raw, ["RELIGION", "Religion", "religion"]),
    AADHAR: pickString(raw, ["AADHAR", "Aadhar", "aadhar"]),
    ExperienceYrs: pickString(raw, ["ExperienceYrs", "experienceYrs", "Experience_Yrs", "Experience"]),
    ExperienceMonths: pickString(raw, ["ExperienceMonths", "experienceMonths", "Experience_Months"]),
    Qualification: pickString(raw, ["Qualification", "qualification", "QUALIFICATION"]),
    TechQualification: pickString(raw, ["TechQualification", "techQualification", "Tech_Qualification", "TECHQUALIFICATION"]),
    PAN: pickString(raw, ["PAN", "Pan", "pan"]),
    PZIP: pickString(raw, ["PZIP", "Pzip", "pzip"]),
    ZIP: pickString(raw, ["ZIP", "Zip", "zip"]),
    Emp_Cat: pickNumber(raw, ["Emp_Cat", "EmpCat", "empCat"], 1),
    ACTIVE: pickBool(raw, ["ACTIVE", "Active", "active"], true)
  };
}

export async function getEmployeeDetail(empId: number): Promise<EmployeeDetailDto> {
  try {
    const { data } = await api.get(`/employee/${empId}`);
    return toEmployeeDetailDto((data ?? {}) as EmployeeDetailRaw);
  } catch (e) {
    const err = e as AxiosError;
    if (err.response?.status !== 404) throw e;
  }

  // Back-compat for older deployments: try "full-profile" and "profile".
  try {
    const { data } = await api.get(`/employee/${empId}/full-profile`);
    const raw = (data as Record<string, unknown>) ?? {};
    const profile = (raw["Profile"] as Record<string, unknown>) ?? {};
    return toEmployeeDetailDto(profile as EmployeeDetailRaw);
  } catch (e) {
    const err = e as AxiosError;
    if (err.response?.status !== 404) throw e;
  }

  const { data } = await api.get(`/employee/${empId}/profile`);
  return toEmployeeDetailDto((data ?? {}) as EmployeeDetailRaw);
}

export async function getEmployeeOverview(empId: number): Promise<EmployeeOverviewDto> {
  const { data } = await api.get(`/employee/${empId}/overview`);
  const raw = (data ?? {}) as Record<string, unknown>;

  const profileRaw = (getByNormalizedKey(raw, ["Profile", "profile"]) ?? {}) as Record<string, unknown>;
  const classesRaw = (getByNormalizedKey(raw, ["Classes", "classes"]) ?? []) as unknown;
  const subjectsRaw = (getByNormalizedKey(raw, ["Subjects", "subjects"]) ?? []) as unknown;

  const toAssignedClass = (x: unknown) => {
    const o = (x ?? {}) as Record<string, unknown>;
    return {
      ClassName: pickStringAny(o, ["ClassName", "classname", "class", "Class"], ""),
      SectionName: pickStringAny(o, ["SectionName", "sectionname", "section", "Sec"], "")
    };
  };

  const toAssignedSubject = (x: unknown) => {
    const o = (x ?? {}) as Record<string, unknown>;
    return {
      ClassName: pickStringAny(o, ["ClassName", "classname", "class", "Class"], ""),
      SectionName: pickStringAny(o, ["SectionName", "sectionname", "section", "Sec"], ""),
      SubjectName: pickStringAny(o, ["SubjectName", "subjectname", "subject", "Sub"], "")
    };
  };

  const classes = Array.isArray(classesRaw) ? classesRaw.map(toAssignedClass).filter((c) => c.ClassName) : [];
  const subjects = Array.isArray(subjectsRaw) ? subjectsRaw.map(toAssignedSubject).filter((s) => s.ClassName && s.SubjectName) : [];

  return {
    Profile: {
      EMP_ID: pickNumberAny(profileRaw, ["EMP_ID", "EmpId", "empId", "id", "Id"], empId),
      NAME: pickStringAny(profileRaw, ["NAME", "Name", "name"], ""),
      ROLE: pickStringAny(profileRaw, ["ROLE", "Role", "role", "RoleName", "roleName"], ""),
      FATHER: pickStringAny(profileRaw, ["FATHER", "Father", "father"], ""),
      DOB: pickStringAny(profileRaw, ["DOB", "Dob", "dob"], ""),
      MOBILE: pickStringAny(profileRaw, ["MOBILE", "Mobile", "mobile"], ""),
      EMAIL: pickStringAny(profileRaw, ["EMAIL", "Email", "email"], ""),
      DISGNATION: pickStringAny(profileRaw, ["DISGNATION", "Disgnation", "disgnation", "Designation"], ""),
      DOJ: pickStringAny(profileRaw, ["DOJ", "Doj", "doj"], ""),
      qualification: pickStringAny(profileRaw, ["qualification", "Qualification"], ""),
      tech_qualification: pickStringAny(profileRaw, ["tech_qualification", "TechQualification", "techQualification"], ""),
      ACTIVE: pickBoolAny(profileRaw, ["ACTIVE", "Active", "active"], true),
      Emp_Cat: pickNumberAny(profileRaw, ["Emp_Cat", "EmpCat", "empCat"], 1),
      PICURL: pickStringAny(profileRaw, ["PICURL", "picUrl", "picurl"], "")
    },
    Classes: classes,
    Subjects: subjects
  } as EmployeeOverviewDto;
}

export async function createEmployee(payload: CreateEmployeeDto): Promise<{ EmpId: number }> {
  const { data } = await api.post("/employee", payload);
  return data;
}

export async function updateEmployee(empId: number, payload: UpdateEmployeeDto): Promise<void> {
  await api.put(`/employee/${empId}`, payload);
}

export async function softDeleteEmployee(empId: number): Promise<void> {
  await api.delete(`/employee/${empId}`);
}

export async function addAssignedClass(empId: number, payload: AssignClassDto): Promise<void> {
  await api.post(`/employee/${empId}/classes`, payload);
}

export async function addAssignedSubject(empId: number, payload: AssignSubjectDto): Promise<void> {
  await api.post(`/employee/${empId}/subjects`, payload);
}

export async function removeAssignedClass(empId: number, payload: AssignClassDto): Promise<void> {
  await api.delete(`/employee/${empId}/classes`, {
    params: {
      className: payload.ClassName,
      sectionName: payload.SectionName
    }
  });
}

export async function removeAssignedSubject(empId: number, payload: AssignSubjectDto): Promise<void> {
  await api.delete(`/employee/${empId}/subjects`, {
    params: {
      className: payload.ClassName,
      sectionName: payload.SectionName,
      subjectName: payload.SubjectName
    }
  });
}

function toAssignRoleResult(raw: Record<string, unknown>): AssignEmployeeRoleResult {
  return {
    empId: pickNumberAny(raw, ["empId", "EmpId"], 0),
    userId: pickNumberAny(raw, ["userId", "UserId"], 0),
    roleId: pickNumberAny(raw, ["roleId", "RoleId"], 0),
    roleName: pickStringAny(raw, ["roleName", "RoleName"], ""),
    createdUser: pickBoolAny(raw, ["createdUser", "CreatedUser"], false),
    username: pickStringAny(raw, ["username", "Username"], "")
  };
}

export async function assignEmployeeRole(empId: number, roleId: number): Promise<AssignEmployeeRoleResult> {
  const { data } = await api.post(`/employee/${empId}/role`, { roleId });
  return toAssignRoleResult((data ?? {}) as Record<string, unknown>);
}
