import { api } from "./client";
import type {
  ResultActionRequest,
  ResultCompilePreviewCoreSubject,
  ResultCompilePreviewNacaSubject,
  ResultCompilePreviewResponse,
  ResultCompilePreviewStudent,
  ResultOperationResponse
} from "../types/result";

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
  const t = String(value ?? "").trim().toLowerCase();
  return t === "true" || t === "1" || t === "yes";
}

function normalizeOperation(data: unknown): ResultOperationResponse {
  const raw = (data ?? {}) as Record<string, unknown>;
  return {
    success: pickBool(raw, "success", "Success"),
    message: pickString(raw, "message", "Message"),
    errorCode: pickString(raw, "errorCode", "ErrorCode"),
    className: pickString(raw, "className", "ClassName"),
    sectionName: pickString(raw, "sectionName", "SectionName"),
    academicYear: pickString(raw, "academicYear", "AcademicYear"),
    examType: pickNumber(raw, "examType", "ExamType"),
    totalMarksRows: pickNumber(raw, "totalMarksRows", "TotalMarksRows"),
    affectedRows: pickNumber(raw, "affectedRows", "AffectedRows")
  };
}

function normalizeCoreSubject(data: unknown): ResultCompilePreviewCoreSubject {
  const raw = (data ?? {}) as Record<string, unknown>;
  return {
    subjectId: pickNumber(raw, "subjectId", "SubjectId"),
    subjectName: pickString(raw, "subjectName", "SubjectName"),
    obtainedMarks: pickString(raw, "obtainedMarks", "ObtainedMarks"),
    notebookMarks: pickString(raw, "notebookMarks", "NotebookMarks"),
    seMarks: pickString(raw, "seMarks", "SeMarks"),
    carryMarks: pickNumber(raw, "carryMarks", "CarryMarks"),
    total: pickNumber(raw, "total", "Total"),
    grade: pickString(raw, "grade", "Grade"),
    isAbsent: pickBool(raw, "isAbsent", "IsAbsent"),
    failed: pickBool(raw, "failed", "Failed")
  };
}

function normalizeNacaSubject(data: unknown): ResultCompilePreviewNacaSubject {
  const raw = (data ?? {}) as Record<string, unknown>;
  return {
    subjectId: pickNumber(raw, "subjectId", "SubjectId"),
    subjectName: pickString(raw, "subjectName", "SubjectName"),
    grade: pickString(raw, "grade", "Grade"),
    present: pickBool(raw, "present", "Present")
  };
}

function normalizeStudent(data: unknown): ResultCompilePreviewStudent {
  const raw = (data ?? {}) as Record<string, unknown>;
  const coreRaw = raw["coreSubjects"] ?? raw["CoreSubjects"];
  const nacaRaw = raw["nacaSubjects"] ?? raw["NacaSubjects"];
  return {
    admNo: pickNumber(raw, "admNo", "AdmNo"),
    studentName: pickString(raw, "studentName", "StudentName"),
    totalObtainedMarks: pickNumber(raw, "totalObtainedMarks", "TotalObtainedMarks"),
    totalMaxMarks: pickNumber(raw, "totalMaxMarks", "TotalMaxMarks"),
    corePresent: pickBool(raw, "corePresent", "CorePresent"),
    corePassed: pickBool(raw, "corePassed", "CorePassed"),
    nacaPresent: pickBool(raw, "nacaPresent", "NacaPresent"),
    eligibleForRank: pickBool(raw, "eligibleForRank", "EligibleForRank"),
    provisionalRank: pickNumber(raw, "provisionalRank", "ProvisionalRank") || null,
    coreSubjects: Array.isArray(coreRaw) ? coreRaw.map(normalizeCoreSubject) : [],
    nacaSubjects: Array.isArray(nacaRaw) ? nacaRaw.map(normalizeNacaSubject) : []
  };
}

function normalizePreview(data: unknown): ResultCompilePreviewResponse {
  const raw = (data ?? {}) as Record<string, unknown>;
  const studentsRaw = raw["students"] ?? raw["Students"];
  return {
    success: pickBool(raw, "success", "Success"),
    message: pickString(raw, "message", "Message"),
    errorCode: pickString(raw, "errorCode", "ErrorCode"),
    className: pickString(raw, "className", "ClassName"),
    sectionName: pickString(raw, "sectionName", "SectionName"),
    academicYear: pickString(raw, "academicYear", "AcademicYear"),
    examType: pickNumber(raw, "examType", "ExamType"),
    studentCount: pickNumber(raw, "studentCount", "StudentCount"),
    students: Array.isArray(studentsRaw) ? studentsRaw.map(normalizeStudent) : []
  };
}

export async function getCompilePreview(payload: ResultActionRequest): Promise<ResultCompilePreviewResponse> {
  const { data } = await api.post("/results/compile-preview", payload);
  return normalizePreview(data);
}

export async function compileResults(payload: ResultActionRequest): Promise<ResultOperationResponse> {
  const { data } = await api.post("/results/compile", payload);
  return normalizeOperation(data);
}

export async function publishResults(payload: ResultActionRequest): Promise<ResultOperationResponse> {
  const { data } = await api.post("/results/publish", payload);
  return normalizeOperation(data);
}

export async function publishResultsPublic(payload: ResultActionRequest): Promise<ResultOperationResponse> {
  const { data } = await api.post("/results/publish-public", payload);
  return normalizeOperation(data);
}
