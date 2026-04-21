export default function SecurityPage() {
  return (
    <section className="grid">
      <div>
        <h1 style={{ margin: 0, fontFamily: "var(--font-serif)", fontSize: 28 }}>Security</h1>
        <p style={{ margin: "8px 0 0", color: "var(--muted)" }}>
          Password reset and user security operations.
        </p>
      </div>

      <div className="grid grid-3">
        <div className="card">
          <h3>User Password Reset</h3>
          <div className="stat">Soon</div>
          <p className="help">Reset passwords for ERP users.</p>
        </div>
        <div className="card">
          <h3>Role Mapping</h3>
          <div className="stat">Soon</div>
          <p className="help">View role mappings and access controls.</p>
        </div>
        <div className="card">
          <h3>Audit</h3>
          <div className="stat">Soon</div>
          <p className="help">Operational logs and audit trails.</p>
        </div>
      </div>
    </section>
  );
}

