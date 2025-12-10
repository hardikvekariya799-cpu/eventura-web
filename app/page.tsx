// pages/index.tsx
import { useState } from "react";

type Section =
  | "dashboard"
  | "events"
  | "calendar"
  | "clients"
  | "vendors"
  | "finance"
  | "hr"
  | "inventory"
  | "reports"
  | "settings";

type FinanceState = {
  eventRevenue: number;
  otherIncome: number;
  fixedCosts: number;
  variableCosts: number;
  taxRate: number;
};

export default function Home() {
  const [activeSection, setActiveSection] = useState<Section>("dashboard");

  const [finance, setFinance] = useState<FinanceState>({
    eventRevenue: 500000, // example default values (in ₹)
    otherIncome: 50000,
    fixedCosts: 265000,
    variableCosts: 150000,
    taxRate: 18,
  });

  const totalIncome = finance.eventRevenue + finance.otherIncome;
  const totalExpenses = finance.fixedCosts + finance.variableCosts;
  const profitBeforeTax = totalIncome - totalExpenses;
  const taxAmount = profitBeforeTax > 0 ? (profitBeforeTax * finance.taxRate) / 100 : 0;
  const netProfit = profitBeforeTax - taxAmount;
  const profitMargin = totalIncome > 0 ? (netProfit / totalIncome) * 100 : 0;

  const handleFinanceChange = (field: keyof FinanceState, value: string) => {
    const clean = value.replace(/,/g, "");
    const num = clean === "" ? 0 : Number(clean);
    if (isNaN(num)) return;
    setFinance((prev) => ({ ...prev, [field]: num }));
  };

  const navItems: { id: Section; label: string }[] = [
    { id: "dashboard", label: "Dashboard" },
    { id: "events", label: "Events" },
    { id: "calendar", label: "Calendar" },
    { id: "clients", label: "Clients & Leads" },
    { id: "vendors", label: "Vendors" },
    { id: "finance", label: "Finance" },
    { id: "hr", label: "HR & Team" },
    { id: "inventory", label: "Inventory & Assets" },
    { id: "reports", label: "Reports & Analytics" },
    { id: "settings", label: "Settings & Access" },
  ];

  return (
    <>
      <div className="app">
        {/* Sidebar */}
        <aside className="sidebar">
          <div className="sidebar-logo">
            <div className="logo-circle">E</div>
            <div>
              <div className="logo-title">Eventura OS</div>
              <div className="logo-subtitle">Events that speak your style</div>
            </div>
          </div>
          <div className="sidebar-location">
            <span className="dot" /> Surat / Ahmedabad / Rajkot
          </div>
          <nav className="sidebar-nav">
            {navItems.map((item) => (
              <button
                key={item.id}
                className={
                  "nav-item" +
                  (activeSection === item.id ? " nav-item-active" : "")
                }
                onClick={() => setActiveSection(item.id)}
              >
                {item.label}
              </button>
            ))}
          </nav>
        </aside>

        {/* Main layout */}
        <div className="main">
          {/* Top bar */}
          <header className="topbar">
            <div className="topbar-left">
              <input
                className="search"
                placeholder="Search events, clients, vendors..."
              />
            </div>
            <div className="topbar-right">
              <button className="pill">New Lead</button>
              <button className="pill">New Event</button>
              <div className="user-chip">
                <span className="user-avatar">H</span>
                <div>
                  <div className="user-name">Hardik Vekariya</div>
                  <div className="user-role">CEO, Eventura</div>
                </div>
              </div>
            </div>
          </header>

          {/* Content */}
          <main className="content">
            {activeSection === "dashboard" && (
              <DashboardSection
                onNavigate={setActiveSection}
                totalIncome={totalIncome}
                totalExpenses={totalExpenses}
                netProfit={netProfit}
                profitMargin={profitMargin}
              />
            )}

            {activeSection === "events" && <EventsSection />}

            {activeSection === "calendar" && <CalendarSection />}

            {activeSection === "clients" && <ClientsSection />}

            {activeSection === "vendors" && <VendorsSection />}

            {activeSection === "finance" && (
              <FinanceSection
                finance={finance}
                onChange={handleFinanceChange}
                totalIncome={totalIncome}
                totalExpenses={totalExpenses}
                netProfit={netProfit}
                profitMargin={profitMargin}
              />
            )}

            {activeSection === "hr" && <HRSection />}

            {activeSection === "inventory" && <InventorySection />}

            {activeSection === "reports" && <ReportsSection />}

            {activeSection === "settings" && <SettingsSection />}
          </main>
        </div>
      </div>

      {/* Styles */}
      <style jsx global>{`
        :root {
          --bg: #050816;
          --bg-soft: #0b1020;
          --bg-card: #111827;
          --accent: #facc15;
          --accent-soft: rgba(250, 204, 21, 0.16);
          --accent-alt: #eab308;
          --text: #f9fafb;
          --text-soft: #9ca3af;
          --border-subtle: rgba(148, 163, 184, 0.3);
          --danger: #f97373;
          --success: #22c55e;
        }

        * {
          box-sizing: border-box;
        }

        body {
          margin: 0;
          font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI",
            sans-serif;
          background: radial-gradient(circle at top, #1f2937 0, #020617 40%);
          color: var(--text);
        }

        .app {
          display: flex;
          min-height: 100vh;
        }

        .sidebar {
          width: 260px;
          background: linear-gradient(180deg, #020617 0, #020617 40%, #030712 100%);
          border-right: 1px solid rgba(148, 163, 184, 0.25);
          padding: 18px 16px;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .sidebar-logo {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 8px;
        }

        .logo-circle {
          width: 38px;
          height: 38px;
          border-radius: 999px;
          background: radial-gradient(circle at 30% 20%, #fde68a, #facc15);
          display: flex;
          align-items: center;
          justify-content: center;
          color: #111827;
          font-weight: 800;
          font-size: 20px;
          box-shadow: 0 0 25px rgba(250, 204, 21, 0.5);
        }

        .logo-title {
          font-weight: 700;
          letter-spacing: 0.06em;
          font-size: 15px;
          text-transform: uppercase;
        }

        .logo-subtitle {
          font-size: 11px;
          color: var(--text-soft);
        }

        .sidebar-location {
          font-size: 11px;
          color: var(--text-soft);
          padding: 8px 10px;
          border-radius: 999px;
          background: rgba(15, 23, 42, 0.8);
          border: 1px solid rgba(148, 163, 184, 0.3);
          display: inline-flex;
          align-items: center;
          gap: 6px;
        }

        .dot {
          width: 8px;
          height: 8px;
          border-radius: 999px;
          background: #22c55e;
          box-shadow: 0 0 10px rgba(34, 197, 94, 0.8);
        }

        .sidebar-nav {
          margin-top: 8px;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .nav-item {
          width: 100%;
          text-align: left;
          padding: 8px 10px;
          border-radius: 8px;
          border: 1px solid transparent;
          background: transparent;
          color: var(--text-soft);
          font-size: 13px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: space-between;
          transition: all 0.15s ease;
        }

        .nav-item:hover {
          background: rgba(15, 23, 42, 0.9);
          border-color: rgba(148, 163, 184, 0.6);
          color: var(--text);
        }

        .nav-item-active {
          background: linear-gradient(
            90deg,
            rgba(250, 204, 21, 0.16),
            rgba(17, 24, 39, 0.9)
          );
          border-color: rgba(250, 204, 21, 0.6);
          color: var(--accent);
        }

        .main {
          flex: 1;
          display: flex;
          flex-direction: column;
        }

        .topbar {
          height: 64px;
          border-bottom: 1px solid rgba(148, 163, 184, 0.2);
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 18px;
          backdrop-filter: blur(16px);
          background: linear-gradient(
            90deg,
            rgba(15, 23, 42, 0.86),
            rgba(15, 23, 42, 0.6)
          );
        }

        .topbar-left {
          flex: 1;
        }

        .search {
          width: 100%;
          max-width: 420px;
          padding: 8px 10px;
          border-radius: 999px;
          border: 1px solid rgba(148, 163, 184, 0.5);
          background: rgba(15, 23, 42, 0.9);
          color: var(--text);
          font-size: 13px;
        }

        .search::placeholder {
          color: #6b7280;
        }

        .topbar-right {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .pill {
          border-radius: 999px;
          border: 1px solid rgba(148, 163, 184, 0.5);
          background: rgba(15, 23, 42, 0.9);
          padding: 6px 10px;
          font-size: 12px;
          color: var(--text);
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .pill:hover {
          border-color: var(--accent-alt);
          box-shadow: 0 0 16px rgba(250, 204, 21, 0.35);
        }

        .user-chip {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 4px 8px;
          border-radius: 999px;
          border: 1px solid rgba(148, 163, 184, 0.4);
          background: rgba(15, 23, 42, 0.96);
        }

        .user-avatar {
          width: 28px;
          height: 28px;
          border-radius: 999px;
          background: radial-gradient(circle at 25% 15%, #bfdbfe, #1d4ed8);
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          font-size: 14px;
        }

        .user-name {
          font-size: 12px;
          font-weight: 600;
        }

        .user-role {
          font-size: 10px;
          color: var(--text-soft);
        }

        .content {
          flex: 1;
          padding: 18px;
          overflow-y: auto;
          background: radial-gradient(circle at top, #111827 0, #020617 55%);
        }

        .section-header {
          display: flex;
          justify-content: space-between;
          align-items: baseline;
          margin-bottom: 12px;
        }

        .section-title {
          font-size: 20px;
          font-weight: 600;
        }

        .section-subtitle {
          font-size: 12px;
          color: var(--text-soft);
        }

        .grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 12px;
        }

        .card {
          padding: 12px;
          border-radius: 14px;
          background: radial-gradient(circle at top, #111827 0, #020617 90%);
          border: 1px solid rgba(148, 163, 184, 0.35);
          box-shadow: 0 18px 45px rgba(15, 23, 42, 0.9);
        }

        .card-soft {
          padding: 12px;
          border-radius: 14px;
          background: rgba(15, 23, 42, 0.9);
          border: 1px dashed rgba(148, 163, 184, 0.4);
        }

        .card-label {
          font-size: 11px;
          color: var(--text-soft);
          margin-bottom: 4px;
        }

        .card-value {
          font-size: 18px;
          font-weight: 600;
        }

        .card-pill {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 3px 7px;
          border-radius: 999px;
          font-size: 10px;
        }

        .pill-green {
          background: rgba(34, 197, 94, 0.14);
          color: var(--success);
        }

        .pill-red {
          background: rgba(248, 113, 113, 0.14);
          color: var(--danger);
        }

        .dashboard-buttons {
          margin-top: 16px;
        }

        .dashboard-button-card {
          padding: 14px 12px;
          border-radius: 16px;
          background: radial-gradient(circle at 0 0, rgba(250, 204, 21, 0.18), #020617 55%);
          border: 1px solid rgba(148, 163, 184, 0.6);
          cursor: pointer;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          gap: 8px;
          transition: transform 0.15s ease, box-shadow 0.15s ease,
            border-color 0.15s ease;
        }

        .dashboard-button-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 18px 40px rgba(15, 23, 42, 0.9);
          border-color: var(--accent-alt);
        }

        .db-btn-title {
          font-size: 14px;
          font-weight: 600;
        }

        .db-btn-subtitle {
          font-size: 11px;
          color: var(--text-soft);
        }

        .small-label {
          font-size: 10px;
          color: var(--text-soft);
        }

        .small-value {
          font-size: 12px;
          font-weight: 500;
        }

        .section-body {
          display: grid;
          grid-template-columns: minmax(0, 2fr) minmax(0, 1.2fr);
          gap: 16px;
        }

        .section-body-single {
          display: block;
        }

        .field-group {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
          gap: 10px;
          margin-bottom: 12px;
        }

        .field-label {
          font-size: 11px;
          color: var(--text-soft);
          margin-bottom: 3px;
        }

        .field-input {
          width: 100%;
          padding: 7px 9px;
          border-radius: 10px;
          border: 1px solid rgba(148, 163, 184, 0.5);
          background: rgba(15, 23, 42, 0.95);
          color: var(--text);
          font-size: 13px;
        }

        .tabs {
          display: inline-flex;
          padding: 3px;
          border-radius: 999px;
          background: rgba(15, 23, 42, 0.9);
          border: 1px solid rgba(148, 163, 184, 0.4);
          font-size: 12px;
          margin-top: 8px;
        }

        .tab {
          border-radius: 999px;
          padding: 4px 10px;
          cursor: pointer;
          border: none;
          background: transparent;
          color: var(--text-soft);
        }

        .tab-active {
          background: radial-gradient(circle at top, #facc15, #eab308);
          color: #111827;
          font-weight: 600;
        }

        .placeholder {
          padding: 14px;
          border-radius: 14px;
          border: 1px dashed rgba(148, 163, 184, 0.5);
          background: rgba(15, 23, 42, 0.85);
          font-size: 13px;
          color: var(--text-soft);
        }

        @media (max-width: 900px) {
          .sidebar {
            display: none;
          }
          .topbar {
            position: sticky;
            top: 0;
            z-index: 10;
          }
          .section-body {
            grid-template-columns: minmax(0, 1fr);
          }
        }
      `}</style>
    </>
  );
}

