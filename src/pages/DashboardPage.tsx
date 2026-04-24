import { useQuery } from "@tanstack/react-query";
import { getCurrentStaffProfile, getStudentProfile } from "../api/profile";
import { useAuth } from "../auth/AuthContext";
import PageHeader from "../components/ui/PageHeader";
import { resolveAppPath } from "../utils/navigation";
import { formatRoleLabel } from "../utils/roles";

function Tile({
  title,
  description,
  to
}: {
  title: string;
  description: string;
  to: string;
}) {
  return (
    <a href={resolveAppPath(to)} style={{ textDecoration: "none" }}>
      <div className="card" style={{ height: "100%", display: "grid", gap: 10 }}>
        <h3 style={{ margin: 0 }}>{title}</h3>
        <div style={{ color: "var(--text)", fontFamily: "var(--font-serif)", fontSize: 22 }}>{title}</div>
        <p className="help" style={{ margin: 0, lineHeight: 1.6 }}>
          {description}
        </p>
        <span className="help">Open</span>
      </div>
    </a>
  );
}

export default function DashboardPage() {
  const { role, username, userId } = useAuth();

  const profileQuery = useQuery({
    queryKey: ["dashProfile", role, userId],
    queryFn: async () => {
      if (role === "Student") {
        const s = await getStudentProfile();
        return { name: s.SNAME || username || "Student", picUrl: s.PICURL || "" };
      }
      const e = await getCurrentStaffProfile({ role, userId, username });
      if (e) {
        return { name: e.NAME || username || role || "User", picUrl: e.PICURL || "" };
      }
      return { name: username || role || "User", picUrl: "" };
    },
    staleTime: 5 * 60 * 1000,
    retry: 0
  });

  const name = profileQuery.data?.name ?? username ?? "User";
  const pic = profileQuery.data?.picUrl ?? "";

  const tiles =
    role === "Administrator" || role === "Academic_Admin"
      ? [
          {
            title: "Academic Administration",
            description: "Manage academic session, teaching assignments, results, and timetable workflows.",
            to: "/academic"
          },
          ...(role === "Administrator"
            ? [
          {
            title: "Employee Administration",
            description: "Create, update, assign classes/subjects, and manage employee records.",
            to: "/employees"
          },
          {
            title: "Guardian Operations",
            description: "Search guardians, map new admissions, link siblings, and reset guardian passwords.",
            to: "/guardians"
          }
              ]
            : [])
        ]
      : [];

  return (
    <section className="grid">
      <PageHeader title="Dashboard" description="Welcome to the School ERP." />

      <div
        className="card"
        style={{
          display: "flex",
          gap: 14,
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap"
        }}
      >
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <div className="avatar" style={{ width: 48, height: 48 }}>
            {pic ? (
              <img
                src={pic}
                alt="Profile"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).style.display = "none";
                }}
              />
            ) : (
              <span style={{ fontWeight: 800, color: "var(--muted)" }}>{name.slice(0, 1).toUpperCase()}</span>
            )}
          </div>
          <div>
            <div style={{ fontFamily: "var(--font-serif)", fontSize: 20 }}>{name}</div>
            <div className="help">{formatRoleLabel(role) || "User"}</div>
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <a href={resolveAppPath("/profile")} className="btn" style={{ textDecoration: "none" }}>
            Profile
          </a>
          <a href={resolveAppPath("/change-password")} className="btn" style={{ textDecoration: "none" }}>
            Change Password
          </a>
        </div>
      </div>

      {tiles.length > 0 ? (
        <div className="grid grid-3">
          {tiles.map((t) => (
            <Tile key={t.to} title={t.title} description={t.description} to={t.to} />
          ))}
        </div>
      ) : (
        <div className="card">
          <h3>Modules</h3>
          <p className="help" style={{ margin: "10px 0 0", lineHeight: 1.6 }}>
            Your role-based modules will appear here as APIs are enabled for your account.
          </p>
        </div>
      )}
    </section>
  );
}
