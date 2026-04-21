import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AxiosError } from "axios";
import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getClasses, getSections, getSubjects } from "../../api/lookup";
import {
  addAssignedClass,
  addAssignedSubject,
  getEmployeeOverview,
  removeAssignedClass,
  removeAssignedSubject
} from "../../api/employees";
import type { AssignClassDto, AssignSubjectDto } from "../../types/employee";
import PageHeader from "../../components/ui/PageHeader";

function getApiErrorMessage(error: unknown): string {
  const axiosErr = error as AxiosError<{ message?: string; title?: string }>;
  const status = axiosErr.response?.status;
  const bodyMessage = axiosErr.response?.data?.message ?? axiosErr.response?.data?.title;
  if (bodyMessage) return status ? `(${status}) ${bodyMessage}` : bodyMessage;
  if (axiosErr.message) return status ? `(${status}) ${axiosErr.message}` : axiosErr.message;
  return "Unknown API error.";
}

function hasRole(roleText: string | undefined, role: string): boolean {
  if (!roleText) return false;
  return roleText
    .split(",")
    .map((x) => x.trim())
    .some((x) => x === role);
}

export default function EmployeeAssignmentsPage() {
  const { empId } = useParams();
  const id = empId ? Number(empId) : NaN;
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [classForm, setClassForm] = useState<AssignClassDto>({ ClassName: "", SectionName: "" });
  const [subjectForm, setSubjectForm] = useState<AssignSubjectDto>({
    ClassName: "",
    SectionName: "",
    SubjectName: ""
  });

  const classesQuery = useQuery({
    queryKey: ["lookup", "classes"],
    queryFn: getClasses,
    staleTime: 10 * 60 * 1000
  });

  const classSectionsQuery = useQuery({
    queryKey: ["lookup", "sections", classForm.ClassName],
    queryFn: () => getSections(classForm.ClassName),
    enabled: Boolean(classForm.ClassName.trim()),
    staleTime: 10 * 60 * 1000
  });

  const subjectSectionsQuery = useQuery({
    queryKey: ["lookup", "sections", subjectForm.ClassName],
    queryFn: () => getSections(subjectForm.ClassName),
    enabled: Boolean(subjectForm.ClassName.trim()),
    staleTime: 10 * 60 * 1000
  });

  const subjectsQuery = useQuery({
    queryKey: ["lookup", "subjects", subjectForm.ClassName],
    queryFn: () => getSubjects(subjectForm.ClassName),
    enabled: Boolean(subjectForm.ClassName.trim()),
    staleTime: 10 * 60 * 1000
  });

  const overviewQuery = useQuery({
    queryKey: ["employeeOverview", id],
    queryFn: () => getEmployeeOverview(id),
    enabled: Number.isFinite(id) && id > 0
  });

  const empRole = overviewQuery.data?.Profile?.ROLE ?? "";
  const isClassTeacher = hasRole(empRole, "Class_Teacher");

  const addClassMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: AssignClassDto }) => addAssignedClass(id, payload),
    onSuccess: async () => {
      setClassForm({ ClassName: "", SectionName: "" });
      await qc.invalidateQueries({ queryKey: ["employeeOverview", id] });
    }
  });

  const removeClassMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: AssignClassDto }) => removeAssignedClass(id, payload),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["employeeOverview", id] });
    }
  });

  const addSubjectMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: AssignSubjectDto }) => addAssignedSubject(id, payload),
    onSuccess: async () => {
      setSubjectForm({ ClassName: "", SectionName: "", SubjectName: "" });
      await qc.invalidateQueries({ queryKey: ["employeeOverview", id] });
    }
  });

  const removeSubjectMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: AssignSubjectDto }) => removeAssignedSubject(id, payload),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["employeeOverview", id] });
    }
  });

  const employeeTitle = useMemo(() => {
    const p = overviewQuery.data?.Profile;
    if (!p) return `Employee #${id}`;
    return `${p.NAME} (#${p.EMP_ID})`;
  }, [id, overviewQuery.data?.Profile]);

  function canSubmitClass() {
    return classForm.ClassName.trim() && classForm.SectionName.trim();
  }

  function canSubmitSubject() {
    return subjectForm.ClassName.trim() && subjectForm.SectionName.trim() && subjectForm.SubjectName.trim();
  }

  return (
    <section className="grid">
      <PageHeader
        title="Assignments"
        description="Assign classes and subjects for Class Teachers and Subject Teachers. Administrator-only."
        actions={
          <>
            <button className="btn" onClick={() => navigate("/employees")}>
              Back to List
            </button>
            <button className="btn" onClick={() => navigate(`/employees/${id}/edit`)}>
              Edit Employee
            </button>
          </>
        }
      />

      <div className="card">
        <div style={{ display: "flex", gap: 12, alignItems: "center", justifyContent: "space-between", flexWrap: "wrap" }}>
          <div>
            <div style={{ fontFamily: "var(--font-serif)", fontSize: 20 }}>{employeeTitle}</div>
            <div className="help">{overviewQuery.data?.Profile?.DISGNATION ?? ""}</div>
          </div>
          <div className="chip">EMP_ID: {Number.isFinite(id) ? id : "-"}</div>
        </div>

        {overviewQuery.isLoading && <p className="help" style={{ marginTop: 10 }}>Loading assignments...</p>}
        {overviewQuery.isError && (
          <p className="error" style={{ marginTop: 10 }}>
            Failed to load: {getApiErrorMessage(overviewQuery.error)}
          </p>
        )}
      </div>

      <div className="grid grid-2">
        {isClassTeacher && (
        <div className="card">
          <h3 style={{ marginBottom: 10 }}>Assigned Classes</h3>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Class</th>
                  <th>Section</th>
                  <th style={{ width: 120, textAlign: "right" }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {overviewQuery.data?.Classes?.map((c, idx) => (
                  <tr key={`${c.ClassName}|${c.SectionName}|${idx}`}>
                    <td style={{ fontWeight: 700 }}>{c.ClassName}</td>
                    <td>{c.SectionName ?? ""}</td>
                    <td style={{ textAlign: "right" }}>
                      <button
                        className="btn btn-sm btn-danger"
                        onClick={() => {
                          const ok = window.confirm(`Remove class ${c.ClassName}-${c.SectionName ?? ""}?`);
                          if (!ok) return;
                          removeClassMutation.mutate({
                            id,
                            payload: { ClassName: c.ClassName, SectionName: String(c.SectionName ?? "") }
                          });
                        }}
                        disabled={removeClassMutation.isPending}
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
                {(overviewQuery.data?.Classes?.length ?? 0) === 0 && (
                  <tr>
                    <td colSpan={3} style={{ color: "var(--muted)" }}>
                      No classes assigned.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div style={{ marginTop: 14 }}>
            <h3 style={{ marginBottom: 10 }}>Add Class</h3>
            <div className="grid grid-2">
              <div>
                <label className="label">Class</label>
                <select
                  className="input"
                  value={classForm.ClassName}
                  onChange={(e) => {
                    const v = e.target.value;
                    setClassForm({ ClassName: v, SectionName: "" });
                  }}
                >
                  <option value="">Select class</option>
                  {classesQuery.data?.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </select>
                {classesQuery.isError && (
                  <div className="help" style={{ color: "var(--danger)" }}>
                    Failed to load classes.
                  </div>
                )}
              </div>
              <div>
                <label className="label">Section</label>
                <select
                  className="input"
                  value={classForm.SectionName}
                  disabled={!classForm.ClassName.trim() || classSectionsQuery.isLoading}
                  onChange={(e) => setClassForm({ ...classForm, SectionName: e.target.value })}
                >
                  <option value="">{classForm.ClassName ? "Select section" : "Select class first"}</option>
                  {classSectionsQuery.data?.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
                {classSectionsQuery.isError && (
                  <div className="help" style={{ color: "var(--danger)" }}>
                    Failed to load sections from API. Using default sections.
                  </div>
                )}
              </div>
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 12, flexWrap: "wrap" }}>
              <button
                className="btn btn-primary"
                disabled={!canSubmitClass() || addClassMutation.isPending}
                onClick={() => addClassMutation.mutate({ id, payload: classForm })}
              >
                Add class
              </button>
              {addClassMutation.isError && <span className="error">{getApiErrorMessage(addClassMutation.error)}</span>}
              {removeClassMutation.isError && <span className="error">{getApiErrorMessage(removeClassMutation.error)}</span>}
            </div>
          </div>
        </div>
        )}

        <div className="card">
          <h3 style={{ marginBottom: 10 }}>Assigned Subjects</h3>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Class</th>
                  <th>Section</th>
                  <th>Subject</th>
                  <th style={{ width: 120, textAlign: "right" }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {overviewQuery.data?.Subjects?.map((s, idx) => (
                  <tr key={`${s.ClassName}|${s.SectionName}|${s.SubjectName}|${idx}`}>
                    <td style={{ fontWeight: 700 }}>{s.ClassName}</td>
                    <td>{s.SectionName ?? ""}</td>
                    <td>{s.SubjectName}</td>
                    <td style={{ textAlign: "right" }}>
                      <button
                        className="btn btn-sm btn-danger"
                        onClick={() => {
                          const ok = window.confirm(
                            `Remove subject ${s.ClassName}-${s.SectionName ?? ""}-${s.SubjectName}?`
                          );
                          if (!ok) return;
                          removeSubjectMutation.mutate({
                            id,
                            payload: {
                              ClassName: s.ClassName,
                              SectionName: String(s.SectionName ?? ""),
                              SubjectName: s.SubjectName
                            }
                          });
                        }}
                        disabled={removeSubjectMutation.isPending}
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
                {(overviewQuery.data?.Subjects?.length ?? 0) === 0 && (
                  <tr>
                    <td colSpan={4} style={{ color: "var(--muted)" }}>
                      No subjects assigned.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div style={{ marginTop: 14 }}>
            <h3 style={{ marginBottom: 10 }}>Add Subject</h3>
            <div className="grid grid-2">
              <div>
                <label className="label">Class</label>
                <select
                  className="input"
                  value={subjectForm.ClassName}
                  onChange={(e) => {
                    const v = e.target.value;
                    setSubjectForm({ ClassName: v, SectionName: "", SubjectName: "" });
                  }}
                >
                  <option value="">Select class</option>
                  {classesQuery.data?.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Section</label>
                <select
                  className="input"
                  value={subjectForm.SectionName}
                  disabled={!subjectForm.ClassName.trim() || subjectSectionsQuery.isLoading}
                  onChange={(e) => setSubjectForm({ ...subjectForm, SectionName: e.target.value })}
                >
                  <option value="">{subjectForm.ClassName ? "Select section" : "Select class first"}</option>
                  {subjectSectionsQuery.data?.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
                {subjectSectionsQuery.isError && (
                  <div className="help" style={{ color: "var(--danger)" }}>
                    Failed to load sections from API. Using default sections.
                  </div>
                )}
              </div>
              <div style={{ gridColumn: "1 / -1" }}>
                <label className="label">Subject</label>
                <select
                  className="input"
                  value={subjectForm.SubjectName}
                  disabled={!subjectForm.ClassName.trim() || subjectsQuery.isLoading}
                  onChange={(e) => setSubjectForm({ ...subjectForm, SubjectName: e.target.value })}
                >
                  <option value="">{subjectForm.ClassName ? "Select subject" : "Select class first"}</option>
                  {subjectsQuery.data?.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
                {subjectsQuery.isError && (
                  <div className="help" style={{ color: "var(--danger)" }}>
                    Failed to load subjects.
                  </div>
                )}
              </div>
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 12, flexWrap: "wrap" }}>
              <button
                className="btn btn-primary"
                disabled={!canSubmitSubject() || addSubjectMutation.isPending}
                onClick={() => addSubjectMutation.mutate({ id, payload: subjectForm })}
              >
                Add subject
              </button>
              {addSubjectMutation.isError && <span className="error">{getApiErrorMessage(addSubjectMutation.error)}</span>}
              {removeSubjectMutation.isError && <span className="error">{getApiErrorMessage(removeSubjectMutation.error)}</span>}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