/* ---------- DASHBOARD ---------- */

type DashboardProps = {
  onNavigate: (section: Section) => void;
  totalIncome: number;
  totalExpenses: number;
  netProfit: number;
  profitMargin: number;
};

function DashboardSection({
  onNavigate,
  totalIncome,
  totalExpenses,
  netProfit,
  profitMargin,
}: DashboardProps) {
  const positive = netProfit >= 0;

  const formatMoney = (v: number) =>
    "₹" + v.toLocaleString("en-IN", { maximumFractionDigits: 0 });

  return (
    <>
      <div className="section-header">
        <div>
          <div className="section-title">Command Center</div>
          <div className="section-subtitle">
            Live overview of Eventura — events, money, team and more.
          </div>
        </div>
      </div>

      <div className="grid">
        <div className="card">
          <div className="card-label">Total Monthly Income</div>
          <div className="card-value">{formatMoney(totalIncome)}</div>
          <div className="card-pill pill-green" style={{ marginTop: 6 }}>
            Auto-calculated from Finance
          </div>
        </div>

        <div className="card">
          <div className="card-label">Total Monthly Expenses</div>
          <div className="card-value">{formatMoney(totalExpenses)}</div>
          <div className="card-pill pill-red" style={{ marginTop: 6 }}>
            Fixed + Variable costs
          </div>
        </div>

        <div className="card">
          <div className="card-label">Net Profit (After Tax)</div>
          <div className="card-value">
            {formatMoney(netProfit)}
          </div>
          <div
            className={
              "card-pill" + (positive ? " pill-green" : " pill-red")
            }
            style={{ marginTop: 6 }}
          >
            {positive ? "Profitable" : "Loss this month"}
            <span>• {profitMargin.toFixed(1)}% margin</span>
          </div>
        </div>

        <div className="card-soft">
          <div className="card-label">Quick Actions</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button
              className="pill"
              onClick={() => onNavigate("events")}
              style={{ fontSize: 11 }}
            >
              + Add Event
            </button>
            <button
              className="pill"
              onClick={() => onNavigate("clients")}
              style={{ fontSize: 11 }}
            >
              + Add Lead
            </button>
            <button
              className="pill"
              onClick={() => onNavigate("finance")}
              style={{ fontSize: 11 }}
            >
              Open Finance Auto Calculator
            </button>
          </div>
        </div>
      </div>

      {/* Big dashboard buttons */}
      <div className="dashboard-buttons">
        <div className="grid">
          <div
            className="dashboard-button-card"
            onClick={() => onNavigate("events")}
          >
            <div>
              <div className="db-btn-title">Events</div>
              <div className="db-btn-subtitle">
                Create, track and update all weddings & corporate events.
              </div>
            </div>
            <div>
              <div className="small-label">Today</div>
              <div className="small-value">No events — add first booking</div>
            </div>
          </div>

          <div
            className="dashboard-button-card"
            onClick={() => onNavigate("calendar")}
          >
            <div>
              <div className="db-btn-title">Calendar</div>
              <div className="db-btn-subtitle">
                Monthly view of all events, rehearsals and vendor meetings.
              </div>
            </div>
            <div>
              <div className="small-label">Status</div>
              <div className="small-value">Fully available this week</div>
            </div>
          </div>

          <div
            className="dashboard-button-card"
            onClick={() => onNavigate("clients")}
          >
            <div>
              <div className="db-btn-title">Clients & Leads</div>
              <div className="db-btn-subtitle">
                Track enquiries, hot leads and confirmed clients.
              </div>
            </div>
            <div>
              <div className="small-label">Pipeline</div>
              <div className="small-value">0 hot leads • 0 warm</div>
            </div>
          </div>

          <div
            className="dashboard-button-card"
            onClick={() => onNavigate("vendors")}
          >
            <div>
              <div className="db-btn-title">Vendors</div>
              <div className="db-btn-subtitle">
                Manage venues, decor, catering, photo/video and more.
              </div>
            </div>
            <div>
              <div className="small-label">Preferred vendors</div>
              <div className="small-value">Start building your list</div>
            </div>
          </div>

          <div
            className="dashboard-button-card"
            onClick={() => onNavigate("finance")}
          >
            <div>
              <div className="db-btn-title">Finance</div>
              <div className="db-btn-subtitle">
                Auto calculator for income, expenses, and profit — linked to
                dashboard.
              </div>
            </div>
            <div>
              <div className="small-label">Sync</div>
              <div className="small-value">Numbers shown above</div>
            </div>
          </div>

          <div
            className="dashboard-button-card"
            onClick={() => onNavigate("reports")}
          >
            <div>
              <div className="db-btn-title">Reports & Analytics</div>
              <div className="db-btn-subtitle">
                View growth, event count, and city-wise performance.
              </div>
            </div>
            <div>
              <div className="small-label">Coming soon</div>
              <div className="small-value">Custom charts and exports</div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

/* ---------- FINANCE (AUTO CALCULATOR) ---------- */

type FinanceProps = {
  finance: FinanceState;
  onChange: (field: keyof FinanceState, value: string) => void;
  totalIncome: number;
  totalExpenses: number;
  netProfit: number;
  profitMargin: number;
};

function FinanceSection({
  finance,
  onChange,
  totalIncome,
  totalExpenses,
  netProfit,
  profitMargin,
}: FinanceProps) {
  const formatMoney = (v: number) =>
    "₹" + v.toLocaleString("en-IN", { maximumFractionDigits: 0 });

  return (
    <>
      <div className="section-header">
        <div>
          <div className="section-title">Finance</div>
          <div className="section-subtitle">
            Auto calculator for Eventura — numbers here are live linked to the
            Dashboard.
          </div>
        </div>
        <div className="tabs">
          <button className="tab tab-active">Auto Calculator</button>
          <button className="tab" disabled>
            Ledger & Downloads (Coming)
          </button>
        </div>
      </div>

      <div className="section-body">
        <div className="card">
          <div className="card-label">Monthly Inputs (₹)</div>

          <div className="field-group" style={{ marginTop: 8 }}>
            <div>
              <div className="field-label">Event Revenue</div>
              <input
                className="field-input"
                value={finance.eventRevenue.toString()}
                onChange={(e) => onChange("eventRevenue", e.target.value)}
              />
            </div>

            <div>
              <div className="field-label">Other Income</div>
              <input
                className="field-input"
                value={finance.otherIncome.toString()}
                onChange={(e) => onChange("otherIncome", e.target.value)}
              />
            </div>

            <div>
              <div className="field-label">Fixed Costs (Rent, Salaries, etc.)</div>
              <input
                className="field-input"
                value={finance.fixedCosts.toString()}
                onChange={(e) => onChange("fixedCosts", e.target.value)}
              />
            </div>

            <div>
              <div className="field-label">Variable Costs (Vendors, Travel)</div>
              <input
                className="field-input"
                value={finance.variableCosts.toString()}
                onChange={(e) => onChange("variableCosts", e.target.value)}
              />
            </div>

            <div>
              <div className="field-label">Tax Rate (%)</div>
              <input
                className="field-input"
                value={finance.taxRate.toString()}
                onChange={(e) => onChange("taxRate", e.target.value)}
              />
            </div>
          </div>

          <div className="placeholder">
            Tip: Put your **real monthly numbers** here. The dashboard will
            automatically update the Income, Expenses, and Net Profit cards.
          </div>
        </div>

        <div className="card">
          <div className="card-label">Auto Summary (Linked to Dashboard)</div>

          <div style={{ marginTop: 8, display: "grid", gap: 8 }}>
            <SummaryRow label="Total Income" value={formatMoney(totalIncome)} />
            <SummaryRow
              label="Total Expenses"
              value={formatMoney(totalExpenses)}
            />
            <SummaryRow
              label="Net Profit (After Tax)"
              value={formatMoney(netProfit)}
              highlight={true}
            />
            <SummaryRow
              label="Profit Margin"
              value={profitMargin.toFixed(1) + "%"}
            />
          </div>

          <div className="placeholder" style={{ marginTop: 10 }}>
            These numbers are **the same** ones you see on the Dashboard
            “Command Center”. You don’t have to type twice — change it here once
            and it is updated everywhere.
          </div>
        </div>
      </div>
    </>
  );
}

type SummaryRowProps = {
  label: string;
  value: string;
  highlight?: boolean;
};

function SummaryRow({ label, value, highlight }: SummaryRowProps) {
  return (
    <div
      style={{
        padding: 8,
        borderRadius: 10,
        border: "1px solid rgba(148,163,184,0.4)",
        background: highlight
          ? "linear-gradient(90deg, rgba(250,204,21,0.2), rgba(15,23,42,0.95))"
          : "rgba(15,23,42,0.95)",
        display: "flex",
        justifyContent: "space-between",
        fontSize: 12,
      }}
    >
      <span style={{ color: "#9ca3af" }}>{label}</span>
      <span style={{ fontWeight: 600 }}>{value}</span>
    </div>
  );
}

/* ---------- OTHER SIMPLE SECTIONS (placeholders but fully navigable) ---------- */

function EventsSection() {
  return (
    <>
      <div className="section-header">
        <div>
          <div className="section-title">Events</div>
          <div className="section-subtitle">
            Create, manage, and track all Eventura projects from enquiry to
            completed event.
          </div>
        </div>
      </div>
      <div className="section-body-single">
        <div className="placeholder">
          ✅ Buttons are working — you are now in the <b>Events</b> module.  
          Next step (future): add forms & status pipeline here.
        </div>
      </div>
    </>
  );
}

function CalendarSection() {
  return (
    <>
      <div className="section-header">
        <div>
          <div className="section-title">Calendar</div>
          <div className="section-subtitle">
            Month-wise view for bookings, rehearsals, and vendor blocks.
          </div>
        </div>
      </div>
      <div className="section-body-single">
        <div className="placeholder">
          ✅ Buttons are working — you are now in the <b>Calendar</b> module.
        </div>
      </div>
    </>
  );
}

function ClientsSection() {
  return (
    <>
      <div className="section-header">
        <div>
          <div className="section-title">Clients & Leads</div>
          <div className="section-subtitle">
            Manage enquiries, hot leads, client details and follow-ups.
          </div>
        </div>
      </div>
      <div className="section-body-single">
        <div className="placeholder">
          ✅ Buttons are working — you are now in the <b>Clients & Leads</b>{" "}
          module.
        </div>
      </div>
    </>
  );
}

function VendorsSection() {
  return (
    <>
      <div className="section-header">
        <div>
          <div className="section-title">Vendors</div>
          <div className="section-subtitle">
            Keep a clean list of venues, caterers, decorators, photographers and
            more.
          </div>
        </div>
      </div>
      <div className="section-body-single">
        <div className="placeholder">
          ✅ Buttons are working — you are now in the <b>Vendors</b> module.
        </div>
      </div>
    </>
  );
}

function HRSection() {
  return (
    <>
      <div className="section-header">
        <div>
          <div className="section-title">HR & Team</div>
          <div className="section-subtitle">
            Track your core team, freelancers, and roles.
          </div>
        </div>
      </div>
      <div className="section-body-single">
        <div className="placeholder">
          ✅ Buttons are working — you are now in the <b>HR & Team</b> module.
        </div>
      </div>
    </>
  );
}

function InventorySection() {
  return (
    <>
      <div className="section-header">
        <div>
          <div className="section-title">Inventory & Assets</div>
          <div className="section-subtitle">
            Manage decor, props, sound equipment and other assets.
          </div>
        </div>
      </div>
      <div className="section-body-single">
        <div className="placeholder">
          ✅ Buttons are working — you are now in the{" "}
          <b>Inventory & Assets</b> module.
        </div>
      </div>
    </>
  );
}

function ReportsSection() {
  return (
    <>
      <div className="section-header">
        <div>
          <div className="section-title">Reports & Analytics</div>
          <div className="section-subtitle">
            High-level KPIs for events, revenue and profitability.
          </div>
        </div>
      </div>
      <div className="section-body-single">
        <div className="placeholder">
          ✅ Buttons are working — you are now in the{" "}
          <b>Reports & Analytics</b> module.
        </div>
      </div>
    </>
  );
}

function SettingsSection() {
  return (
    <>
      <div className="section-header">
        <div>
          <div className="section-title">Settings & Access</div>
          <div className="section-subtitle">
            Control access for CEO, core team, and staff (future: role-based
            permissions).
          </div>
        </div>
      </div>
      <div className="section-body-single">
        <div className="placeholder">
          ✅ Buttons are working — you are now in the{" "}
          <b>Settings & Access</b> module.
        </div>
      </div>
    </>
  );
}
