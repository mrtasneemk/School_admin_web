import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { AxiosError } from "axios";
import Alert from "../components/ui/Alert";
import PageHeader from "../components/ui/PageHeader";
import {
  addAcademicYear,
  getAcademicYears,
  getClasses,
  getExamTypes,
  getSections,
  getSubjects,
  setActiveAcademicYear,
  setActiveExamType
} from "../api/lookup";
import {
  addAssignedClass,
  addAssignedSubject,
  getEmployeeOverview,
  getTeachers,
  removeAssignedClass,
  removeAssignedSubject
} from "../api/employees";
import { compileResults, getCompilePreview, publishResults, publishResultsPublic } from "../api/results";
import type { EmployeeListItem, AssignClassDto, AssignSubjectDto } from "../types/employee";
import type { ResultActionRequest, ResultCompilePreviewResponse } from "../types/result";

function getApiErrorMessage(error: unknown): string {
  const axiosErr = error as AxiosError<{ message?: string; title?: string }>;
  const status = axiosErr.response?.status;
  const bodyMessage = axiosErr.response?.data?.message ?? axiosErr.response?.data?.title;
  if (bodyMessage) return status ? `(${status}) ${bodyMessage}` : bodyMessage;
  if (axiosErr.message) return status ? `(${status}) ${axiosErr.message}` : axiosErr.message;
  return "Unknown API error.";
}

function splitRoles(roleText: string | undefined): string[] {
  return (roleText ?? "")
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
}

function hasAnyRole(roleText: string | undefined, roles: string[]): boolean {
  const actual = splitRoles(roleText).map((x) => x.toLowerCase());
  return roles.some((role) => actual.includes(role.toLowerCase()));
}

const MANAGEABLE_TEACHER_ROLES = ["Teacher", "Class_Teacher", "Subject_Teacher"] as const;
const SUBJECT_ASSIGNMENT_ROLES = ["Teacher", "Class_Teacher", "Subject_Teacher"] as const;

