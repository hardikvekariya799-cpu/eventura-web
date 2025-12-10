"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";

type Role = "CEO" | "Staff";
type User = { name: string; role: Role; city: string };

const USER_KEY = "eventura-user";
const EVENTS_KEY = "eventura-events";
const FINANCE_KEY = "eventura-finance";

type StageKey =
  | "New Leads"
  | "Proposal Sent"
  | "Negotiation"
  | "Confirmed"
  | "Completed";

const STAGES: StageKey[] = [
  "New Leads",
  "Proposal Sent",
  "Negotiation",
  "Confirmed",
  "Completed",
];

type StoredEvent = {
  status?: string;
};

type FinanceEntry = {
  id: number;
  month?: string;
  income: string;
  expenses: string;
  notes?: string;
};

function parseMoney(value: string): number {
  const cleaned = value.replace(/[₹, ,]/g, "");
  const n = parseFloat(cleaned);
  return isNaN(n) ? 0 : n;
}

export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null);

  const [eventsThisMonth, setEventsThisMonth] = useState(0);
  const [confirmedRevenue, setConfirmedRevenue] = useState(0);
  const [projectedMargin, setProjectedMargin] = useState(0);
  const [cashInHand, setCashInHand] = useState(0);

  const [pipeCounts, setPipeCounts] = useState<Record<StageKey, number>>({
    "New Leads": 0,
    "Proposal Sent": 0,
    Negotiation: 0,
    Confirmed: 0,
    Completed: 0,
  });

  // === AUTH + LOAD DATA ===
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
      loadDashboardData();
    } catch {
      window.localStorage.removeItem(USER_KEY);
      window.location.href = "/login";
    }
  }, []);

  function loadDashboardData() {
    if (typeof window === "undefined") return;

    // Events
    const eventsRaw = window.localStorage.getItem(EVENTS_KEY);
    if (eventsRaw) {
      try {
        const list: StoredEvent[] = JSON.parse(eventsRaw);
        setEventsThisMonth(list.length);

        const counts: Record<StageKey, number> = {
          "New Leads": 0,
          "Proposal Sent": 0,
          Negotiation: 0,
          Confirmed: 0,
          Completed: 0,
        };

        for (const ev of list) {
          const status = (ev.status || "New").trim();
          if (status === "New") counts["New Leads"] += 1;
          else if (status === "Proposal Sent") counts["Proposal Sent"] += 1;
          else if (status === "Negotiation") counts["Negotiation"] += 1;
          else if (status === "Confirmed") counts["Confirmed"] += 1;
          else if (status === "Completed") counts["Completed"] += 1;
        }
        setPipeCounts(counts);
      } catch (e) {
        console.error("Failed to parse events", e);
      }
    }

    // Finance
    const financeRaw = window.localStorage.getItem(FINANCE_KEY);
    if (financeRaw) {
      try {
        const entries: FinanceEntry[] = JSON.parse(financeRaw);
        if (entries.length > 0) {
          const sorted = [...entries].sort((a, b) => b.id - a.id);
          const latest = sorted[0];
          const income = parseMoney(latest.income || "0");
          const expenses = parseMoney(latest.expenses || "0");
          const net = income - expenses;
          const margin = income > 0 ? Math.round((net / income) * 100) : 0;

          setConfirmedRevenue(income);
          setCashInHand(net);
          setProjectedMargin(margin);
        }
      } catch (e) {
        console.error("Failed to parse finance", e);
      }
    }
  }

  function handleLogout() {
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(USER_KEY);
      window.location.href = "/login";
    }
  }

  if (!user) return null;
  const isCEO = user.role === "CEO";

  return (
    <main className="eventura-os">
      {/* Sidebar */}
      <aside className="eventura-sidebar">
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
          <SidebarLink href="/" label="Dashboard" icon="📊" active />
          <SidebarLink href="/events" label="Events" icon="🎉" />
          <SidebarLink href="/calendar" label="Calendar" icon="📅" />
          <SidebarLink href="/leads" label="Clients & Leads" icon="👥" />
          <SidebarLink href="/vendors" label="Vendors" icon="🤝" />
          {isCEO && (
            <SidebarLink href="/finance" label="Finance" icon="💰" />
          )}
          <SidebarLink href="/hr" label="HR & Team" icon="🧑‍💼" />
          <SidebarLink href="/inventory" label="Inventory & Assets" icon="📦" />
          {isCEO && (
            <SidebarLink
              href="/reports"
              label="Reports & Analytics"
              icon="📈"
            />
          )}
          {isCEO && (
            <SidebarLink
              href="/settings"
              label="Settings & Access"
              icon="⚙️"
            />
          )}
        </nav>

        <div className="eventura-sidebar-footer">
          <div className="eventura-sidebar-role">
            Role: {user.role === "CEO" ? "CEO / Super Admin" : "Staff"}
          </div>
          <div className="eventura-sidebar-city">City: {user.city}</div>
        </div>
      </aside>

      {/* Main content area */}
      <div className="eventura-main">
        {/* Top bar */}
        <header className="eventura-topbar">
          <div className="eventura-topbar-left">
            <div className="eventura-topbar-location">
              📍 {user.city}, Gujarat
            </div>
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
            <button
              className="eventura-topbar-logout"
              onClick={handleLogout}
              title="Logout"
            >
              Logout
            </button>
          </div>
        </header>

        {/* Page content */}
        <div className="eventura-content">
          {/* KPI cards */}
          <section className="eventura-kpi-row">
            <div className="eventura-card">
              <div className="eventura-card-label">Events this month</div>
              <div className="eventura-card-value">
                {eventsThisMonth}
                <span className="eventura-card-icon">📊</span>
              </div>
              <div className="eventura-card-note">
                Count from Events module
              </div>
            </div>

            <div className="eventura-card">
              <div className="eventura-card-label">
                Confirmed revenue (latest month)
              </div>
              <div className="eventura-card-value">
                ₹{confirmedRevenue.toLocaleString("en-IN")}
              </div>
              <div className="eventura-card-note">
                From Finance records – latest entry
              </div>
            </div>

            {isCEO && (
              <>
                <div className="eventura-card">
                  <div className="eventura-card-label">
                    Projected profit margin
                  </div>
                  <div className="eventura-card-value">
                    {projectedMargin}%
                  </div>
                  <div className="eventura-card-note">
                    Auto-calculated from Finance (net ÷ income)
                  </div>
                </div>

                <div className="eventura-card">
                  <div className="eventura-card-label">
                    Cash in hand / bank (latest month)
                  </div>
                  <div className="eventura-card-value">
                    ₹{cashInHand.toLocaleString("en-IN")}
                  </div>
                  <div className="eventura-card-note">
                    Income − expenses for latest Finance record
                  </div>
                </div>
              </>
            )}
          </section>

          {/* Middle section */}
          <section className="eventura-middle">
            {/* Event pipeline */}
            <div className="eventura-panel">
              <h2 className="eventura-panel-title">Event pipeline</h2>
              <div className="eventura-stage-bar">
                {STAGES.map((stage) => (
                  <div key={stage} className="eventura-stage-item">
                    <div className="eventura-stage-label">{stage}</div>
                    <div className="eventura-stage-count">
                      {pipeCounts[stage]}
                    </div>
                  </div>
                ))}
              </div>

              <div className="eventura-small-text">
                Numbers above come directly from Events statuses.
              </div>
            </div>

            {/* Upcoming (still sample) */}
            <div className="eventura-panel">
              <h2 className="eventura-panel-title">
                Upcoming 7 events (sample view)
              </h2>
              <ul className="eventura-list">
                <li className="eventura-list-item">
                  <div>
                    <div className="eventura-list-title">
                      Patel Wedding Sangeet
                    </div>
                    <div className="eventura-list-sub">
                      14 Dec · Laxmi Farm, Surat · 450 guests
                    </div>
                  </div>
                  <span className="eventura-tag eventura-tag-green">
                    Planning
                  </span>
                </li>
                <li className="eventura-list-item">
                  <div>
                    <div className="eventura-list-title">
                      Corporate Gala – XYZ Textiles
                    </div>
                    <div className="eventura-list-sub">
                      16 Dec · Taj Gateway, Surat · 220 guests
                    </div>
                  </div>
                  <span className="eventura-tag eventura-tag-amber">
                    In Execution
                  </span>
                </li>
                <li className="eventura-list-item">
                  <div>
                    <div className="eventura-list-title">
                      Engagement – Mehta Family
                    </div>
                    <div className="eventura-list-sub">
                      18 Dec · Indoor · Rajkot · 150 guests
                    </div>
                  </div>
                  <span className="eventura-tag eventura-tag-blue">
                    Final Billing
                  </span>
                </li>
              </ul>
              <div className="eventura-small-text">
                Later we can wire this to real Calendar data.
              </div>
            </div>
          </section>

          {/* Quick actions — NOW USING LINKS (WILL ALWAYS WORK) */}
          <section className="eventura-quick-actions">
            <Link href="/events" className="eventura-button">
              + New Event
            </Link>

            <Link href="/leads" className="eventura-button-secondary">
              + New Lead
            </Link>

            {isCEO && (
              <>
                <Link
                  href="/finance?tab=calculator"
                  className="eventura-button-secondary"
                >
                  + Vendor Payment
                </Link>

                <Link
                  href="/finance?autoDownload=1"
                  className="eventura-button-secondary"
                >
                  Download Monthly Report
                </Link>
              </>
            )}
          </section>
        </div>
      </div>
    </main>
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
