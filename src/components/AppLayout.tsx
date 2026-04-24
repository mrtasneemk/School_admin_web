import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { useTheme } from "../theme/ThemeContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getCurrentStaffProfile, getStudentProfile } from "../api/profile";
import SidebarNav from "./SidebarNav";
import { formatRoleLabel } from "../utils/roles";

export default function AppLayout() {
  const { username, logout, role, userId, admNo } = useAuth();
  const { effectiveMode, toggle } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const qc = useQueryClient();

  function handleLogout() {
    qc.clear();
    logout();
    navigate("/login");
  }

  const profileQuery = useQuery({
    queryKey: ["profile", role, userId, admNo],
    queryFn: async () => {
      if (role === "Student") {
        const s = await getStudentProfile();
        return { picUrl: s.PICURL, displayName: s.SNAME || username || "Student" };
      }

      const e = await getCurrentStaffProfile({ role, userId, username });
      if (e) {
        return { picUrl: e.PICURL, displayName: e.NAME || username || role || "User" };
      }

      return { picUrl: "", displayName: username || role || "User" };
    },
    staleTime: 5 * 60 * 1000,
    retry: 0
  });

  const avatarUrl = profileQuery.data?.picUrl || null;

  return (
    <div className="app-shell">
      <div className="shell-grid">
        <aside className="panel sidebar">
          <div className="brand">
            <div className="brand-mark" />
            <div>
              <h1>School ERP</h1>
              <p>Unified School Operations</p>
            </div>
          </div>

          <SidebarNav role={role} />
        </aside>

        <main className="panel content">
          <header className="topbar">
            <div className="topbar-title">
              <h2>{profileQuery.data?.displayName ?? username ?? "User"}</h2>
              <p>{formatRoleLabel(role) || "User"}</p>
            </div>

            <div className="topbar-actions">
              <button className="btn" onClick={toggle} title="Toggle theme">
                Theme: {effectiveMode === "dark" ? "Dark" : "Light"}
              </button>

              <div className="avatar" title={profileQuery.data?.displayName ?? username ?? "User"}>
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt="Profile"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).style.display = "none";
                    }}
                  />
                ) : (
                  <span style={{ fontWeight: 700, color: "var(--muted)" }}>
                    {(username ?? "A").slice(0, 1).toUpperCase()}
                  </span>
                )}
              </div>

              <button className="btn btn-danger" onClick={handleLogout}>
                Logout
              </button>
            </div>
          </header>

          <div key={location.pathname}>
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