export default function AcademicAdminPage() {
  const qc = useQueryClient();

  const [ayInput, setAyInput] = useState("");
  const [setActiveOnAdd, setSetActiveOnAdd] = useState(true);
  const [ayValidationError, setAyValidationError] = useState("");

  const [resultClass, setResultClass] = useState("");
  const [resultSection, setResultSection] = useState("");
  const [useExplicitAy, setUseExplicitAy] = useState(false);
  const [explicitAy, setExplicitAy] = useState("");
  const [useExplicitExam, setUseExplicitExam] = useState(false);
  const [explicitExamId, setExplicitExamId] = useState<number>(0);
  const [dryRun, setDryRun] = useState(true);

  const [preview, setPreview] = useState<ResultCompilePreviewResponse | null>(null);
  const [selectedPreviewAdmNo, setSelectedPreviewAdmNo] = useState<number | null>(null);

  const [teacherFilterClass, setTeacherFilterClass] = useState("");
  const [teacherFilterSection, setTeacherFilterSection] = useState("");
  const [selectedTeacherId, setSelectedTeacherId] = useState<number>(0);
  const [classForm, setClassForm] = useState<AssignClassDto>({ ClassName: "", SectionName: "" });
  const [subjectForm, setSubjectForm] = useState<AssignSubjectDto>({
    ClassName: "",
    SectionName: "",
    SubjectName: ""
  });
  const [timetableFileName, setTimetableFileName] = useState("");

  const yearsQuery = useQuery({
    queryKey: ["lookup", "academic-years"],
    queryFn: () => getAcademicYears()
  });
  const examsQuery = useQuery({
    queryKey: ["lookup", "exam-types"],
    queryFn: () => getExamTypes()
  });
  const classesQuery = useQuery({
    queryKey: ["lookup", "classes"],
    queryFn: () => getClasses()
  });
  const resultSectionsQuery = useQuery({
    queryKey: ["lookup", "sections", "result", resultClass],
    queryFn: () => getSections(resultClass),
    enabled: !!resultClass
  });
  const teacherFilterSectionsQuery = useQuery({
    queryKey: ["lookup", "sections", "teacher-filter", teacherFilterClass],
    queryFn: () => getSections(teacherFilterClass),
    enabled: !!teacherFilterClass
  });
  const classSectionsQuery = useQuery({
    queryKey: ["lookup", "sections", "assign-class", classForm.ClassName],
    queryFn: () => getSections(classForm.ClassName),
    enabled: !!classForm.ClassName
  });
  const subjectSectionsQuery = useQuery({
    queryKey: ["lookup", "sections", "assign-subject", subjectForm.ClassName],
    queryFn: () => getSections(subjectForm.ClassName),
    enabled: !!subjectForm.ClassName
  });
  const subjectsQuery = useQuery({
    queryKey: ["lookup", "subjects", subjectForm.ClassName],
    queryFn: () => getSubjects(subjectForm.ClassName),
    enabled: !!subjectForm.ClassName
  });
  const teachersQuery = useQuery({
    queryKey: ["teachers", teacherFilterClass, teacherFilterSection],
    queryFn: () =>
      getTeachers({
        className: teacherFilterClass || undefined,
        sectionName: teacherFilterSection || undefined
      }),
    retry: 0
  });
  const teacherOverviewQuery = useQuery({
    queryKey: ["employeeOverview", selectedTeacherId],
    queryFn: () => getEmployeeOverview(selectedTeacherId),
    enabled: selectedTeacherId > 0
  });

  const refreshLookups = () => {
    qc.invalidateQueries({ queryKey: ["lookup", "academic-years"] });
    qc.invalidateQueries({ queryKey: ["lookup", "exam-types"] });
  };

  const addYearMutation = useMutation({
    mutationFn: addAcademicYear,
    onSuccess: () => {
      setAyInput("");
      setAyValidationError("");
      refreshLookups();
    }
  });
  const activateYearMutation = useMutation({ mutationFn: setActiveAcademicYear, onSuccess: refreshLookups });
  const activateExamMutation = useMutation({ mutationFn: setActiveExamType, onSuccess: refreshLookups });

  const previewMutation = useMutation({
    mutationFn: getCompilePreview,
    onSuccess: (data) => {
      setPreview(data);
      setSelectedPreviewAdmNo(data.students[0]?.admNo ?? null);
    }
  });
  const compileMutation = useMutation({ mutationFn: compileResults });
  const publishMutation = useMutation({ mutationFn: publishResults });
  const publishPublicMutation = useMutation({ mutationFn: publishResultsPublic });

  const addClassMutation = useMutation({
    mutationFn: ({ empId, payload }: { empId: number; payload: AssignClassDto }) => addAssignedClass(empId, payload),
    onSuccess: async () => {
      setClassForm({ ClassName: "", SectionName: "" });
      await qc.invalidateQueries({ queryKey: ["employeeOverview", selectedTeacherId] });
    }
  });
  const removeClassMutation = useMutation({
    mutationFn: ({ empId, payload }: { empId: number; payload: AssignClassDto }) => removeAssignedClass(empId, payload),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["employeeOverview", selectedTeacherId] });
    }
  });
  const addSubjectMutation = useMutation({
    mutationFn: ({ empId, payload }: { empId: number; payload: AssignSubjectDto }) => addAssignedSubject(empId, payload),
    onSuccess: async () => {
      setSubjectForm({ ClassName: "", SectionName: "", SubjectName: "" });
      await qc.invalidateQueries({ queryKey: ["employeeOverview", selectedTeacherId] });
    }
  });
  const removeSubjectMutation = useMutation({
    mutationFn: ({ empId, payload }: { empId: number; payload: AssignSubjectDto }) => removeAssignedSubject(empId, payload),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["employeeOverview", selectedTeacherId] });
    }
  });

  const activeAy = useMemo(() => yearsQuery.data?.find((x) => x.active)?.ay || "Not set", [yearsQuery.data]);
  const activeExam = useMemo(() => examsQuery.data?.find((x) => x.active)?.exam || "Not set", [examsQuery.data]);
  const selectedStudent = useMemo(
    () => preview?.students.find((x) => x.admNo === selectedPreviewAdmNo) ?? null,
    [preview, selectedPreviewAdmNo]
  );
  const teacherCandidates = useMemo(
    () => (teachersQuery.data ?? []).filter((teacher) => hasAnyRole(teacher.ROLE, [...MANAGEABLE_TEACHER_ROLES])),
    [teachersQuery.data]
  );
  const selectedTeacher = useMemo(
    () => teacherCandidates.find((teacher) => teacher.EMP_ID === selectedTeacherId) ?? null,
    [selectedTeacherId, teacherCandidates]
  );
  const canManageClasses = hasAnyRole(selectedTeacher?.ROLE, ["Class_Teacher"]);
  const canManageSubjects = hasAnyRole(selectedTeacher?.ROLE, [...SUBJECT_ASSIGNMENT_ROLES]);
  const teacherRolesLabel = splitRoles(selectedTeacher?.ROLE).join(", ") || "No matching role";
  const teacherBusy =
    addClassMutation.isPending ||
    removeClassMutation.isPending ||
    addSubjectMutation.isPending ||
    removeSubjectMutation.isPending;

  function onAddYear() {
    const ay = ayInput.trim();
    if (!/^\d{4}$/.test(ay)) {
      setAyValidationError("Academic year must be 4 digits (example: 2026).");
      return;
    }
    setAyValidationError("");
    addYearMutation.mutate({ ay, setActive: setActiveOnAdd });
  }

  function getScopePayload(): ResultActionRequest | null {
    if (!resultClass || !resultSection) return null;
    const payload: ResultActionRequest = {
      className: resultClass,
      sectionName: resultSection,
      dryRun
    };
    if (useExplicitAy && explicitAy.trim()) payload.academicYear = explicitAy.trim();
    if (useExplicitExam && explicitExamId > 0) payload.examType = explicitExamId;
    return payload;
  }

  function runPreview() {
    const payload = getScopePayload();
    if (!payload) return;
    previewMutation.mutate(payload);
  }

  function runCompile() {
    const payload = getScopePayload();
    if (!payload) return;
    compileMutation.mutate(payload);
  }

  function runPublish() {
    const payload = getScopePayload();
    if (!payload) return;
    publishMutation.mutate(payload);
  }

  function runPublishPublic() {
    const payload = getScopePayload();
    if (!payload) return;
    publishPublicMutation.mutate(payload);
  }

  function selectTeacher(teacher: EmployeeListItem) {
    setSelectedTeacherId(teacher.EMP_ID);
    setClassForm({ ClassName: "", SectionName: "" });
    setSubjectForm({ ClassName: "", SectionName: "", SubjectName: "" });
  }

  function addTeacherClass() {
    if (!selectedTeacherId || !classForm.ClassName.trim() || !classForm.SectionName.trim()) return;
    addClassMutation.mutate({ empId: selectedTeacherId, payload: classForm });
  }

  function addTeacherSubject() {
    if (
      !selectedTeacherId ||
      !subjectForm.ClassName.trim() ||
      !subjectForm.SectionName.trim() ||
      !subjectForm.SubjectName.trim()
    ) {
      return;
    }
    addSubjectMutation.mutate({ empId: selectedTeacherId, payload: subjectForm });
  }

  return (
    <section className="grid">
      <PageHeader
        title="Academic Administration"
        description="Control the active academic session and exam, compile and publish results, monitor timetable status, and assign teachers."
      />

      <div className="grid grid-3">
        <div className="card">
          <h3>Current Academic Year</h3>
          <div className="stat">{activeAy}</div>
        </div>
        <div className="card">
          <h3>Current Active Exam</h3>
          <div className="stat">{activeExam}</div>
        </div>
        <div className="card">
          <h3>Teacher Profiles</h3>
          <div className="stat">{teacherCandidates.length}</div>
          <p className="help">Showing Teacher, Subject_Teacher, and Class_Teacher profiles.</p>
        </div>
      </div>

      <div className="grid grid-2">
        <div className="card">
          <h3>Academic Session</h3>
          <div className="grid" style={{ marginTop: 12 }}>
            <div>
              <label className="label">Add Academic Year</label>
              <input
                className="input"
                value={ayInput}
                onChange={(e) => setAyInput(e.target.value)}
                placeholder="YYYY"
                maxLength={4}
              />
              <p className="help">Use four digits like 2026 or 2027.</p>
            </div>
            <label className="chip" style={{ cursor: "pointer", width: "fit-content" }}>
              <input
                type="checkbox"
                checked={setActiveOnAdd}
                onChange={(e) => setSetActiveOnAdd(e.target.checked)}
                style={{ margin: 0 }}
              />
              Set active on add
            </label>
            <div>
              <button className="btn btn-primary" onClick={onAddYear} disabled={addYearMutation.isPending}>
                Add Year
              </button>
            </div>
            {ayValidationError ? <p className="error">{ayValidationError}</p> : null}
            {addYearMutation.isError ? <p className="error">Add failed: {getApiErrorMessage(addYearMutation.error)}</p> : null}
          </div>

          <div className="table-wrap" style={{ marginTop: 14 }}>
            <table>
              <thead>
                <tr>
                  <th>Academic Year</th>
                  <th style={{ width: 120 }}>Status</th>
                  <th style={{ width: 140, textAlign: "right" }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {yearsQuery.data?.map((year) => (
                  <tr key={year.ay}>
                    <td>{year.ay}</td>
                    <td>{year.active ? <span className="pill pill-ok">Active</span> : <span className="pill">Inactive</span>}</td>
                    <td style={{ textAlign: "right" }}>
                      <button
                        className="btn btn-sm"
                        disabled={year.active || activateYearMutation.isPending}
                        onClick={() => activateYearMutation.mutate(year.ay)}
                      >
                        Set Active
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card">
          <h3>Active Exam</h3>
          <p className="help" style={{ marginTop: 8 }}>
            Select one active exam type. The backend handles the active switch.
          </p>
          <div className="table-wrap" style={{ marginTop: 14 }}>
            <table>
              <thead>
                <tr>
                  <th>Exam</th>
                  <th style={{ width: 120 }}>Status</th>
                  <th style={{ width: 140, textAlign: "right" }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {examsQuery.data?.map((exam) => (
                  <tr key={exam.id}>
                    <td>{exam.exam}</td>
                    <td>{exam.active ? <span className="pill pill-ok">Active</span> : <span className="pill">Inactive</span>}</td>
                    <td style={{ textAlign: "right" }}>
                      <button
                        className="btn btn-sm"
                        disabled={exam.active || activateExamMutation.isPending}
                        onClick={() => activateExamMutation.mutate(exam.id)}
                      >
                        Set Active
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="card">
        <h3>Result Compile And Publish</h3>
        <div className="grid grid-3" style={{ marginTop: 12 }}>
          <div>
            <label className="label">Class</label>
            <select
              className="input"
              value={resultClass}
              onChange={(e) => {
                setResultClass(e.target.value);
                setResultSection("");
              }}
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
              value={resultSection}
              onChange={(e) => setResultSection(e.target.value)}
              disabled={!resultClass}
            >
              <option value="">Select section</option>
              {resultSectionsQuery.data?.map((x) => (
                <option key={x.value} value={x.value}>
                  {x.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Dry Run</label>
            <label className="chip" style={{ cursor: "pointer", width: "fit-content", marginTop: 2 }}>
              <input type="checkbox" checked={dryRun} onChange={(e) => setDryRun(e.target.checked)} style={{ margin: 0 }} />
              No DB write
            </label>
          </div>
        </div>

        <div className="grid grid-2" style={{ marginTop: 10 }}>
          <div>
            <label className="chip" style={{ cursor: "pointer", width: "fit-content", marginBottom: 8 }}>
              <input type="checkbox" checked={useExplicitAy} onChange={(e) => setUseExplicitAy(e.target.checked)} style={{ margin: 0 }} />
              Override academic year
            </label>
            <input
              className="input"
              value={explicitAy}
              onChange={(e) => setExplicitAy(e.target.value)}
              placeholder="YYYY"
              disabled={!useExplicitAy}
              maxLength={4}
            />
          </div>
          <div>
            <label className="chip" style={{ cursor: "pointer", width: "fit-content", marginBottom: 8 }}>
              <input type="checkbox" checked={useExplicitExam} onChange={(e) => setUseExplicitExam(e.target.checked)} style={{ margin: 0 }} />
              Override exam type
            </label>
            <select
              className="input"
              value={explicitExamId || ""}
              onChange={(e) => setExplicitExamId(Number(e.target.value || 0))}
              disabled={!useExplicitExam}
            >
              <option value="">Select exam</option>
              {examsQuery.data?.map((x) => (
                <option key={x.id} value={x.id}>
                  {x.exam}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="toolbar" style={{ marginTop: 12 }}>
          <div className="toolbar-left">
            <button className="btn btn-primary" onClick={runPreview} disabled={!resultClass || !resultSection || previewMutation.isPending}>
              Preview Compile
            </button>
            <button className="btn" onClick={runCompile} disabled={!resultClass || !resultSection || compileMutation.isPending}>
              Compile
            </button>
            <button className="btn" onClick={runPublish} disabled={!resultClass || !resultSection || publishMutation.isPending}>
              Publish
            </button>
            <button className="btn" onClick={runPublishPublic} disabled={!resultClass || !resultSection || publishPublicMutation.isPending}>
              Publish Public
            </button>
          </div>
          <div className="toolbar-right">
            <span className="chip">Last preview students: {preview?.studentCount ?? 0}</span>
          </div>
        </div>

        {previewMutation.isError ? <p className="error">Preview failed: {getApiErrorMessage(previewMutation.error)}</p> : null}
        {compileMutation.isError ? <p className="error">Compile failed: {getApiErrorMessage(compileMutation.error)}</p> : null}
        {publishMutation.isError ? <p className="error">Publish failed: {getApiErrorMessage(publishMutation.error)}</p> : null}
        {publishPublicMutation.isError ? <p className="error">Publish public failed: {getApiErrorMessage(publishPublicMutation.error)}</p> : null}

        {compileMutation.data ? <Alert tone="info" title="Compile Response">{compileMutation.data.message}</Alert> : null}
        {publishMutation.data ? <Alert tone="info" title="Publish Response">{publishMutation.data.message}</Alert> : null}
        {publishPublicMutation.data ? <Alert tone="info" title="Public Publish Response">{publishPublicMutation.data.message}</Alert> : null}

        {preview ? (
          <div className="grid" style={{ marginTop: 14 }}>
            <Alert tone="success" title="Compile Preview Ready">
              {preview.message} | Students: {preview.studentCount}
            </Alert>

            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th style={{ width: 80 }}>AdmNo</th>
                    <th>Name</th>
                    <th style={{ width: 130 }}>Marks</th>
                    <th style={{ width: 140 }}>Rank</th>
                    <th style={{ width: 120 }}>Eligible</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.students.map((student) => (
                    <tr key={student.admNo} onClick={() => setSelectedPreviewAdmNo(student.admNo)} style={{ cursor: "pointer" }}>
                      <td>{student.admNo}</td>
                      <td style={{ fontWeight: 700 }}>{student.studentName || "-"}</td>
                      <td>
                        {student.totalObtainedMarks}/{student.totalMaxMarks}
                      </td>
                      <td>{student.provisionalRank ?? "-"}</td>
                      <td>{student.eligibleForRank ? <span className="pill pill-ok">Yes</span> : <span className="pill">No</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {selectedStudent ? (
              <div className="grid grid-2">
                <div className="card">
                  <h3>Core Subjects: {selectedStudent.studentName || selectedStudent.admNo}</h3>
                  <div className="table-wrap" style={{ marginTop: 10 }}>
                    <table>
                      <thead>
                        <tr>
                          <th>Subject</th>
                          <th style={{ width: 70 }}>Ob</th>
                          <th style={{ width: 70 }}>NB</th>
                          <th style={{ width: 70 }}>SE</th>
                          <th style={{ width: 70 }}>Carry</th>
                          <th style={{ width: 70 }}>Total</th>
                          <th style={{ width: 70 }}>Grade</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedStudent.coreSubjects.map((subject) => (
                          <tr key={`${selectedStudent.admNo}-${subject.subjectId}`}>
                            <td>{subject.subjectName || subject.subjectId}</td>
                            <td>{subject.obtainedMarks}</td>
                            <td>{subject.notebookMarks}</td>
                            <td>{subject.seMarks}</td>
                            <td>{subject.carryMarks}</td>
                            <td>{subject.total}</td>
                            <td>{subject.grade}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="card">
                  <h3>NACA Subjects</h3>
                  <div className="table-wrap" style={{ marginTop: 10 }}>
                    <table>
                      <thead>
                        <tr>
                          <th>Subject</th>
                          <th style={{ width: 100 }}>Grade</th>
                          <th style={{ width: 100 }}>Present</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedStudent.nacaSubjects.map((subject) => (
                          <tr key={`${selectedStudent.admNo}-n-${subject.subjectId}`}>
                            <td>{subject.subjectName || subject.subjectId}</td>
                            <td>{subject.grade || "-"}</td>
                            <td>{subject.present ? <span className="pill pill-ok">Yes</span> : <span className="pill">No</span>}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="grid grid-2">
        <div className="card">
          <h3>Teacher Assignment Scope</h3>
          <p className="help" style={{ marginTop: 8 }}>
            This view shows Teacher, Subject_Teacher, and Class_Teacher users. Select both class and section to narrow the list.
          </p>
          <div className="grid grid-2" style={{ marginTop: 12 }}>
            <div>
              <label className="label">Filter by class</label>
              <select
                className="input"
                value={teacherFilterClass}
                onChange={(e) => {
                  setTeacherFilterClass(e.target.value);
                  setTeacherFilterSection("");
                }}
              >
                <option value="">All classes</option>
                {classesQuery.data?.map((x) => (
                  <option key={x.value} value={x.value}>
                    {x.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Filter by section</label>
              <select
                className="input"
                value={teacherFilterSection}
                onChange={(e) => setTeacherFilterSection(e.target.value)}
                disabled={!teacherFilterClass}
              >
                <option value="">All sections</option>
                {teacherFilterSectionsQuery.data?.map((x) => (
                  <option key={x.value} value={x.value}>
                    {x.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="table-wrap" style={{ marginTop: 14 }}>
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Name</th>
                  <th>Role</th>
                  <th style={{ width: 120 }}>Status</th>
                  <th style={{ width: 120, textAlign: "right" }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {teacherCandidates.map((teacher) => (
                  <tr key={teacher.EMP_ID}>
                    <td>{teacher.EMP_ID}</td>
                    <td style={{ fontWeight: 700 }}>{teacher.NAME}</td>
                    <td>{teacher.ROLE || "-"}</td>
                    <td>{teacher.ACTIVE ? <span className="pill pill-ok">Active</span> : <span className="pill pill-off">Inactive</span>}</td>
                    <td style={{ textAlign: "right" }}>
                      <button className="btn btn-sm" onClick={() => selectTeacher(teacher)}>
                        {selectedTeacherId === teacher.EMP_ID ? "Selected" : "Manage"}
                      </button>
                    </td>
                  </tr>
                ))}
                {!teachersQuery.isLoading && teacherCandidates.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ color: "var(--muted)" }}>
                      {teacherFilterClass && !teacherFilterSection
                        ? "Select a section to filter teachers for the chosen class."
                        : "No Teacher, Subject_Teacher, or Class_Teacher profiles found for the current filter."}
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card">
          <h3>Upload Latest Timetable XML</h3>
          <p className="help" style={{ marginTop: 8 }}>
            Choose the latest XML file here. The current backend only exposes a read endpoint, so the upload action will be enabled once the write API is available.
          </p>
          <div className="grid" style={{ marginTop: 12 }}>
            <div>
              <label className="label">Timetable XML File</label>
              <input
                className="input"
                type="file"
                accept=".xml,text/xml,application/xml"
                onChange={(e) => setTimetableFileName(e.target.files?.[0]?.name ?? "")}
              />
              <p className="help">{timetableFileName ? `Selected: ${timetableFileName}` : "No file selected yet."}</p>
            </div>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <button className="btn btn-primary" type="button" disabled>
                Upload XML
              </button>
              <span className="chip">Backend upload endpoint pending</span>
            </div>
          </div>
        </div>
      </div>

      {selectedTeacher ? (
        <div className="grid grid-2">
          <div className="card">
            <h3>Teacher Profile</h3>
            <div className="grid" style={{ marginTop: 12 }}>
              <div className="kv">
                <div className="kv-key">Employee</div>
                <div className="kv-val">
                  {selectedTeacher.NAME} (#{selectedTeacher.EMP_ID})
                </div>
              </div>
              <div className="kv">
                <div className="kv-key">Role</div>
                <div className="kv-val">{teacherRolesLabel}</div>
              </div>
              <div className="kv">
                <div className="kv-key">Designation</div>
                <div className="kv-val">{selectedTeacher.DISGNATION || "-"}</div>
              </div>
              <div className="kv">
                <div className="kv-key">Status</div>
                <div className="kv-val">{selectedTeacher.ACTIVE ? "Active" : "Inactive"}</div>
              </div>
            </div>

            {teacherOverviewQuery.isLoading ? <p className="help">Loading current teacher assignments...</p> : null}
            {teacherOverviewQuery.isError ? (
              <Alert tone="danger" title="Teacher Load Failed">
                {getApiErrorMessage(teacherOverviewQuery.error)}
              </Alert>
            ) : null}

            {!canManageClasses ? (
              <Alert tone="info" title="Class Assignment Locked">
                This profile is not a <b>Class_Teacher</b>, so class assignment is hidden.
              </Alert>
            ) : null}
            {!canManageSubjects ? (
              <Alert tone="info" title="Subject Assignment Locked">
                This profile is not a <b>Teacher</b>, <b>Subject_Teacher</b>, or <b>Class_Teacher</b>, so subject assignment is hidden.
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
                      {teacherOverviewQuery.data?.Classes?.map((assignedClass, index) => (
                        <tr key={`${assignedClass.ClassName}-${assignedClass.SectionName}-${index}`}>
                          <td>{assignedClass.ClassName}</td>
                          <td>{assignedClass.SectionName || "-"}</td>
                          <td style={{ textAlign: "right" }}>
                            <button
                              className="btn btn-sm btn-danger"
                              disabled={teacherBusy}
                              onClick={() =>
                                removeClassMutation.mutate({
                                  empId: selectedTeacherId,
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
                      {(teacherOverviewQuery.data?.Classes?.length ?? 0) === 0 ? (
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
                    <select
                      className="input"
                      value={classForm.ClassName}
                      onChange={(e) => setClassForm({ ClassName: e.target.value, SectionName: "" })}
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
                      {teacherOverviewQuery.data?.Subjects?.map((assignedSubject, index) => (
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
                                  empId: selectedTeacherId,
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
                      {(teacherOverviewQuery.data?.Subjects?.length ?? 0) === 0 ? (
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
                      onChange={(e) =>
                        setSubjectForm({
                          ClassName: e.target.value,
                          SectionName: "",
                          SubjectName: ""
                        })
                      }
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
      ) : null}

      {yearsQuery.isError ? <Alert tone="danger" title="Academic Year Load Failed">{getApiErrorMessage(yearsQuery.error)}</Alert> : null}
      {examsQuery.isError ? <Alert tone="danger" title="Exam Types Load Failed">{getApiErrorMessage(examsQuery.error)}</Alert> : null}
      {classesQuery.isError ? <Alert tone="danger" title="Classes Load Failed">{getApiErrorMessage(classesQuery.error)}</Alert> : null}
      {resultSectionsQuery.isError ? <Alert tone="danger" title="Result Sections Load Failed">{getApiErrorMessage(resultSectionsQuery.error)}</Alert> : null}
      {teachersQuery.isError ? <Alert tone="danger" title="Teacher Profiles Load Failed">{getApiErrorMessage(teachersQuery.error)}</Alert> : null}
    </section>
  );
}
