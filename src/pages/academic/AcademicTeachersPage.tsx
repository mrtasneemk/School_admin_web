import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Alert from "../../components/ui/Alert";
import PageHeader from "../../components/ui/PageHeader";
import { getClasses, getSections } from "../../api/lookup";
import { getTeachers } from "../../api/employees";
import { resolveAppPath } from "../../utils/navigation";
import { formatRoleListLabel } from "../../utils/roles";
import { getApiErrorMessage, hasAnyRole, MANAGEABLE_TEACHER_ROLES } from "./shared";

const PAGE_SIZE = 10;

export default function AcademicTeachersPage() {
  const [teacherFilterClass, setTeacherFilterClass] = useState("");
  const [teacherFilterSection, setTeacherFilterSection] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const classesQuery = useQuery({
    queryKey: ["lookup", "classes"],
    queryFn: () => getClasses()
  });
  const teacherFilterSectionsQuery = useQuery({
    queryKey: ["lookup", "sections", "teacher-filter", teacherFilterClass],
    queryFn: () => getSections(teacherFilterClass),
    enabled: !!teacherFilterClass
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

  const teacherCandidates = useMemo(
    () => (teachersQuery.data ?? []).filter((teacher) => hasAnyRole(teacher.ROLE, [...MANAGEABLE_TEACHER_ROLES])),
    [teachersQuery.data]
  );
  const filteredTeachers = useMemo(() => {
    const query = search.trim().toLowerCase();
    return teacherCandidates.filter((teacher) => {
      if (!query) return true;
      return (
        teacher.NAME.toLowerCase().includes(query) ||
        teacher.ROLE.toLowerCase().includes(query) ||
        String(teacher.EMP_ID).includes(query)
      );
    });
  }, [teacherCandidates, search]);
  const totalPages = Math.max(1, Math.ceil(filteredTeachers.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pagedTeachers = filteredTeachers.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  return (
    <section className="grid">
      <PageHeader
        title="Teachers Management"
        description="Search, filter, and paginate teaching staff before opening a dedicated teacher management screen."
      />

      <div className="card">
        <h3>Teachers Directory</h3>
        <p className="help" style={{ marginTop: 8 }}>
          Filter by class and section when needed, or search directly by teacher name, id, or role.
        </p>

        <div className="grid grid-3" style={{ marginTop: 12 }}>
          <div>
            <label className="label">Search teachers</label>
            <input
              className="input"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Teacher name, id, or role"
            />
          </div>
          <div>
            <label className="label">Filter by class</label>
            <select
              className="input"
              value={teacherFilterClass}
              onChange={(e) => {
                setTeacherFilterClass(e.target.value);
                setTeacherFilterSection("");
                setPage(1);
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
              onChange={(e) => {
                setTeacherFilterSection(e.target.value);
                setPage(1);
              }}
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

        <div className="toolbar" style={{ marginTop: 14 }}>
          <div className="toolbar-left">
            <span className="chip">Teachers: {filteredTeachers.length}</span>
            <span className="chip">Page {currentPage} / {totalPages}</span>
          </div>
          <div className="toolbar-right">
            <button className="btn btn-sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={currentPage <= 1}>
              Prev
            </button>
            <button className="btn btn-sm" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={currentPage >= totalPages}>
              Next
            </button>
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
              {pagedTeachers.map((teacher) => (
                <tr key={teacher.EMP_ID}>
                  <td>{teacher.EMP_ID}</td>
                  <td style={{ fontWeight: 700 }}>{teacher.NAME}</td>
                  <td>{formatRoleListLabel(teacher.ROLE) || "-"}</td>
                  <td>{teacher.ACTIVE ? <span className="pill pill-ok">Active</span> : <span className="pill pill-off">Inactive</span>}</td>
                  <td style={{ textAlign: "right" }}>
                    <a className="btn btn-sm" href={resolveAppPath(`/academic/teachers/${teacher.EMP_ID}`)} style={{ textDecoration: "none" }}>
                      Manage
                    </a>
                  </td>
                </tr>
              ))}
              {!teachersQuery.isLoading && pagedTeachers.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ color: "var(--muted)" }}>
                    No teacher profiles match the current search and filter.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>

      {classesQuery.isError ? <Alert tone="danger" title="Classes Load Failed">{getApiErrorMessage(classesQuery.error)}</Alert> : null}
      {teachersQuery.isError ? <Alert tone="danger" title="Teacher Profiles Load Failed">{getApiErrorMessage(teachersQuery.error)}</Alert> : null}
    </section>
  );
}
