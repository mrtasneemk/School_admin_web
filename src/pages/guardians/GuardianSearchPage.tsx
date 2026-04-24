import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { AxiosError } from "axios";
import PageHeader from "../../components/ui/PageHeader";
import { searchGuardians } from "../../api/guardians";
import { navigateDocument } from "../../utils/navigation";

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

export default function GuardianSearchPage() {
  const [searchText, setSearchText] = useState("");
  const [searchMobile, setSearchMobile] = useState("");
  const [searchSubmitted, setSearchSubmitted] = useState(false);

  const searchQuery = useQuery({
    queryKey: ["guardians", "search", searchText, searchMobile, searchSubmitted],
    queryFn: () => searchGuardians({ q: searchText.trim(), mobile: searchMobile.trim() }),
    enabled: searchSubmitted
  });

  const canSearch = searchText.trim().length > 0 || searchMobile.trim().length > 0;

  function runSearch() {
    if (!canSearch) return;
    if (searchSubmitted) {
      searchQuery.refetch();
      return;
    }
    setSearchSubmitted(true);
  }

  return (
    <section className="grid">
      <PageHeader
        title="Search Guardians"
        description="Start here when you suspect the family already has a guardian account. Search, verify the guardian profile, then open the detail screen to map a new sibling or reset credentials."
        actions={
          <button className="btn" onClick={() => navigateDocument("/guardians/admission")}>
            Go To Admission Link
          </button>
        }
      />

      <div className="card">
        <div className="grid grid-2">
          <div>
            <label className="label">Search text</label>
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
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 14 }}>
          <button className="btn btn-primary" onClick={runSearch} disabled={!canSearch || searchQuery.isFetching}>
            Search Guardians
          </button>
          <span className="chip">Matches: {searchQuery.data?.length ?? 0}</span>
        </div>

        {searchQuery.isError ? <p className="error">Search failed: {getApiErrorMessage(searchQuery.error)}</p> : null}

        <div className="table-wrap" style={{ marginTop: 14 }}>
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Guardian</th>
                <th>Mobile</th>
                <th style={{ width: 100 }}>Wards</th>
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
                    <button className="btn btn-sm" onClick={() => navigateDocument(`/guardians/${guardian.guardianId}`)}>
                      Open
                    </button>
                  </td>
                </tr>
              ))}
              {searchSubmitted && !searchQuery.isFetching && (searchQuery.data?.length ?? 0) === 0 ? (
                <tr>
                  <td colSpan={6} style={{ color: "var(--muted)" }}>
                    No guardians matched the current search. Use Admission Link if this is a brand-new family.
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
