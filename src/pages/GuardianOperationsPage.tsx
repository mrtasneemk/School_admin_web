import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { AxiosError } from "axios";
import Alert from "../components/ui/Alert";
import PageHeader from "../components/ui/PageHeader";
import {
  getGuardianDetail,
  mapWardToGuardian,
  resetGuardianPassword,
  searchGuardians,
  upsertGuardianByStudent
} from "../api/guardians";
import type {
  GuardianAdminOperationResult,
  GuardianAdmissionOperationRequest,
  GuardianPasswordResetResult
} from "../types/guardian";

function getApiErrorMessage(error: unknown): string {
  const axiosErr = error as AxiosError<{
    message?: string;
    Message?: string;
    title?: string;
    Title?: string;
  }>;
  const status = axiosErr.response?.status;
  const bodyMessage =
    axiosErr.response?.data?.message ??
    axiosErr.response?.data?.Message ??
    axiosErr.response?.data?.title ??
    axiosErr.response?.data?.Title;
  if (bodyMessage) return status ? `(${status}) ${bodyMessage}` : bodyMessage;
  if (axiosErr.message) return status ? `(${status}) ${axiosErr.message}` : axiosErr.message;
  return "Unknown API error.";
}

const DEFAULT_RELATIONSHIP = "Guardian";

