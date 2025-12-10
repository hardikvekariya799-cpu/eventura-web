"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";

type FinanceEntry = {
  id: number;
  month: string;
  income: string;
  expenses: string;
  notes: string;
};

const STORAGE_KEY = "eventura-finance";

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

export default function FinancePage() {
  const [entries, setEntries] = useState<FinanceEntry[]>([]);
  const [form, setForm] = useState<Omit<FinanceEntry, "id">>({
    month: "",
    income: "",
    expenses: "",
    notes: "",
  });

  // load from localStorage
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        setEntries(JSON.parse(raw));
      }
    } catch (e) {
      console.error("Failed to load finance entries", e);
    }
  }, []);

  // save to localStorage
  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  }, [entries]);

  function handleChange(
    e:
      | React.ChangeEvent<HTMLInputElement>
      | React.ChangeEvent<HTMLTextAreaElement>
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
      window.localStorage.removeItem(STORAGE_KEY);
    }
  }

  // totals
  let totalIncome = 0;
  let totalExpenses = 0;

  for (const e of entries) {
    totalIncome += parseMoney(e.income);
    totalExpenses += parseMoney(e.expenses);
  }

  const net = totalIncome - totalExpenses;
  const margin = totalIncome > 0 ? (net / totalIncome) * 100 : 0;

  return (
    <main className="eventura-page">
      <div className="eventura-shell">
        {/* Header */}
        <header className="eventura-header">
          <div>
            <h1 className="eventura-title">Finance – Eventura</h1>
            <p className="eventura-subtitle">
              Track income, expenses, and profit for your event pipeline.
            </p>
          </div>
        </header>

        {/* Nav */}
        <nav className="eventura-nav">
          <Link href="/" className="eventura-nav-link">
            Dashboard
          </Link>
          <Link href="/events" className="eventura-nav-link">
            Events
          </Link>
          <Link
            href="/finance"
            className="eventura-nav-link eventura-nav-link-active"
          >
            Finance
          </Link>
        </nav>

        {/* Summary cards */}
        <section className="eventura-grid">
          <div className="eventura-card">
            <p className="eventura-card-label">Total expected income</p>
            <p className="eventura-card-value">
              ₹{formatCurrency(totalIncome)}
            </p>
            <p className="eventura-card-note">
              Sum of all months in this view
            </p>
          </div>

          <div className="eventura-card">
            <p className="eventura-card-label">Total expected expenses</p>
            <p className="eventura-card-value">
              ₹{formatCurrency(totalExpenses)}
            </p>
            <p className="eventura-card-note">
              Vendor payouts, staff, decor, venue, etc.
            </p>
          </div>

          <div className="eventura-card">
            <p className="eventura-card-label">Net profit & margin</p>
            <p className="eventura-card-value">
              ₹{formatCurrency(net)}
            </p>
            <p className="eventura-card-note">
              Margin: {margin.toFixed(1)}%
            </p>
          </div>
        </section>

        {/* Layout: form + list */}
        <section className="eventura-columns">
          {/* Form */}
          <div>
            <h2 className="eventura-section-title">Add finance record</h2>
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

              <div className="eventura-field" style={{ marginTop: "0.75rem" }}>
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
              </div>
            </form>
          </div>

          {/* List */}
          <div className="eventura-panel">
            <h2 className="eventura-panel-title">Monthly overview</h2>
            {entries.length === 0 ? (
              <p style={{ fontSize: "0.8rem", color: "#9ca3af" }}>
                No finance records yet. Add your first month using the form on
                the left.
              </p>
            ) : (
              <ul className="eventura-list">
                {entries.map((entry) => {
                  const income = parseMoney(entry.income);
                  const expenses = parseMoney(entry.expenses);
                  const netValue = income - expenses;
                  const marginValue =
                    income > 0 ? (netValue / income) * 100 : 0;

                  return (
                    <li key={entry.id} className="eventura-list-item">
                      <div>
                        <p className="eventura-list-title">{entry.month}</p>
                        <p className="eventura-list-sub">
                          Income: ₹{entry.income || "0"} · Expenses: ₹
                          {entry.expenses || "0"}
                        </p>
                        <p className="eventura-list-sub">
                          Net: ₹{formatCurrency(netValue)} · Margin:{" "}
                          {marginValue.toFixed(1)}%
                        </p>
                        {entry.notes && (
                          <p
                            className="eventura-list-sub"
                            style={{ marginTop: "0.15rem" }}
                          >
                            Notes: {entry.notes}
                          </p>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </section>

        <footer className="eventura-footer">
          Eventura · Finance module · © {new Date().getFullYear()}
        </footer>
      </div>
    </main>
  );
}
