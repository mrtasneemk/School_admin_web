import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AxiosError } from "axios";
import { useEffect, useMemo, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { resetEmployeePassword } from "../../api/auth";
import { assignEmployeeRole, getEmployees, softDeleteEmployee } from "../../api/employees";
import { getRoles } from "../../api/lookup";
import type { EmployeeListItem } from "../../types/employee";
import Alert from "../../components/ui/Alert";
import PageHeader from "../../components/ui/PageHeader";
import { formatRoleLabel, formatRoleListLabel } from "../../utils/roles";

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

export default function EmployeesListPage() {
  const PAGE_SIZE_OPTIONS = [20, 50, 100] as const;
  const qc = useQueryClient();
  const navigate = useNavigate();

  const [search, setSearch] = useState("");
  const [activeOnly, setActiveOnly] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<(typeof PAGE_SIZE_OPTIONS)[number]>(50);
  const [sortBy, setSortBy] = useState<"name" | "designation" | "role">("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [resetResult, setResetResult] = useState<{
    empId: number;
    password: string;
    updatedUsers: number;
  } | null>(null);
  const [roleResult, setRoleResult] = useState<{
    empId: number;
    roleName: string;
    createdUser: boolean;
  } | null>(null);
  const [roleTarget, setRoleTarget] = useState<EmployeeListItem | null>(null);
  const [selectedRoleId, setSelectedRoleId] = useState<number>(0);

  const employeesQuery = useQuery({
    queryKey: ["employees", search, activeOnly, page, pageSize],
    queryFn: () => getEmployees({ search, active: activeOnly, page, pageSize })
  });
  const rolesQuery = useQuery({
    queryKey: ["lookup", "roles"],
    queryFn: getRoles
  });

  const deleteMutation = useMutation({
    mutationFn: softDeleteEmployee,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["employees"] })
  });

  const resetPasswordMutation = useMutation({
    mutationFn: resetEmployeePassword,
    onSuccess: (result, empId) => {
      setResetResult({
        empId,
        password: result.password,
        updatedUsers: result.updatedUsers
      });
    }
  });
  const assignRoleMutation = useMutation({
    mutationFn: ({ empId, roleId }: { empId: number; roleId: number }) => assignEmployeeRole(empId, roleId),
    onSuccess: (result) => {
      setRoleResult({
        empId: result.empId,
        roleName: result.roleName,
        createdUser: result.createdUser
      });
      setRoleTarget(null);
      setSelectedRoleId(0);
      qc.invalidateQueries({ queryKey: ["employees"] });
    }
  });

  const countText = useMemo(() => {
    if (employeesQuery.isLoading) return "Loading...";
    if (employeesQuery.isError) return "Error";
    return `Page ${page} • ${employeesQuery.data?.length ?? 0} results`;
  }, [employeesQuery.data?.length, employeesQuery.isError, employeesQuery.isLoading, page]);

  useEffect(() => {
    setPage(1);
  }, [search, activeOnly, pageSize]);

  const canGoPrev = page > 1 && !employeesQuery.isLoading;
  const canGoNext = (employeesQuery.data?.length ?? 0) === pageSize && !employeesQuery.isLoading;

  const sortedEmployees = useMemo(() => {
    const rows = [...(employeesQuery.data ?? [])];
    const getValue = (row: EmployeeListItem) => {
      if (sortBy === "designation") return (row.DISGNATION ?? "").toLowerCase();
      if (sortBy === "role") return (row.ROLE ?? "").toLowerCase();
      return (row.NAME ?? "").toLowerCase();
    };
    rows.sort((a, b) => {
      const av = getValue(a);
      const bv = getValue(b);
      if (av < bv) return sortDir === "asc" ? -1 : 1;
      if (av > bv) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
    return rows;
  }, [employeesQuery.data, sortBy, sortDir]);

  function setSort(field: "name" | "designation" | "role") {
    if (sortBy === field) {
      setSortDir((p) => (p === "asc" ? "desc" : "asc"));
      return;
    }
    setSortBy(field);
    setSortDir("asc");
  }

  function onDelete(row: EmployeeListItem) {
    const ok = window.confirm(`Soft delete employee #${row.EMP_ID} (${row.NAME})?`);
    if (!ok) return;
    deleteMutation.mutate(row.EMP_ID);
  }

  function onResetPassword(row: EmployeeListItem) {
    if (!row.ROLE?.trim()) return;
    const ok = window.confirm(
      `Reset password for employee #${row.EMP_ID} (${row.NAME})?\n` +
        "A new temporary password will be generated and shown once."
    );
    if (!ok) return;
    setResetResult(null);
    resetPasswordMutation.mutate(row.EMP_ID);
  }

  function onOpenRoleDialog(row: EmployeeListItem) {
    setRoleResult(null);
    setRoleTarget(row);
    const currentRoleName = (row.ROLE || "").split(",").map((x) => x.trim()).find((x) => x.length > 0) || "";
    const current = (rolesQuery.data ?? []).find((r) => r.roleName === currentRoleName);
    setSelectedRoleId(current?.roleId ?? 0);
  }

  function onAssignRole() {
    if (!roleTarget || selectedRoleId <= 0) return;
    assignRoleMutation.mutate({ empId: roleTarget.EMP_ID, roleId: selectedRoleId });
  }

  return (
    <section className="grid">
      <PageHeader
        title="Employees"
        description="Employee master list. Create, update, assign classes/subjects, and soft delete."
        actions={
          <button className="btn btn-primary" onClick={() => navigate("/employees/new")}>
            Add Employee
          </button>
        }
      />

      <div className="card">
        <div className="toolbar">
          <div className="toolbar-left">
            <div style={{ minWidth: 280 }}>
              <label className="label">Search</label>
              <input
                className="input"
                placeholder="Name, mobile, email, designation"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <label className="chip" style={{ marginTop: 18, cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={activeOnly}
                onChange={(e) => setActiveOnly(e.target.checked)}
                style={{ margin: 0 }}
              />
              Active only
            </label>
          </div>

          <div className="toolbar-right">
            <span className="chip">{countText}</span>
            <label className="label" style={{ margin: 0 }}>
              Per page
            </label>
            <select
              className="input"
              style={{ width: 90 }}
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value) as (typeof PAGE_SIZE_OPTIONS)[number])}
            >
              {PAGE_SIZE_OPTIONS.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
            <button className="btn btn-sm" disabled={!canGoPrev} onClick={() => setPage((p) => Math.max(1, p - 1))}>
              Prev
            </button>
            <button className="btn btn-sm" disabled={!canGoNext} onClick={() => setPage((p) => p + 1)}>
              Next
            </button>
          </div>
        </div>

        {employeesQuery.isLoading && <p className="help">Loading employees...</p>}
        {employeesQuery.isError && (
          <p className="error">Failed to load employees: {getApiErrorMessage(employeesQuery.error)}</p>
        )}
        {rolesQuery.isError && <p className="error">Failed to load roles: {getApiErrorMessage(rolesQuery.error)}</p>}
        {resetResult && (
          <Alert tone="success" title="Password Reset Successful">
            Employee #{resetResult.empId} temporary password: <code>{resetResult.password}</code> (updated users:{" "}
            {resetResult.updatedUsers})
          </Alert>
        )}
        {resetPasswordMutation.isError && (
          <p className="error">Reset failed: {getApiErrorMessage(resetPasswordMutation.error)}</p>
        )}
        {roleResult && (
          <Alert tone="success" title="Role Updated">
            Employee #{roleResult.empId} assigned role <b>{formatRoleLabel(roleResult.roleName)}</b>
            {roleResult.createdUser ? " (new login user created)." : "."}
          </Alert>
        )}
        {assignRoleMutation.isError && (
          <p className="error">Role update failed: {getApiErrorMessage(assignRoleMutation.error)}</p>
        )}

        {roleTarget && (
          <div className="card" style={{ marginTop: 12 }}>
            <h3>Assign Role: {roleTarget.NAME} (#{roleTarget.EMP_ID})</h3>
            <div className="toolbar" style={{ marginTop: 10 }}>
              <div className="toolbar-left">
                <div style={{ minWidth: 280 }}>
                  <label className="label">Role</label>
                  <select className="input" value={selectedRoleId || ""} onChange={(e) => setSelectedRoleId(Number(e.target.value || 0))}>
                    <option value="">Select role</option>
                    {rolesQuery.data?.map((r) => (
                      <option key={r.roleId} value={r.roleId}>
                        {formatRoleLabel(r.roleName)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="toolbar-right">
                <button className="btn" onClick={() => setRoleTarget(null)} disabled={assignRoleMutation.isPending}>
                  Cancel
                </button>
                <button className="btn btn-primary" onClick={onAssignRole} disabled={assignRoleMutation.isPending || selectedRoleId <= 0}>
                  Save Role
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="table-wrap" style={{ marginTop: 12 }}>
          <table>
            <thead>
              <tr>
                <th style={{ width: 70 }}>ID</th>
                <th>
                  <button className="btn btn-sm" onClick={() => setSort("name")}>
                    Name {sortBy === "name" ? (sortDir === "asc" ? "↑" : "↓") : ""}
                  </button>
                </th>
                <th>
                  <button className="btn btn-sm" onClick={() => setSort("designation")}>
                    Designation {sortBy === "designation" ? (sortDir === "asc" ? "↑" : "↓") : ""}
                  </button>
                </th>
                <th style={{ width: 180 }}>
                  <button className="btn btn-sm" onClick={() => setSort("role")}>
                    Role {sortBy === "role" ? (sortDir === "asc" ? "↑" : "↓") : ""}
                  </button>
                </th>
                <th style={{ width: 120 }}>Status</th>
                <th style={{ width: 260, textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {sortedEmployees.map((e) => (
                <tr key={e.EMP_ID}>
                  <td>{e.EMP_ID}</td>
                  <td style={{ fontWeight: 700 }}>{e.NAME}</td>
                  <td>{e.DISGNATION}</td>
                  <td>{formatRoleListLabel(e.ROLE) || "-"}</td>
                  <td>
                    {e.ACTIVE ? (
                      <span className="pill pill-ok">Active</span>
                    ) : (
                      <span className="pill pill-off">Inactive</span>
                    )}
                  </td>
                  <td style={{ textAlign: "right" }}>
                    <div className="row-actions">
                      <NavLink className="btn btn-sm" to={`/employees/${e.EMP_ID}/edit`} style={{ textDecoration: "none" }}>
                        Edit
                      </NavLink>
                      <button className="btn btn-sm" onClick={() => onOpenRoleDialog(e)} disabled={rolesQuery.isLoading}>
                        Set Role
                      </button>
                      {(hasRole(e.ROLE, "Class_Teacher") ||
                        hasRole(e.ROLE, "Subject_Teacher") ||
                        hasRole(e.ROLE, "Academic_Admin")) && (
                        <NavLink className="btn btn-sm" to={`/employees/${e.EMP_ID}/assign`} style={{ textDecoration: "none" }}>
                          Assign
                        </NavLink>
                      )}
                      {!!e.ROLE?.trim() && (
                        <button className="btn btn-sm" onClick={() => onResetPassword(e)} disabled={resetPasswordMutation.isPending}>
                          Reset Password
                        </button>
                      )}
                      <button className="btn btn-sm btn-danger" onClick={() => onDelete(e)}>
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {employeesQuery.data && employeesQuery.data.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ color: "var(--muted)" }}>
                    No employees found for current filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {deleteMutation.isError && (
          <p className="error" style={{ marginTop: 10 }}>
            Delete failed: {getApiErrorMessage(deleteMutation.error)}
          </p>
        )}
      </div>
    </section>
  );
}
