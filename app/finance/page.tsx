"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";

type Role = "CEO" | "Staff";
type User = { name: string; role: Role; city: string };

const USER_KEY = "eventura-user";
const FINANCE_KEY = "eventura-finance";

type FinanceEntry = {
  id: number;
  month: string; // e.g. 2025-01
  income: string;
  expenses: string;
  notes: string;
};

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
  const [draft, setDraft] = useState<Omit<FinanceEntry, "id">>({
    month: "",
    income: "",
    expenses: "",
    notes: "",
  });

  // load user + finance data
  useEffect(() => {
    if (typeof window === "undefined") return;

    const rawUser = window.localStorage.getItem(USER_KEY);
    if (!rawUser) {
      window.location.href = "/login";
      return;
    }
    try {
      const u: User = JSON.parse(rawUser);
      if (u.role !== "CEO") {
        // only CEO should see full finance page
        window.location.href = "/";
        return;
      }
      setUser(u);
    } catch {
      window.localStorage.removeItem(USER_KEY);
      window.location.href = "/login";
      return;
    }

    const rawFinance = window.localStorage.getItem(FINANCE_KEY);
    if (rawFinance) {
      try {
        setEntries(JSON.parse(rawFinance));
      } catch {
        // ignore parsing errors
      }
    }
  }, []);

  // persist on change
  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(FINANCE_KEY, JSON.stringify(entries));
  }, [entries]);

  // 🚫 NO useSearchParams – we use window.location.search instead
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const downloadFlag = params.get("download");
    if (downloadFlag === "1" && entries.length > 0) {
      handleDownload();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entries.length]);

  function handleDraftChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) {
    const { name, value } = e.target;
    setDraft((prev) => ({ ...prev, [name]: value }));
  }

  function handleAddEntry(e: React.FormEvent) {
    e.preventDefault();
    if (!draft.month || (!draft.income && !draft.expenses)) {
      alert("Month and at least income or expenses are required.");
      return;
    }
    const newEntry: FinanceEntry = {
      id: Date.now(),
      ...draft,
    };
    setEntries((prev) => [newEntry, ...prev]);
    setDraft({
      month: "",
      income: "",
      expenses: "",
      notes: "",
    });
  }

  function handleDeleteEntry(id: number) {
    if (!confirm("Delete this finance record?")) return;
    setEntries((prev) => prev.filter((e) => e.id !== id));
  }

  function handleInlineChange(
    id: number,
    field: keyof Omit<FinanceEntry, "id">,
    value: string
  ) {
    setEntries((prev) =>
      prev.map((e) =>
        e.id === id
          ? {
              ...e,
              [field]: value,
            }
          : e
      )
    );
  }

  function handleDownload() {
    if (entries.length === 0) {
      alert("No finance data to download.");
      return;
    }

    const header = ["Month", "Income", "Expenses", "Net", "Notes"];
    const rows = entries.map((e) => {
      const income = parseMoney(e.income || "0");
      const expenses = parseMoney(e.expenses || "0");
      const net = income - expenses;
      return [
        e.month,
        income.toString(),
        expenses.toString(),
        net.toString(),
        (e.notes || "").replace(/[\r\n]+/g, " "),
      ];
    });

    const csv = [header, ...rows]
      .map((row) => row.map((v) => `"${v}"`).join(","))
      .join("\r\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "Eventura_Finance_Report.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  if (!user) return null;

  // summary numbers
  let totalIncome = 0;
  let totalExpenses = 0;
  entries.forEach((e) => {
    totalIncome += parseMoney(e.income || "0");
    totalExpenses += parseMoney(e.expenses || "0");
  });
  const net = totalIncome - totalExpenses;
  const margin = totalIncome > 0 ? (net / totalIncome) * 100 : 0;

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
              <h1 className="eventura-page-title">Finance & Auto Calculator</h1>
              <p className="eventura-subtitle">
                Track Eventura income, expenses, and auto-calculated margins.
              </p>
            </div>
            <div className="eventura-actions">
              <button
                type="button"
                className="eventura-button-secondary"
                onClick={handleDownload}
              >
                ⬇ Download CSV
              </button>
            </div>
          </div>

          {/* Summary row */}
          <section className="eventura-kpi-row">
            <div className="eventura-card">
              <div className="eventura-card-label">Total income</div>
              <div className="eventura-card-value">
                ₹{formatCurrency(totalIncome)}
              </div>
              <div className="eventura-card-note">
                Sum of all income entries
              </div>
            </div>

            <div className="eventura-card">
              <div className="eventura-card-label">Total expenses</div>
              <div className="eventura-card-value">
                ₹{formatCurrency(totalExpenses)}
              </div>
              <div className="eventura-card-note">
                Vendor payouts, salaries, rent, etc.
              </div>
            </div>

            <div className="eventura-card">
              <div className="eventura-card-label">Net & margin</div>
              <div className="eventura-card-value">
                ₹{formatCurrency(net)}
              </div>
              <div className="eventura-card-note">
                Margin {margin ? margin.toFixed(1) : "–"}%
              </div>
            </div>
          </section>

          {/* Main layout: left = data entry, right = table */}
          <section className="eventura-columns" style={{ marginTop: "1.2rem" }}>
            {/* Left: add / edit form */}
            <div className="eventura-panel">
              <h2 className="eventura-panel-title">
                Add monthly finance record
              </h2>
              <p className="eventura-small-text">
                Use one row per month or per event group. You can still edit
                numbers directly in the table on the right.
              </p>

              <form
                className="eventura-form"
                onSubmit={handleAddEntry}
                style={{ marginTop: "0.7rem" }}
              >
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
                    <label className="eventura-label" htmlFor="income">
                      Income (₹)
                    </label>
                    <input
                      id="income"
                      name="income"
                      className="eventura-input"
                      value={draft.income}
                      onChange={handleDraftChange}
                      placeholder="e.g. 20,00,000"
                    />
                  </div>
                </div>

                <div className="eventura-form-grid" style={{ marginTop: "0.5rem" }}>
                  <div className="eventura-field">
                    <label className="eventura-label" htmlFor="expenses">
                      Expenses (₹)
                    </label>
                    <input
                      id="expenses"
                      name="expenses"
                      className="eventura-input"
                      value={draft.expenses}
                      onChange={handleDraftChange}
                      placeholder="e.g. 13,50,000"
                    />
                  </div>
                </div>

                <div className="eventura-field" style={{ marginTop: "0.5rem" }}>
                  <label className="eventura-label" htmlFor="notes">
                    Notes
                  </label>
                  <textarea
                    id="notes"
                    name="notes"
                    className="eventura-textarea"
                    value={draft.notes}
                    onChange={handleDraftChange}
                    placeholder="e.g. Includes 4 weddings in Surat + 1 corporate gala"
                  />
                </div>

                <div className="eventura-actions" style={{ marginTop: "0.7rem" }}>
                  <button type="submit" className="eventura-button">
                    Save record
                  </button>
                </div>
              </form>
            </div>

            {/* Right: table & auto calculations */}
            <div className="eventura-panel">
              <h2 className="eventura-panel-title">
                Finance table (auto net & margin)
              </h2>
              <p className="eventura-small-text">
                Edit any cell directly. Net and margin are calculated
                automatically per row.
              </p>

              <div className="eventura-table-wrapper" style={{ marginTop: "0.6rem" }}>
                {entries.length === 0 ? (
                  <p
                    style={{
                      fontSize: "0.8rem",
                      color: "#9ca3af",
                    }}
                  >
                    No finance records yet. Add at least one month on the left
                    to see the auto calculator.
                  </p>
                ) : (
                  <table className="eventura-table">
                    <thead>
                      <tr>
                        <th>Month</th>
                        <th>Income (₹)</th>
                        <th>Expenses (₹)</th>
                        <th>Net (₹)</th>
                        <th>Margin %</th>
                        <th>Notes</th>
                        <th />
                      </tr>
                    </thead>
                    <tbody>
                      {entries.map((e) => {
                        const income = parseMoney(e.income || "0");
                        const expenses = parseMoney(e.expenses || "0");
                        const netRow = income - expenses;
                        const marginRow =
                          income > 0 ? (netRow / income) * 100 : 0;

                        return (
                          <tr key={e.id}>
                            <td>
                              <input
                                className="eventura-input"
                                type="month"
                                value={e.month}
                                onChange={(ev) =>
                                  handleInlineChange(
                                    e.id,
                                    "month",
                                    ev.target.value
                                  )
                                }
                              />
                            </td>
                            <td>
                              <input
                                className="eventura-input"
                                value={e.income}
                                onChange={(ev) =>
                                  handleInlineChange(
                                    e.id,
                                    "income",
                                    ev.target.value
                                  )
                                }
                              />
                            </td>
                            <td>
                              <input
                                className="eventura-input"
                                value={e.expenses}
                                onChange={(ev) =>
                                  handleInlineChange(
                                    e.id,
                                    "expenses",
                                    ev.target.value
                                  )
                                }
                              />
                            </td>
                            <td>₹{formatCurrency(netRow)}</td>
                            <td>
                              {marginRow ? marginRow.toFixed(1) : "–"}%
                            </td>
                            <td>
                              <input
                                className="eventura-input"
                                value={e.notes}
                                onChange={(ev) =>
                                  handleInlineChange(
                                    e.id,
                                    "notes",
                                    ev.target.value
                                  )
                                }
                              />
                            </td>
                            <td>
                              <button
                                type="button"
                                className="eventura-tag eventura-tag-amber"
                                onClick={() => handleDeleteEntry(e.id)}
                              >
                                Delete
                              </button>
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

          <footer className="eventura-footer">
            Eventura · Finance & Strategy · © {new Date().getFullYear()}
          </footer>
        </div>
      </div>
    </main>
  );
}

/* Shared layout bits (same classes as other pages) */

function SidebarCore({ user, active }: { user: User; active: string }) {
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
        <SidebarLink
          href="/finance"
          label="Finance"
          icon="💰"
          active={active === "finance"}
        />
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
        <SidebarLink
          href="/reports"
          label="Reports & Analytics"
          icon="📈"
          active={active === "reports"}
        />
        <SidebarLink
          href="/settings"
          label="Settings & Access"
          icon="⚙️"
          active={active === "settings"}
        />
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
