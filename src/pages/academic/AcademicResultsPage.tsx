import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import Alert from "../../components/ui/Alert";
import PageHeader from "../../components/ui/PageHeader";
import { getClasses, getExamTypes, getSections } from "../../api/lookup";
import { compileResults, getCompilePreview, publishResults, publishResultsPublic } from "../../api/results";
import type { ResultActionRequest, ResultCompilePreviewResponse } from "../../types/result";
import { getApiErrorMessage } from "./shared";

export default function AcademicResultsPage() {
  const [resultClass, setResultClass] = useState("");
  const [resultSection, setResultSection] = useState("");
  const [useExplicitAy, setUseExplicitAy] = useState(false);
  const [explicitAy, setExplicitAy] = useState("");
  const [useExplicitExam, setUseExplicitExam] = useState(false);
  const [explicitExamId, setExplicitExamId] = useState<number>(0);
  const [dryRun, setDryRun] = useState(true);
  const [preview, setPreview] = useState<ResultCompilePreviewResponse | null>(null);
  const [selectedPreviewAdmNo, setSelectedPreviewAdmNo] = useState<number | null>(null);

  const classesQuery = useQuery({
    queryKey: ["lookup", "classes"],
    queryFn: () => getClasses()
  });
  const examsQuery = useQuery({
    queryKey: ["lookup", "exam-types"],
    queryFn: () => getExamTypes()
  });
  const resultSectionsQuery = useQuery({
    queryKey: ["lookup", "sections", "result", resultClass],
    queryFn: () => getSections(resultClass),
    enabled: !!resultClass
  });

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

  const selectedStudent = useMemo(
    () => preview?.students.find((x) => x.admNo === selectedPreviewAdmNo) ?? null,
    [preview, selectedPreviewAdmNo]
  );

  useEffect(() => {
    setPreview(null);
    setSelectedPreviewAdmNo(null);
  }, [resultClass, resultSection, explicitAy, explicitExamId, dryRun, useExplicitAy, useExplicitExam]);

  function getScopePayload(includeDryRun = true): ResultActionRequest | null {
    if (!resultClass || !resultSection) return null;
    const payload: ResultActionRequest = {
      className: resultClass,
      sectionName: resultSection
    };
    if (includeDryRun) payload.dryRun = dryRun;
    if (useExplicitAy && explicitAy.trim()) payload.academicYear = explicitAy.trim();
    if (useExplicitExam && explicitExamId > 0) payload.examType = explicitExamId;
    return payload;
  }

  function runPreview() {
    const payload = getScopePayload(true);
    if (!payload) return;
    previewMutation.mutate(payload);
  }

  function runCompile() {
    const payload = getScopePayload(true);
    if (!payload) return;
    compileMutation.mutate(payload);
  }

  function runPublish() {
    const payload = getScopePayload(false);
    if (!payload) return;
    publishMutation.mutate(payload);
  }

  function runPublishPublic() {
    const payload = getScopePayload(false);
    if (!payload) return;
    publishPublicMutation.mutate(payload);
  }

  return (
    <section className="grid">
      <PageHeader
        title="Result Operations"
        description="Scope one class and section at a time, preview the compile, then run compile or publish from a dedicated result workflow."
      />

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

      {classesQuery.isError ? <Alert tone="danger" title="Classes Load Failed">{getApiErrorMessage(classesQuery.error)}</Alert> : null}
      {examsQuery.isError ? <Alert tone="danger" title="Exam Types Load Failed">{getApiErrorMessage(examsQuery.error)}</Alert> : null}
      {resultSectionsQuery.isError ? <Alert tone="danger" title="Result Sections Load Failed">{getApiErrorMessage(resultSectionsQuery.error)}</Alert> : null}
    </section>
  );
}
