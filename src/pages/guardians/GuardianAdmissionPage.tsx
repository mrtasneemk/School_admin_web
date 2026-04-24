import { useMemo, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import type { AxiosError } from "axios";
import PageHeader from "../../components/ui/PageHeader";
import Alert from "../../components/ui/Alert";
import { upsertGuardianByStudent } from "../../api/guardians";
import type { GuardianAdminOperationResult, GuardianAdmissionOperationRequest } from "../../types/guardian";
import { resolveAppPath } from "../../utils/navigation";

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

export default function GuardianAdmissionPage() {
  const [form, setForm] = useState<GuardianAdmissionOperationRequest>({
    admNo: 0,
    relationship: DEFAULT_RELATIONSHIP,
    setAsPrimary: true
  });
  const [result, setResult] = useState<GuardianAdminOperationResult | null>(null);

  const mutation = useMutation({
    mutationFn: upsertGuardianByStudent,
    onSuccess: (data) => setResult(data)
  });

  const canSubmit = form.admNo > 0 && form.relationship.trim().length > 0;
  const credentialSet = useMemo(() => {
    if (!result?.temporaryPassword) return null;
    return {
      username: result.username,
      temporaryPassword: result.temporaryPassword
    };
  }, [result]);

  return (
    <section className="grid">
      <PageHeader
        title="Admission Link"
        description="Use the admission number to let the backend create a new guardian account or automatically attach the student to an existing family."
      />

      {result ? (
        <Alert tone="success" title={result.createdAccount ? "Guardian Account Created" : "Guardian Linked"}>
          {result.message}
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 10 }}>
            <span className="chip">Guardian: {result.guardianName || result.guardianCode}</span>
            <span className="chip">Wards: {result.wardCount}</span>
            <span className="chip">{result.createdAccount ? "New account" : "Existing account reused"}</span>
          </div>
          {credentialSet ? (
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 10 }}>
              <span className="chip">Username: {credentialSet.username || "-"}</span>
              <span className="chip">Temporary Password: {credentialSet.temporaryPassword}</span>
            </div>
          ) : null}
          {result.guardianId > 0 ? (
            <div style={{ marginTop: 12 }}>
              <a className="btn btn-primary" href={resolveAppPath(`/guardians/${result.guardianId}`)} style={{ textDecoration: "none" }}>
                Open Guardian Profile
              </a>
            </div>
          ) : null}
        </Alert>
      ) : null}

      <div className="card">
        <div className="grid grid-2">
          <div>
            <label className="label">Admission Number</label>
            <input
              className="input"
              type="number"
              min={1}
              value={form.admNo || ""}
              onChange={(e) => setForm((prev) => ({ ...prev, admNo: Number(e.target.value || 0) }))}
              placeholder="12345"
            />
          </div>
          <div>
            <label className="label">Relationship</label>
            <input
              className="input"
              value={form.relationship}
              onChange={(e) => setForm((prev) => ({ ...prev, relationship: e.target.value }))}
            />
          </div>
        </div>

        <label className="chip" style={{ cursor: "pointer", marginTop: 12, width: "fit-content" }}>
          <input
            type="checkbox"
            checked={form.setAsPrimary}
            onChange={(e) => setForm((prev) => ({ ...prev, setAsPrimary: e.target.checked }))}
            style={{ margin: 0 }}
          />
          Set as primary ward
        </label>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 14 }}>
          <button className="btn btn-primary" onClick={() => mutation.mutate(form)} disabled={!canSubmit || mutation.isPending}>
            Create Or Link Guardian
          </button>
          <a className="btn" href={resolveAppPath("/guardians/search")} style={{ textDecoration: "none" }}>
            Search Existing Guardians
          </a>
        </div>

        {mutation.isError ? <p className="error">Admission link failed: {getApiErrorMessage(mutation.error)}</p> : null}
      </div>
    </section>
  );
}
