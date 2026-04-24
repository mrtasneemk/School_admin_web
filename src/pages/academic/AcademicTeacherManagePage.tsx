import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams } from "react-router-dom";
import Alert from "../../components/ui/Alert";
import PageHeader from "../../components/ui/PageHeader";
import { getClasses, getSections, getSubjects } from "../../api/lookup";
import {
  addAssignedClass,
  addAssignedSubject,
  getEmployeeOverview,
  removeAssignedClass,
  removeAssignedSubject
} from "../../api/employees";
import type { AssignClassDto, AssignSubjectDto } from "../../types/employee";
import { navigateDocument } from "../../utils/navigation";
import { formatRoleLabel, formatRoleListLabel } from "../../utils/roles";
import { getApiErrorMessage, hasAnyRole, SUBJECT_ASSIGNMENT_ROLES } from "./shared";

export default function AcademicTeacherManagePage() {
  const qc = useQueryClient();
  const { empId } = useParams();
  const teacherId = Number(empId || 0);
  const [classForm, setClassForm] = useState<AssignClassDto>({ ClassName: "", SectionName: "" });
  const [subjectForm, setSubjectForm] = useState<AssignSubjectDto>({ ClassName: "", SectionName: "", SubjectName: "" });

  const overviewQuery = useQuery({
    queryKey: ["employeeOverview", teacherId],
    queryFn: () => getEmployeeOverview(teacherId),
    enabled: teacherId > 0
  });
  const classesQuery = useQuery({
    queryKey: ["lookup", "classes"],
    queryFn: () => getClasses()
  });
  const classSectionsQuery = useQuery({
    queryKey: ["lookup", "sections", "teacher-manage-class", classForm.ClassName],
    queryFn: () => getSections(classForm.ClassName),
    enabled: !!classForm.ClassName
  });
  const subjectSectionsQuery = useQuery({
    queryKey: ["lookup", "sections", "teacher-manage-subject", subjectForm.ClassName],
    queryFn: () => getSections(subjectForm.ClassName),
    enabled: !!subjectForm.ClassName
  });
  const subjectsQuery = useQuery({
    queryKey: ["lookup", "subjects", subjectForm.ClassName],
    queryFn: () => getSubjects(subjectForm.ClassName),
    enabled: !!subjectForm.ClassName
  });

  const addClassMutation = useMutation({
    mutationFn: ({ empId, payload }: { empId: number; payload: AssignClassDto }) => addAssignedClass(empId, payload),
    onSuccess: async () => {
      setClassForm({ ClassName: "", SectionName: "" });
      await qc.invalidateQueries({ queryKey: ["employeeOverview", teacherId] });
    }
  });
  const removeClassMutation = useMutation({
    mutationFn: ({ empId, payload }: { empId: number; payload: AssignClassDto }) => removeAssignedClass(empId, payload),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["employeeOverview", teacherId] });
    }
  });
  const addSubjectMutation = useMutation({
    mutationFn: ({ empId, payload }: { empId: number; payload: AssignSubjectDto }) => addAssignedSubject(empId, payload),
    onSuccess: async () => {
      setSubjectForm({ ClassName: "", SectionName: "", SubjectName: "" });
      await qc.invalidateQueries({ queryKey: ["employeeOverview", teacherId] });
    }
  });
  const removeSubjectMutation = useMutation({
    mutationFn: ({ empId, payload }: { empId: number; payload: AssignSubjectDto }) => removeAssignedSubject(empId, payload),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["employeeOverview", teacherId] });
    }
  });

  const teacher = overviewQuery.data?.Profile;
  const teacherRoleText = teacher?.ROLE ?? "";
  const canManageClasses = hasAnyRole(teacherRoleText, ["Class_Teacher"]);
  const canManageSubjects = hasAnyRole(teacherRoleText, [...SUBJECT_ASSIGNMENT_ROLES]);
  const teacherBusy =
    addClassMutation.isPending ||
    removeClassMutation.isPending ||
    addSubjectMutation.isPending ||
    removeSubjectMutation.isPending;
  const teacherRolesLabel = useMemo(
    () => formatRoleListLabel(teacherRoleText) || "No matching role",
    [teacherRoleText]
  );

  function addTeacherClass() {
    if (!teacherId || !classForm.ClassName.trim() || !classForm.SectionName.trim()) return;
    addClassMutation.mutate({ empId: teacherId, payload: classForm });
  }

  function addTeacherSubject() {
    if (!teacherId || !subjectForm.ClassName.trim() || !subjectForm.SectionName.trim() || !subjectForm.SubjectName.trim()) return;
    addSubjectMutation.mutate({ empId: teacherId, payload: subjectForm });
  }

  return (
    <section className="grid">
      <PageHeader
        title={teacher ? `${teacher.NAME} Management` : "Teacher Management"}
        description="Manage one teacher profile at a time so class and subject assignment are easier to review and update."
        actions={
          <button className="btn" onClick={() => navigateDocument("/academic/teachers")}>
            Back To Teachers
          </button>
        }
      />

      <div className="grid grid-2">
        <div className="card">
          <h3>Teacher Profile</h3>
          {overviewQuery.isLoading ? <p className="help" style={{ marginTop: 12 }}>Loading teacher profile...</p> : null}
          {teacher ? (
            <div className="grid" style={{ marginTop: 12 }}>
              <div className="kv">
                <div className="kv-key">Employee</div>
                <div className="kv-val">
                  {teacher.NAME} (#{teacher.EMP_ID})
                </div>
              </div>
              <div className="kv">
                <div className="kv-key">Role</div>
                <div className="kv-val">{teacherRolesLabel}</div>
              </div>
              <div className="kv">
                <div className="kv-key">Designation</div>
                <div className="kv-val">{teacher.DISGNATION || "-"}</div>
              </div>
              <div className="kv">
                <div className="kv-key">Status</div>
                <div className="kv-val">{teacher.ACTIVE ? "Active" : "Inactive"}</div>
              </div>
            </div>
          ) : null}

          {overviewQuery.isError ? (
            <Alert tone="danger" title="Teacher Load Failed">
              {getApiErrorMessage(overviewQuery.error)}
            </Alert>
          ) : null}

          {!canManageClasses && teacher ? (
            <Alert tone="info" title="Class Assignment Locked">
              This profile is not a <b>{formatRoleLabel("Class_Teacher")}</b>, so class assignment is hidden.
            </Alert>
          ) : null}
          {!canManageSubjects && teacher ? (
            <Alert tone="info" title="Subject Assignment Locked">
              This profile is not a <b>{formatRoleLabel("Teacher")}</b>, <b>{formatRoleLabel("Subject_Teacher")}</b>, or{" "}
              <b>{formatRoleLabel("Class_Teacher")}</b>, so subject assignment is hidden.
            </Alert>
          ) : null}
        </div>

        <div className="card">
          <h3>Assignment Tools</h3>
          {canManageClasses ? (
            <div className="grid" style={{ marginTop: 12 }}>
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
                    {overviewQuery.data?.Classes?.map((assignedClass, index) => (
                      <tr key={`${assignedClass.ClassName}-${assignedClass.SectionName}-${index}`}>
                        <td>{assignedClass.ClassName}</td>
                        <td>{assignedClass.SectionName || "-"}</td>
                        <td style={{ textAlign: "right" }}>
                          <button
                            className="btn btn-sm btn-danger"
                            disabled={teacherBusy}
                            onClick={() =>
                              removeClassMutation.mutate({
                                empId: teacherId,
                                payload: {
                                  ClassName: assignedClass.ClassName,
                                  SectionName: assignedClass.SectionName || ""
                                }
                              })
                            }
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    ))}
                    {(overviewQuery.data?.Classes?.length ?? 0) === 0 ? (
                      <tr>
                        <td colSpan={3} style={{ color: "var(--muted)" }}>
                          No classes assigned.
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>

              <div className="grid grid-2">
                <div>
                  <label className="label">Class</label>
                  <select className="input" value={classForm.ClassName} onChange={(e) => setClassForm({ ClassName: e.target.value, SectionName: "" })}>
                    <option value="">Select class</option>
                    {classesQuery.data?.map((x) => (
                      <option key={x.value} value={x.value}>
                        {x.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label">Section</label>
                  <select
                    className="input"
                    value={classForm.SectionName}
                    onChange={(e) => setClassForm((prev) => ({ ...prev, SectionName: e.target.value }))}
                    disabled={!classForm.ClassName}
                  >
                    <option value="">Select section</option>
                    {classSectionsQuery.data?.map((x) => (
                      <option key={x.value} value={x.value}>
                        {x.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <button className="btn btn-primary" disabled={teacherBusy || !classForm.ClassName || !classForm.SectionName} onClick={addTeacherClass}>
                  Assign Class
                </button>
              </div>
            </div>
          ) : null}

          {canManageSubjects ? (
            <div className="grid" style={{ marginTop: 16 }}>
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
                    {overviewQuery.data?.Subjects?.map((assignedSubject, index) => (
                      <tr key={`${assignedSubject.ClassName}-${assignedSubject.SectionName}-${assignedSubject.SubjectName}-${index}`}>
                        <td>{assignedSubject.ClassName}</td>
                        <td>{assignedSubject.SectionName || "-"}</td>
                        <td>{assignedSubject.SubjectName}</td>
                        <td style={{ textAlign: "right" }}>
                          <button
                            className="btn btn-sm btn-danger"
                            disabled={teacherBusy}
                            onClick={() =>
                              removeSubjectMutation.mutate({
                                empId: teacherId,
                                payload: {
                                  ClassName: assignedSubject.ClassName,
                                  SectionName: assignedSubject.SectionName || "",
                                  SubjectName: assignedSubject.SubjectName
                                }
                              })
                            }
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    ))}
                    {(overviewQuery.data?.Subjects?.length ?? 0) === 0 ? (
                      <tr>
                        <td colSpan={4} style={{ color: "var(--muted)" }}>
                          No subjects assigned.
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>

              <div className="grid grid-2">
                <div>
                  <label className="label">Class</label>
                  <select
                    className="input"
                    value={subjectForm.ClassName}
                    onChange={(e) => setSubjectForm({ ClassName: e.target.value, SectionName: "", SubjectName: "" })}
                  >
                    <option value="">Select class</option>
                    {classesQuery.data?.map((x) => (
                      <option key={x.value} value={x.value}>
                        {x.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label">Section</label>
                  <select
                    className="input"
                    value={subjectForm.SectionName}
                    onChange={(e) => setSubjectForm((prev) => ({ ...prev, SectionName: e.target.value }))}
                    disabled={!subjectForm.ClassName}
                  >
                    <option value="">Select section</option>
                    {subjectSectionsQuery.data?.map((x) => (
                      <option key={x.value} value={x.value}>
                        {x.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div style={{ gridColumn: "1 / -1" }}>
                  <label className="label">Subject</label>
                  <select
                    className="input"
                    value={subjectForm.SubjectName}
                    onChange={(e) => setSubjectForm((prev) => ({ ...prev, SubjectName: e.target.value }))}
                    disabled={!subjectForm.ClassName}
                  >
                    <option value="">Select subject</option>
                    {subjectsQuery.data?.map((x) => (
                      <option key={x.value} value={x.value}>
                        {x.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <button
                  className="btn btn-primary"
                  disabled={teacherBusy || !subjectForm.ClassName || !subjectForm.SectionName || !subjectForm.SubjectName}
                  onClick={addTeacherSubject}
                >
                  Assign Subject
                </button>
              </div>
            </div>
          ) : null}

          {addClassMutation.isError ? <p className="error">Assign class failed: {getApiErrorMessage(addClassMutation.error)}</p> : null}
          {removeClassMutation.isError ? <p className="error">Remove class failed: {getApiErrorMessage(removeClassMutation.error)}</p> : null}
          {addSubjectMutation.isError ? <p className="error">Assign subject failed: {getApiErrorMessage(addSubjectMutation.error)}</p> : null}
          {removeSubjectMutation.isError ? <p className="error">Remove subject failed: {getApiErrorMessage(removeSubjectMutation.error)}</p> : null}
        </div>
      </div>
    </section>
  );
}
