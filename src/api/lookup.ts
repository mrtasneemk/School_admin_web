import { api } from "./client";

export type LookupItem = { value: string; label: string };
const DEFAULT_SECTION_OPTIONS: LookupItem[] = ["A", "B", "C", "D", "E", "F", "G"].map((x) => ({ value: x, label: x }));

function toLookup(items: unknown): LookupItem[] {
  if (!Array.isArray(items)) return [];
  return items
    .map((x) => {
      if (typeof x === "string") return { value: x, label: x };
      if (x && typeof x === "object") {
        const o = x as Record<string, unknown>;
        const v = String(
          o.value ??
            o.Value ??
            o.VALUE ??
            o.className ??
            o.ClassName ??
            o.CLASSNAME ??
            o.subjectName ??
            o.SubjectName ??
            o.SUBJECTNAME ??
            o.sectionName ??
            o.SectionName ??
            o.SECTIONNAME ??
            ""
        );
        const l = String(o.label ?? o.Label ?? v);
        if (!v) return null;
        return { value: v, label: l || v };
      }
      return null;
    })
    .filter(Boolean) as LookupItem[];
}

export async function getClasses(): Promise<LookupItem[]> {
  const { data } = await api.get("/lookup/classes");
  return toLookup(data);
}

export async function getSections(className: string): Promise<LookupItem[]> {
  const c = className.trim();
  if (!c) return [];
  try {
    const { data } = await api.get("/lookup/sections", { params: { className: c } });
    const items = toLookup(data);
    if (items.length > 0) return items;
  } catch {
    // Older deployments may not expose sections consistently.
  }
  return DEFAULT_SECTION_OPTIONS;
}

export async function getSubjects(className: string): Promise<LookupItem[]> {
  const { data } = await api.get("/lookup/subjects", { params: { className } });
  return toLookup(data);
}

export async function getDesignations(q?: string): Promise<LookupItem[]> {
  const { data } = await api.get("/lookup/designations", { params: { q: q || undefined } });
  return toLookup(data);
}

export async function getCastes(q?: string): Promise<LookupItem[]> {
  const { data } = await api.get("/lookup/castes", { params: { q: q || undefined } });
  return toLookup(data);
}

export async function getReligions(q?: string): Promise<LookupItem[]> {
  const { data } = await api.get("/lookup/religions", { params: { q: q || undefined } });
  return toLookup(data);
}

export async function getQualifications(q?: string): Promise<LookupItem[]> {
  const { data } = await api.get("/lookup/qualifications", { params: { q: q || undefined } });
  return toLookup(data);
}

export async function getTechQualifications(q?: string): Promise<LookupItem[]> {
  const { data } = await api.get("/lookup/tech-qualifications", { params: { q: q || undefined } });
  return toLookup(data);
}

export type RoleLookup = { roleId: number; roleCode: string; roleName: string };

export async function getRoles(): Promise<RoleLookup[]> {
  const { data } = await api.get("/lookup/roles");
  if (!Array.isArray(data)) return [];
  return data
    .map((x) => {
      const raw = (x ?? {}) as Record<string, unknown>;
      return {
        roleId: pickNumber(raw, "roleId", "RoleId"),
        roleCode: pickString(raw, "roleCode", "RoleCode"),
        roleName: pickString(raw, "roleName", "RoleName")
      };
    })
    .filter((x) => x.roleId > 0 && x.roleName.length > 0);
}

export type AcademicYearLookup = { ay: string; active: boolean };

function pickString(raw: Record<string, unknown>, keyA: string, keyB: string): string {
  const value = raw[keyA] ?? raw[keyB];
  return typeof value === "string" ? value.trim() : String(value ?? "").trim();
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

export async function getAcademicYears(activeOnly?: boolean): Promise<AcademicYearLookup[]> {
  const { data } = await api.get("/lookup/academic-years", { params: { activeOnly: activeOnly ? true : undefined } });
  if (!Array.isArray(data)) return [];
  return data.map((x) => {
    const raw = (x ?? {}) as Record<string, unknown>;
    return {
      ay: pickString(raw, "ay", "Ay"),
      active: pickBool(raw, "active", "Active")
    };
  });
}

export type ExamTypeLookup = { id: number; exam: string; active: boolean };

export async function getExamTypes(activeOnly?: boolean): Promise<ExamTypeLookup[]> {
  const { data } = await api.get("/lookup/exam-types", { params: { activeOnly: activeOnly ? true : undefined } });
  if (!Array.isArray(data)) return [];
  return data.map((x) => {
    const raw = (x ?? {}) as Record<string, unknown>;
    return {
      id: pickNumber(raw, "id", "Id"),
      exam: pickString(raw, "exam", "Exam"),
      active: pickBool(raw, "active", "Active")
    };
  });
}

export async function addAcademicYear(payload: { ay: string; setActive?: boolean }): Promise<AcademicYearLookup> {
  const { data } = await api.post("/lookup/academic-years", payload);
  const raw = (data ?? {}) as Record<string, unknown>;
  return {
    ay: pickString(raw, "ay", "Ay"),
    active: pickBool(raw, "active", "Active")
  };
}

export async function setActiveAcademicYear(ay: string): Promise<void> {
  await api.put(`/lookup/academic-years/${encodeURIComponent(ay)}/active`);
}

export async function setActiveExamType(id: number): Promise<void> {
  await api.put(`/lookup/exam-types/${id}/active`);
}
