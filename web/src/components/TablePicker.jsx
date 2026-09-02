export default function TablePicker({ businessName, logoUrl, storeName, tables, onPick }) {
  return (
    <div className="waiting">
      <div className="waiting-card">
        {logoUrl ? (
          <img src={logoUrl} alt="" className="brand-logo big" />
        ) : (
          <span className="material-symbols-outlined pick-mark">table_restaurant</span>
        )}

        <h1>Where are you sitting?</h1>
        <p className="muted">
          Pick your table so {businessName ?? 'our staff'} can bring your order to the right place.
        </p>

        {tables.length === 0 ? (
          <p className="muted">No tables are set up yet. Please ask a staff member.</p>
        ) : (
          <div className="table-grid">
            {tables.map((t) => (
              <button key={t.id} className="table-pick" onClick={() => onPick(t)}>
                {t.label}
              </button>
            ))}
          </div>
        )}

        <p className="muted small centre">{storeName}</p>
      </div>
    </div>
  )
}
