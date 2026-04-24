import PageHeader from "../../components/ui/PageHeader";
import { resolveAppPath } from "../../utils/navigation";

function WorkflowCard({
  title,
  description,
  to,
  badge
}: {
  title: string;
  description: string;
  to: string;
  badge: string;
}) {
  return (
    <a href={resolveAppPath(to)} style={{ textDecoration: "none" }}>
      <div className="card" style={{ display: "grid", gap: 10, height: "100%" }}>
        <span className="chip" style={{ width: "fit-content" }}>
          {badge}
        </span>
        <div style={{ fontFamily: "var(--font-serif)", fontSize: 22 }}>{title}</div>
        <p className="help" style={{ margin: 0, lineHeight: 1.6 }}>
          {description}
        </p>
      </div>
    </a>
  );
}

export default function AcademicHomePage() {
  return (
    <section className="grid">
      <PageHeader
        title="Academic Administration"
        description="Pick a focused workflow instead of managing the whole academic module from one crowded screen."
      />

      <div className="grid grid-2">
        <WorkflowCard
          badge="Setup"
          title="Academic Session"
          description="Manage academic years, switch the active session, and set the current exam type."
          to="/academic/setup"
        />
        <WorkflowCard
          badge="Staff"
          title="Teachers Management"
          description="Search teachers, paginate the teaching list, and open a focused management screen for one teacher at a time."
          to="/academic/teachers"
        />
        <WorkflowCard
          badge="Results"
          title="Result Operations"
          description="Preview compile, run compile, and publish results with a clearer scoped workflow."
          to="/academic/results"
        />
        <WorkflowCard
          badge="Timetable"
          title="Timetable"
          description="Handle timetable upload and timetable viewing in its own workspace."
          to="/academic/timetable"
        />
      </div>
    </section>
  );
}
