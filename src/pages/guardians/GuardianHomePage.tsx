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

export default function GuardianHomePage() {
  return (
    <section className="grid">
      <PageHeader
        title="Guardian Management"
        description="Choose a clear workflow: search an existing guardian, create or link a guardian from a new admission, or open a guardian profile to manage wards and credentials."
      />

      <div className="grid grid-3">
        <WorkflowCard
          badge="Step 1"
          title="Search Guardians"
          description="Find an existing guardian by mobile, guardian code, username, or parent details before linking a sibling."
          to="/guardians/search"
        />
        <WorkflowCard
          badge="Step 2"
          title="Admission Link"
          description="Create a new guardian account or automatically link a new admission to an existing family from the admission number."
          to="/guardians/admission"
        />
        <WorkflowCard
          badge="Step 3"
          title="Manage Wards"
          description="Open a guardian profile to map another ward, reset credentials, or change the primary ward."
          to="/guardians/search"
        />
      </div>
    </section>
  );
}
