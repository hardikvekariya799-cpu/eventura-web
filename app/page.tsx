"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";

type Role = "CEO" | "Staff";
type User = { name: string; role: Role };

const USER_KEY = "eventura-user";

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [eventsMonth, setEventsMonth] = useState("12");
  const [expectedRevenue, setExpectedRevenue] = useState("18.5 Lakh");
  const [leadsPipeline, setLeadsPipeline] = useState("23");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const raw = window.localStorage.getItem(USER_KEY);
    if (!raw) {
      window.location.href = "/login";
      return;
    }
    try {
      setUser(JSON.parse(raw));
    } catch {
      window.localStorage.removeItem(USER_KEY);
      window.location.href = "/login";
    }
  }, []);

  function handleLogout() {
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(USER_KEY);
      window.location.href = "/login";
    }
  }

  function handleQuickUpdate(e: React.FormEvent) {
    e.preventDefault();
    alert("Dashboard KPIs updated (local only).");
  }

  if (!user) return null;
  const isCEO = user.role === "CEO";

  return (
    <main className="eventura-page">
      <div className="eventura-shell">
        {/* Header */}
        <header className="eventura-header">
          <div>
            <h1 className="eventura-title">Eventura – CEO Dashboard</h1>
            <p className="eventura-subtitle">
              {user.name} ({user.role}) · Events that speak your style
            </p>
          </div>
          <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
            <div className="eventura-pill">
              Cofounders: Hardik · Shubh · Dixit
            </div>
            <button
              className="eventura-button-secondary"
              style={{ paddingInline: "0.8rem" }}
              onClick={handleLogout}
            >
              Logout
            </button>
          </div>
        </header>

        {/* Nav */}
        <nav className="eventura-nav">
          <Link
            href="/"
            className="eventura-nav-link eventura-nav-link-active"
          >
            Dashboard
          </Link>
          <Link href="/events" className="eventura-nav-link">
            Events
          </Link>
          <Link href="/leads" className="eventura-nav-link">
            Leads
          </Link>
          {isCEO && (
            <Link href="/finance" className="eventura-nav-link">
              Finance
            </Link>
          )}
        </nav>

        {/* KPI cards */}
        <section className="eventura-grid">
          <div className="eventura-card">
            <p className="eventura-card-label">Events this month</p>
            <p className="eventura-card-value">{eventsMonth}</p>
            <p className="eventura-card-note">Manual KPI</p>
          </div>

          <div className="eventura-card">
            <p className="eventura-card-label">Expected Revenue</p>
            <p className="eventura-card-value">₹{expectedRevenue}</p>
            <p className="eventura-card-note">Target: ₹25 Lakh</p>
          </div>

          <div className="eventura-card">
            <p className="eventura-card-label">Leads in pipeline</p>
            <p className="eventura-card-value">{leadsPipeline}</p>
            <p className="eventura-card-note">From Leads module</p>
          </div>
        </section>

        {/* Quick KPI edit */}
        <section className="eventura-form" style={{ marginBottom: "2rem" }}>
          <h2 className="eventura-section-title">Quick update – KPIs</h2>
          <form className="eventura-form-grid" onSubmit={handleQuickUpdate}>
            <div className="eventura-field">
              <label className="eventura-label" htmlFor="eventsMonth">
                Events this month
              </label>
              <input
                id="eventsMonth"
                className="eventura-input"
                value={eventsMonth}
                onChange={(e) => setEventsMonth(e.target.value)}
              />
            </div>

            <div className="eventura-field">
              <label className="eventura-label" htmlFor="expectedRevenue">
                Expected revenue (₹)
              </label>
              <input
                id="expectedRevenue"
                className="eventura-input"
                value={expectedRevenue}
                onChange={(e) => setExpectedRevenue(e.target.value)}
              />
            </div>

            <div className="eventura-field">
              <label className="eventura-label" htmlFor="leadsPipeline">
                Leads in pipeline
              </label>
              <input
                id="leadsPipeline"
                className="eventura-input"
                value={leadsPipeline}
                onChange={(e) => setLeadsPipeline(e.target.value)}
              />
            </div>

            <div className="eventura-actions">
              <button type="submit" className="eventura-button">
                Save dashboard KPIs
              </button>
            </div>
          </form>
        </section>

        {/* Bottom panels (static for now) */}
        <section className="eventura-columns">
          <div className="eventura-panel">
            <h2 className="eventura-panel-title">
              Upcoming events (manual snapshot)
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

          <div className="eventura-panel">
            <h2 className="eventura-panel-title">Finance snapshot</h2>
            <p className="eventura-list-sub">
              Open Finance module for full income/expense breakdown.
            </p>
          </div>
        </section>

        <footer className="eventura-footer">
          Eventura · Royal Event & Wedding Design Studio · Surat · ©{" "}
          {new Date().getFullYear()}
        </footer>
      </div>
    </main>
  );
}
