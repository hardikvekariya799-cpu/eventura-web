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

function parseMoney(value: string): number {
  const cleaned = value.replace(/[₹, ]/g, "");
  const n = parseFloat(cleaned);
  return isNaN(n) ? 0 : n;
}

function formatCurrency(value: number): string {
  return value.toLocaleString("en-IN", {
    maximumFractionDigits: 0,
  });
}

export default function FinancePage() {
  const [user, setUser] = useState<User | null>(null);
  const [entries, setEntries] = useState<FinanceEntry[]>([]);
  const [form, setForm] = useState<Omit<FinanceEntry, "id">>({
    month: "",
    income: "",
    expenses: "",
    notes: "",
  });

  const [activeTab, setActiveTab] =
    useState<"overview" | "calculator">("overview");

  // calculator tab
  const [calcIncome, setCalcIncome] = useState("");
  const [calcExpenses, setCalcExpenses] = useState("");
  const [autoDownloadRequested, setAutoDownloadRequested] = useState(false);

  // ---- AUTH ----
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

  // ---- LOAD ENTRIES ----
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
  }, []);

  // ---- SAVE ENTRIES ----
  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(FINANCE_KEY, JSON.stringify(entries));
  }, [entries]);

  // ---- READ URL QUERY (tab & autoDownload) WITHOUT useSearchParams ----
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);

    const tab = params.get("tab");
    if (tab === "calculator") {
      setActiveTab("calculator");
    }

    const autoDownload = params.get("autoDownload");
    if (autoDownload === "1") {
      setAutoDownloadRequested(true);
    }
  }, []);

  // when entries loaded AND autoDownloadRequested -> download once
  useEffect(() => {
    if (autoDownloadRequested && entries.length > 0) {
      handleDownload();
      setAutoDownloadRequested(false);
    }
  }, [autoDownloadRequested, entries]);

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

  // Totals for summary cards
  let totalIncome = 0;
  let totalExpenses = 0;
  for (const e of entries) {
    totalIncome += parseMoney(e.income);
    totalExpenses += parseMoney(e.expenses);
  }
  const net = totalIncome - totalExpenses;
  const margin = totalIncome > 0 ? (net / totalIncome) * 100 : 0;

  // calculator derived values
  const calcIncNum = parseMoney(calcIncome);
  const calcExpNum = parseMoney(calcExpenses);
  const calcNet = calcIncNum - calcExpNum;
  const calcMargin = calcIncNum > 0 ? (calcNet / calcIncNum) * 100 : 0;

  function handleSaveFromCalculator() {
    if (!calcIncome) {
      alert("Enter at least income to save.");
      return;
    }
    const newEntry: FinanceEntry = {
      id: Date.now(),
      month: "Calculator entry",
      income: calcIncome,
      expenses: calcExpenses,
      notes: "Added from quick calculator",
    };
    setEntries((prev) => [newEntry, ...prev]);
    alert("Saved calculator result into Finance records.");
  }

  if (!user) return null;

  return (
    <main className="eventura-os">
      <aside className="eventura-sidebar">
        <SidebarCore user={user} active="finance" />
      </aside>

      <div className="eventura-main">
        <TopbarCore user={user} />

        <div className="eventura-content">
          <h1 className="eventura-title">Finance – Eventura OS</h1>
          <p className="eventura-subtitle">
            Track revenue, expenses, profit and vendor payments. This module
            powers the dashboard KPIs automatically.
          </p>

          {/* Summary cards */}
          <section className="eventura-kpi-row">
            <div className="eventura-card">
              <div className="eventura-card-label">Total expected income</div>
              <div className="eventura-card-value">
                ₹{formatCurrency(totalIncome)}
              </div>
              <div className="eventura-card-note">
                Sum of all finance records
              </div>
            </div>

            <div className="eventura-card">
              <div className="eventura-card-label">Total expected expenses</div>
              <div className="eventura-card-value">
                ₹{formatCurrency(totalExpenses)}
              </div>
              <div className="eventura-card-note">
                Vendor payouts, salaries, rent, marketing
              </div>
            </div>

            <div className="eventura-card">
              <div className="eventura-card-label">Net profit & margin</div>
              <div className="eventura-card-value">
                ₹{formatCurrency(net)}
              </div>
              <div className="eventura-card-note">
                Margin: {margin.toFixed(1)}%
              </div>
            </div>
          </section>

          {/* Tabs */}
          <div className="eventura-tabs">
            <button
              className={
                "eventura-tab" +
                (activeTab === "overview" ? " eventura-tab-active" : "")
              }
              onClick={() => setActiveTab("overview")}
            >
              Overview & Records
            </button>
            <button
              className={
                "eventura-tab" +
                (activeTab === "calculator" ? " eventura-tab-active" : "")
              }
              onClick={() => setActiveTab("calculator")}
            >
              Auto Calculator & Vendor Payments
            </button>
          </div>

          {activeTab === "overview" ? (
            // ===== OVERVIEW TAB =====
            <section className="eventura-columns">
              <div>
                <h2 className="eventura-panel-title">Add finance record</h2>
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
                        Income (₹)
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
                        Expenses (₹)
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
                      Notes
                    </label>
                    <textarea
                      id="notes"
                      name="notes"
                      className="eventura-textarea"
                      value={form.notes}
                      onChange={handleChange}
                      placeholder="High-level notes, key events driving this month..."
                    />
                  </div>

                  <div className="eventura-actions">
                    <button type="submit" className="eventura-button">
                      Save finance record
                    </button>
                    <button
                      type="button"
                      className="eventura-button-secondary"
                      onClick={handleClear}
                    >
                      Clear all records
                    </button>
                    <button
                      type="button"
                      className="eventura-button-secondary"
                      onClick={handleDownload}
                    >
                      Download report (CSV)
                    </button>
                  </div>
                </form>
              </div>

              <div className="eventura-panel">
                <h2 className="eventura-panel-title">Monthly overview</h2>
                {entries.length === 0 ? (
                  <p className="eventura-small-text">
                    No finance records yet. Add your first month on the left.
                  </p>
                ) : (
                  <div className="eventura-table-wrapper">
                    <table className="eventura-table">
                      <thead>
                        <tr>
                          <th>Month</th>
                          <th>Income (₹)</th>
                          <th>Expenses (₹)</th>
                          <th>Net (₹)</th>
                          <th>Margin %</th>
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
                  </div>
                )}
              </div>
            </section>
          ) : (
            // ===== CALCULATOR TAB =====
            <section className="eventura-columns">
              <div className="eventura-panel">
                <h2 className="eventura-panel-title">
                  Quick auto calculator (monthly / event)
                </h2>
                <div className="eventura-form">
                  <div className="eventura-field">
                    <label className="eventura-label" htmlFor="calcIncome">
                      Income (₹)
                    </label>
                    <input
                      id="calcIncome"
                      className="eventura-input"
                      value={calcIncome}
                      onChange={(e) => setCalcIncome(e.target.value)}
                      placeholder="Client billing or monthly income"
                    />
                  </div>

                  <div className="eventura-field">
                    <label className="eventura-label" htmlFor="calcExpenses">
                      Expenses (₹)
                    </label>
                    <input
                      id="calcExpenses"
                      className="eventura-input"
                      value={calcExpenses}
                      onChange={(e) => setCalcExpenses(e.target.value)}
                      placeholder="Vendors, salaries, rent, etc."
                    />
                  </div>

                  <div className="eventura-field">
                    <label className="eventura-label">Auto results</label>
                    <div className="eventura-kpi-row">
                      <div className="eventura-card">
                        <div className="eventura-card-label">Net profit</div>
                        <div className="eventura-card-value">
                          ₹{formatCurrency(calcNet)}
                        </div>
                      </div>
                      <div className="eventura-card">
                        <div className="eventura-card-label">
                          Profit margin
                        </div>
                        <div className="eventura-card-value">
                          {isNaN(calcMargin) ? "0.0" : calcMargin.toFixed(1)}%
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="eventura-actions">
                    <button
                      type="button"
                      className="eventura-button"
                      onClick={handleSaveFromCalculator}
                    >
                      Save to Finance records
                    </button>
                  </div>
                </div>
              </div>

              <div className="eventura-panel">
                <h2 className="eventura-panel-title">
                  Vendor payments – guidance
                </h2>
                <p className="eventura-small-text">
                  Use the calculator to test vendor payment structures. Example:
                </p>
                <ul className="eventura-fin-bullets">
                  <li>Client pays 50% advance, 40% pre-event, 10% after.</li>
                  <li>Vendors usually 60–75% of event budget.</li>
                  <li>
                    Keep at least 20–25% margin on every large event to stay
                    above break-even.
                  </li>
                </ul>
              </div>
            </section>
          )}

          <footer className="eventura-footer">
            Eventura · Finance module · © {new Date().getFullYear()}
          </footer>
        </div>
      </div>
    </main>
  );
}

/* Sidebar + topbar reused */

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
