import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AxiosError } from "axios";
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { createEmployee, getEmployeeDetail, updateEmployee } from "../../api/employees";
import { getCastes, getDesignations, getQualifications, getReligions, getTechQualifications } from "../../api/lookup";
import type { CreateEmployeeDto, EmployeeDetailDto } from "../../types/employee";
import PageHeader from "../../components/ui/PageHeader";
import Alert from "../../components/ui/Alert";

function getApiErrorMessage(error: unknown): string {
  const axiosErr = error as AxiosError<{ message?: string; title?: string }>;
  const status = axiosErr.response?.status;
  const bodyMessage = axiosErr.response?.data?.message ?? axiosErr.response?.data?.title;
  if (bodyMessage) return status ? `(${status}) ${bodyMessage}` : bodyMessage;
  if (axiosErr.message) return status ? `(${status}) ${axiosErr.message}` : axiosErr.message;
  return "Unknown API error.";
}

const defaultEmployee: CreateEmployeeDto = {
  NAME: "",
  FATHER: "",
  DOB: "2000-01-01",
  PAREA: "",
  PPOST: "",
  PDIST: "",
  AREA: "",
  POST: "",
  DIST: "",
  PHONE: "",
  MOBILE: "",
  DISGNATION: "",
  DOJ: new Date().toISOString().slice(0, 10),
  EMAIL: "",
  CASTE: "",
  RELIGION: "",
  AADHAR: "",
  ExperienceYrs: "",
  ExperienceMonths: "",
  Qualification: "",
  TechQualification: "",
  PAN: "",
  PZIP: "",
  ZIP: "",
  Emp_Cat: 1,
  ACTIVE: true
};

function validate(dto: CreateEmployeeDto): string[] {
  const errs: string[] = [];
  const req = (label: string, value: string) => {
    if (!value || !value.trim()) errs.push(`${label} is required.`);
  };

  req("Name", dto.NAME);
  req("Father", dto.FATHER);
  req("Permanent Area", dto.PAREA);
  req("Permanent Post", dto.PPOST);
  req("Permanent District", dto.PDIST);
  req("Current Area", dto.AREA);
  req("Current Post", dto.POST);
  req("Current District", dto.DIST);
  req("Phone", dto.PHONE);
  req("Mobile", dto.MOBILE);
  req("Designation", dto.DISGNATION);
  req("Email", dto.EMAIL);
  req("Caste", dto.CASTE);
  req("Religion", dto.RELIGION);
  req("Aadhar", dto.AADHAR);

  if (dto.MOBILE && dto.MOBILE.trim().length !== 10) errs.push("Mobile must be 10 digits.");
  if (dto.AADHAR && dto.AADHAR.trim().length !== 12) errs.push("Aadhar must be 12 digits.");
  if (dto.EMAIL && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(dto.EMAIL.trim())) errs.push("Email is invalid.");

  const dob = new Date(dto.DOB);
  const doj = new Date(dto.DOJ);
  const today = new Date();
  if (isFinite(dob.getTime()) && dob > today) errs.push("DOB cannot be in the future.");
  if (isFinite(doj.getTime()) && doj > today) errs.push("DOJ cannot be in the future.");
  if (isFinite(dob.getTime()) && isFinite(doj.getTime()) && dob > doj) errs.push("DOB cannot be after DOJ.");

  return errs;
}

function toFormModel(detail: EmployeeDetailDto): CreateEmployeeDto {
  // API uses DateTime; normalize to YYYY-MM-DD.
  const iso = (d: unknown) => String(d ?? "").slice(0, 10);
  return {
    NAME: detail.NAME ?? "",
    FATHER: detail.FATHER ?? "",
    DOB: iso(detail.DOB),
    PAREA: detail.PAREA ?? "",
    PPOST: detail.PPOST ?? "",
    PDIST: detail.PDIST ?? "",
    AREA: detail.AREA ?? "",
    POST: detail.POST ?? "",
    DIST: detail.DIST ?? "",
    PHONE: detail.PHONE ?? "",
    MOBILE: detail.MOBILE ?? "",
    DISGNATION: detail.DISGNATION ?? "",
    DOJ: iso(detail.DOJ),
    EMAIL: detail.EMAIL ?? "",
    CASTE: detail.CASTE ?? "",
    RELIGION: detail.RELIGION ?? "",
    AADHAR: detail.AADHAR ?? "",
    ExperienceYrs: detail.ExperienceYrs ?? "",
    ExperienceMonths: detail.ExperienceMonths ?? "",
    Qualification: detail.Qualification ?? "",
    TechQualification: detail.TechQualification ?? "",
    PAN: detail.PAN ?? "",
    PZIP: detail.PZIP ?? "",
    ZIP: detail.ZIP ?? "",
    Emp_Cat: Number(detail.Emp_Cat ?? 1),
    ACTIVE: Boolean(detail.ACTIVE ?? true)
  };
}

