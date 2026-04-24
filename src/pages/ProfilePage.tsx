import { useQuery } from "@tanstack/react-query";
import { NavLink } from "react-router-dom";
import { getCurrentStaffProfile, getStudentProfile } from "../api/profile";
import { useAuth } from "../auth/AuthContext";
import PageHeader from "../components/ui/PageHeader";
import { formatRoleLabel } from "../utils/roles";

export default function ProfilePage() {
  const { role, username, userId } = useAuth();

  const profileQuery = useQuery({
    queryKey: ["myProfile", role, userId],
    queryFn: async () => {
      if (role === "Student") {
        const s = await getStudentProfile();
        return {
          displayName: s.SNAME || username || "Student",
          picUrl: s.PICURL,
          fields: [
            ["Role", formatRoleLabel(role) || "Student"],
            ["Name", s.SNAME]
          ] as Array<[string, string]>
        };
      }

      const e = await getCurrentStaffProfile({ role, userId, username });
      if (e) {
        return {
          displayName: e.NAME || username || role || "User",
          picUrl: e.PICURL,
          fields: [
            ["Role", formatRoleLabel(role) || "User"],
            ["Name", e.NAME],
            ["Designation", e.DISGNATION],
            ["Mobile", e.MOBILE],
            ["Email", e.EMAIL]
          ] as Array<[string, string]>
        };
      }

      return {
        displayName: username || role || "User",
        picUrl: "",
        fields: [["Role", formatRoleLabel(role) || "User"], ["Username", username ?? ""]]
      };
    },
    staleTime: 5 * 60 * 1000,
    retry: 0
  });

  const pic = profileQuery.data?.picUrl || "";

  return (
    <section className="grid">
      <PageHeader title="Profile" description="View your profile details and account actions." />

      <div className="grid grid-2">
        <div className="card" style={{ display: "grid", gap: 12 }}>
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <div className="avatar" style={{ width: 56, height: 56 }}>
              {pic ? (
                <img
                  src={pic}
                  alt="Profile"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).style.display = "none";
                  }}
                />
              ) : (
                <span style={{ fontWeight: 900, color: "var(--muted)", fontSize: 18 }}>
                  {(profileQuery.data?.displayName ?? username ?? "U").slice(0, 1).toUpperCase()}
                </span>
              )}
            </div>
            <div>
              <div style={{ fontFamily: "var(--font-serif)", fontSize: 22 }}>{profileQuery.data?.displayName ?? "User"}</div>
              <div className="help">{formatRoleLabel(role) || "User"}</div>
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <NavLink to="/change-password" className="btn btn-primary" style={{ textDecoration: "none" }}>
              Change Password
            </NavLink>
          </div>
        </div>

        <div className="card">
          <h3>Details</h3>
          {profileQuery.isLoading && <p className="help">Loading profile...</p>}
          {profileQuery.isError && <p className="error">Failed to load profile.</p>}

          {profileQuery.data && (
            <div style={{ display: "grid" }}>
              {profileQuery.data.fields
                .filter(([, v]) => String(v ?? "").trim().length > 0)
                .map(([k, v]) => (
                  <div key={k} className="kv">
                    <span className="kv-key">{k}</span>
                    <span className="kv-val">{v}</span>
                  </div>
                ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
