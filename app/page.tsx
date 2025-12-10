export default function Home() {
  return (
    <main className="eventura-page">
      <div className="eventura-shell">
        {/* Header */}
        <header className="eventura-header">
          <div>
            <h1 className="eventura-title">Eventura – CEO Dashboard</h1>
            <p className="eventura-subtitle">
              Hardik Vekariya (CEO) · Surat, Gujarat · Events that speak your
              style
            </p>
          </div>
          <div className="eventura-pill">
            Cofounders: Hardik · Shubh · Dixit
          </div>
        </header>

        {/* Summary cards */}
        <section className="eventura-grid">
          <div className="eventura-card">
            <p className="eventura-card-label">Events this month</p>
            <p className="eventura-card-value">12</p>
            <p className="eventura-card-note">+4 vs last month</p>
          </div>

          <div className="eventura-card">
            <p className="eventura-card-label">Expected Revenue</p>
            <p className="eventura-card-value">₹18.5 Lakh</p>
            <p className="eventura-card-note">Target: ₹25 Lakh</p>
          </div>

          <div className="eventura-card">
            <p className="eventura-card-label">Leads in pipeline</p>
            <p className="eventura-card-value">23</p>
            <p className="eventura-card-note">7 need follow-up</p>
          </div>
        </section>

        {/* Two columns */}
        <section className="eventura-columns">
          {/* Upcoming events */}
          <div className="eventura-panel">
            <h2 className="eventura-panel-title">
              Upcoming events (next 7 days)
            </h2>
            <ul className="eventura-list">
              <li className="eventura-list-item">
                <div>
                  <p className="eventura-list-title">Patel Wedding Sangeet</p>
                  <p className="eventura-list-sub">
                    14 Dec · Laxmi Farm, Surat · 450 guests
                  </p>
                </div>
                <span className="eventura-tag eventura-tag-green">
                  Confirmed
                </span>
              </li>

              <li className="eventura-list-item">
                <div>
                  <p className="eventura-list-title">
                    Corporate Gala – XYZ Textiles
                  </p>
                  <p className="eventura-list-sub">
                    16 Dec · Taj Gateway · 220 guests
                  </p>
                </div>
                <span className="eventura-tag eventura-tag-amber">
                  Pending advance
                </span>
              </li>

              <li className="eventura-list-item">
                <div>
                  <p className="eventura-list-title">
                    Engagement – Mehta Family
                  </p>
                  <p className="eventura-list-sub">
                    18 Dec · Indoor · 150 guests
                  </p>
                </div>
                <span className="eventura-tag eventura-tag-blue">
                  Proposal sent
                </span>
              </li>
            </ul>
          </div>

          {/* Finance snapshot */}
          <div className="eventura-panel">
            <h2 className="eventura-panel-title">Finance snapshot</h2>
            <div className="eventura-fin-grid">
              <div className="eventura-fin-card">
                <p className="eventura-card-label">Expected income</p>
                <p className="eventura-card-value">₹26.4 L</p>
              </div>
              <div className="eventura-fin-card">
                <p className="eventura-card-label">Expected expense</p>
                <p className="eventura-card-value">₹19.2 L</p>
              </div>
            </div>
            <ul className="eventura-fin-bullets">
              <li>Vendor payments ≈ 60% of event budget</li>
              <li>Target margin: 25–30% per event</li>
              <li>Break-even: ~3 events per month</li>
            </ul>
          </div>
        </section>

        {/* Footer */}
        <footer className="eventura-footer">
          Eventura · Royal Event & Wedding Design Studio · Surat · ©{" "}
          {new Date().getFullYear()}
        </footer>
      </div>
    </main>
  );
}
