const CARDS = ['62%', '48%', '55%', '70%', '44%', '58%']

export default function MenuSkeleton() {
  return (
    <div className="menu" aria-busy="true" aria-label="Loading the menu">
      {[0, 1].map((section) => (
        <section key={section} className="menu-section">
          <div className="menu-heading">
            <span className="sk sk-heading" />
          </div>
          <div className="card-grid">
            {CARDS.map((w, i) => (
              <div key={i} className="card">
                <div className="card-body">
                  <span className="sk sk-name" style={{ width: w }} />
                  <span className="sk sk-desc" />
                  <span className="sk sk-desc short" />
                  <div className="card-foot">
                    <span className="sk sk-price" />
                    <span className="sk sk-add" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}
