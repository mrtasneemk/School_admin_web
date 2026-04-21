import { NavLink } from "react-router-dom";

export type SidebarRole = string | null | undefined;

type NavItem = {
  to: string;
  label: string;
  anyOf?: string[];
};

type NavGroup = {
  title: string;
  items: NavItem[];
};

function isAllowed(role: SidebarRole, item: NavItem) {
  if (!item.anyOf || item.anyOf.length === 0) return true;
  if (!role) return false;
  return item.anyOf.includes(role);
}

export default function SidebarNav({ role }: { role: SidebarRole }) {
  const groups: NavGroup[] = [
    {
      title: "Overview",
      items: [{ to: "/", label: "Dashboard" }]
    },
    {
      title: "Employee Administration",
      items: [{ to: "/employees", label: "Employees", anyOf: ["Administrator"] }]
    },
    {
      title: "Academic Administration",
      items: [{ to: "/academic", label: "Academic Setup", anyOf: ["Administrator", "Academic_Admin"] }]
    },
    {
      title: "Settings",
      items: [
        { to: "/profile", label: "Profile" },
        { to: "/change-password", label: "Change Password" }
      ]
    }
  ];

  const visibleGroups = groups
    .map((g) => ({ ...g, items: g.items.filter((it) => isAllowed(role, it)) }))
    .filter((g) => g.items.length > 0);

  return (
    <nav className="nav">
      {visibleGroups.map((group) => (
        <div className="nav-group" key={group.title}>
          <div className="nav-group-title">{group.title}</div>
          <div className="nav-group-items">
            {group.items.map((item) => (
              <NavLink key={item.to} to={item.to} end={item.to === "/"}>
                <span>{item.label}</span>
              </NavLink>
            ))}
          </div>
        </div>
      ))}
    </nav>
  );
}
