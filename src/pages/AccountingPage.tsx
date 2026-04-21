export default function AccountingPage() {
  return (
    <section className="grid">
      <div>
        <h1 style={{ margin: 0, fontFamily: "var(--font-serif)", fontSize: 28 }}>Accounting</h1>
        <p style={{ margin: "8px 0 0", color: "var(--muted)" }}>
          Accounting dashboards and administrative fee operations.
        </p>
      </div>

      <div className="grid grid-3">
        <div className="card">
          <h3>Receipts</h3>
          <div className="stat">Soon</div>
          <p className="help">Search receipts and view summaries.</p>
        </div>
        <div className="card">
          <h3>Dues</h3>
          <div className="stat">Soon</div>
          <p className="help">View dues summary and student balances.</p>
        </div>
        <div className="card">
          <h3>Reports</h3>
          <div className="stat">Soon</div>
          <p className="help">Daily/monthly financial reports.</p>
        </div>
      </div>
    </section>
  );
}