export default function GuardianOperationsPage() {
  const qc = useQueryClient();

  const [searchText, setSearchText] = useState("");
  const [searchMobile, setSearchMobile] = useState("");
  const [searchSubmitted, setSearchSubmitted] = useState(false);
  const [selectedGuardianId, setSelectedGuardianId] = useState<number>(0);

  const [upsertForm, setUpsertForm] = useState<GuardianAdmissionOperationRequest>({
    admNo: 0,
    relationship: DEFAULT_RELATIONSHIP,
    setAsPrimary: true
  });
  const [mapForm, setMapForm] = useState<GuardianAdmissionOperationRequest>({
    admNo: 0,
    relationship: DEFAULT_RELATIONSHIP,
    setAsPrimary: false
  });

  const [operationResult, setOperationResult] = useState<GuardianAdminOperationResult | null>(null);
  const [resetResult, setResetResult] = useState<GuardianPasswordResetResult | null>(null);

  const searchQuery = useQuery({
    queryKey: ["guardians", "search", searchText, searchMobile, searchSubmitted],
    queryFn: () => searchGuardians({ q: searchText.trim(), mobile: searchMobile.trim() }),
    enabled: searchSubmitted
  });

  const guardianDetailQuery = useQuery({
    queryKey: ["guardian", selectedGuardianId],
    queryFn: () => getGuardianDetail(selectedGuardianId),
    enabled: selectedGuardianId > 0
  });

  const upsertMutation = useMutation({
    mutationFn: upsertGuardianByStudent,
    onSuccess: (result) => {
      setOperationResult(result);
      setResetResult(null);
      if (result.guardianId > 0) {
        setSelectedGuardianId(result.guardianId);
        setSearchSubmitted(true);
        qc.invalidateQueries({ queryKey: ["guardian", result.guardianId] });
        qc.invalidateQueries({ queryKey: ["guardians", "search"] });
      }
    }
  });

  const mapMutation = useMutation({
    mutationFn: ({ guardianId, payload }: { guardianId: number; payload: GuardianAdmissionOperationRequest }) =>
      mapWardToGuardian(guardianId, payload),
    onSuccess: (result) => {
      setOperationResult(result);
      setResetResult(null);
      qc.invalidateQueries({ queryKey: ["guardian", result.guardianId] });
      qc.invalidateQueries({ queryKey: ["guardians", "search"] });
    }
  });

  const resetMutation = useMutation({
    mutationFn: resetGuardianPassword,
    onSuccess: (result) => {
      setResetResult(result);
      setOperationResult(null);
      if (result.guardianId > 0) {
        qc.invalidateQueries({ queryKey: ["guardian", result.guardianId] });
      }
    }
  });

  const selectedGuardian = guardianDetailQuery.data;
  const canSearch = searchText.trim().length > 0 || searchMobile.trim().length > 0;
  const canUpsert = upsertForm.admNo > 0 && upsertForm.relationship.trim().length > 0;
  const canMap = selectedGuardianId > 0 && mapForm.admNo > 0 && mapForm.relationship.trim().length > 0;
  const searchCount = searchQuery.data?.length ?? 0;

  const currentCredentialAlert = useMemo(() => {
    if (resetResult?.temporaryPassword) {
      return {
        title: "Guardian Password Reset",
        username: resetResult.username,
        temporaryPassword: resetResult.temporaryPassword,
        message: resetResult.message
      };
    }

    if (operationResult?.temporaryPassword) {
      return {
        title: operationResult.createdAccount ? "Guardian Account Created" : "Guardian Credentials",
        username: operationResult.username,
        temporaryPassword: operationResult.temporaryPassword,
        message: operationResult.message
      };
    }

    return null;
  }, [operationResult, resetResult]);

  function runSearch() {
    if (!canSearch) return;
    setOperationResult(null);
    setResetResult(null);
    if (searchSubmitted) {
      searchQuery.refetch();
      return;
    }
    setSearchSubmitted(true);
  }

  function clearSearch() {
    setSearchText("");
    setSearchMobile("");
    setSearchSubmitted(false);
    setSelectedGuardianId(0);
    setOperationResult(null);
    setResetResult(null);
  }

  function setPrimaryWard(admNo: number) {
    if (!selectedGuardianId || admNo <= 0) return;
    mapMutation.mutate({
      guardianId: selectedGuardianId,
      payload: {
        admNo,
        relationship: "",
        setAsPrimary: true
      }
    });
  }

  return (
    <section className="grid">
      <PageHeader
        title="Guardian Operations"
        description="Search guardians, verify family details, create or link admission records, map siblings, and reset guardian credentials."
      />

      {currentCredentialAlert ? (
        <Alert tone="success" title={currentCredentialAlert.title}>
          {currentCredentialAlert.message}
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 10 }}>
            <span className="chip">Username: {currentCredentialAlert.username || "-"}</span>
            <span className="chip">Temporary Password: {currentCredentialAlert.temporaryPassword}</span>
          </div>
        </Alert>
      ) : null}

      {operationResult && !operationResult.temporaryPassword ? (
        <Alert tone="success" title="Guardian Mapping Saved">
          {operationResult.message}
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 10 }}>
            <span className="chip">Guardian: {operationResult.guardianName || operationResult.guardianCode}</span>
            <span className="chip">Wards: {operationResult.wardCount}</span>
            <span className="chip">{operationResult.createdAccount ? "New account" : "Existing account"}</span>
          </div>
        </Alert>
      ) : null}

      <div className="grid grid-2">
        <div className="card">
          <h3>Search Existing Guardian</h3>
          <div className="grid" style={{ marginTop: 12 }}>
            <div>
              <label className="label">Name / username / guardian code / parent name</label>
              <input
                className="input"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                placeholder="Parent name, guardian code, username..."
              />
            </div>
            <div>
              <label className="label">Mobile</label>
              <input
                className="input"
                value={searchMobile}
                onChange={(e) => setSearchMobile(e.target.value)}
                placeholder="9661815786"
              />
            </div>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <button className="btn btn-primary" onClick={runSearch} disabled={!canSearch || searchQuery.isFetching}>
                Search Existing Guardian
              </button>
              <button className="btn" onClick={clearSearch} disabled={searchQuery.isFetching}>
                Clear
              </button>
              <span className="chip">Results: {searchCount}</span>
            </div>
          </div>

          {searchQuery.isError ? <p className="error">Search failed: {getApiErrorMessage(searchQuery.error)}</p> : null}

          <div className="table-wrap" style={{ marginTop: 14 }}>
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Guardian</th>
                  <th>Mobile</th>
                  <th style={{ width: 90 }}>Wards</th>
                  <th style={{ width: 120 }}>Status</th>
                  <th style={{ width: 120, textAlign: "right" }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {searchQuery.data?.map((guardian) => (
                  <tr key={guardian.guardianId}>
                    <td>{guardian.guardianCode || guardian.guardianId}</td>
                    <td style={{ fontWeight: 700 }}>
                      {guardian.guardianName}
                      <div className="help" style={{ marginTop: 4 }}>
                        {guardian.username || "-"}
                      </div>
                    </td>
                    <td>{guardian.mobile || "-"}</td>
                    <td>{guardian.wardCount}</td>
                    <td>{guardian.isActive ? <span className="pill pill-ok">Active</span> : <span className="pill pill-off">Inactive</span>}</td>
                    <td style={{ textAlign: "right" }}>
                      <button className="btn btn-sm" onClick={() => setSelectedGuardianId(guardian.guardianId)}>
                        {guardian.guardianId === selectedGuardianId ? "Selected" : "View"}
                      </button>
                    </td>
                  </tr>
                ))}
                {searchSubmitted && !searchQuery.isFetching && (searchQuery.data?.length ?? 0) === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ color: "var(--muted)" }}>
                      No matching guardian found. Use the create-or-link flow if this is a new family.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card">
          <h3>Create Or Link From Student Admission</h3>
          <p className="help" style={{ marginTop: 8 }}>
            Use this fast path when admission is completed and the student admission number is available. The backend will create a new guardian account or attach the student to an existing family automatically.
          </p>
          <div className="grid grid-2" style={{ marginTop: 12 }}>
            <div>
              <label className="label">Admission Number</label>
              <input
                className="input"
                type="number"
                min={1}
                value={upsertForm.admNo || ""}
                onChange={(e) => setUpsertForm((prev) => ({ ...prev, admNo: Number(e.target.value || 0) }))}
                placeholder="12345"
              />
            </div>
            <div>
              <label className="label">Relationship</label>
              <input
                className="input"
                value={upsertForm.relationship}
                onChange={(e) => setUpsertForm((prev) => ({ ...prev, relationship: e.target.value }))}
              />
            </div>
          </div>
          <label className="chip" style={{ cursor: "pointer", marginTop: 12, width: "fit-content" }}>
            <input
              type="checkbox"
              checked={upsertForm.setAsPrimary}
              onChange={(e) => setUpsertForm((prev) => ({ ...prev, setAsPrimary: e.target.checked }))}
              style={{ margin: 0 }}
            />
            Set as primary ward
          </label>
          <div style={{ marginTop: 14 }}>
            <button className="btn btn-primary" onClick={() => upsertMutation.mutate(upsertForm)} disabled={!canUpsert || upsertMutation.isPending}>
              Create Or Link Guardian From Student
            </button>
          </div>
          {upsertMutation.isError ? <p className="error">Create/link failed: {getApiErrorMessage(upsertMutation.error)}</p> : null}
        </div>
      </div>

      <div className="grid grid-2">
        <div className="card">
          <h3>Selected Guardian Detail</h3>
          {!selectedGuardianId ? <p className="help" style={{ marginTop: 10 }}>Select a guardian from search results to verify the family and manage wards.</p> : null}
          {guardianDetailQuery.isLoading ? <p className="help" style={{ marginTop: 10 }}>Loading guardian detail...</p> : null}
          {guardianDetailQuery.isError ? <p className="error">Detail load failed: {getApiErrorMessage(guardianDetailQuery.error)}</p> : null}

          {selectedGuardian ? (
            <div className="grid" style={{ marginTop: 12 }}>
              <div className="kv">
                <div className="kv-key">Guardian</div>
                <div className="kv-val">{selectedGuardian.guardianName || "-"}</div>
              </div>
              <div className="kv">
                <div className="kv-key">Guardian Code</div>
                <div className="kv-val">{selectedGuardian.guardianCode || "-"}</div>
              </div>
              <div className="kv">
                <div className="kv-key">Username</div>
                <div className="kv-val">{selectedGuardian.username || "-"}</div>
              </div>
              <div className="kv">
                <div className="kv-key">Mobile</div>
                <div className="kv-val">{selectedGuardian.mobile || "-"}</div>
              </div>
              <div className="kv">
                <div className="kv-key">Father Name</div>
                <div className="kv-val">{selectedGuardian.fatherName || "-"}</div>
              </div>
              <div className="kv">
                <div className="kv-key">Mother Name</div>
                <div className="kv-val">{selectedGuardian.motherName || "-"}</div>
              </div>
              <div className="kv">
                <div className="kv-key">Status</div>
                <div className="kv-val">{selectedGuardian.isActive ? "Active" : "Inactive"}</div>
              </div>

              <div className="table-wrap" style={{ marginTop: 12 }}>
                <table>
                  <thead>
                    <tr>
                      <th>AdmNo</th>
                      <th>Student</th>
                      <th>Class</th>
                      <th style={{ width: 100 }}>Primary</th>
                      <th style={{ width: 120, textAlign: "right" }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedGuardian.wards.map((ward) => (
                      <tr key={`${selectedGuardian.guardianId}-${ward.admNo}`}>
                        <td>{ward.admNo}</td>
                        <td style={{ fontWeight: 700 }}>
                          {ward.studentName}
                          <div className="help" style={{ marginTop: 4 }}>
                            {ward.fatherName || ward.motherName || ward.mobile || "-"}
                          </div>
                        </td>
                        <td>
                          {ward.className || "-"} {ward.sectionName ? `(${ward.sectionName})` : ""}
                        </td>
                        <td>{ward.isPrimary ? <span className="pill pill-ok">Primary</span> : <span className="pill">No</span>}</td>
                        <td style={{ textAlign: "right" }}>
                          {ward.isPrimary ? null : (
                            <button
                              className="btn btn-sm"
                              onClick={() => setPrimaryWard(ward.admNo)}
                              disabled={mapMutation.isPending}
                            >
                              Set Primary
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                    {selectedGuardian.wards.length === 0 ? (
                      <tr>
                        <td colSpan={5} style={{ color: "var(--muted)" }}>
                          No wards mapped yet.
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}
        </div>

        <div className="card">
          <h3>Map New Ward Or Reset Password</h3>
          <p className="help" style={{ marginTop: 8 }}>
            After verifying the guardian, map a newly admitted sibling or issue a new temporary password.
          </p>
          <div className="grid grid-2" style={{ marginTop: 12 }}>
            <div>
              <label className="label">Admission Number</label>
              <input
                className="input"
                type="number"
                min={1}
                value={mapForm.admNo || ""}
                onChange={(e) => setMapForm((prev) => ({ ...prev, admNo: Number(e.target.value || 0) }))}
                placeholder="12346"
                disabled={!selectedGuardianId}
              />
            </div>
            <div>
              <label className="label">Relationship</label>
              <input
                className="input"
                value={mapForm.relationship}
                onChange={(e) => setMapForm((prev) => ({ ...prev, relationship: e.target.value }))}
                disabled={!selectedGuardianId}
              />
            </div>
          </div>
          <label className="chip" style={{ cursor: "pointer", marginTop: 12, width: "fit-content" }}>
            <input
              type="checkbox"
              checked={mapForm.setAsPrimary}
              onChange={(e) => setMapForm((prev) => ({ ...prev, setAsPrimary: e.target.checked }))}
              style={{ margin: 0 }}
              disabled={!selectedGuardianId}
            />
            Set mapped ward as primary
          </label>
          <div style={{ display: "flex", gap: 10, marginTop: 14, flexWrap: "wrap" }}>
            <button
              className="btn btn-primary"
              onClick={() => mapMutation.mutate({ guardianId: selectedGuardianId, payload: mapForm })}
              disabled={!canMap || mapMutation.isPending}
            >
              Map Student To Selected Guardian
            </button>
            <button
              className="btn"
              onClick={() => resetMutation.mutate(selectedGuardianId)}
              disabled={!selectedGuardianId || resetMutation.isPending}
            >
              Reset Guardian Password
            </button>
          </div>
          {mapMutation.isError ? <p className="error">Map ward failed: {getApiErrorMessage(mapMutation.error)}</p> : null}
          {resetMutation.isError ? <p className="error">Reset password failed: {getApiErrorMessage(resetMutation.error)}</p> : null}
        </div>
      </div>
    </section>
  );
}
