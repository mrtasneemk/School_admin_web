import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { AxiosError } from "axios";
import { useParams } from "react-router-dom";
import Alert from "../../components/ui/Alert";
import PageHeader from "../../components/ui/PageHeader";
import { getGuardianDetail, mapWardToGuardian, resetGuardianPassword } from "../../api/guardians";
import type {
  GuardianAdminOperationResult,
  GuardianAdmissionOperationRequest,
  GuardianPasswordResetResult
} from "../../types/guardian";
import { navigateDocument, resolveAppPath } from "../../utils/navigation";

function getApiErrorMessage(error: unknown): string {
  const axiosErr = error as AxiosError<{ message?: string; Message?: string; title?: string; Title?: string }>;
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

export default function GuardianDetailPage() {
  const qc = useQueryClient();
  const { guardianId } = useParams();
  const resolvedGuardianId = Number(guardianId || 0);

  const [mapForm, setMapForm] = useState<GuardianAdmissionOperationRequest>({
    admNo: 0,
    relationship: DEFAULT_RELATIONSHIP,
    setAsPrimary: false
  });
  const [operationResult, setOperationResult] = useState<GuardianAdminOperationResult | null>(null);
  const [resetResult, setResetResult] = useState<GuardianPasswordResetResult | null>(null);

  const detailQuery = useQuery({
    queryKey: ["guardian", resolvedGuardianId],
    queryFn: () => getGuardianDetail(resolvedGuardianId),
    enabled: resolvedGuardianId > 0
  });

  const mapMutation = useMutation({
    mutationFn: ({ guardianId, payload }: { guardianId: number; payload: GuardianAdmissionOperationRequest }) =>
      mapWardToGuardian(guardianId, payload),
    onSuccess: (result) => {
      setOperationResult(result);
      setResetResult(null);
      qc.invalidateQueries({ queryKey: ["guardian", result.guardianId] });
    }
  });

  const resetMutation = useMutation({
    mutationFn: resetGuardianPassword,
    onSuccess: (result) => {
      setResetResult(result);
      setOperationResult(null);
    }
  });

  const credentialSet = useMemo(() => {
    if (!resetResult?.temporaryPassword) return null;
    return {
      username: resetResult.username,
      temporaryPassword: resetResult.temporaryPassword,
      message: resetResult.message
    };
  }, [resetResult]);

  const guardian = detailQuery.data;
  const canMap = resolvedGuardianId > 0 && mapForm.admNo > 0 && mapForm.relationship.trim().length > 0;

  function setPrimaryWard(admNo: number) {
    if (!resolvedGuardianId || admNo <= 0) return;
    mapMutation.mutate({
      guardianId: resolvedGuardianId,
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
        title={guardian ? guardian.guardianName || guardian.guardianCode || "Guardian Profile" : "Guardian Profile"}
        description="Verify the guardian, review current wards, map a sibling, reset the password, or change the primary ward."
        actions={
          <>
            <button className="btn" onClick={() => navigateDocument("/guardians/search")}>
              Back To Search
            </button>
            <a className="btn" href={resolveAppPath("/guardians/admission")} style={{ textDecoration: "none" }}>
              Admission Link
            </a>
          </>
        }
      />

      {credentialSet ? (
        <Alert tone="success" title="Guardian Password Reset">
          {credentialSet.message}
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 10 }}>
            <span className="chip">Username: {credentialSet.username || "-"}</span>
            <span className="chip">Temporary Password: {credentialSet.temporaryPassword}</span>
          </div>
        </Alert>
      ) : null}

      {operationResult ? (
        <Alert tone="success" title="Guardian Mapping Updated">
          {operationResult.message}
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 10 }}>
            <span className="chip">Guardian: {operationResult.guardianName || operationResult.guardianCode}</span>
            <span className="chip">Wards: {operationResult.wardCount}</span>
          </div>
        </Alert>
      ) : null}

      {detailQuery.isError ? (
        <Alert tone="danger" title="Guardian Load Failed">
          {getApiErrorMessage(detailQuery.error)}
        </Alert>
      ) : null}

      <div className="grid grid-2">
        <div className="card">
          <h3>Guardian Details</h3>
          {detailQuery.isLoading ? <p className="help" style={{ marginTop: 10 }}>Loading guardian profile...</p> : null}
          {guardian ? (
            <div className="grid" style={{ marginTop: 12 }}>
              <div className="kv">
                <div className="kv-key">Guardian Code</div>
                <div className="kv-val">{guardian.guardianCode || "-"}</div>
              </div>
              <div className="kv">
                <div className="kv-key">Username</div>
                <div className="kv-val">{guardian.username || "-"}</div>
              </div>
              <div className="kv">
                <div className="kv-key">Mobile</div>
                <div className="kv-val">{guardian.mobile || "-"}</div>
              </div>
              <div className="kv">
                <div className="kv-key">Father Name</div>
                <div className="kv-val">{guardian.fatherName || "-"}</div>
              </div>
              <div className="kv">
                <div className="kv-key">Mother Name</div>
                <div className="kv-val">{guardian.motherName || "-"}</div>
              </div>
              <div className="kv">
                <div className="kv-key">Status</div>
                <div className="kv-val">{guardian.isActive ? "Active" : "Inactive"}</div>
              </div>
            </div>
          ) : null}
        </div>

        <div className="card">
          <h3>Actions</h3>
          <p className="help" style={{ marginTop: 8 }}>
            Use sibling mapping to add another admitted student to this family. Use password reset only when you need to re-issue guardian credentials.
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
                disabled={!resolvedGuardianId}
              />
            </div>
            <div>
              <label className="label">Relationship</label>
              <input
                className="input"
                value={mapForm.relationship}
                onChange={(e) => setMapForm((prev) => ({ ...prev, relationship: e.target.value }))}
                disabled={!resolvedGuardianId}
              />
            </div>
          </div>
          <label className="chip" style={{ cursor: "pointer", marginTop: 12, width: "fit-content" }}>
            <input
              type="checkbox"
              checked={mapForm.setAsPrimary}
              onChange={(e) => setMapForm((prev) => ({ ...prev, setAsPrimary: e.target.checked }))}
              style={{ margin: 0 }}
              disabled={!resolvedGuardianId}
            />
            Set mapped ward as primary
          </label>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 14 }}>
            <button
              className="btn btn-primary"
              onClick={() => mapMutation.mutate({ guardianId: resolvedGuardianId, payload: mapForm })}
              disabled={!canMap || mapMutation.isPending}
            >
              Map New Ward
            </button>
            <button
              className="btn"
              onClick={() => resetMutation.mutate(resolvedGuardianId)}
              disabled={!resolvedGuardianId || resetMutation.isPending}
            >
              Reset Password
            </button>
          </div>
          {mapMutation.isError ? <p className="error">Map ward failed: {getApiErrorMessage(mapMutation.error)}</p> : null}
          {resetMutation.isError ? <p className="error">Reset password failed: {getApiErrorMessage(resetMutation.error)}</p> : null}
        </div>
      </div>

      <div className="card">
        <h3>Current Wards</h3>
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
              {guardian?.wards.map((ward) => (
                <tr key={`${resolvedGuardianId}-${ward.admNo}`}>
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
                      <button className="btn btn-sm" onClick={() => setPrimaryWard(ward.admNo)} disabled={mapMutation.isPending}>
                        Set Primary
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {guardian && guardian.wards.length === 0 ? (
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
    </section>
  );
}
