"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";

type Role = "CEO" | "Staff";
type User = { name: string; role: Role; city: string };

const USER_KEY = "eventura-user";

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

export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null);

  // simple KPI state (manual for now)
  const [eventsThisMonth, setEventsThisMonth] = useState(12);
  const [confirmedRevenue, setConfirmedRevenue] = useState(1850000); // ₹
  const [projectedMargin, setProjectedMargin] = useState(28); // %
  const [cashInHand, setCashInHand] = useState(650000); // ₹
  const [pipeCounts, setPipeCounts] = useState<Record<StageKey, number>>({
    "New Leads": 5,
    "Proposal Sent": 7,
    Negotiation: 3,
    Confirmed: 4,
    Completed: 2,
  });

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
      setUser(u);
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
              <div className="eventura-card-note">All cities combined</div>
            </div>

            <div className="eventura-card">
              <div className="eventura-card-label">
                Confirmed revenue this month
              </div>
              <div className="eventura-card-value">
                ₹{confirmedRevenue.toLocaleString("en-IN")}
              </div>
              <div className="eventura-card-note">
                From signed contracts only
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
                    Based on current budgets & cost %
                  </div>
                </div>

                <div className="eventura-card">
                  <div className="eventura-card-label">Cash in hand / bank</div>
                  <div className="eventura-card-value">
                    ₹{cashInHand.toLocaleString("en-IN")}
                  </div>
                  <div className="eventura-card-note">
                    From Finance module snapshot
                  </div>
                </div>
              </>
            )}
          </section>

          {/* Middle section: pipeline + upcoming events */}
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
                Pipeline view: from new leads to completed events.
              </div>
            </div>

            {/* Calendar & upcoming events */}
            <div className="eventura-panel">
              <h2 className="eventura-panel-title">
                Upcoming 7 events (all cities)
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
                Open Calendar for full month & week view.
              </div>
            </div>
          </section>

          {/* Quick actions */}
          <section className="eventura-quick-actions">
            <button className="eventura-button">+ New Event</button>
            <button className="eventura-button-secondary">+ New Lead</button>
            {isCEO && (
              <>
                <button className="eventura-button-secondary">
                  + Vendor Payment
                </button>
                <button className="eventura-button-secondary">
                  Download Monthly Report
                </button>
              </>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}

/* simple sidebar link component */
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
