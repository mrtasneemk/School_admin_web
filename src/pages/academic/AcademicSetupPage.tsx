import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Alert from "../../components/ui/Alert";
import PageHeader from "../../components/ui/PageHeader";
import {
  addAcademicYear,
  getAcademicYears,
  getExamTypes,
  setActiveAcademicYear,
  setActiveExamType
} from "../../api/lookup";
import { getApiErrorMessage } from "./shared";

export default function AcademicSetupPage() {
  const qc = useQueryClient();
  const [ayInput, setAyInput] = useState("");
  const [setActiveOnAdd, setSetActiveOnAdd] = useState(true);
  const [ayValidationError, setAyValidationError] = useState("");

  const yearsQuery = useQuery({
    queryKey: ["lookup", "academic-years"],
    queryFn: () => getAcademicYears()
  });
  const examsQuery = useQuery({
    queryKey: ["lookup", "exam-types"],
    queryFn: () => getExamTypes()
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

  const activeAy = useMemo(() => yearsQuery.data?.find((x) => x.active)?.ay || "Not set", [yearsQuery.data]);
  const activeExam = useMemo(() => examsQuery.data?.find((x) => x.active)?.exam || "Not set", [examsQuery.data]);

  function onAddYear() {
    const ay = ayInput.trim();
    if (!/^\d{4}$/.test(ay)) {
      setAyValidationError("Academic year must be 4 digits (example: 2026).");
      return;
    }
    setAyValidationError("");
    addYearMutation.mutate({ ay, setActive: setActiveOnAdd });
  }

  return (
    <section className="grid">
      <PageHeader
        title="Academic Session"
        description="Manage the current academic year and the active exam type from one focused setup screen."
      />

      <div className="grid grid-2">
        <div className="card">
          <h3>Current Academic Year</h3>
          <div className="stat">{activeAy}</div>
        </div>
        <div className="card">
          <h3>Current Active Exam</h3>
          <div className="stat">{activeExam}</div>
        </div>
      </div>

      <div className="grid grid-2">
        <div className="card">
          <h3>Academic Year Management</h3>
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
          <h3>Exam Type Management</h3>
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

      {yearsQuery.isError ? <Alert tone="danger" title="Academic Year Load Failed">{getApiErrorMessage(yearsQuery.error)}</Alert> : null}
      {examsQuery.isError ? <Alert tone="danger" title="Exam Types Load Failed">{getApiErrorMessage(examsQuery.error)}</Alert> : null}
    </section>
  );
}
