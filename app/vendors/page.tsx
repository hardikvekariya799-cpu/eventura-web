import React, { useState } from "react";

type VendorCategory =
  | "Decor"
  | "Catering"
  | "LED Wall"
  | "DJ"
  | "Photography"
  | "Logistics";

type Vendor = {
  id: string;
  name: string;
  category: VendorCategory;
  companyType: string;
  contactPerson: string;
  phone: string;
  email: string;
  gstNumber: string;
  licenseProof?: string;
  citiesServed: string[];
  crewSize: number;
  yearsExperience: number;
  basePricingRange: string;
  minBookingValue: string;
  specializationTags: string[];
  riskLevel: "Low" | "Medium" | "High";
  successRate: number; // %
  suitableBudgetRange: string;
  bestEvents: string[];
};

const MOCK_VENDORS: Vendor[] = [
  {
    id: "maa-decorators",
    name: "Maa Decorators",
    category: "Decor",
    companyType: "Partnership",
    contactPerson: "Rahul Mehta",
    phone: "+91-98765-12345",
    email: "contact@maadecorators.in",
    gstNumber: "24ABCDE1234F1Z5",
    licenseProof: "TRUSTED_VENDOR",
    citiesServed: ["Surat", "Ahmedabad", "Vapi"],
    crewSize: 18,
    yearsExperience: 7,
    basePricingRange: "₹2.5L – ₹8L",
    minBookingValue: "₹1.5L",
    specializationTags: [
      "Luxury Decor",
      "Stage Design",
      "Royal Wedding",
      "Floral Premium",
    ],
    riskLevel: "Low",
    successRate: 94,
    suitableBudgetRange: "₹5L – ₹15L",
    bestEvents: [
      "Royal Gujarati Wedding – Surat",
      "Corporate Gala – Hazira",
      "Destination Sangeet – Udaipur",
    ],
  },
  {
    id: "punjabi-caterers",
    name: "Punjab Rasoi Caterers",
    category: "Catering",
    companyType: "Proprietor",
    contactPerson: "Gurpreet Singh",
    phone: "+91-99887-66554",
    email: "orders@punjabrasoi.in",
    gstNumber: "24FGHIJ5678K1Z9",
    citiesServed: ["Surat", "Ankleshwar"],
    crewSize: 25,
    yearsExperience: 10,
    basePricingRange: "₹800 – ₹1,600 / plate",
    minBookingValue: "₹1.2L",
    specializationTags: ["Punjabi Catering", "Live Counters", "Veg + Non-Veg"],
    riskLevel: "Medium",
    successRate: 89,
    suitableBudgetRange: "₹3L – ₹12L",
    bestEvents: [
      "Punjabi Wedding – Adajan",
      "Corporate Diwali Party – Piplod",
    ],
  },
];

const TAB_LIST = [
  "Overview",
  "Pricing & Packages",
  "Contracts & Compliance",
  "Performance",
  "Inventory & Assets",
  "Availability & Scheduling",
  "Team Communication",
  "Advanced & Reports",
] as const;

type TabKey = (typeof TAB_LIST)[number];

