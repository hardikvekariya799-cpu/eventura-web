"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";

type Role = "CEO" | "Staff";
type User = { name: string; role: Role; city: string };

type FinanceEntry = {
  id: number;
  label: string; // Month / period name
  revenue: string; // ₹ as string
  expenses: string; // ₹ as string
  nonCash: string; // ₹ as string (depreciation etc.)
  notes?: string;
};

const USER_KEY = "eventura-user";
const FINANCE_KEY = "eventura-finance";
const FINANCE_START_CASH_KEY = "eventura-finance-starting-cash";

function parseMoney(value: string): number {
  if (!value) return 0;
  const cleaned = value.replace(/[₹, ]/g, "");
  const n = parseFloat(cleaned);
  return isNaN(n) ? 0 : n;
}

export default function FinancePage() {
  const [user, setUser] = useState<User | null>(null);

  const [startingCash, setStartingCash] = useState<string>("0");
  const [entries, setEntries] = useState<FinanceEntry[]>([]);
  const [form, setForm] = useState<Omit<FinanceEntry, "id">>({
    label: "",
    revenue: "",
    expenses: "",
    nonCash: "",
    notes: "",
  });

  // Derived totals
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [totalExpenses, setTotalExpenses] = useState(0);
  const [totalNonCash, setTotalNonCash] = useState(0);
  const [netProfit, setNetProfit] = useState(0);
  const [netCashMovement, setNetCashMovement] = useState(0);
  const [closingCash, setClosingCash] = useState(0);

  // --- AUTH ---
  useEffect(() => {
    if (typeof window === "undefined") return;
    const raw = window.localStorage.getItem(USER_KEY);
    if (!raw) {
      window.location.href = "/login";
      return;
    }
    try {
      const u: User = JSON.parse(raw);
      setUser(u);
    } catch {
      window.localStorage.removeItem(USER_KEY);
      window.location.href = "/login";
    }
  }, []);

  // --- LOAD FINANCE DATA ---
  useEffect(() => {
    if (typeof window === "undefined") return;

    const raw = window.localStorage.getItem(FINANCE_KEY);
    if (raw) {
      try {
        const list: FinanceEntry[] = JSON.parse(raw);
        setEntries(list);
      } catch (e) {
        console.error("Failed to parse finance entries", e);
      }
    }

    const startCashRaw = window.localStorage.getItem(FINANCE_START_CASH_KEY);
    if (startCashRaw) {
      setStartingCash(startCashRaw);
    }
  }, []);

  // --- SAVE FINANCE DATA ---
  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(FINANCE_KEY, JSON.stringify(entries));
  }, [entries]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(FINANCE_START_CASH_KEY, startingCash || "0");
  }, [startingCash]);

  // --- COMPUTE TOTALS ---
  useEffect(() => {
    const totalRev = entries.reduce(
      (sum, e) => sum + parseMoney(e.revenue),
      0
    );
    const totalExp = entries.reduce(
      (sum, e) => sum + parseMoney(e.expenses),
      0
    );
    const totalNC = entries.reduce(
      (sum, e) => sum + parseMoney(e.nonCash),
      0
    );

    const profit = totalRev - totalExp;
    const startCashNum = parseMoney(startingCash);
    const netCash = totalRev - totalExp; // simple: assume all revenue/expenses are cash
    const closing = startCashNum + netCash;

    setTotalRevenue(totalRev);
    setTotalExpenses(totalExp);
    setTotalNonCash(totalNC);
    setNetProfit(profit);
    setNetCashMovement(netCash);
    setClosingCash(closing);
  }, [entries, startingCash]);

  if (!user) return null;
  const isCEO = user.role === "CEO";

  function handleFormChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  function handleAddEntry(e: React.FormEvent) {
    e.preventDefault();
    if (!form.label) {
      alert("Please enter a period label (e.g. Jan 2025).");
      return;
    }

    const newEntry: FinanceEntry = {
      id: Date.now(),
      ...form,
    };

    setEntries((prev) => [newEntry, ...prev]);

    setForm({
      label: "",
      revenue: "",
      expenses: "",
      nonCash: "",
      notes: "",
    });
  }

  function handleDelete(id: number) {
    if (!confirm("Delete this finance record?")) return;
    setEntries((prev) => prev.filter((e) => e.id !== id));
  }

  return (
    <main className="eventura-os">
      {/* Sidebar */}
      <aside className="eventura-sidebar">
        <SidebarCore user={user} active="finance" />
      </aside>

      {/* Main area */}
      <div className="eventura-main">
        <TopbarCore user={user} />

        <div className="eventura-content">
          <h1 className="eventura-title">Finance – P&L, Balance Sheet & Cash Flow</h1>
          <p className="eventura-subtitle">
            Centralised finance view for Eventura. Add monthly records once –
            P&amp;L, Balance Sheet and Cash Flow are calculated automatically
            from the same data (simplified model).
          </p>

          {/* KPI CARDS */}
          <section className="eventura-kpi-row">
            <div className="eventura-card">
              <div className="eventura-card-label">Total revenue (all periods)</div>
              <div className="eventura-card-value">
                ₹{totalRevenue.toLocaleString("en-IN")}
              </div>
              <div className="eventura-card-note">
                Sum of all client income recorded below.
              </div>
            </div>

            <div className="eventura-card">
              <div className="eventura-card-label">Total expenses (all periods)</div>
              <div className="eventura-card-value">
                ₹{totalExpenses.toLocaleString("en-IN")}
              </div>
              <div className="eventura-card-note">
                Includes vendors, salaries, rent, marketing etc.
              </div>
            </div>

            <div className="eventura-card">
              <div className="eventura-card-label">Net profit (P&amp;L)</div>
              <div className="eventura-card-value">
                ₹{netProfit.toLocaleString("en-IN")}
              </div>
              <div className="eventura-card-note">
                Revenue − Expenses across all periods.
              </div>
            </div>

            <div className="eventura-card">
              <div className="eventura-card-label">Closing cash (Cash Flow)</div>
              <div className="eventura-card-value">
                ₹{closingCash.toLocaleString("en-IN")}
              </div>
              <div className="eventura-card-note">
                Based on starting cash and net cash from operations.
              </div>
            </div>
          </section>

          {/* STARTING CASH + FORM */}
          <section className="eventura-columns">
            {/* LEFT: Starting cash + add entry */}
            <div>
              <div className="eventura-panel" style={{ marginBottom: "1rem" }}>
                <h2 className="eventura-panel-title">Starting cash balance</h2>
                <p className="eventura-small-text" style={{ marginBottom: "0.5rem" }}>
                  Set your opening cash (bank + cash in hand) before your first
                  finance period. All cash flow and balance sheet calculations
                  use this number.
                </p>
                <input
                  className="eventura-input"
                  value={startingCash}
                  onChange={(e) => setStartingCash(e.target.value)}
                  placeholder="e.g. 2,50,000"
                />
              </div>

              <div className="eventura-panel">
                <h2 className="eventura-panel-title">Add monthly finance record</h2>
                <form className="eventura-form" onSubmit={handleAddEntry}>
                  <div className="eventura-form-grid">
                    <div className="eventura-field">
                      <label className="eventura-label" htmlFor="label">
                        Period / label
                      </label>
                      <input
                        id="label"
                        name="label"
                        className="eventura-input"
                        value={form.label}
                        onChange={handleFormChange}
                        placeholder="Jan 2025 / Q1 2025 / Festive season"
                      />
                    </div>

                    <div className="eventura-field">
                      <label className="eventura-label" htmlFor="revenue">
                        Revenue (₹)
                      </label>
                      <input
                        id="revenue"
                        name="revenue"
                        className="eventura-input"
                        value={form.revenue}
                        onChange={handleFormChange}
                        placeholder="Total income for this period"
                      />
                    </div>

                    <div className="eventura-field">
                      <label className="eventura-label" htmlFor="expenses">
                        Expenses (₹)
                      </label>
                      <input
                        id="expenses"
                        name="expenses"
                        className="eventura-input"
                        value={form.expenses}
                        onChange={handleFormChange}
                        placeholder="Vendor, salary, rent, marketing etc."
                      />
                    </div>

                    <div className="eventura-field">
                      <label className="eventura-label" htmlFor="nonCash">
                        Non-cash items (₹)
                      </label>
                      <input
                        id="nonCash"
                        name="nonCash"
                        className="eventura-input"
                        value={form.nonCash}
                        onChange={handleFormChange}
                        placeholder="Depreciation, write-off (optional)"
                      />
                    </div>

                    <div className="eventura-field" style={{ gridColumn: "1 / -1" }}>
                      <label className="eventura-label" htmlFor="notes">
                        Notes
                      </label>
                      <textarea
                        id="notes"
                        name="notes"
                        className="eventura-input"
                        value={form.notes}
                        onChange={handleFormChange}
                        placeholder="Short note about major events, big weddings, investments etc."
                        rows={3}
                      />
                    </div>
                  </div>

                  <div className="eventura-actions">
                    <button type="submit" className="eventura-button">
                      Save finance record
                    </button>
                  </div>
                </form>
              </div>
            </div>

            {/* RIGHT: P&L TABLE */}
            <div className="eventura-panel">
              <h2 className="eventura-panel-title">Profit &amp; Loss (summary)</h2>
              {entries.length === 0 ? (
                <p className="eventura-small-text">
                  No finance records yet. Add at least one monthly record to
                  see Profit &amp; Loss summary.
                </p>
              ) : (
                <div className="eventura-table-wrapper">
                  <table className="eventura-table">
                    <thead>
                      <tr>
                        <th>Period</th>
                        <th>Revenue (₹)</th>
                        <th>Expenses (₹)</th>
                        <th>Net profit (₹)</th>
                        <th>Notes</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {entries
                        .slice()
                        .sort((a, b) => b.id - a.id)
                        .map((e) => {
                          const rev = parseMoney(e.revenue);
                          const exp = parseMoney(e.expenses);
                          const net = rev - exp;
                          return (
                            <tr key={e.id}>
                              <td>{e.label}</td>
                              <td>{rev.toLocaleString("en-IN")}</td>
                              <td>{exp.toLocaleString("en-IN")}</td>
                              <td>{net.toLocaleString("en-IN")}</td>
                              <td>{e.notes}</td>
                              <td>
                                <button
                                  type="button"
                                  className="eventura-button-secondary"
                                  onClick={() => handleDelete(e.id)}
                                >
                                  Delete
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                    <tfoot>
                      <tr>
                        <th>Total</th>
                        <th>{totalRevenue.toLocaleString("en-IN")}</th>
                        <th>{totalExpenses.toLocaleString("en-IN")}</th>
                        <th>{netProfit.toLocaleString("en-IN")}</th>
                        <th colSpan={2}></th>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </div>
          </section>

          {/* BALANCE SHEET + CASH FLOW */}
          <section style={{ marginTop: "1.5rem" }} className="eventura-columns">
            {/* BALANCE SHEET */}
            <div className="eventura-panel">
              <h2 className="eventura-panel-title">Balance Sheet (simplified)</h2>
              <p className="eventura-small-text" style={{ marginBottom: "0.75rem" }}>
                This is a simple model: Cash is taken from closing cash in the
                Cash Flow section, and equity is your retained earnings (sum of
                net profit). Liabilities are set to 0 for now.
              </p>
              <div className="eventura-table-wrapper">
                <table className="eventura-table">
                  <thead>
                    <tr>
                      <th colSpan={2}>Assets</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>Cash &amp; bank</td>
                      <td>₹{closingCash.toLocaleString("en-IN")}</td>
                    </tr>
                    <tr>
                      <td>Total assets</td>
                      <td>₹{closingCash.toLocaleString("en-IN")}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div
                className="eventura-table-wrapper"
                style={{ marginTop: "1rem" }}
              >
                <table className="eventura-table">
                  <thead>
                    <tr>
                      <th colSpan={2}>Liabilities &amp; Equity</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>Liabilities</td>
                      <td>₹0</td>
                    </tr>
                    <tr>
                      <td>Equity (retained earnings)</td>
                      <td>₹{closingCash.toLocaleString("en-IN")}</td>
                    </tr>
                    <tr>
                      <td>Total Liabilities &amp; Equity</td>
                      <td>₹{closingCash.toLocaleString("en-IN")}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* CASH FLOW */}
            <div className="eventura-panel">
              <h2 className="eventura-panel-title">Cash Flow (from operations)</h2>
              <p className="eventura-small-text" style={{ marginBottom: "0.75rem" }}>
                Operating cash flow is approximated as Revenue − Expenses.
                Non-cash items are tracked separately for your reference.
              </p>
              <div className="eventura-table-wrapper">
                <table className="eventura-table">
                  <tbody>
                    <tr>
                      <td>Starting cash</td>
                      <td>₹{parseMoney(startingCash).toLocaleString("en-IN")}</td>
                    </tr>
                    <tr>
                      <td>Cash in from operations (Revenue)</td>
                      <td>₹{totalRevenue.toLocaleString("en-IN")}</td>
                    </tr>
                    <tr>
                      <td>Cash out from operations (Expenses)</td>
                      <td>₹{totalExpenses.toLocaleString("en-IN")}</td>
                    </tr>
                    <tr>
                      <td>Net cash from operations</td>
                      <td>₹{netCashMovement.toLocaleString("en-IN")}</td>
                    </tr>
                    <tr>
                      <td>Ending cash</td>
                      <td>₹{closingCash.toLocaleString("en-IN")}</td>
                    </tr>
                    <tr>
                      <td>Non-cash items (total)</td>
                      <td>₹{totalNonCash.toLocaleString("en-IN")}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <p className="eventura-small-text" style={{ marginTop: "0.75rem" }}>
                For detailed CGTMSE / banker reports later, this can be extended
                with loan schedules and investing / financing cash flows.
              </p>
            </div>
          </section>

          <footer className="eventura-footer">
            Eventura · Finance module · P&amp;L · Balance Sheet · Cash Flow · ©{" "}
            {new Date().getFullYear()}
          </footer>
        </div>
      </div>
    </main>
  );
}

/* Shared layout helpers – similar style as other modules */

function SidebarCore({ user, active }: { user: User; active: string }) {
  const isCEO = user.role === "CEO";
  return (
    <>
      <div className="eventura-sidebar-header">
        <div className="eventura-logo-circle">E</div>
        <div className="eventura-logo-text">
          <div className="eventura-logo-name">Eventura OS</div>
        </div>
      </div>
      <nav className="eventura-sidebar-nav">
        <SidebarLink
          href="/"
          label="Dashboard"
          icon="📊"
          active={active === "dashboard"}
        />
        <SidebarLink
          href="/events"
          label="Events"
          icon="🎉"
          active={active === "events"}
        />
        <SidebarLink
          href="/calendar"
          label="Calendar"
          icon="📅"
          active={active === "calendar"}
        />
        <SidebarLink
          href="/leads"
          label="Clients & Leads"
          icon="👥"
          active={active === "leads"}
        />
        <SidebarLink
          href="/vendors"
          label="Vendors"
          icon="🤝"
          active={active === "vendors"}
        />
        {isCEO && (
          <SidebarLink
            href="/finance"
            label="Finance"
            icon="💰"
            active={active === "finance"}
          />
        )}
        <SidebarLink
          href="/hr"
          label="HR & Team"
          icon="🧑‍💼"
          active={active === "hr"}
        />
        <SidebarLink
          href="/inventory"
          label="Inventory & Assets"
          icon="📦"
          active={active === "inventory"}
        />
        {isCEO && (
          <SidebarLink
            href="/reports"
            label="Reports & Analytics"
            icon="📈"
            active={active === "reports"}
          />
        )}
        {isCEO && (
          <SidebarLink
            href="/settings"
            label="Settings & Access"
            icon="⚙️"
            active={active === "settings"}
          />
        )}
      </nav>
      <div className="eventura-sidebar-footer">
        <div className="eventura-sidebar-role">Role: {user.role}</div>
        <div className="eventura-sidebar-city">City: {user.city}</div>
      </div>
    </>
  );
}

function TopbarCore({ user }: { user: User }) {
  return (
    <header className="eventura-topbar">
      <div className="eventura-topbar-left">
        <div className="eventura-topbar-location">📍 {user.city}, Gujarat</div>
      </div>
      <div className="eventura-topbar-center">
        <input
          className="eventura-search"
          placeholder="Search (coming soon)"
          disabled
        />
      </div>
      <div className="eventura-topbar-right">
        <div className="eventura-user-avatar">
          {user.name.charAt(0).toUpperCase()}
        </div>
      </div>
    </header>
  );
}

function SidebarLink(props: {
  href: string;
  label: string;
  icon: string;
  active?: boolean;
}) {
  const className =
    "eventura-sidebar-link" +
    (props.active ? " eventura-sidebar-link-active" : "");
  return (
    <Link href={props.href} className={className}>
      <span className="eventura-sidebar-icon">{props.icon}</span>
      <span>{props.label}</span>
    </Link>
  );
}
