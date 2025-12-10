export default function Home() {
  const pageStyle = {
    minHeight: "100vh",
    margin: 0,
    background:
      "radial-gradient(circle at top, #1f2937 0, #020617 45%, #000000 100%)",
    color: "#e5e7eb",
    fontFamily:
      'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    display: "flex",
    justifyContent: "center",
  } as const;

  const shellStyle = {
    maxWidth: "1100px",
    width: "100%",
    padding: "2.5rem 1.5rem 3rem",
  } as const;

  const headerStyle = {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: "1.5rem",
    marginBottom: "2rem",
  } as const;

  const titleStyle = {
    fontSize: "1.9rem",
    fontWeight: 700,
    letterSpacing: "-0.03em",
  } as const;

  const subtitleStyle = {
    marginTop: "0.35rem",
    fontSize: "0.8rem",
    color: "#9ca3af",
  } as const;

  const pillStyle = {
    padding: "0.4rem 0.9rem",
    borderRadius: "999px",
    border: "1px solid rgba(250, 204, 21, 0.5)",
    fontSize: "0.7rem",
    textTransform: "uppercase" as const,
    letterSpacing: "0.12em",
    color: "#facc15",
    whiteSpace: "nowrap" as const,
    alignSelf: "center",
  };

  const gridStyle = {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
    gap: "1rem",
    marginBottom: "2rem",
  } as const;

  const cardStyle = {
    background: "linear-gradient(135deg, #020617, #0b1120)",
    borderRadius: "1rem",
    padding: "1rem",
    border: "1px solid #111827",
    boxShadow: "0 18px 40px rgba(0, 0, 0, 0.6)",
  } as const;

  const cardLabelStyle = {
    fontSize: "0.7rem",
    textTransform: "uppercase" as const,
    letterSpacing: "0.14em",
    color: "#9ca3af",
    marginBottom: "0.2rem",
  };

  const cardValueStyle = {
    fontSize: "1.4rem",
    fontWeight: 600,
  } as const;

  const cardNoteStyle = {
    marginTop: "0.35rem",
    fontSize: "0.7rem",
    color: "#4ade80",
  } as const;

  const columnsStyle = {
    display: "grid",
    gridTemplateColumns: "minmax(0, 1.1fr) minmax(0, 1fr)",
    gap: "1.5rem",
  } as const;

  const panelStyle = {
    background:
      "radial-gradient(circle at top left, #1e293b 0, #020617 45%, #020617 100%)",
    borderRadius: "1.25rem",
    padding: "1rem",
    border: "1px solid #111827",
    boxShadow: "0 16px 32px rgba(0, 0, 0, 0.7)",
  } as const;

  const panelTitleStyle = {
    fontSize: "0.95rem",
    fontWeight: 600,
    marginBottom: "0.75rem",
  } as const;

  const listStyle = {
    listStyle: "none",
    padding: 0,
    margin: 0,
    display: "grid",
    gap: "0.7rem",
  } as const;

  const listItemStyle = {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: "0.75rem",
    borderBottom: "1px solid #111827",
    paddingBottom: "0.4rem",
  } as const;

  const listTitleStyle = {
    fontSize: "0.85rem",
    fontWeight: 500,
  } as const;

  const listSubStyle = {
    fontSize: "0.7rem",
    color: "#9ca3af",
    marginTop: "0.15rem",
  } as const;

  const tagBase = {
    fontSize: "0.65rem",
    padding: "0.25rem 0.55rem",
    borderRadius: "999px",
    border: "1px solid transparent",
    whiteSpace: "nowrap" as const,
  };

  const tagGreen = {
    ...tagBase,
    borderColor: "rgba(34, 197, 94, 0.6)",
    color: "#4ade80",
    background: "rgba(21, 128, 61, 0.16)",
  };

  const tagAmber = {
    ...tagBase,
    borderColor: "rgba(245, 158, 11, 0.6)",
    color: "#fbbf24",
    background: "rgba(146, 64, 14, 0.2)",
  };

  const tagBlue = {
    ...tagBase,
    borderColor: "rgba(59, 130, 246, 0.6)",
    color: "#60a5fa",
    background: "rgba(30, 64, 175, 0.22)",
  };

  const financeGridStyle = {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: "0.75rem",
    marginBottom: "0.75rem",
  } as const;

  const financeCardStyle = {
    background: "radial-gradient(circle at top, #020617, #020617)",
    borderRadius: "0.9rem",
    padding: "0.7rem 0.8rem",
    border: "1px solid #1e293b",
  } as const;

  const financeBulletsStyle = {
    margin: 0,
    paddingLeft: "1rem",
    fontSize: "0.72rem",
    color: "#9ca3af",
    display: "grid",
    gap: "0.25rem",
  } as const;

  const footerStyle = {
    marginTop: "2rem",
    fontSize: "0.7rem",
    textAlign: "center" as const,
    color: "#6b7280",
  };

  // Simple responsive tweak for small screens:
  const isSmallScreen =
    typeof window !== "undefined" && window.innerWidth < 768;
  const responsiveColumnsStyle = isSmallScreen
    ? { ...columnsStyle, gridTemplateColumns: "minmax(0, 1fr)" }
    : columnsStyle;

  const responsiveHeaderStyle = isSmallScreen
    ? { ...headerStyle, flexDirection: "column" as const }
    : headerStyle;

  return (
    <main style={pageStyle}>
      <div style={shellStyle}>
        {/* Header */}
        <header style={responsiveHeaderStyle}>
          <div>
            <h1 style={titleStyle}>Eventura – CEO Dashboard</h1>
            <p style={subtitleStyle}>
              Hardik Vekariya (CEO) · Surat, Gujarat · Events that speak your
              style
            </p>
          </div>
          <div style={pillStyle}>Cofounders: Hardik · Shubh · Dixit</div>
        </header>

        {/* Summary cards */}
        <section style={gridStyle}>
          <div style={cardStyle}>
            <p style={cardLabelStyle}>Events this month</p>
            <p style={cardValueStyle}>12</p>
            <p style={cardNoteStyle}>+4 vs last month</p>
          </div>

          <div style={cardStyle}>
            <p style={cardLabelStyle}>Expected Revenue</p>
            <p style={cardValueStyle}>₹18.5 Lakh</p>
            <p style={cardNoteStyle}>Target: ₹25 Lakh</p>
          </div>

          <div style={cardStyle}>
            <p style={cardLabelStyle}>Leads in pipeline</p>
            <p style={cardValueStyle}>23</p>
            <p style={cardNoteStyle}>7 need follow-up</p>
          </div>
        </section>

        {/* Two columns */}
        <section style={responsiveColumnsStyle}>
          {/* Upcoming events */}
          <div style={panelStyle}>
            <h2 style={panelTitleStyle}>Upcoming events (next 7 days)</h2>
            <ul style={listStyle}>
              <li style={listItemStyle}>
                <div>
                  <p style={listTitleStyle}>Patel Wedding Sangeet</p>
                  <p style={listSubStyle}>
                    14 Dec · Laxmi Farm, Surat · 450 guests
                  </p>
                </div>
                <span style={tagGreen}>Confirmed</span>
              </li>

              <li style={listItemStyle}>
                <div>
                  <p style={listTitleStyle}>Corporate Gala – XYZ Textiles</p>
                  <p style={listSubStyle}>
                    16 Dec · Taj Gateway · 220 guests
                  </p>
                </div>
                <span style={tagAmber}>Pending advance</span>
              </li>

              <li style={listItemStyle}>
                <div>
                  <p style={listTitleStyle}>Engagement – Mehta Family</p>
                  <p style={listSubStyle}>18 Dec · Indoor · 150 guests</p>
                </div>
                <span style={tagBlue}>Proposal sent</span>
              </li>
            </ul>
          </div>

          {/* Finance snapshot */}
          <div style={panelStyle}>
            <h2 style={panelTitleStyle}>Finance snapshot</h2>
            <div style={financeGridStyle}>
              <div style={financeCardStyle}>
                <p style={cardLabelStyle}>Expected income</p>
                <p style={cardValueStyle}>₹26.4 L</p>
              </div>
              <div style={financeCardStyle}>
                <p style={cardLabelStyle}>Expected expense</p>
                <p style={cardValueStyle}>₹19.2 L</p>
              </div>
            </div>
            <ul style={financeBulletsStyle}>
              <li>Vendor payments ≈ 60% of event budget</li>
              <li>Target margin: 25–30% per event</li>
              <li>Break-even: ~3 events per month</li>
            </ul>
          </div>
        </section>

        {/* Footer */}
        <footer style={footerStyle}>
          Eventura · Royal Event & Wedding Design Studio · Surat · ©{" "}
          {new Date().getFullYear()}
        </footer>
      </div>
    </main>
  );
}