const VendorDashboard: React.FC = () => {
  const [selectedVendorId, setSelectedVendorId] = useState(MOCK_VENDORS[0].id);
  const [activeTab, setActiveTab] = useState<TabKey>("Overview");

  const vendor = MOCK_VENDORS.find((v) => v.id === selectedVendorId)!;

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <h1 className="title">Eventura Vendor Hub</h1>
          <p className="subtitle">
            Manage vendors, contracts, pricing, compliance & AI insights in one
            place.
          </p>
        </div>
        <div className="brand-badge">
          <span className="brand-name">EVENTURA</span>
          <span className="brand-tagline">Events that speak your style</span>
        </div>
      </header>

      {/* Vendor selector + AI summary */}
      <section className="top-section">
        <div className="vendor-selector-card">
          <label className="label">Select Vendor</label>
          <select
            className="select"
            value={selectedVendorId}
            onChange={(e) => setSelectedVendorId(e.target.value)}
          >
            {MOCK_VENDORS.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name} — {v.category}
              </option>
            ))}
          </select>

          <div className="vendor-meta">
            <div>
              <span className="meta-label">Category</span>
              <span className="meta-value">{vendor.category}</span>
            </div>
            <div>
              <span className="meta-label">Crew Size</span>
              <span className="meta-value">{vendor.crewSize}</span>
            </div>
            <div>
              <span className="meta-label">Risk Level</span>
              <span className={`risk-pill risk-${vendor.riskLevel}`}>
                {vendor.riskLevel}
              </span>
            </div>
          </div>
        </div>

        <div className="ai-card">
          <div className="ai-header">
            <span className="sparkle">✨</span>
            <div>
              <p className="ai-title">AI Vendor Insights</p>
              <p className="ai-subtitle">
                Auto-generated from past events, ratings & payments.
              </p>
            </div>
          </div>
          <div className="ai-grid">
            <div>
              <p className="ai-label">Ideal For</p>
              <p className="ai-value">
                Wedding décor, Stage design, Corporate gala sets
              </p>
            </div>
            <div>
              <p className="ai-label">Best Events</p>
              <ul className="ai-list">
                {vendor.bestEvents.map((e) => (
                  <li key={e}>{e}</li>
                ))}
              </ul>
            </div>
            <div>
              <p className="ai-label">Success Rate</p>
              <p className="ai-value">{vendor.successRate}%</p>
            </div>
            <div>
              <p className="ai-label">Suitable Budget Range</p>
              <p className="ai-value">{vendor.suitableBudgetRange}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Tabs */}
      <nav className="tabs">
        {TAB_LIST.map((tab) => (
          <button
            key={tab}
            className={`tab ${activeTab === tab ? "tab-active" : ""}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab}
          </button>
        ))}
      </nav>

      {/* Main content */}
      <main className="content">
        {activeTab === "Overview" && <OverviewTab vendor={vendor} />}
        {activeTab === "Pricing & Packages" && <PricingTab vendor={vendor} />}
        {activeTab === "Contracts & Compliance" && <ContractsTab />}
        {activeTab === "Performance" && <PerformanceTab />}
        {activeTab === "Inventory & Assets" && <InventoryTab />}
        {activeTab === "Availability & Scheduling" && (
          <AvailabilityTab vendor={vendor} />
        )}
        {activeTab === "Team Communication" && <CommunicationTab />}
        {activeTab === "Advanced & Reports" && <AdvancedReportsTab />}
      </main>

      <style jsx>{`
        .page {
          min-height: 100vh;
          background: radial-gradient(circle at top, #151531 0, #050816 52%);
          color: #f9fafb;
          padding: 24px 32px 40px;
          font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI",
            sans-serif;
        }

        .page-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 16px;
          margin-bottom: 24px;
        }

        .title {
          font-size: 28px;
          font-weight: 700;
          letter-spacing: 0.04em;
        }

        .subtitle {
          margin-top: 4px;
          font-size: 13px;
          color: #9ca3af;
        }

        .brand-badge {
          border-radius: 16px;
          padding: 10px 16px;
          background: linear-gradient(135deg, #111827, #1f2937);
          border: 1px solid rgba(212, 175, 55, 0.35);
          box-shadow: 0 0 20px rgba(212, 175, 55, 0.3);
          text-align: right;
        }

        .brand-name {
          display: block;
          font-size: 14px;
          font-weight: 700;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          color: #facc15;
        }

        .brand-tagline {
          display: block;
          font-size: 11px;
          color: #e5e7eb;
        }

        .top-section {
          display: grid;
          grid-template-columns: minmax(0, 1.2fr) minmax(0, 1.6fr);
          gap: 20px;
          margin-bottom: 20px;
        }

        .vendor-selector-card,
        .ai-card {
          background: rgba(15, 23, 42, 0.9);
          border-radius: 18px;
          padding: 16px 18px;
          border: 1px solid rgba(148, 163, 184, 0.25);
          box-shadow: 0 18px 40px rgba(15, 23, 42, 0.7);
        }

        .label {
          display: block;
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.12em;
          color: #9ca3af;
          margin-bottom: 4px;
        }

        .select {
          width: 100%;
          background: #020617;
          border-radius: 10px;
          border: 1px solid rgba(148, 163, 184, 0.6);
          color: #f9fafb;
          padding: 9px 10px;
          font-size: 13px;
          outline: none;
        }

        .select:focus {
          border-color: #facc15;
          box-shadow: 0 0 0 1px rgba(250, 204, 21, 0.4);
        }

        .vendor-meta {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 10px;
          margin-top: 16px;
        }

        .meta-label {
          display: block;
          font-size: 10px;
          text-transform: uppercase;
          letter-spacing: 0.14em;
          color: #9ca3af;
          margin-bottom: 2px;
        }

        .meta-value {
          font-size: 13px;
          font-weight: 500;
        }

        .risk-pill {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 3px 10px;
          border-radius: 999px;
          font-size: 11px;
          font-weight: 600;
        }

        .risk-Low {
          background: rgba(22, 163, 74, 0.1);
          color: #4ade80;
          border: 1px solid rgba(34, 197, 94, 0.4);
        }

        .risk-Medium {
          background: rgba(245, 158, 11, 0.1);
          color: #fbbf24;
          border: 1px solid rgba(251, 191, 36, 0.4);
        }

        .risk-High {
          background: rgba(239, 68, 68, 0.12);
          color: #f97373;
          border: 1px solid rgba(248, 113, 113, 0.5);
        }

        .ai-header {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 10px;
        }

        .sparkle {
          font-size: 18px;
        }

        .ai-title {
          font-size: 13px;
          font-weight: 600;
        }

        .ai-subtitle {
          font-size: 11px;
          color: #9ca3af;
        }

        .ai-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 10px 18px;
          margin-top: 8px;
        }

        .ai-label {
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.14em;
          color: #9ca3af;
          margin-bottom: 3px;
        }

        .ai-value {
          font-size: 13px;
        }

        .ai-list {
          margin: 0;
          padding-left: 16px;
          font-size: 12px;
        }

        .tabs {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-bottom: 16px;
        }

        .tab {
          border-radius: 999px;
          border: 1px solid rgba(148, 163, 184, 0.6);
          background: rgba(15, 23, 42, 0.8);
          color: #e5e7eb;
          font-size: 12px;
          padding: 6px 12px;
          cursor: pointer;
          transition: all 0.15s ease-out;
        }

        .tab-active {
          background: linear-gradient(135deg, #fbbf24, #d4af37);
          color: #030712;
          border-color: transparent;
          box-shadow: 0 0 16px rgba(250, 204, 21, 0.3);
          font-weight: 600;
        }

        .tab:hover:not(.tab-active) {
          border-color: #facc15;
        }

        .content {
          background: rgba(15, 23, 42, 0.94);
          border-radius: 18px;
          padding: 18px 20px 22px;
          border: 1px solid rgba(148, 163, 184, 0.35);
          box-shadow: 0 24px 48px rgba(15, 23, 42, 0.8);
        }

        @media (max-width: 900px) {
          .page {
            padding: 18px 16px 28px;
          }

          .page-header {
            flex-direction: column;
          }

          .top-section {
            grid-template-columns: minmax(0, 1fr);
          }
        }
      `}</style>
    </div>
  );
};

/* ---------------- TAB 1 – OVERVIEW ---------------- */

const OverviewTab: React.FC<{ vendor: Vendor }> = ({ vendor }) => {
  return (
    <div className="tab-grid">
      <section className="card">
        <h2 className="card-title">📌 Vendor Overview</h2>
        <div className="info-grid">
          <InfoRow label="Vendor Name" value={vendor.name} />
          <InfoRow label="Category" value={vendor.category} />
          <InfoRow label="Company Type" value={vendor.companyType} />
          <InfoRow label="Contact Person" value={vendor.contactPerson} />
          <InfoRow label="Phone" value={vendor.phone} />
          <InfoRow label="Email" value={vendor.email} />
          <InfoRow label="GST / License" value={vendor.gstNumber} />
          <InfoRow
            label="Cities Served"
            value={vendor.citiesServed.join(", ")}
          />
          <InfoRow label="Crew Size" value={String(vendor.crewSize)} />
          <InfoRow
            label="Experience"
            value={`${vendor.yearsExperience}+ years`}
          />
          <InfoRow label="Base Pricing" value={vendor.basePricingRange} />
          <InfoRow
            label="Min Booking Value"
            value={vendor.minBookingValue}
          />
        </div>
        <div className="chips">
          {vendor.specializationTags.map((tag) => (
            <span key={tag} className="chip">
              {tag}
            </span>
          ))}
        </div>
      </section>

      <section className="card">
        <h2 className="card-title">🤖 Risk & Fit Score</h2>
        <div className="score-row">
          <div>
            <p className="score-label">Success Rate</p>
            <p className="score-value">{vendor.successRate}%</p>
          </div>
          <div>
            <p className="score-label">Risk Level</p>
            <p className="score-pill">{vendor.riskLevel}</p>
          </div>
          <div>
            <p className="score-label">Recommended Budget</p>
            <p className="score-value">{vendor.suitableBudgetRange}</p>
          </div>
        </div>
        <p className="score-note">
          AI will auto-match this vendor with{" "}
          <strong>wedding décor, royal setups, and corporate stages</strong>{" "}
          where risk is low and budgets align with past performance.
        </p>
        <div className="mini-links">
          <button className="link-btn">
            View linked events &rarr;
          </button>
          <button className="link-btn">
            View finance exposure &rarr;
          </button>
        </div>
      </section>

      <style jsx>{`
        .tab-grid {
          display: grid;
          grid-template-columns: minmax(0, 1.4fr) minmax(0, 1.1fr);
          gap: 16px;
        }

        .card {
          background: radial-gradient(circle at top, #020617 0, #020617 55%);
          border-radius: 14px;
          padding: 14px 14px 16px;
          border: 1px solid rgba(148, 163, 184, 0.35);
        }

        .card-title {
          font-size: 14px;
          font-weight: 600;
          margin-bottom: 10px;
        }

        .info-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 10px 20px;
          font-size: 12px;
          margin-bottom: 10px;
        }

        .chips {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
        }

        .chip {
          font-size: 11px;
          padding: 4px 8px;
          border-radius: 999px;
          background: rgba(212, 175, 55, 0.08);
          border: 1px solid rgba(212, 175, 55, 0.4);
          color: #facc15;
        }

        .score-row {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 8px;
        }

        .score-label {
          font-size: 11px;
          color: #9ca3af;
          text-transform: uppercase;
          letter-spacing: 0.12em;
        }

        .score-value {
          font-size: 14px;
          font-weight: 600;
        }

        .score-pill {
          font-size: 13px;
          font-weight: 600;
        }

        .score-note {
          margin-top: 4px;
          font-size: 12px;
          color: #e5e7eb;
        }

        .mini-links {
          display: flex;
          gap: 10px;
          margin-top: 10px;
        }

        .link-btn {
          background: transparent;
          border: none;
          padding: 0;
          font-size: 11px;
          color: #facc15;
          cursor: pointer;
          text-decoration: underline;
          text-underline-offset: 3px;
        }

        @media (max-width: 900px) {
          .tab-grid {
            grid-template-columns: minmax(0, 1fr);
          }
        }
      `}</style>
    </div>
  );
};

const InfoRow: React.FC<{ label: string; value: string }> = ({
  label,
  value,
}) => (
  <div>
    <div
      style={{
        fontSize: "10px",
        textTransform: "uppercase",
        letterSpacing: "0.14em",
        color: "#9CA3AF",
        marginBottom: 2,
      }}
    >
      {label}
    </div>
    <div style={{ fontSize: 13 }}>{value}</div>
  </div>
);

/* ---------------- TAB 2 – PRICING & PACKAGES ---------------- */

const PricingTab: React.FC<{ vendor: Vendor }> = ({ vendor }) => {
  return (
    <div className="grid">
      <section className="card">
        <h2 className="card-title">💵 Vendor Pricing Sheet</h2>
        <table className="table">
          <thead>
            <tr>
              <th>Service</th>
              <th>Type / Variant</th>
              <th>Base Price</th>
              <th>Notes</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Mandap</td>
              <td>Floral / Theme / Premium</td>
              <td>From ₹1.2L</td>
              <td>Price varies by flowers & stage size</td>
            </tr>
            <tr>
              <td>Stage</td>
              <td>Standard + LED backdrop</td>
              <td>₹80K – ₹2L</td>
              <td>Custom fabrication extra</td>
            </tr>
            <tr>
              <td>Centerpieces</td>
              <td>Floral / Crystal / LED</td>
              <td>₹800 – ₹2,000 / table</td>
              <td>Depends on decor theme</td>
            </tr>
            <tr>
              <td>Lighting</td>
              <td>Ambient + Moving Heads</td>
              <td>₹40K – ₹1.5L</td>
              <td>Excl. generator & truss rental</td>
            </tr>
            <tr>
              <td>Transport</td>
              <td>Local + Outstation</td>
              <td>₹5K – ₹45K</td>
              <td>KM-based slab pricing</td>
            </tr>
            <tr>
              <td>Artists / Performers</td>
              <td>Anchor / Folk / Celebrity</td>
              <td>₹25K – On Request</td>
              <td>Celebrity subject to availability</td>
            </tr>
          </tbody>
        </table>
        <p className="hint">
          These are **master rates**. Final client quote will apply tiered logic
          + seasonal & destination surcharges.
        </p>
      </section>

      <section className="card">
        <h2 className="card-title">⭐ Tiered Pricing Logic</h2>
        <ul className="list">
          <li>
            <strong>Weekday vs Weekend:</strong> +5–12% extra on Fri–Sun and
            auspicious wedding dates.
          </li>
          <li>
            <strong>Seasonal Rates:</strong> +15–25% for peak wedding months
            (Nov–Feb, May).
          </li>
          <li>
            <strong>Destination Surcharge:</strong> Travel + stay + 10–15% ops
            fee added for outstation events.
          </li>
        </ul>

        <div className="divider" />

        <h3 className="subheading">🤖 Price Forecasting (AI)</h3>
        <p className="text">
          AI analyzes last 12 months of bookings, demand and vendor revisions to
          predict:
        </p>
        <ul className="list">
          <li>Expected price increase for upcoming season</li>
          <li>Vendors likely to raise rates suddenly</li>
          <li>Recommended buffer for quotation (e.g. +8% safety margin)</li>
        </ul>

        <div className="alert">
          Example: For this vendor, system expects{" "}
          <strong>~10–14% cost increase</strong> for Nov–Dec weddings vs
          off-season.
        </div>
      </section>

      <style jsx>{`
        .grid {
          display: grid;
          grid-template-columns: minmax(0, 1.3fr) minmax(0, 1.1fr);
          gap: 16px;
        }

        .card {
          background: #020617;
          border-radius: 14px;
          padding: 14px 14px 16px;
          border: 1px solid rgba(148, 163, 184, 0.35);
        }

        .card-title {
          font-size: 14px;
          font-weight: 600;
          margin-bottom: 10px;
        }

        .table {
          width: 100%;
          border-collapse: collapse;
          font-size: 11.5px;
        }

        th,
        td {
          border-bottom: 1px solid rgba(55, 65, 81, 0.7);
          padding: 6px 6px;
          text-align: left;
        }

        th {
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.12em;
          color: #9ca3af;
        }

        .hint {
          margin-top: 8px;
          font-size: 11px;
          color: #9ca3af;
        }

        .list {
          font-size: 12px;
          padding-left: 18px;
          margin: 4px 0;
        }

        .divider {
          height: 1px;
          background: rgba(55, 65, 81, 0.9);
          margin: 10px 0;
        }

        .subheading {
          font-size: 13px;
          font-weight: 600;
          margin-bottom: 4px;
        }

        .text {
          font-size: 12px;
          margin-bottom: 4px;
        }

        .alert {
          margin-top: 10px;
          font-size: 12px;
          border-radius: 10px;
          padding: 8px 10px;
          background: rgba(250, 204, 21, 0.05);
          border: 1px dashed rgba(250, 204, 21, 0.7);
          color: #fef9c3;
        }

        @media (max-width: 900px) {
          .grid {
            grid-template-columns: minmax(0, 1fr);
          }
        }
      `}</style>
    </div>
  );
};

/* ---------------- TAB 3 – CONTRACTS & COMPLIANCE ---------------- */

const ContractsTab: React.FC = () => {
  return (
    <div className="wrap">
      <section className="card">
        <h2 className="card-title">📄 Contracts & Documents</h2>
        <ul className="list">
          <li>Contract PDF (Master Agreement & Event-specific annexures)</li>
          <li>Rate Cards & Package Lists</li>
          <li>MOUs & Long-term Retainer Documents</li>
          <li>Warranties on equipment / decor items</li>
          <li>License / Insurance validity dates</li>
        </ul>
        <button className="btn">Upload / View Contract</button>
      </section>

      <section className="card">
        <h2 className="card-title">⭐ Contract Expiry Alerts</h2>
        <p className="text">
          System scans all vendor contracts and triggers alerts such as:
        </p>
        <div className="alert">
          “Vendor contract expiring in <strong>24 days</strong>. Renew now?”
        </div>
        <p className="text">
          Alerts are visible in CEO dashboard, Vendor tab, and optional email /
          WhatsApp notifications.
        </p>

        <div className="divider" />

        <h3 className="subheading">🤖 Auto-Check for Missing Clauses (AI)</h3>
        <ul className="list">
          <li>Cancellation policy</li>
          <li>Refund terms</li>
          <li>Penalties & late arrival clauses</li>
          <li>Delivery & setup obligations</li>
          <li>Payment schedule & GST details</li>
        </ul>
        <p className="text">
          AI highlights missing or weak clauses and suggests edits before
          contract is approved by CEO.
        </p>
      </section>

      <style jsx>{`
        .wrap {
          display: grid;
          grid-template-columns: minmax(0, 1.1fr) minmax(0, 1.2fr);
          gap: 16px;
        }

        .card {
          background: #020617;
          border-radius: 14px;
          padding: 14px 14px 16px;
          border: 1px solid rgba(148, 163, 184, 0.35);
        }

        .card-title {
          font-size: 14px;
          font-weight: 600;
          margin-bottom: 10px;
        }

        .list {
          font-size: 12px;
          padding-left: 18px;
        }

        .btn {
          margin-top: 10px;
          padding: 7px 14px;
          border-radius: 999px;
          border: none;
          font-size: 12px;
          font-weight: 500;
          cursor: pointer;
          background: linear-gradient(135deg, #fbbf24, #d4af37);
          color: #030712;
        }

        .text {
          font-size: 12px;
        }

        .alert {
          margin: 8px 0 10px;
          font-size: 12px;
          border-radius: 10px;
          padding: 8px 10px;
          background: rgba(34, 197, 94, 0.08);
          border: 1px dashed rgba(34, 197, 94, 0.6);
          color: #bbf7d0;
        }

        .divider {
          height: 1px;
          background: rgba(55, 65, 81, 0.9);
          margin: 10px 0;
        }

        .subheading {
          font-size: 13px;
          font-weight: 600;
          margin-bottom: 4px;
        }

        @media (max-width: 900px) {
          .wrap {
            grid-template-columns: minmax(0, 1fr);
          }
        }
      `}</style>
    </div>
  );
};

/* ---------------- TAB 4 – PERFORMANCE ---------------- */

const PerformanceTab: React.FC = () => {
  return (
    <div className="wrap">
      <section className="card">
        <h2 className="card-title">📊 Vendor Scorecard</h2>
        <table className="table">
          <thead>
            <tr>
              <th>Metric</th>
              <th>Score</th>
              <th>Notes</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>On-Time Delivery</td>
              <td>95%</td>
              <td>1 late arrival this season</td>
            </tr>
            <tr>
              <td>Design Accuracy</td>
              <td>90%</td>
              <td>Matches moodboard 9/10 events</td>
            </tr>
            <tr>
              <td>Client Satisfaction</td>
              <td>4.7 / 5</td>
              <td>Excellent</td>
            </tr>
            <tr>
              <td>Professional Behavior</td>
              <td>5 / 5</td>
              <td>Team highly cooperative</td>
            </tr>
            <tr>
              <td>Price Stability</td>
              <td>80%</td>
              <td>Minor seasonal increases</td>
            </tr>
            <tr>
              <td>Material Quality</td>
              <td>92%</td>
              <td>Good inventory</td>
            </tr>
          </tbody>
        </table>
        <p className="text">
          These scores are calculated from internal feedback forms, client
          reviews and event post-mortems.
        </p>
      </section>

      <section className="card">
        <h2 className="card-title">📈 Trends & Events</h2>
        <div className="fake-chart">
          <span>Performance trend line (placeholder)</span>
        </div>
        <ul className="list">
          <li>Events handled this year: <strong>18</strong></li>
          <li>Events cancelled: <strong>0</strong></li>
          <li>Events with issues logged: <strong>2</strong></li>
        </ul>
        <button className="btn">Open full analytics view</button>
      </section>

      <style jsx>{`
        .wrap {
          display: grid;
          grid-template-columns: minmax(0, 1.3fr) minmax(0, 1.1fr);
          gap: 16px;
        }

        .card {
          background: #020617;
          border-radius: 14px;
          padding: 14px 14px 16px;
          border: 1px solid rgba(148, 163, 184, 0.35);
        }

        .card-title {
          font-size: 14px;
          font-weight: 600;
          margin-bottom: 10px;
        }

        .table {
          width: 100%;
          border-collapse: collapse;
          font-size: 11.5px;
        }

        th,
        td {
          border-bottom: 1px solid rgba(55, 65, 81, 0.7);
          padding: 6px 6px;
          text-align: left;
        }

        th {
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.12em;
          color: #9ca3af;
        }

        .text {
          margin-top: 8px;
          font-size: 12px;
        }

        .fake-chart {
          margin-bottom: 10px;
          height: 120px;
          border-radius: 10px;
          border: 1px dashed rgba(148, 163, 184, 0.6);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 11px;
          color: #9ca3af;
        }

        .list {
          font-size: 12px;
          padding-left: 18px;
        }

        .btn {
          margin-top: 10px;
          padding: 7px 14px;
          border-radius: 999px;
          border: none;
          font-size: 12px;
          font-weight: 500;
          cursor: pointer;
          background: linear-gradient(135deg, #4ade80, #22c55e);
          color: #022c22;
        }

        @media (max-width: 900px) {
          .wrap {
            grid-template-columns: minmax(0, 1fr);
          }
        }
      `}</style>
    </div>
  );
};

/* ---------------- TAB 5 – INVENTORY & ASSETS ---------------- */

const InventoryTab: React.FC = () => {
  return (
    <div className="card">
      <h2 className="card-title">📦 Vendor Inventory & Assets</h2>
      <table className="table">
        <thead>
          <tr>
            <th>Type</th>
            <th>Item</th>
            <th>Availability</th>
            <th>Condition</th>
            <th>Replacement Cost</th>
            <th>Maintenance Log</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Props</td>
            <td>Royal Backdrop Frames (x6)</td>
            <td>Available</td>
            <td>Good</td>
            <td>₹80,000</td>
            <td>Polished Feb 2025</td>
          </tr>
          <tr>
            <td>Backdrops</td>
            <td>LED Panel Wall 24ft</td>
            <td>Booked 3–5 Dec</td>
            <td>Excellent</td>
            <td>₹3,50,000</td>
            <td>Serviced Jan 2025</td>
          </tr>
          <tr>
            <td>Lights</td>
            <td>Moving Head Lights (x12)</td>
            <td>Available</td>
            <td>Good</td>
            <td>₹2,40,000</td>
            <td>Repair scheduled March 2025</td>
          </tr>
          <tr>
            <td>Furniture</td>
            <td>Gold Chiavari Chairs (x200)</td>
            <td>Available</td>
            <td>Needs touch-up</td>
            <td>₹1,60,000</td>
            <td>Paint touch-up pending</td>
          </tr>
          <tr>
            <td>Florals</td>
            <td>Silk Floral Garlands (x150)</td>
            <td>Available</td>
            <td>Good</td>
            <td>₹90,000</td>
            <td>Washed & stored Dec 2024</td>
          </tr>
        </tbody>
      </table>
      <p className="text">
        This tab links to asset depreciation, insurance, and replacement
        planning in the **Finance** module.
      </p>

      <style jsx>{`
        .card {
          background: #020617;
          border-radius: 14px;
          padding: 14px 14px 16px;
          border: 1px solid rgba(148, 163, 184, 0.35);
        }

        .card-title {
          font-size: 14px;
          font-weight: 600;
          margin-bottom: 10px;
        }

        .table {
          width: 100%;
          border-collapse: collapse;
          font-size: 11.5px;
        }

        th,
        td {
          border-bottom: 1px solid rgba(55, 65, 81, 0.7);
          padding: 6px 6px;
          text-align: left;
        }

        th {
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.12em;
          color: #9ca3af;
        }

        .text {
          margin-top: 8px;
          font-size: 12px;
        }
      `}</style>
    </div>
  );
};

/* ---------------- TAB 6 – AVAILABILITY & SCHEDULING ---------------- */

const AvailabilityTab: React.FC<{ vendor: Vendor }> = ({ vendor }) => {
  return (
    <div className="wrap">
      <section className="card">
        <h2 className="card-title">📅 Availability Calendar</h2>
        <div className="fake-calendar">
          <span>Calendar integration placeholder (events ⬌ vendor)</span>
        </div>
        <ul className="list">
          <li>Shows Eventura event dates with this vendor assigned</li>
          <li>Highlights public holidays & peak wedding seasons</li>
          <li>Flags **double booking risk** and blocked dates</li>
        </ul>
      </section>

      <section className="card">
        <h2 className="card-title">⚠ Risk Indicators</h2>
        <ul className="list">
          <li>Double booking risk (red flag if same slot booked twice)</li>
          <li>Last-minute cancellation risk (past history + pattern)</li>
          <li>Delayed arrival risk for far locations</li>
        </ul>
        <div className="alert">
          Example: Vendor has <strong>0 cancellations</strong> in last 12
          months. Risk currently **LOW**.
        </div>
        <p className="text">
          This tab connects directly to **Event Calendar** and **HR scheduling**
          (crew allocation) so CEO can view full picture.
        </p>
      </section>

      <style jsx>{`
        .wrap {
          display: grid;
          grid-template-columns: minmax(0, 1.2fr) minmax(0, 1.1fr);
          gap: 16px;
        }

        .card {
          background: #020617;
          border-radius: 14px;
          padding: 14px 14px 16px;
          border: 1px solid rgba(148, 163, 184, 0.35);
        }

        .card-title {
          font-size: 14px;
          font-weight: 600;
          margin-bottom: 10px;
        }

        .fake-calendar {
          margin-bottom: 10px;
          height: 160px;
          border-radius: 10px;
          border: 1px dashed rgba(148, 163, 184, 0.6);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 11px;
          color: #9ca3af;
        }

        .list {
          font-size: 12px;
          padding-left: 18px;
        }

        .alert {
          margin-top: 8px;
          font-size: 12px;
          border-radius: 10px;
          padding: 8px 10px;
          background: rgba(248, 250, 252, 0.02);
          border: 1px dashed rgba(248, 113, 113, 0.6);
          color: #fecaca;
        }

        .text {
          margin-top: 8px;
          font-size: 12px;
        }

        @media (max-width: 900px) {
          .wrap {
            grid-template-columns: minmax(0, 1fr);
          }
        }
      `}</style>
    </div>
  );
};

/* ---------------- TAB 7 – TEAM COMMUNICATION ---------------- */

const CommunicationTab: React.FC = () => {
  return (
    <div className="wrap">
      <section className="card">
        <h2 className="card-title">🧑‍🤝‍🧑 Internal Notes</h2>
        <ul className="list">
          <li>Past issues (e.g., late setup, misalignment with design)</li>
          <li>Strengths (e.g., very fast setup, flexible with last-minute changes)</li>
          <li>Special instructions (don’t allow direct pricing with client, etc.)</li>
          <li>Payment disputes & resolution notes</li>
        </ul>
        <textarea
          className="textarea"
          placeholder="Add or review internal notes for this vendor..."
        />
      </section>

      <section className="card">
        <h2 className="card-title">💬 Communication Log</h2>
        <p className="text">
          Connects with **email / WhatsApp API** (log only, sending handled by
          your communication layer).
        </p>
        <div className="log-box">
          <div className="log-item">
            <span className="log-meta">WhatsApp • 12 Feb</span>
            <p>Shared revised stage layout and confirmed delivery time.</p>
          </div>
          <div className="log-item">
            <span className="log-meta">Email • 05 Feb</span>
            <p>Sent PO & 40% advance confirmation for Aditi Wedding.</p>
          </div>
        </div>
        <button className="btn">Open full conversation history</button>
      </section>

      <style jsx>{`
        .wrap {
          display: grid;
          grid-template-columns: minmax(0, 1.2fr) minmax(0, 1.1fr);
          gap: 16px;
        }

        .card {
          background: #020617;
          border-radius: 14px;
          padding: 14px 14px 16px;
          border: 1px solid rgba(148, 163, 184, 0.35);
        }

        .card-title {
          font-size: 14px;
          font-weight: 600;
          margin-bottom: 10px;
        }

        .list {
          font-size: 12px;
          padding-left: 18px;
        }

        .textarea {
          margin-top: 8px;
          width: 100%;
          min-height: 80px;
          border-radius: 10px;
          border: 1px solid rgba(148, 163, 184, 0.7);
          background: #020617;
          color: #e5e7eb;
          padding: 8px 9px;
          font-size: 12px;
          resize: vertical;
        }

        .log-box {
          margin-top: 8px;
          border-radius: 10px;
          border: 1px solid rgba(55, 65, 81, 0.9);
          max-height: 160px;
          overflow-y: auto;
          padding: 8px 9px;
          background: rgba(15, 23, 42, 0.9);
        }

        .log-item + .log-item {
          margin-top: 8px;
          padding-top: 6px;
          border-top: 1px solid rgba(31, 41, 55, 0.8);
        }

        .log-meta {
          font-size: 10px;
          text-transform: uppercase;
          letter-spacing: 0.12em;
          color: #9ca3af;
        }

        .log-item p {
          font-size: 12px;
          margin: 2px 0 0;
        }

        .btn {
          margin-top: 10px;
          padding: 7px 14px;
          border-radius: 999px;
          border: none;
          font-size: 12px;
          font-weight: 500;
          cursor: pointer;
          background: linear-gradient(135deg, #38bdf8, #0ea5e9);
          color: #02131f;
        }

        .text {
          font-size: 12px;
        }

        @media (max-width: 900px) {
          .wrap {
            grid-template-columns: minmax(0, 1fr);
          }
        }
      `}</style>
    </div>
  );
};

/* ---------------- TAB 8 – ADVANCED + REPORTS ---------------- */

const AdvancedReportsTab: React.FC = () => {
  return (
    <div className="grid">
      <section className="card">
        <h2 className="card-title">🤖 Vendor Auto-Matching</h2>
        <p className="text">
          System suggests vendors based on event type, budget, location,
          design style, past success and availability.
        </p>
        <div className="example">
          “Recommended: <strong>Maa Decorators</strong> –{" "}
          <strong>92% match</strong> for Royal Wedding, Budget 5–8L”
        </div>

        <h3 className="subheading">Vendor Comparison Engine</h3>
        <table className="table">
          <thead>
            <tr>
              <th>Feature</th>
              <th>Vendor A</th>
              <th>Vendor B</th>
              <th>Vendor C</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Price</td>
              <td>₹3.4L</td>
              <td>₹3L</td>
              <td>₹3.8L</td>
            </tr>
            <tr>
              <td>Reliability</td>
              <td>95%</td>
              <td>80%</td>
              <td>90%</td>
            </tr>
            <tr>
              <td>Quality</td>
              <td>★★★★★</td>
              <td>★★★★☆</td>
              <td>★★★★★</td>
            </tr>
            <tr>
              <td>Speed</td>
              <td>Fast</td>
              <td>Moderate</td>
              <td>Fast</td>
            </tr>
            <tr>
              <td>Risk</td>
              <td>Low</td>
              <td>Medium</td>
              <td>Low</td>
            </tr>
          </tbody>
        </table>
      </section>

      <section className="card">
        <h2 className="card-title">💰 Billing, Wallet & Compliance</h2>
        <h3 className="subheading">Vendor Billing Automation</h3>
        <ul className="list">
          <li>Auto-calculate advance, milestone and final payment</li>
          <li>Show pending payouts and overdue alerts</li>
          <li>Sync with Finance tab (cash flow, general ledger)</li>
        </ul>

        <h3 className="subheading">Vendor Wallet Balance</h3>
        <ul className="list">
          <li>Current event payable</li>
          <li>Past events outstanding</li>
          <li>Disputes / on-hold amounts</li>
        </ul>

        <div className="divider" />

        <h3 className="subheading">🛡 Compliance & Fraud Prevention</h3>
        <ul className="list">
          <li>Flags different price given to different staff</li>
          <li>Detects sudden quotation changes & double charging</li>
          <li>Checks for hidden clauses in contracts</li>
        </ul>
        <div className="alert">
          Vendor Fraud Checker (AI) + Blacklist system. High-risk vendors can
          be blocked from assignment, with CEO override only.
        </div>

        <div className="divider" />

        <h3 className="subheading">📊 Vendor Analytics</h3>
        <ul className="list">
          <li>Most profitable vendors</li>
          <li>Worst performing vendors</li>
          <li>City-wise vendor cost trends</li>
          <li>Cost overruns by category</li>
          <li>Vendor usage distribution</li>
          <li>Payment cycle analysis & peak season performance</li>
        </ul>
      </section>

      <style jsx>{`
        .grid {
          display: grid;
          grid-template-columns: minmax(0, 1.3fr) minmax(0, 1.1fr);
          gap: 16px;
        }

        .card {
          background: #020617;
          border-radius: 14px;
          padding: 14px 14px 16px;
          border: 1px solid rgba(148, 163, 184, 0.35);
        }

        .card-title {
          font-size: 14px;
          font-weight: 600;
          margin-bottom: 10px;
        }

        .subheading {
          font-size: 13px;
          font-weight: 600;
          margin: 10px 0 4px;
        }

        .text {
          font-size: 12px;
        }

        .example {
          margin: 8px 0 10px;
          font-size: 12px;
          border-radius: 10px;
          padding: 8px 10px;
          background: rgba(250, 204, 21, 0.05);
          border: 1px dashed rgba(250, 204, 21, 0.7);
          color: #fef9c3;
        }

        .table {
          width: 100%;
          border-collapse: collapse;
          font-size: 11.5px;
          margin-top: 6px;
        }

        th,
        td {
          border-bottom: 1px solid rgba(55, 65, 81, 0.7);
          padding: 6px 6px;
          text-align: left;
        }

        th {
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.12em;
          color: #9ca3af;
        }

        .list {
          font-size: 12px;
          padding-left: 18px;
        }

        .divider {
          height: 1px;
          background: rgba(55, 65, 81, 0.9);
          margin: 10px 0;
        }

        .alert {
          margin-top: 8px;
          font-size: 12px;
          border-radius: 10px;
          padding: 8px 10px;
          background: rgba(248, 250, 252, 0.02);
          border: 1px dashed rgba(248, 113, 113, 0.6);
          color: #fecaca;
        }

        @media (max-width: 900px) {
          .grid {
            grid-template-columns: minmax(0, 1fr);
          }
        }
      `}</style>
    </div>
  );
};

export default VendorDashboard;
