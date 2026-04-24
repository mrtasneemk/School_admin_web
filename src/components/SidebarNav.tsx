import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { resolveAppPath } from "../utils/navigation";

export type SidebarRole = string | null | undefined;

type NavItem = {
  to: string;
  label: string;
  anyOf?: string[];
};

type NavGroup = {
  title: string;
  to?: string;
  anyOf?: string[];
  items: NavItem[];
};

function isAllowed(role: SidebarRole, item: { anyOf?: string[] }) {
  if (!item.anyOf || item.anyOf.length === 0) return true;
  if (!role) return false;
  return item.anyOf.includes(role);
}

function isItemActive(pathname: string, to: string) {
  if (to === "/") return pathname === "/";
  return pathname === to || pathname.startsWith(`${to}/`);
}

export default function SidebarNav({ role }: { role: SidebarRole }) {
  const location = useLocation();
  const groups: NavGroup[] = [
    {
      title: "Overview",
      items: [{ to: "/", label: "Dashboard" }]
    },
    {
      title: "Employee Administration",
      to: "/employees",
      anyOf: ["Administrator"],
      items: [
        { to: "/employees", label: "Directory", anyOf: ["Administrator"] },
        { to: "/employees/new", label: "Add Employee", anyOf: ["Administrator"] }
      ]
    },
    {
      title: "Guardian Management",
      to: "/guardians",
      anyOf: ["Administrator"],
      items: [
        { to: "/guardians", label: "Overview", anyOf: ["Administrator"] },
        { to: "/guardians/search", label: "Search Guardians", anyOf: ["Administrator"] },
        { to: "/guardians/admission", label: "Admission Link", anyOf: ["Administrator"] }
      ]
    },
    {
      title: "Academic Administration",
      to: "/academic",
      anyOf: ["Administrator", "Academic_Admin"],
      items: [
        { to: "/academic", label: "Overview", anyOf: ["Administrator", "Academic_Admin"] },
        { to: "/academic/setup", label: "Session & Exam", anyOf: ["Administrator", "Academic_Admin"] },
        { to: "/academic/teachers", label: "Teachers Management", anyOf: ["Administrator", "Academic_Admin"] },
        { to: "/academic/results", label: "Result Operations", anyOf: ["Administrator", "Academic_Admin"] },
        { to: "/academic/timetable", label: "Timetable", anyOf: ["Administrator", "Academic_Admin"] }
      ]
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
    .filter((group) => isAllowed(role, group))
    .map((group) => ({ ...group, items: group.items.filter((item) => isAllowed(role, item)) }))
    .filter((group) => group.items.length > 0);

  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setExpanded((prev) => {
      const next = { ...prev };
      for (const group of visibleGroups) {
        const hasSubmenu = group.items.length > 1;
        if (!hasSubmenu) continue;
        if (prev[group.title] !== undefined) continue;
        next[group.title] = group.items.some((item) => isItemActive(location.pathname, item.to));
      }
      return next;
    });
  }, [location.pathname, visibleGroups]);

  return (
    <nav className="nav">
      {visibleGroups.map((group) => {
        const hasSubmenu = group.items.length > 1;
        const isActiveGroup = group.items.some((item) => isItemActive(location.pathname, item.to));
        const groupTarget = group.to ?? group.items[0].to;

        return (
          <div className="nav-group" key={group.title}>
            {hasSubmenu ? (
              <div className={`nav-group-header ${isActiveGroup ? "active" : ""}`}>
                <a className="nav-group-link" href={resolveAppPath(groupTarget)}>
                  <span className="nav-group-title">{group.title}</span>
                </a>
                <button
                  type="button"
                  className="nav-group-toggle"
                  onClick={() => setExpanded((prev) => ({ ...prev, [group.title]: !prev[group.title] }))}
                  aria-label={`${expanded[group.title] ? "Collapse" : "Expand"} ${group.title}`}
                >
                  <span className="nav-group-caret">{expanded[group.title] ? "-" : "+"}</span>
                </button>
              </div>
            ) : (
              <div className="nav-group-title">{group.title}</div>
            )}

            <div className={`nav-group-items ${hasSubmenu ? "nav-submenu" : ""} ${expanded[group.title] === false ? "collapsed" : ""}`}>
              {group.items.map((item) => (
                <a
                  key={item.to}
                  href={resolveAppPath(item.to)}
                  className={isItemActive(location.pathname, item.to) ? "active" : undefined}
                >
                  <span>{item.label}</span>
                </a>
              ))}
            </div>
          </div>
        );
      })}
    </nav>
  );
}
