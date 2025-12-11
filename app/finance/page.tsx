"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";

/* ========= Shared types & keys ========= */

type Role = "CEO" | "Staff";
type User = { name: string; role: Role; city: string };

const USER_KEY = "eventura-user";
const FINANCE_KEY = "eventura-finance-board";

type FinanceRow = {
  id: number;
  label: string;
  month: string; // "2025-12"
  income: string;
  expense: string;
  category:
    | "Client Payment"
    | "Vendor Payment"
    | "Salary"
    | "Office & Rent"
    | "Marketing"
    | "Travel"
    | "Investment"
    | "Other";
  notes: string;
};

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

/* ========= MAIN PAGE ========= */

export default function FinancePage() {
  const [user, setUser] = useState<User | null>(null);
  const [rows, setRows] = useState<FinanceRow[]>([]);
  const [selectedMonth, setSelectedMonth] = useState<string>("");
  const [filterCategory, setFilterCategory] = useState<string>("All");

  const [draft, setDraft] = useState<Omit<FinanceRow, "id">>({
    label: "",
    month: "",
    income: "",
    expense: "",
    category: "Client Payment",
    notes: "",
  });

  const [editingId, setEditingId] = useState<number | null>(null);

  // Auth: must be logged in (CEO or Staff)
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

  // Load finance board
  useEffect(() => {
    if (typeof window === "undefined") return;
    const raw = window.localStorage.getItem(FINANCE_KEY);
    if (!raw) {
      // seed example
      const seed: FinanceRow[] = [
        {
          id: Date.now(),
          label: "Patel Wedding Final Payment",
          month: "2025-12",
          income: "1200000",
          expense: "800000",
          category: "Client Payment",
          notes: "Includes decor + catering + artist.",
        },
        {
          id: Date.now() + 1,
          label: "Office & Studio Rent",
          month: "2025-12",
          income: "",
          expense: "75000",
          category: "Office & Rent",
          notes: "Eventura Reality Surat.",
        },
      ];
      setRows(seed);
      window.localStorage.setItem(FINANCE_KEY, JSON.stringify(seed));
      return;
    }
    try {
      const parsed: FinanceRow[] = JSON.parse(raw);
      setRows(parsed);
    } catch {
      // ignore corrupt data
    }
  }, []);

  // Persist on change
  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(FINANCE_KEY, JSON.stringify(rows));
  }, [rows]);

  function handleDraftChange(
    e:
      | React.ChangeEvent<HTMLInputElement>
      | React.ChangeEvent<HTMLTextAreaElement>
      | React.ChangeEvent<HTMLSelectElement>
  ) {
    const { name, value } = e.target;
    setDraft((prev) => ({ ...prev, [name]: value }));
  }

  function resetDraft() {
    setEditingId(null);
    setDraft({
      label: "",
      month: "",
      income: "",
      expense: "",
      category: "Client Payment",
      notes: "",
    });
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!draft.label || !draft.month) {
      alert("Please fill at least Title and Month.");
      return;
    }

    if (editingId == null) {
      const newRow: FinanceRow = {
        id: Date.now(),
        ...draft,
      };
      setRows((prev) => [newRow, ...prev]);
    } else {
      setRows((prev) =>
        prev.map((r) => (r.id === editingId ? { ...r, ...draft } : r))
      );
    }

    resetDraft();
  }

  function handleEdit(row: FinanceRow) {
    setEditingId(row.id);
    setDraft({
      label: row.label,
      month: row.month,
      income: row.income,
      expense: row.expense,
      category: row.category,
      notes: row.notes,
    });
  }

  function handleDelete(id: number) {
    if (!confirm("Delete this record?")) return;
    setRows((prev) => prev.filter((r) => r.id !== id));
    if (editingId === id) resetDraft();
  }

  function clearMonth(month: string) {
    if (!confirm(`Clear all entries for ${month}?`)) return;
    setRows((prev) => prev.filter((r) => r.month !== month));
  }

  /* ========= Calculations ========= */

  const filteredRows = rows.filter((r) => {
    const monthOk = selectedMonth ? r.month === selectedMonth : true;
    const catOk =
      filterCategory === "All" ? true : r.category === filterCategory;
    return monthOk && catOk;
  });

  const summary = useMemo(() => {
    let totalIncome = 0;
    let totalExpense = 0;

    for (const row of filteredRows) {
      totalIncome += parseMoney(row.income || "0");
      totalExpense += parseMoney(row.expense || "0");
    }

    const profit = totalIncome - totalExpense;
    const margin = totalIncome
      ? Math.round((profit / totalIncome) * 100)
      : 0;

    // category wise
    const byCategory: Record<string, { income: number; expense: number }> = {};
    for (const row of filteredRows) {
      if (!byCategory[row.category]) {
        byCategory[row.category] = { income: 0, expense: 0 };
      }
      byCategory[row.category].income += parseMoney(row.income || "0");
      byCategory[row.category].expense += parseMoney(row.expense || "0");
    }

    return { totalIncome, totalExpense, profit, margin, byCategory };
  }, [filteredRows]);

  if (!user) return null;

  const isCEO = user.role === "CEO";

  return (
    <main className="eventura-os">
      <aside className="eventura-sidebar">
        <SidebarCore user={user} active="finance" />
      </aside>

      <div className="eventura-main">
        <TopbarCore user={user} />

        <div className="eventura-content">
          {/* Header */}
          <div className="eventura-header-row">
            <div>
              <h1 className="eventura-page-title">Finance Board</h1>
              <p className="eventura-subtitle">
                Track Eventura cashflow: client receipts, vendor payouts, salaries,
                rent, marketing – all in one purple-black board.
              </p>
            </div>
            <div className="eventura-actions">
              <button
                type="button"
                className="eventura-button-secondary"
                onClick={resetDraft}
              >
                + New line
              </button>
            </div>
          </div>

          {/* Summary cards */}
          <section className="eventura-grid">
            <div className="eventura-card eventura-card-glow">
              <p className="eventura-card-label">Total income</p>
              <p className="eventura-card-value">
                ₹{formatCurrency(summary.totalIncome)}
              </p>
              <p className="eventura-card-note">
                All client & other inflows for selected filters.
              </p>
            </div>

            <div className="eventura-card eventura-card-glow">
              <p className="eventura-card-label">Total expense</p>
              <p className="eventura-card-value">
                ₹{formatCurrency(summary.totalExpense)}
              </p>
              <p className="eventura-card-note">
                Vendor payouts, salaries, rent, marketing, travel.
              </p>
            </div>

            <div className="eventura-card eventura-card-glow">
              <p className="eventura-card-label">Net profit</p>
              <p
                className="eventura-card-value"
                style={{ color: summary.profit >= 0 ? "#4ade80" : "#f97373" }}
              >
                ₹{formatCurrency(summary.profit)}
              </p>
              <p className="eventura-card-note">
                Margin: {summary.margin}%
              </p>
            </div>
          </section>

          {/* Filters */}
          <section className="eventura-panel" style={{ marginBottom: "1rem" }}>
            <h2 className="eventura-panel-title">Filters & month view</h2>
            <div className="eventura-form-grid">
              <div className="eventura-field">
                <label className="eventura-label">Month</label>
                <input
                  type="month"
                  className="eventura-input"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                />
              </div>
              <div className="eventura-field">
                <label className="eventura-label">Category</label>
                <select
                  className="eventura-input"
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                >
                  <option value="All">All</option>
                  <option>Client Payment</option>
                  <option>Vendor Payment</option>
                  <option>Salary</option>
                  <option>Office & Rent</option>
                  <option>Marketing</option>
                  <option>Travel</option>
                  <option>Investment</option>
                  <option>Other</option>
                </select>
              </div>
              {selectedMonth && (
                <div className="eventura-field" style={{ alignSelf: "flex-end" }}>
                  <button
                    type="button"
                    className="eventura-button-secondary"
                    onClick={() => clearMonth(selectedMonth)}
                  >
                    Clear month
                  </button>
                </div>
              )}
            </div>
          </section>

          {/* Main 2-column: Auto calculator + table */}
          <section
            className="eventura-columns"
            style={{
              gridTemplateColumns: "minmax(0, 1.2fr) minmax(0, 2fr)",
            }}
          >
            {/* Left: Auto calculator form */}
            <div className="eventura-panel finance-panel-gradient">
              <h2 className="eventura-panel-title">Add transaction</h2>
              <form className="eventura-form" onSubmit={handleSubmit}>
                <div className="eventura-field">
                  <label className="eventura-label" htmlFor="label">
                    Title
                  </label>
                  <input
                    id="label"
                    name="label"
                    className="eventura-input"
                    value={draft.label}
                    onChange={handleDraftChange}
                    placeholder="e.g. Mehta Wedding advance, Vendor payout, Office rent"
                  />
                </div>

                <div className="eventura-form-grid">
                  <div className="eventura-field">
                    <label className="eventura-label" htmlFor="month">
                      Month
                    </label>
                    <input
                      id="month"
                      name="month"
                      type="month"
                      className="eventura-input"
                      value={draft.month}
                      onChange={handleDraftChange}
                    />
                  </div>
                  <div className="eventura-field">
                    <label className="eventura-label" htmlFor="category">
                      Category
                    </label>
                    <select
                      id="category"
                      name="category"
                      className="eventura-input"
                      value={draft.category}
                      onChange={handleDraftChange}
                    >
                      <option>Client Payment</option>
                      <option>Vendor Payment</option>
                      <option>Salary</option>
                      <option>Office & Rent</option>
                      <option>Marketing</option>
                      <option>Travel</option>
                      <option>Investment</option>
                      <option>Other</option>
                    </select>
                  </div>
                </div>

                <div className="eventura-form-grid">
                  <div className="eventura-field">
                    <label className="eventura-label" htmlFor="income">
                      Income (₹)
                    </label>
                    <input
                      id="income"
                      name="income"
                      className="eventura-input"
                      value={draft.income}
                      onChange={handleDraftChange}
                      placeholder="Only numbers, no comma"
                    />
                  </div>
                  <div className="eventura-field">
                    <label className="eventura-label" htmlFor="expense">
                      Expense (₹)
                    </label>
                    <input
                      id="expense"
                      name="expense"
                      className="eventura-input"
                      value={draft.expense}
                      onChange={handleDraftChange}
                      placeholder="Vendor payout, salary etc."
                    />
                  </div>
                </div>

                <div className="eventura-field">
                  <label className="eventura-label" htmlFor="notes">
                    Notes
                  </label>
                  <textarea
                    id="notes"
                    name="notes"
                    className="eventura-textarea"
                    value={draft.notes}
                    onChange={handleDraftChange}
                    placeholder="Vendor name, client, payment stage, anything important…"
                  />
                </div>

                <div className="eventura-actions">
                  <button type="submit" className="eventura-button">
                    {editingId ? "Update line" : "Add line"}
                  </button>
                  {editingId && (
                    <button
                      type="button"
                      className="eventura-button-secondary"
                      onClick={resetDraft}
                    >
                      Cancel edit
                    </button>
                  )}
                </div>
              </form>

              <div
                className="eventura-panel"
                style={{
                  marginTop: "1rem",
                  background:
                    "radial-gradient(circle at top, rgba(168,85,247,0.35), rgba(15,23,42,0.95))",
                }}
              >
                <h3 className="eventura-panel-title">
                  Month snapshot (current filters)
                </h3>
                <ul className="eventura-bullets">
                  <li>
                    Gross inflow: ₹{formatCurrency(summary.totalIncome)}
                  </li>
                  <li>
                    Gross outflow: ₹{formatCurrency(summary.totalExpense)}
                  </li>
                  <li>
                    Net:{" "}
                    <span
                      style={{
                        color: summary.profit >= 0 ? "#4ade80" : "#f97373",
                      }}
                    >
                      ₹{formatCurrency(summary.profit)}
                    </span>{" "}
                    ({summary.margin}% margin)
                  </li>
                </ul>
              </div>
            </div>

            {/* Right: Table */}
            <div className="eventura-panel finance-panel-gradient">
              <h2 className="eventura-panel-title">Transactions</h2>
              <p className="eventura-small-text">
                This table is saved in your browser. In future, we can sync with
                real accounting (Zoho/QuickBooks) using Eventura ecosystem.
              </p>

              <div className="eventura-table-wrapper" style={{ marginTop: "0.5rem" }}>
                {filteredRows.length === 0 ? (
                  <p style={{ fontSize: "0.8rem", color: "#9ca3af" }}>
                    No entries match this filter. Add a row on the left or reset
                    filters.
                  </p>
                ) : (
                  <table className="eventura-table">
                    <thead>
                      <tr>
                        <th>Month</th>
                        <th>Title</th>
                        <th>Category</th>
                        <th>Income</th>
                        <th>Expense</th>
                        <th>Net</th>
                        <th />
                      </tr>
                    </thead>
                    <tbody>
                      {filteredRows.map((row) => {
                        const income = parseMoney(row.income || "0");
                        const expense = parseMoney(row.expense || "0");
                        const net = income - expense;
                        return (
                          <tr key={row.id}>
                            <td>
                              {row.month
                                ? row.month.replace("-", " / ")
                                : "–"}
                            </td>
                            <td>
                              <div className="eventura-list-title">
                                {row.label}
                              </div>
                              <div className="eventura-list-sub">
                                {row.notes || "No notes"}
                              </div>
                            </td>
                            <td>{row.category}</td>
                            <td>
                              {income
                                ? `₹${formatCurrency(income)}`
                                : "–"}
                            </td>
                            <td>
                              {expense
                                ? `₹${formatCurrency(expense)}`
                                : "–"}
                            </td>
                            <td
                              style={{
                                color: net >= 0 ? "#4ade80" : "#f97373",
                              }}
                            >
                              {net ? `₹${formatCurrency(net)}` : "–"}
                            </td>
                            <td>
                              <div
                                style={{
                                  display: "flex",
                                  gap: "0.3rem",
                                  justifyContent: "flex-end",
                                }}
                              >
                                <button
                                  type="button"
                                  className="eventura-tag eventura-tag-blue"
                                  onClick={() => handleEdit(row)}
                                >
                                  Edit
                                </button>
                                <button
                                  type="button"
                                  className="eventura-tag eventura-tag-amber"
                                  onClick={() => handleDelete(row.id)}
                                >
                                  Delete
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </section>

          {/* Category breakdown */}
          <section className="eventura-panel" style={{ marginTop: "1rem" }}>
            <h2 className="eventura-panel-title">Category breakdown</h2>
            <div
              className="eventura-grid"
              style={{ gridTemplateColumns: "repeat(auto-fit, minmax(180px,1fr))" }}
            >
              {Object.entries(summary.byCategory).map(
                ([cat, { income, expense }]) => {
                  const net = income - expense;
                  return (
                    <div key={cat} className="eventura-card">
                      <p className="eventura-card-label">{cat}</p>
                      <p className="eventura-card-note">
                        Income: ₹{formatCurrency(income)}
                      </p>
                      <p className="eventura-card-note">
                        Expense: ₹{formatCurrency(expense)}
                      </p>
                      <p
                        className="eventura-card-note"
                        style={{
                          color: net >= 0 ? "#4ade80" : "#f97373",
                          marginTop: "0.4rem",
                        }}
                      >
                        Net: ₹{formatCurrency(net)}
                      </p>
                    </div>
                  );
                }
              )}
              {Object.keys(summary.byCategory).length === 0 && (
                <p style={{ fontSize: "0.8rem", color: "#9ca3af" }}>
                  Add some data to see category-wise breakdown.
                </p>
              )}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}

/* ========= Common layout components (same style as other tabs) ========= */

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
          placeholder="Search events, finance, vendors..."
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
