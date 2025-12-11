"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";

type Role = "CEO" | "Staff";
type User = { name: string; role: Role; city: string };

type EventStatus =
  | "New Lead"
  | "Proposal Sent"
  | "Negotiation"
  | "Confirmed"
  | "Planning"
  | "In Execution"
  | "Completed"
  | "Cancelled";

type EventType = "Wedding" | "Corporate" | "Party" | "Festival" | "Other";

type EventItem = {
  id: number;
  clientName: string;
  eventName: string;
  eventType: EventType;
  city: string;
  venue: string;
  date: string;
  guests: string;
  budget: string;
  status: EventStatus;
};

type FinanceEntry = {
  id: number;
  month: string;
  income: string;
  expenses: string;
  notes: string;
};

const USER_KEY = "eventura-user";
const EVENTS_KEY = "eventura-events";
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

export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [finance, setFinance] = useState<FinanceEntry[]>([]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const rawUser = window.localStorage.getItem(USER_KEY);
    if (!rawUser) {
      window.location.href = "/login";
      return;
    }
    try {
      const u: User = JSON.parse(rawUser);
      setUser(u);
    } catch {
      window.localStorage.removeItem(USER_KEY);
      window.location.href = "/login";
      return;
    }

    const rawEvents = window.localStorage.getItem(EVENTS_KEY);
    if (rawEvents) {
      try {
        setEvents(JSON.parse(rawEvents));
      } catch {
        // ignore
      }
    }
    const rawFinance = window.localStorage.getItem(FINANCE_KEY);
    if (rawFinance) {
      try {
        setFinance(JSON.parse(rawFinance));
      } catch {
        // ignore
      }
    }
  }, []);

  if (!user) return null;

  // === EVENT PIPELINE ===
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  const eventsThisMonth = events.filter((ev) => {
    if (!ev.date) return false;
    const d = new Date(ev.date);
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  });

  const countByStatus = (statuses: EventStatus[]) =>
    events.filter((ev) => statuses.includes(ev.status)).length;

  const pipelineCounts = {
    leads: countByStatus(["New Lead", "Proposal Sent", "Negotiation"]),
    confirmed: countByStatus(["Confirmed"]),
    planning: countByStatus(["Planning"]),
    execution: countByStatus(["In Execution"]),
    completed: countByStatus(["Completed"]),
  };

  // === FINANCE SNAPSHOT ===
  let totalIncome = 0;
  let totalExpenses = 0;
  finance.forEach((f) => {
    totalIncome += parseMoney(f.income || "0");
    totalExpenses += parseMoney(f.expenses || "0");
  });
  const net = totalIncome - totalExpenses;
  const margin = totalIncome > 0 ? (net / totalIncome) * 100 : 0;

  // Next 7 days events
  const upcoming7 = events
    .filter((ev) => ev.date)
    .map((ev) => ({ ...ev, dateObj: new Date(ev.date) }))
    .filter((ev) => {
      const diff =
        (ev.dateObj.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
      return diff >= 0 && diff <= 7;
    })
    .sort((a, b) => a.dateObj.getTime() - b.dateObj.getTime())
    .slice(0, 5);

  return (
    <main className="eventura-os">
      <aside className="eventura-sidebar">
        <SidebarCore user={user} active="dashboard" />
      </aside>

      <div className="eventura-main">
        <TopbarCore user={user} />

        <div className="eventura-content">
          {/* Header */}
          <div className="eventura-header-row">
            <div>
              <h1 className="eventura-page-title">CEO Dashboard</h1>
              <p className="eventura-subtitle">
                Snapshot of Eventura pipeline, revenue and upcoming events.
              </p>
            </div>
            <div className="eventura-actions">
              <Link href="/events" className="eventura-button">
                + New Event
              </Link>
            </div>
          </div>

          {/* TOP KPI CARDS */}
          <section className="eventura-kpi-row">
            <div className="eventura-card">
              <div className="eventura-card-label">Events this month</div>
              <div className="eventura-card-value">
                {eventsThisMonth.length}
              </div>
              <div className="eventura-card-note">
                Based on event dates in Events module
              </div>
            </div>

            <div className="eventura-card">
              <div className="eventura-card-label">Total income (all time)</div>
              <div className="eventura-card-value">
                ₹{formatCurrency(totalIncome)}
              </div>
              <div className="eventura-card-note">
                From Finance → Income records
              </div>
            </div>

            <div className="eventura-card">
              <div className="eventura-card-label">Net cash (all time)</div>
              <div className="eventura-card-value">
                ₹{formatCurrency(net)}
              </div>
              <div className="eventura-card-note">
                Margin {margin ? margin.toFixed(1) : "–"}%
              </div>
            </div>
          </section>

          {/* PIPELINE + UPCOMING */}
          <section className="eventura-columns" style={{ marginTop: "1.2rem" }}>
            {/* Pipeline */}
            <div className="eventura-panel">
              <h2 className="eventura-panel-title">Event pipeline</h2>
              <p className="eventura-small-text">
                Live counts directly from event statuses.
              </p>
              <div className="pipeline-row">
                <PipelineStage
                  label="Leads"
                  count={pipelineCounts.leads}
                  helper="New Lead · Proposal · Negotiation"
                />
                <PipelineStage
                  label="Confirmed"
                  count={pipelineCounts.confirmed}
                  helper="Client confirmed"
                />
                <PipelineStage
                  label="Planning"
                  count={pipelineCounts.planning}
                  helper="Planning & vendor mapping"
                />
                <PipelineStage
                  label="Execution"
                  count={pipelineCounts.execution}
                  helper="In Execution"
                />
                <PipelineStage
                  label="Completed"
                  count={pipelineCounts.completed}
                  helper="Closed events"
                />
              </div>
            </div>

            {/* Upcoming */}
            <div className="eventura-panel">
              <h2 className="eventura-panel-title">Next 7 days</h2>
              <p className="eventura-small-text">
                Events from Events module with dates in the next week.
              </p>
              {upcoming7.length === 0 ? (
                <p
                  style={{
                    fontSize: "0.8rem",
                    color: "#9ca3af",
                    marginTop: "0.5rem",
                  }}
                >
                  No events in the next 7 days.
                </p>
              ) : (
                <ul className="eventura-list" style={{ marginTop: "0.5rem" }}>
                  {upcoming7.map((ev) => (
                    <li key={ev.id} className="eventura-list-item">
                      <div>
                        <div className="eventura-list-title">
                          {ev.eventName}
                        </div>
                        <div className="eventura-list-sub">
                          {ev.clientName} · {ev.city} ·{" "}
                          {ev.dateObj.toLocaleDateString("en-IN")} ·{" "}
                          {ev.venue}
                        </div>
                      </div>
                      <span className="eventura-tag eventura-tag-blue">
                        {ev.status}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>

          {/* QUICK LINKS */}
          <section style={{ marginTop: "1.2rem" }}>
            <div className="eventura-panel">
              <h2 className="eventura-panel-title">Quick actions</h2>
              <div className="eventura-quick-actions">
                <Link href="/events" className="eventura-button-secondary">
                  📁 Go to Events
                </Link>
                <Link href="/finance" className="eventura-button-secondary">
                  💰 Go to Finance
                </Link>
                <Link href="/leads" className="eventura-button-secondary">
                  👥 Go to Leads
                </Link>
                <Link href="/vendors" className="eventura-button-secondary">
                  🤝 Go to Vendors
                </Link>
              </div>
            </div>
          </section>

          <footer className="eventura-footer">
            Eventura · CEO Dashboard · © {new Date().getFullYear()}
          </footer>
        </div>
      </div>
    </main>
  );
}

/* Small components */

function PipelineStage(props: {
  label: string;
  count: number;
  helper: string;
}) {
  return (
    <div className="pipeline-stage">
      <div className="pipeline-count">{props.count}</div>
      <div className="pipeline-label">{props.label}</div>
      <div className="pipeline-helper">{props.helper}</div>
    </div>
  );
}

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
