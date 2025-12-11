"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";

type Role = "CEO" | "Staff";
type User = { name: string; role: Role; city: string };

type FinanceEntry = {
  id: number;
  month: string;
  income: string;
  expenses: string;
  notes: string;
};

const USER_KEY = "eventura-user";
const FINANCE_KEY = "eventura-finance";
const CALC_KEY = "eventura-finance-calculator";

type BoardTab =
  | "income"
  | "expenses"
  | "accounts"
  | "wishlist"
  | "categories"
  | "months";

function parseMoney(value: string): number {
  const cleaned = value.replace(/[₹, ,]/g, "");
  const n = parseFloat(cleaned);
  return isNaN(n) ? 0 : n;
}

function formatCurrency(value: number): string {
  return value.toLocaleString("en-IN", {
    maximumFractionDigits: 0,
  });
}

type CalculatorState = {
  avgRevenue: string;
  costPercent: string;
  fixedCost: string;
  targetEvents: string;
};

export default function FinancePage() {
  const [user, setUser] = useState<User | null>(null);
  const [entries, setEntries] = useState<FinanceEntry[]>([]);
  const [form, setForm] = useState<Omit<FinanceEntry, "id">>({
    month: "",
    income: "",
    expenses: "",
    notes: "",
  });

  const [calc, setCalc] = useState<CalculatorState>({
    avgRevenue: "",
    costPercent: "70",
    fixedCost: "",
    targetEvents: "3",
  });

  const [activeTab, setActiveTab] = useState<BoardTab>("income");

  // auth
  useEffect(() => {
    if (typeof window === "undefined") return;
    const raw = window.localStorage.getItem(USER_KEY);
    if (!raw) {
      window.location.href = "/login";
      return;
    }
    try {
      const u: User = JSON.parse(raw);
      if (u.role !== "CEO") {
        alert("Finance module is CEO-only.");
        window.location.href = "/";
        return;
      }
      setUser(u);
    } catch {
      window.localStorage.removeItem(USER_KEY);
      window.location.href = "/login";
    }
  }, []);

  // load entries + calculator
  useEffect(() => {
    if (typeof window === "undefined") return;
    const raw = window.localStorage.getItem(FINANCE_KEY);
    if (raw) {
      try {
        setEntries(JSON.parse(raw));
      } catch (e) {
        console.error("Failed to parse finance", e);
      }
    }
    const rawCalc = window.localStorage.getItem(CALC_KEY);
    if (rawCalc) {
      try {
        setCalc(JSON.parse(rawCalc));
      } catch {
        // ignore
      }
    }
  }, []);

  // persist entries
  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(FINANCE_KEY, JSON.stringify(entries));
  }, [entries]);

  // persist calculator
  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(CALC_KEY, JSON.stringify(calc));
  }, [calc]);

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.month || !form.income) {
      alert("Month and income are required.");
      return;
    }

    const newEntry: FinanceEntry = {
      id: Date.now(),
      ...form,
    };
    setEntries((prev) => [newEntry, ...prev]);
    setForm({
      month: "",
      income: "",
      expenses: "",
      notes: "",
    });
  }

  function handleClear() {
    if (!confirm("Clear all finance records?")) return;
    setEntries([]);
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(FINANCE_KEY);
    }
  }

  function handleDownload() {
    if (entries.length === 0) {
      alert("No finance records to download.");
      return;
    }

    const header = "Month,Income,Expenses,Net,Margin(%),Notes";
    const rows = entries.map((entry) => {
      const income = parseMoney(entry.income);
      const expenses = parseMoney(entry.expenses);
      const netValue = income - expenses;
      const marginValue = income > 0 ? (netValue / income) * 100 : 0;
      return `"${entry.month}","${entry.income}","${entry.expenses}","${netValue}","${marginValue.toFixed(
        1
      )}","${(entry.notes || "").replace(/"/g, '""')}"`;
    });

    const csv = [header, ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "eventura-finance.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  // auto-download if coming from dashboard (?download=1)
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const flag = params.get("download");
    if (flag === "1" && entries.length > 0) {
      handleDownload();
    }
    // only re-run when entries length changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entries.length]);

  // totals
  let totalIncome = 0;
  let totalExpenses = 0;
  for (const e of entries) {
    totalIncome += parseMoney(e.income);
    totalExpenses += parseMoney(e.expenses);
  }
  const net = totalIncome - totalExpenses;
  const margin = totalIncome > 0 ? (net / totalIncome) * 100 : 0;

  // calculator derived values
  const avgRev = parseMoney(calc.avgRevenue || "0");
  const costPct = parseFloat(calc.costPercent || "0");
  const fixed = parseMoney(calc.fixedCost || "0");
  const events = parseFloat(calc.targetEvents || "0");

  const totalPlanRevenue = avgRev * events;
  const varCostPerEvent = avgRev * (costPct / 100);
  const profitPerEvent = avgRev - varCostPerEvent;
  const projectedGrossProfit = profitPerEvent * events;
  const projectedNetProfit = projectedGrossProfit - fixed;
  const breakEvenEvents =
    profitPerEvent > 0 ? Math.ceil(fixed / profitPerEvent) : 0;

  function handleCalcChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target;
    setCalc((prev) => ({ ...prev, [name]: value }));
  }

  function handleQuick(tab: BoardTab) {
    setActiveTab(tab);
  }

  if (!user) return null;

  return (
    <main className="eventura-os">
      {/* Sidebar */}
      <aside className="eventura-sidebar">
        <SidebarCore user={user} active="finance" />
      </aside>

      {/* Main */}
      <div className="eventura-main">
        <TopbarCore user={user} />

        <div className="eventura-content finance-board">
          {/* TITLE */}
          <div className="finance-header-row">
            <div>
              <h1 className="finance-title">Finance Board</h1>
              <p className="finance-subtitle">
                Control Eventura cashflow, accounts and break-even in one place.
              </p>
            </div>
            <div className="finance-header-tags">
              <span className="finance-chip">
                This month: ₹{formatCurrency(net)}
              </span>
              <span className="finance-chip-outline">
                Margin: {margin.toFixed(1)}%
              </span>
            </div>
          </div>

          {/* TOP NAV CARDS */}
          <section className="finance-nav-row">
            <FinanceNavCard
              label="Income"
              icon="💹"
              color="green"
              active={activeTab === "income"}
              onClick={() => setActiveTab("income")}
            />
            <FinanceNavCard
              label="Expenses"
              icon="💸"
              color="red"
              active={activeTab === "expenses"}
              onClick={() => setActiveTab("expenses")}
            />
            <FinanceNavCard
              label="Accounts"
              icon="🏦"
              color="blue"
              active={activeTab === "accounts"}
              onClick={() => setActiveTab("accounts")}
            />
            <FinanceNavCard
              label="Wishlist"
              icon="⭐"
              color="amber"
              active={activeTab === "wishlist"}
              onClick={() => setActiveTab("wishlist")}
            />
            <FinanceNavCard
              label="Categories"
              icon="🏷️"
              color="purple"
              active={activeTab === "categories"}
              onClick={() => setActiveTab("categories")}
            />
            <FinanceNavCard
              label="Months"
              icon="🗓️"
              color="teal"
              active={activeTab === "months"}
              onClick={() => setActiveTab("months")}
            />
          </section>

          {/* QUICK BUTTONS */}
          <section className="finance-quick-row">
            <button
              className="eventura-button-secondary"
              onClick={() => handleQuick("income")}
            >
              + New Income
            </button>
            <button
              className="eventura-button-secondary"
              onClick={() => handleQuick("expenses")}
            >
              + New Expense
            </button>
            <button
              className="eventura-button-secondary"
              onClick={() => handleQuick("wishlist")}
            >
              + New Wishlist Item
            </button>
            <button
              className="eventura-button-secondary"
              onClick={() => handleQuick("accounts")}
            >
              + New Account (coming soon)
            </button>
            <button
              className="eventura-button-secondary"
              onClick={handleDownload}
            >
              Download Finance CSV
            </button>
          </section>

          {/* MAIN GRID */}
          <section className="finance-main-grid">
            {/* LEFT PANEL – tab content */}
            <div className="eventura-panel">
              {activeTab === "income" || activeTab === "expenses" ? (
                <>
                  <h2 className="eventura-panel-title">
                    {activeTab === "income"
                      ? "Income & Expense Records"
                      : "Expense & Income Records"}
                  </h2>
                  <p className="eventura-small-text">
                    Add monthly totals for Eventura – the Dashboard reads these
                    values automatically.
                  </p>

                  <form className="eventura-form" onSubmit={handleSubmit}>
                    <div className="eventura-form-grid">
                      <div className="eventura-field">
                        <label className="eventura-label" htmlFor="month">
                          Month / period
                        </label>
                        <input
                          id="month"
                          name="month"
                          className="eventura-input"
                          value={form.month}
                          onChange={handleChange}
                          placeholder="e.g. Dec 2025"
                        />
                      </div>
                      <div className="eventura-field">
                        <label className="eventura-label" htmlFor="income">
                          Total income (₹)
                        </label>
                        <input
                          id="income"
                          name="income"
                          className="eventura-input"
                          value={form.income}
                          onChange={handleChange}
                          placeholder="e.g. 26,40,000"
                        />
                      </div>
                      <div className="eventura-field">
                        <label className="eventura-label" htmlFor="expenses">
                          Total expenses (₹)
                        </label>
                        <input
                          id="expenses"
                          name="expenses"
                          className="eventura-input"
                          value={form.expenses}
                          onChange={handleChange}
                          placeholder="e.g. 19,20,000"
                        />
                      </div>
                    </div>

                    <div
                      className="eventura-field"
                      style={{ marginTop: "0.75rem" }}
                    >
                      <label className="eventura-label" htmlFor="notes">
                        Notes (major events, comments)
                      </label>
                      <textarea
                        id="notes"
                        name="notes"
                        className="eventura-textarea"
                        value={form.notes}
                        onChange={handleChange}
                        placeholder="Example: 3 weddings + 1 corporate gala, 28% margin overall..."
                      />
                    </div>

                    <div className="eventura-actions">
                      <button type="submit" className="eventura-button">
                        Save record
                      </button>
                      <button
                        type="button"
                        className="eventura-button-secondary"
                        onClick={handleClear}
                      >
                        Clear all records
                      </button>
                    </div>
                  </form>

                  <div
                    className="eventura-table-wrapper"
                    style={{ marginTop: "1rem" }}
                  >
                    {entries.length === 0 ? (
                      <p
                        style={{
                          fontSize: "0.8rem",
                          color: "#9ca3af",
                          padding: "0.3rem 0.1rem",
                        }}
                      >
                        No finance records yet. Once you add months here, the
                        dashboard revenue & cash metrics will update.
                      </p>
                    ) : (
                      <table className="eventura-table">
                        <thead>
                          <tr>
                            <th>Month</th>
                            <th>Income (₹)</th>
                            <th>Expenses (₹)</th>
                            <th>Net (₹)</th>
                            <th>Margin</th>
                            <th>Notes</th>
                          </tr>
                        </thead>
                        <tbody>
                          {entries.map((entry) => {
                            const income = parseMoney(entry.income);
                            const expenses = parseMoney(entry.expenses);
                            const netValue = income - expenses;
                            const marginValue =
                              income > 0 ? (netValue / income) * 100 : 0;
                            return (
                              <tr key={entry.id}>
                                <td>{entry.month}</td>
                                <td>{entry.income}</td>
                                <td>{entry.expenses}</td>
                                <td>{formatCurrency(netValue)}</td>
                                <td>{marginValue.toFixed(1)}%</td>
                                <td>{entry.notes}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    )}
                  </div>
                </>
              ) : null}

              {activeTab === "accounts" && (
                <>
                  <h2 className="eventura-panel-title">Accounts snapshot</h2>
                  <p className="eventura-small-text">
                    High-level view of where Eventura’s money lives. You can
                    map each account to entries above when you want.
                  </p>
                  <div className="finance-accounts-grid">
                    <FinanceAccountCard
                      label="Current Account"
                      provider="HDFC Surat"
                      balance={totalIncome > 0 ? net : 544500}
                    />
                    <FinanceAccountCard
                      label="Reserve FD"
                      provider="ICICI"
                      balance={200000}
                    />
                    <FinanceAccountCard
                      label="Petty Cash"
                      provider="Office"
                      balance={15000}
                    />
                    <FinanceAccountCard
                      label="Payments Gateway"
                      provider="Razorpay"
                      balance={65000}
                    />
                  </div>
                  <p
                    className="eventura-small-text"
                    style={{ marginTop: "0.7rem" }}
                  >
                    For full accounting & GST, you’ll still use QuickBooks /
                    Zoho Books – this is a control tower view for the CEO.
                  </p>
                </>
              )}

              {activeTab === "wishlist" && (
                <>
                  <h2 className="eventura-panel-title">
                    Wishlist – future spends
                  </h2>
                  <p className="eventura-small-text">
                    Track big-ticket purchases you want to plan: new mandap set,
                    vehicle, warehouse, etc.
                  </p>
                  <ul className="eventura-list" style={{ marginTop: "0.5rem" }}>
                    <li className="eventura-list-item">
                      <div>
                        <div className="eventura-list-title">
                          Premium mandap & stage kit
                        </div>
                        <div className="eventura-list-sub">
                          Target: ₹8,00,000 · Priority: High · Payback in 10–12
                          weddings
                        </div>
                      </div>
                      <span className="eventura-tag eventura-tag-amber">
                        2026 Goal
                      </span>
                    </li>
                    <li className="eventura-list-item">
                      <div>
                        <div className="eventura-list-title">
                          Warehouse / godown upgrade
                        </div>
                        <div className="eventura-list-sub">
                          Target: ₹12,00,000 · For decor storage & fabrication
                        </div>
                      </div>
                      <span className="eventura-tag eventura-tag-blue">
                        Expansion
                      </span>
                    </li>
                    <li className="eventura-list-item">
                      <div>
                        <div className="eventura-list-title">
                          Eventura internal software
                        </div>
                        <div className="eventura-list-sub">
                          Target: ₹5,00,000 · Automate CRM, vendors & tasks
                        </div>
                      </div>
                      <span className="eventura-tag eventura-tag-green">
                        Tech
                      </span>
                    </li>
                  </ul>
                </>
              )}

              {activeTab === "categories" && (
                <>
                  <h2 className="eventura-panel-title">Spending categories</h2>
                  <p className="eventura-small-text">
                    Use this as a guide when you analyse finance CSV in Excel /
                    Google Sheets.
                  </p>
                  <div className="finance-categories-grid">
                    <FinanceCategoryPill label="Vendors (decor, catering, photo)" />
                    <FinanceCategoryPill label="Salaries & HR" />
                    <FinanceCategoryPill label="Office & Rent" />
                    <FinanceCategoryPill label="Marketing & Ads" />
                    <FinanceCategoryPill label="Travel & Logistics" />
                    <FinanceCategoryPill label="Equipment & Inventory" />
                    <FinanceCategoryPill label="Tax & Compliance" />
                    <FinanceCategoryPill label="Miscellaneous" />
                  </div>
                </>
              )}

              {activeTab === "months" && (
                <>
                  <h2 className="eventura-panel-title">Month-wise view</h2>
                  <p className="eventura-small-text">
                    Quick glance at each recorded month. Use filters in Excel
                    for deeper analysis.
                  </p>
                  {entries.length === 0 ? (
                    <p
                      style={{
                        fontSize: "0.8rem",
                        color: "#9ca3af",
                        marginTop: "0.7rem",
                      }}
                    >
                      No months saved yet. Add at least one record in Income /
                      Expenses tab.
                    </p>
                  ) : (
                    <ul
                      className="eventura-list"
                      style={{ marginTop: "0.7rem" }}
                    >
                      {entries.map((e) => {
                        const income = parseMoney(e.income);
                        const expenses = parseMoney(e.expenses);
                        const netValue = income - expenses;
                        const marginValue =
                          income > 0 ? (netValue / income) * 100 : 0;

                        return (
                          <li key={e.id} className="eventura-list-item">
                            <div>
                              <div className="eventura-list-title">
                                {e.month}
                              </div>
                              <div className="eventura-list-sub">
                                Income: ₹{e.income} · Expenses: ₹{e.expenses} ·
                                Net: ₹{formatCurrency(netValue)}
                              </div>
                            </div>
                            <span className="eventura-tag eventura-tag-blue">
                              Margin {marginValue.toFixed(1)}%
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </>
              )}
            </div>

            {/* RIGHT SIDE – ACTUAL MONTH SUMMARY + AUTO CALCULATOR */}
            <div className="finance-right-column">
              <div className="eventura-panel">
                <h2 className="eventura-panel-title">Actual month snapshot</h2>
                <p className="eventura-small-text">
                  Use the last saved record as “current month” for a quick CEO
                  summary.
                </p>

                {entries.length === 0 ? (
                  <p
                    style={{
                      fontSize: "0.8rem",
                      color: "#9ca3af",
                      marginTop: "0.6rem",
                    }}
                  >
                    No records yet. Once you save, you’ll see totals here.
                  </p>
                ) : (
                  <div className="finance-actual-card">
                    <div className="finance-actual-header">
                      <div className="finance-actual-month">
                        {entries[0].month}
                      </div>
                      <div className="finance-actual-tag">Actual Month</div>
                    </div>
                    <div className="finance-actual-row">
                      <span>Total income</span>
                      <strong>₹{entries[0].income}</strong>
                    </div>
                    <div className="finance-actual-row">
                      <span>Total expenses</span>
                      <strong>₹{entries[0].expenses}</strong>
                    </div>
                    <div className="finance-actual-row">
                      <span>Net cash</span>
                      <strong>
                        ₹
                        {formatCurrency(
                          parseMoney(entries[0].income) -
                            parseMoney(entries[0].expenses)
                        )}
                      </strong>
                    </div>
                  </div>
                )}
              </div>

              <div className="eventura-panel" style={{ marginTop: "1rem" }}>
                <h2 className="eventura-panel-title">
                  Auto calculator – break-even
                </h2>

                <div
                  className="eventura-form-grid"
                  style={{ marginTop: "0.6rem" }}
                >
                  <div className="eventura-field">
                    <label className="eventura-label" htmlFor="avgRevenue">
                      Avg revenue per event (₹)
                    </label>
                    <input
                      id="avgRevenue"
                      name="avgRevenue"
                      className="eventura-input"
                      value={calc.avgRevenue}
                      onChange={handleCalcChange}
                      placeholder="e.g. 8,00,000"
                    />
                  </div>
                  <div className="eventura-field">
                    <label className="eventura-label" htmlFor="costPercent">
                      Variable cost % (vendors etc.)
                    </label>
                    <input
                      id="costPercent"
                      name="costPercent"
                      className="eventura-input"
                      value={calc.costPercent}
                      onChange={handleCalcChange}
                      placeholder="e.g. 70"
                    />
                  </div>
                  <div className="eventura-field">
                    <label className="eventura-label" htmlFor="fixedCost">
                      Monthly fixed cost (₹)
                    </label>
                    <input
                      id="fixedCost"
                      name="fixedCost"
                      className="eventura-input"
                      value={calc.fixedCost}
                      onChange={handleCalcChange}
                      placeholder="e.g. 2,65,000"
                    />
                  </div>
                  <div className="eventura-field">
                    <label className="eventura-label" htmlFor="targetEvents">
                      Target events / month
                    </label>
                    <input
                      id="targetEvents"
                      name="targetEvents"
                      className="eventura-input"
                      value={calc.targetEvents}
                      onChange={handleCalcChange}
                      placeholder="e.g. 4"
                    />
                  </div>
                </div>

                <div className="finance-calc-grid">
                  <div className="finance-calc-card">
                    <div className="finance-calc-label">Plan revenue</div>
                    <div className="finance-calc-value">
                      ₹{formatCurrency(totalPlanRevenue)}
                    </div>
                  </div>
                  <div className="finance-calc-card">
                    <div className="finance-calc-label">Gross profit</div>
                    <div className="finance-calc-value">
                      ₹{formatCurrency(projectedGrossProfit)}
                    </div>
                  </div>
                  <div className="finance-calc-card">
                    <div className="finance-calc-label">Net profit</div>
                    <div className="finance-calc-value">
                      ₹{formatCurrency(projectedNetProfit)}
                    </div>
                  </div>
                  <div className="finance-calc-card">
                    <div className="finance-calc-label">Break-even events</div>
                    <div className="finance-calc-value">
                      {breakEvenEvents}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <footer className="eventura-footer">
            Eventura · Finance Board · © {new Date().getFullYear()}
          </footer>
        </div>
      </div>
    </main>
  );
}

/* Shared sidebar + topbar */

function SidebarCore({ user, active }: { user: User; active: string }) {
  const isCEO = user.role === "CEO";
  return (
    <>
      <div className="eventura-sidebar-header">
        <div className="eventura-logo-circle">E</div>
        <div className="eventura-logo-text">
          <div className="eventura-logo-name">Eventura OS</div>
          <div className="eventura-logo-tagline">
            Events that speak your style
          </div>
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
        <div className="eventura-sidebar-role">
          Role: {user.role === "CEO" ? "CEO / Super Admin" : "Staff"}
        </div>
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
          placeholder="Search events, clients, vendors..."
        />
      </div>
      <div className="eventura-topbar-right">
        <button className="eventura-topbar-icon" title="Notifications">
          🔔
        </button>
        <div className="eventura-user-avatar" title={user.name}>
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

/* Small presentational components */

function FinanceNavCard(props: {
  label: string;
  icon: string;
  color: "green" | "red" | "blue" | "amber" | "purple" | "teal";
  active: boolean;
  onClick: () => void;
}) {
  const base = "finance-nav-card";
  const classes = [base, `${base}-${props.color}`];
  if (props.active) classes.push(`${base}-active`);
  return (
    <button className={classes.join(" ")} type="button" onClick={props.onClick}>
      <div className="finance-nav-icon">{props.icon}</div>
      <div className="finance-nav-label">{props.label}</div>
    </button>
  );
}

function FinanceAccountCard(props: {
  label: string;
  provider: string;
  balance: number;
}) {
  return (
    <div className="finance-account-card">
      <div className="finance-account-label">{props.label}</div>
      <div className="finance-account-provider">{props.provider}</div>
      <div className="finance-account-balance">
        ₹{formatCurrency(props.balance)}
      </div>
    </div>
  );
}

function FinanceCategoryPill({ label }: { label: string }) {
  return <span className="finance-category-pill">{label}</span>;
}