export default function EmployeeUpsertPage() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { empId } = useParams();

  const id = empId ? Number(empId) : null;
  const isEdit = typeof id === "number" && Number.isFinite(id) && id > 0;
  const hasEmpIdParam = typeof empId === "string" && empId.length > 0;
  const invalidEmpIdParam = hasEmpIdParam && !(typeof id === "number" && Number.isFinite(id) && id > 0);

  const detailQuery = useQuery({
    queryKey: ["employeeDetail", id],
    queryFn: () => getEmployeeDetail(id as number),
    enabled: isEdit,
    refetchOnMount: "always",
    retry: 0
  });

  const designationsQuery = useQuery({
    queryKey: ["lookup", "designations"],
    queryFn: () => getDesignations(),
    staleTime: 30 * 60 * 1000,
    retry: 0
  });

  const castesQuery = useQuery({
    queryKey: ["lookup", "castes"],
    queryFn: () => getCastes(),
    staleTime: 30 * 60 * 1000,
    retry: 0
  });

  const religionsQuery = useQuery({
    queryKey: ["lookup", "religions"],
    queryFn: () => getReligions(),
    staleTime: 30 * 60 * 1000,
    retry: 0
  });

  const qualificationsQuery = useQuery({
    queryKey: ["lookup", "qualifications"],
    queryFn: () => getQualifications(),
    staleTime: 30 * 60 * 1000,
    retry: 0
  });

  const techQualificationsQuery = useQuery({
    queryKey: ["lookup", "techQualifications"],
    queryFn: () => getTechQualifications(),
    staleTime: 30 * 60 * 1000,
    retry: 0
  });

  const [form, setForm] = useState<CreateEmployeeDto>(defaultEmployee);
  const [touched, setTouched] = useState(false);
  const [sameAsPermanent, setSameAsPermanent] = useState(false);

  useEffect(() => {
    if (!isEdit) return;
    if (!detailQuery.data) return;
    if (touched) return;
    setForm(toFormModel(detailQuery.data));
  }, [detailQuery.data, isEdit, touched]);

  useEffect(() => {
    if (!sameAsPermanent) return;
    setForm((prev) => {
      if (
        prev.AREA === prev.PAREA &&
        prev.POST === prev.PPOST &&
        prev.DIST === prev.PDIST &&
        prev.ZIP === prev.PZIP
      ) {
        return prev;
      }

      return {
        ...prev,
        AREA: prev.PAREA,
        POST: prev.PPOST,
        DIST: prev.PDIST,
        ZIP: prev.PZIP
      };
    });
  }, [sameAsPermanent, form.PAREA, form.PPOST, form.PDIST, form.PZIP]);

  const errors = useMemo(() => validate(form), [form]);
  const yearOptions = useMemo(() => Array.from({ length: 51 }, (_, i) => String(i)), []);
  const monthOptions = useMemo(() => Array.from({ length: 12 }, (_, i) => String(i)), []);
  const categoryOptions = useMemo(
    () => [
      { value: 1, label: "Teaching" },
      { value: 2, label: "Non-Teaching" },
      { value: 3, label: "Office Staff" },
      { value: 4, label: "Support Staff" }
    ],
    []
  );

  const designationOptions = useMemo(() => {
    const list = designationsQuery.data ?? [];
    if (form.DISGNATION && !list.some((x) => x.value === form.DISGNATION)) {
      return [{ value: form.DISGNATION, label: form.DISGNATION }, ...list];
    }
    return list;
  }, [designationsQuery.data, form.DISGNATION]);

  const religionOptions = useMemo(() => {
    const list = religionsQuery.data ?? [];
    if (form.RELIGION && !list.some((x) => x.value === form.RELIGION)) {
      return [{ value: form.RELIGION, label: form.RELIGION }, ...list];
    }
    return list;
  }, [religionsQuery.data, form.RELIGION]);

  const casteOptions = useMemo(() => {
    const list = castesQuery.data ?? [];
    if (form.CASTE && !list.some((x) => x.value === form.CASTE)) {
      return [{ value: form.CASTE, label: form.CASTE }, ...list];
    }
    return list;
  }, [castesQuery.data, form.CASTE]);

  const qualificationOptions = useMemo(() => {
    const list = qualificationsQuery.data ?? [];
    if (form.Qualification && !list.some((x) => x.value === form.Qualification)) {
      return [{ value: form.Qualification, label: form.Qualification }, ...list];
    }
    return list;
  }, [qualificationsQuery.data, form.Qualification]);

  const techQualificationOptions = useMemo(() => {
    const list = techQualificationsQuery.data ?? [];
    if (form.TechQualification && !list.some((x) => x.value === form.TechQualification)) {
      return [{ value: form.TechQualification, label: form.TechQualification }, ...list];
    }
    return list;
  }, [techQualificationsQuery.data, form.TechQualification]);

  const createMutation = useMutation({
    mutationFn: createEmployee,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["employees"] });
      navigate("/employees");
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: CreateEmployeeDto }) => updateEmployee(id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["employees"] });
      qc.invalidateQueries({ queryKey: ["employeeDetail", id] });
      navigate("/employees");
    }
  });

  function setField<K extends keyof CreateEmployeeDto>(key: K, value: CreateEmployeeDto[K]) {
    if (!touched) setTouched(true);
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function onSave() {
    if (errors.length > 0) return;
    if (isEdit) updateMutation.mutate({ id: id as number, payload: form });
    else createMutation.mutate(form);
  }

  const busy = createMutation.isPending || updateMutation.isPending || detailQuery.isLoading;
  const pageTitle = isEdit ? `Edit Employee #${id}` : "Add Employee";

  return (
    <section className="grid">
      <PageHeader
        title={pageTitle}
        description="All fields are validated. Use Assignments to manage classes and subjects for teachers."
        actions={
          <>
            <button className="btn" onClick={() => navigate("/employees")} disabled={busy}>
              Back to List
            </button>
            <button className="btn btn-primary" onClick={onSave} disabled={busy || errors.length > 0}>
              {isEdit ? "Update" : "Create"}
            </button>
          </>
        }
      />

      {isEdit && detailQuery.isLoading && (
        <Alert tone="info" title="Loading">
          Loading employee details...
        </Alert>
      )}

      {invalidEmpIdParam && (
        <Alert tone="danger" title="Invalid Employee ID">
          This page needs a valid employee id in the URL (example: /employees/12/edit). Current param:{" "}
          <b>{String(empId ?? "")}</b>
        </Alert>
      )}

      {isEdit && detailQuery.isError && (
        <Alert tone="danger" title="Load Failed">
          Failed to load employee: {getApiErrorMessage(detailQuery.error)}
        </Alert>
      )}

      {(createMutation.isError || updateMutation.isError) && (
        <Alert tone="danger" title="Save Failed">
          {getApiErrorMessage((createMutation.error as unknown) || (updateMutation.error as unknown))}
        </Alert>
      )}

      {errors.length > 0 && (
        <Alert tone="info" title="Fix These Issues">
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            {errors.map((e) => (
              <li key={e} style={{ marginBottom: 6 }}>
                {e}
              </li>
            ))}
          </ul>
        </Alert>
      )}

      <div className="card">
        <h3 style={{ marginBottom: 12 }}>Personal Details</h3>
        <div className="grid grid-2">
          <div>
            <label className="label">Employee Name</label>
            <input className="input" value={form.NAME} onChange={(e) => setField("NAME", e.target.value)} />
          </div>
          <div>
            <label className="label">Father Name</label>
            <input className="input" value={form.FATHER} onChange={(e) => setField("FATHER", e.target.value)} />
          </div>
          <div>
            <label className="label">Aadhar Number</label>
            <input className="input" value={form.AADHAR} onChange={(e) => setField("AADHAR", e.target.value)} />
          </div>
          <div>
            <label className="label">PAN Number</label>
            <input className="input" value={form.PAN} onChange={(e) => setField("PAN", e.target.value)} />
          </div>
          <div>
            <label className="label">Religion</label>
            <select className="input" value={form.RELIGION} onChange={(e) => setField("RELIGION", e.target.value)}>
              <option value="">Select</option>
              {religionOptions.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Caste</label>
            <select className="input" value={form.CASTE} onChange={(e) => setField("CASTE", e.target.value)}>
              <option value="">Select</option>
              {casteOptions.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Date of Birth</label>
            <input className="input" type="date" value={form.DOB} onChange={(e) => setField("DOB", e.target.value)} />
          </div>
          <div>
            <label className="label">E-mail</label>
            <input className="input" type="email" value={form.EMAIL} onChange={(e) => setField("EMAIL", e.target.value)} />
          </div>
          <div>
            <label className="label">Phone Number</label>
            <input className="input" value={form.PHONE} onChange={(e) => setField("PHONE", e.target.value)} />
          </div>
          <div>
            <label className="label">Mobile Number</label>
            <input className="input" value={form.MOBILE} onChange={(e) => setField("MOBILE", e.target.value)} />
          </div>
        </div>
      </div>

      <div className="card">
        <h3 style={{ marginBottom: 12 }}>Permanent Address</h3>
        <div className="grid grid-2">
          <div>
            <label className="label">Area</label>
            <input className="input" value={form.PAREA} onChange={(e) => setField("PAREA", e.target.value)} />
          </div>
          <div>
            <label className="label">Post</label>
            <input className="input" value={form.PPOST} onChange={(e) => setField("PPOST", e.target.value)} />
          </div>
          <div>
            <label className="label">District</label>
            <input className="input" value={form.PDIST} onChange={(e) => setField("PDIST", e.target.value)} />
          </div>
          <div>
            <label className="label">PIN Number</label>
            <input className="input" value={form.PZIP} onChange={(e) => setField("PZIP", e.target.value)} />
          </div>
        </div>
      </div>

      <div className="card">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: 12 }}>
          <h3>Present Address</h3>
          <label className="chip" style={{ cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={sameAsPermanent}
              onChange={(e) => setSameAsPermanent(e.target.checked)}
              style={{ margin: 0 }}
            />
            Same As Above
          </label>
        </div>
        <div className="grid grid-2">
          <div>
            <label className="label">Area</label>
            <input className="input" value={form.AREA} onChange={(e) => setField("AREA", e.target.value)} disabled={sameAsPermanent} />
          </div>
          <div>
            <label className="label">Post</label>
            <input className="input" value={form.POST} onChange={(e) => setField("POST", e.target.value)} disabled={sameAsPermanent} />
          </div>
          <div>
            <label className="label">District</label>
            <input className="input" value={form.DIST} onChange={(e) => setField("DIST", e.target.value)} disabled={sameAsPermanent} />
          </div>
          <div>
            <label className="label">PIN Number</label>
            <input className="input" value={form.ZIP} onChange={(e) => setField("ZIP", e.target.value)} disabled={sameAsPermanent} />
          </div>
        </div>
      </div>

      <div className="card">
        <h3 style={{ marginBottom: 12 }}>Employment Details</h3>
        <div className="grid grid-2">
          <div>
            <label className="label">Date of Joining</label>
            <input className="input" type="date" value={form.DOJ} onChange={(e) => setField("DOJ", e.target.value)} />
          </div>
          <div>
            <label className="label">Designation</label>
            <select className="input" value={form.DISGNATION} onChange={(e) => setField("DISGNATION", e.target.value)}>
              <option value="">Select Designation</option>
              {designationOptions.map((d) => (
                <option key={d.value} value={d.value}>
                  {d.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Edu. Qualification</label>
            <select className="input" value={form.Qualification} onChange={(e) => setField("Qualification", e.target.value)}>
              <option value="">Select</option>
              {qualificationOptions.map((q) => (
                <option key={q.value} value={q.value}>
                  {q.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Tech. Qualification</label>
            <select className="input" value={form.TechQualification} onChange={(e) => setField("TechQualification", e.target.value)}>
              <option value="">Select</option>
              {techQualificationOptions.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Experience (Years)</label>
            <select className="input" value={form.ExperienceYrs} onChange={(e) => setField("ExperienceYrs", e.target.value)}>
              {yearOptions.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Experience (Months)</label>
            <select className="input" value={form.ExperienceMonths} onChange={(e) => setField("ExperienceMonths", e.target.value)}>
              {monthOptions.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Emp. Category</label>
            <select className="input" value={form.Emp_Cat} onChange={(e) => setField("Emp_Cat", Number(e.target.value))}>
              {categoryOptions.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="chip" style={{ cursor: "pointer", marginTop: 23 }}>
              <input
                type="checkbox"
                checked={form.ACTIVE}
                onChange={(e) => setField("ACTIVE", e.target.checked)}
                style={{ margin: 0 }}
              />
              Active
            </label>
          </div>
        </div>
      </div>
    </section>
  );
}
