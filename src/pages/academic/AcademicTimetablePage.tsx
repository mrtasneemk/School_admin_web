import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import Alert from "../../components/ui/Alert";
import PageHeader from "../../components/ui/PageHeader";
import { getClasses, getSections } from "../../api/lookup";
import { getEmployees } from "../../api/employees";
import { getLatestTimetable, uploadLatestTimetable } from "../../api/timetable";
import { parseStudentTimetableXml, parseTeacherTimetableXml, type TimetableGrid } from "../../features/timetable/parseTimetableXml";
import { formatRoleListLabel } from "../../utils/roles";
import { getApiErrorMessage } from "./shared";

export default function AcademicTimetablePage() {
  const [timetableFile, setTimetableFile] = useState<File | null>(null);
  const [viewMode, setViewMode] = useState<"class" | "teacher">("class");
  const [selectedClass, setSelectedClass] = useState("");
  const [selectedSection, setSelectedSection] = useState("");
  const [teacherSearch, setTeacherSearch] = useState("");
  const [selectedTeacherId, setSelectedTeacherId] = useState<number>(0);
  const currentDayName = useMemo(() => {
    const mapping = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    return mapping[new Date().getDay()] ?? "";
  }, []);

  const classesQuery = useQuery({
    queryKey: ["lookup", "classes"],
    queryFn: () => getClasses()
  });
  const sectionsQuery = useQuery({
    queryKey: ["lookup", "sections", "timetable-view", selectedClass],
    queryFn: () => getSections(selectedClass),
    enabled: !!selectedClass
  });
  const xmlQuery = useQuery({
    queryKey: ["timetable", "latest"],
    queryFn: getLatestTimetable,
    retry: 0
  });
  const teacherSearchQuery = useQuery({
    queryKey: ["timetable", "teacher-search", teacherSearch],
    queryFn: () =>
      getEmployees({
        search: teacherSearch.trim(),
        active: true,
        page: 1,
        pageSize: 100
      }),
    enabled: teacherSearch.trim().length >= 2
  });
  const uploadMutation = useMutation({
    mutationFn: uploadLatestTimetable,
    onSuccess: () => {
      setTimetableFile(null);
      xmlQuery.refetch();
    }
  });

  const teacherCandidates = useMemo(() => teacherSearchQuery.data ?? [], [teacherSearchQuery.data]);
  const selectedTeacher = useMemo(
    () => teacherCandidates.find((teacher) => teacher.EMP_ID === selectedTeacherId) ?? null,
    [teacherCandidates, selectedTeacherId]
  );
  const renderedGrid = useMemo<TimetableGrid | null>(() => {
    if (!xmlQuery.data?.text) return null;
    try {
      if (viewMode === "class" && selectedClass && selectedSection) {
        return parseStudentTimetableXml(xmlQuery.data.text, selectedClass, selectedSection);
      }
      if (viewMode === "teacher" && selectedTeacher) {
        return parseTeacherTimetableXml(xmlQuery.data.text, {
          teacherName: selectedTeacher.NAME,
          teacherEmpId: selectedTeacher.EMP_ID
        });
      }
      return null;
    } catch {
      return null;
    }
  }, [xmlQuery.data?.text, viewMode, selectedClass, selectedSection, selectedTeacher]);

  return (
    <section className="grid">
      <PageHeader
        title="Timetable"
      />

      <div className="card">
        <h3>Upload Latest Timetable</h3>
        <div className="grid" style={{ marginTop: 12 }}>
          <div className="timetable-upload-row">
            <input
              className="input timetable-file-input"
              type="file"
              accept=".xml,text/xml,application/xml"
              onChange={(e) => setTimetableFile(e.target.files?.[0] ?? null)}
            />
            <button
              className="btn btn-primary timetable-upload-btn"
              type="button"
              disabled={!timetableFile || uploadMutation.isPending}
              onClick={() => timetableFile && uploadMutation.mutate(timetableFile)}
            >
              Upload XML
            </button>
            {uploadMutation.data ? <span className="chip">{uploadMutation.data.message || "Upload complete"}</span> : null}
          </div>
          <p className="help">{timetableFile ? `Selected: ${timetableFile.name}` : "No file selected yet."}</p>
          {uploadMutation.isError ? <p className="error">Upload failed: {getApiErrorMessage(uploadMutation.error)}</p> : null}
        </div>
      </div>

      <div className="card">
        <h3>Timetable View</h3>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 12 }}>
          <button className={`btn ${viewMode === "class" ? "btn-primary" : ""}`} onClick={() => setViewMode("class")}>
            Class Timetable
          </button>
          <button className={`btn ${viewMode === "teacher" ? "btn-primary" : ""}`} onClick={() => setViewMode("teacher")}>
            Teacher Timetable
          </button>
        </div>

        {viewMode === "class" ? (
          <div className="grid grid-2" style={{ marginTop: 14 }}>
            <div>
              <label className="label">Class</label>
              <select
                className="input"
                value={selectedClass}
                onChange={(e) => {
                  setSelectedClass(e.target.value);
                  setSelectedSection("");
                }}
              >
                <option value="">Select class</option>
                {classesQuery.data?.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Section</label>
              <select
                className="input"
                value={selectedSection}
                onChange={(e) => setSelectedSection(e.target.value)}
                disabled={!selectedClass}
              >
                <option value="">Select section</option>
                {sectionsQuery.data?.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        ) : null}

        {viewMode === "teacher" ? (
          <div className="grid" style={{ marginTop: 14 }}>
            <div>
              <label className="label">Search Teacher</label>
              <input
                className="input"
                value={teacherSearch}
                onChange={(e) => {
                  setTeacherSearch(e.target.value);
                  setSelectedTeacherId(0);
                }}
                placeholder="Type at least 2 characters"
              />
            </div>
            {teacherCandidates.length > 0 ? (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Name</th>
                      <th>Role</th>
                      <th style={{ width: 120, textAlign: "right" }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {teacherCandidates.map((teacher) => (
                      <tr key={teacher.EMP_ID}>
                        <td>{teacher.EMP_ID}</td>
                        <td>{teacher.NAME}</td>
                        <td>{formatRoleListLabel(teacher.ROLE) || "-"}</td>
                        <td style={{ textAlign: "right" }}>
                          <button className="btn btn-sm" onClick={() => setSelectedTeacherId(teacher.EMP_ID)}>
                            {selectedTeacherId === teacher.EMP_ID ? "Selected" : "Use"}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}
            {teacherSearch.trim().length >= 2 && !teacherSearchQuery.isLoading && teacherCandidates.length === 0 ? (
              <p className="help">No teacher matched the current search.</p>
            ) : null}
          </div>
        ) : null}

        {xmlQuery.isError ? (
          <Alert tone="danger" title="Timetable Load Failed">
            {getApiErrorMessage(xmlQuery.error)}
          </Alert>
        ) : null}

        {renderedGrid ? (
          <div className="grid" style={{ marginTop: 16 }}>
            {viewMode === "teacher" && renderedGrid.meta?.matchedTeacher === false ? (
              <Alert tone="info" title="Teacher Mapping Not Found">
                Teacher mapping not found in timetable XML.
              </Alert>
            ) : null}
            {viewMode === "teacher" && renderedGrid.meta?.matchedTeacher && renderedGrid.meta.lessonCount === 0 ? (
              <Alert tone="info" title="No Teacher Lessons">
                Subject teacher timetable not available.
              </Alert>
            ) : null}

            <div
              className="timetable-calendar"
              style={{ ["--tt-columns" as string]: String(renderedGrid.headers.length) }}
            >
              <div className="timetable-calendar-header">
                <div className="timetable-calendar-corner">Day</div>
                {renderedGrid.headers.map((header) => (
                  <div key={header.id} className={`timetable-period ${header.isBreak ? "break" : ""}`}>
                    <div className="timetable-period-label">{header.label}</div>
                    <div className="timetable-period-time">
                      {header.startTime} - {header.endTime}
                    </div>
                  </div>
                ))}
              </div>

              <div className="timetable-calendar-body">
                {renderedGrid.rows.map((row) => (
                  <div key={row.dayName} className={`timetable-row ${row.dayName === currentDayName ? "current" : ""}`}>
                    <div className={`timetable-day ${row.dayName === currentDayName ? "current" : ""}`}>{row.dayName}</div>
                    {row.cells.map((cell, index) => (
                      <div
                        key={`${row.dayName}-${index}`}
                        className={`timetable-slot ${cell.type === "lesson" ? "filled" : "empty"} ${row.dayName === currentDayName ? "current" : ""}`}
                      >
                        {cell.type === "lesson" ? (
                          <>
                            <div className="timetable-subject">{cell.subject}</div>
                            <div className="timetable-meta">{cell.teacher || "-"}</div>
                          </>
                        ) : (
                          <div className="timetable-empty">Free</div>
                        )}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : null}

        {!renderedGrid && !xmlQuery.isLoading ? (
          <Alert tone="info" title="Choose Timetable Scope">
            {viewMode === "class"
              ? "Select both class and section to render the class timetable."
              : "Search and select a teacher to render the teacher timetable."}
          </Alert>
        ) : null}
      </div>

      {classesQuery.isError ? <Alert tone="danger" title="Classes Load Failed">{getApiErrorMessage(classesQuery.error)}</Alert> : null}
      {sectionsQuery.isError ? <Alert tone="danger" title="Sections Load Failed">{getApiErrorMessage(sectionsQuery.error)}</Alert> : null}
      {teacherSearchQuery.isError ? <Alert tone="danger" title="Teacher Search Failed">{getApiErrorMessage(teacherSearchQuery.error)}</Alert> : null}
    </section>
  );
}
