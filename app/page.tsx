"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";

/* ========= Shared types ========= */

type Role = "CEO" | "Staff";
type User = { name: string; role: Role; city: string };

const USER_KEY = "eventura-user";

type EventStage =
  | "Lead"
  | "Proposal Sent"
  | "Negotiation"
  | "Confirmed"
  | "Completed";

type EventType = "Wedding" | "Corporate" | "Social";

type PipelineEvent = {
  id: number;
  name: string;
  client: string;
  type: EventType;
  city: string;
  date: string; // YYYY-MM-DD
  stage: EventStage;
  value: number; // ₹
  probability: number; // 0–1
};

type MonthlyKPI = {
  month: string;
  revenue: number;
  profitMargin: number; // %
  eventsCount: number;
};

type HRKPI = {
  hrCost: number;
  revenue: number;
  coreStaff: number;
  freelancers: number;
};

type LeadSource = {
  channel: string;
  leads: number;
  conversionRate: number; // %
};

/* ========= Seed / sample data (CEO view) ========= */

const pipeline: PipelineEvent[] = [
  {
    id: 1,
    name: "Patel – Royal Wedding",
    client: "Patel Family",
    type: "Wedding",
    city: "Surat",
    date: "2026-01-10",
    stage: "Negotiation",
    value: 1800000,
    probability: 0.7,
  },
  {
    id: 2,
    name: "XYZ Textiles – Annual Gala",
    client: "XYZ Textiles",
    type: "Corporate",
    city: "Surat",
    date: "2026-02-05",
    stage: "Proposal Sent",
    value: 950000,
    probability: 0.6,
  },
  {
    id: 3,
    name: "Mehta – Engagement",
    client: "Mehta Family",
    type: "Wedding",
    city: "Surat",
    date: "2025-12-18",
    stage: "Confirmed",
    value: 650000,
    probability: 0.95,
  },
  {
    id: 4,
    name: "Social – Sangeet Night",
    client: "Shah Family",
    type: "Social",
    city: "Surat",
    date: "2025-12-28",
    stage: "Lead",
    value: 300000,
    probability: 0.4,
  },
];

const monthlyKPI: MonthlyKPI[] = [
  { month: "Aug", revenue: 850000, profitMargin: 32, eventsCount: 5 },
  { month: "Sep", revenue: 1200000, profitMargin: 35, eventsCount: 7 },
  { month: "Oct", revenue: 1850000, profitMargin: 38, eventsCount: 9 },
  { month: "Nov", revenue: 2100000, profitMargin: 41, eventsCount: 10 },
  { month: "Dec", revenue: 1950000, profitMargin: 39, eventsCount: 8 },
];

const hrKPI: HRKPI = {
  hrCost: 248000, // monthly
  revenue: 1950000, // monthly
  coreStaff: 7,
  freelancers: 2,
};

const leadSources: LeadSource[] = [
  { channel: "Instagram", leads: 48, conversionRate: 18 },
  { channel: "Referral", leads: 21, conversionRate: 42 },
  { channel: "Venue Partner", leads: 12, conversionRate: 36 },
  { channel: "WhatsApp / Direct", leads: 9, conversionRate: 55 },
];

/* ========= Helper functions ========= */

function formatINR(value: number): string {
  return "₹" + value.toLocaleString("en-IN");
}

function gaugeColor(value: number): string {
  if (value < 60) return "eventura-tag-amber";
  if (value <= 80) return "eventura-tag-blue";
  return "eventura-tag-green";
}

/* ========= Page ========= */

export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null);

  // Auth same as HR
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

  const {
    mrr,
    avgMargin,
    eventsThisMonth,
    projectedRevenue,
    weightedPipeline,
  } = useMemo(() => {
    const latest = monthlyKPI[monthlyKPI.length - 1];

    const mrr = latest.revenue;
    const avgMargin =
      monthlyKPI.reduce((sum, m) => sum + m.profitMargin, 0) /
      monthlyKPI.length;
    const eventsThisMonth = latest.eventsCount;

    const weightedPipeline = pipeline.reduce(
      (sum, e) => sum + e.value * e.probability,
      0
    );

    const projectedRevenue = mrr + weightedPipeline;

    return {
      mrr,
      avgMargin: Math.round(avgMargin),
      eventsThisMonth,
      projectedRevenue,
      weightedPipeline,
    };
  }, []);

  const isCEO = user?.role === "CEO";

  if (!user) return null;

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
              <h1 className="eventura-page-title">CEO Command Center</h1>
              <p className="eventura-subtitle">
                One view of revenue, pipeline, HR cost, and event capacity for
                Eventura – tuned for fast decisions.
              </p>
            </div>
            <div className="eventura-chips-row">
              <Link href="/events" className="eventura-tag eventura-tag-blue">
                🎉 Open Events
              </Link>
              <Link href="/finance" className="eventura-tag eventura-tag-amber">
                💰 Open Finance
              </Link>
              <Link href="/hr" className="eventura-tag eventura-tag-green">
                🧑‍💼 HR & Crew
              </Link>
            </div>
          </div>

          {/* Top KPI row */}
          <section className="eventura-grid">
            <div className="eventura-card eventura-card-glow">
              <p className="eventura-card-label">This month revenue</p>
              <p className="eventura-card-value">{formatINR(mrr)}</p>
              <p className="eventura-card-note">
                Based on confirmed & completed events in the last 30–31 days.
              </p>
            </div>
            <div className="eventura-card eventura-card-glow">
              <p className="eventura-card-label">Avg profit margin</p>
              <p className="eventura-card-value">{avgMargin}%</p>
              <p className="eventura-card-note">
                Across last 5 months – target 40–45% on weddings.
              </p>
            </div>
            <div className="eventura-card eventura-card-glow">
              <p className="eventura-card-label">Events this month</p>
              <p className="eventura-card-value">{eventsThisMonth}</p>
              <p className="eventura-card-note">
                Mix of weddings, corporates & socials (see Events tab).
              </p>
            </div>
            <div className="eventura-card eventura-card-glow">
              <p className="eventura-card-label">Projected revenue</p>
              <p className="eventura-card-value">
                {formatINR(Math.round(projectedRevenue))}
              </p>
              <p className="eventura-card-note">
                Confirmed + weighted pipeline (probability-adjusted).
              </p>
            </div>
          </section>

          {/* Revenue trend + HR vs Revenue */}
          <section className="eventura-columns">
            <div className="eventura-panel">
              <h2 className="eventura-panel-title">
                Monthly revenue & events trend
              </h2>
              <div className="eventura-table-wrapper">
                <table className="eventura-table">
                  <thead>
                    <tr>
                      <th>Month</th>
                      <th>Revenue</th>
                      <th>Profit margin</th>
                      <th>Events</th>
                    </tr>
                  </thead>
                  <tbody>
                    {monthlyKPI.map((m) => (
                      <tr key={m.month}>
                        <td>{m.month}</td>
                        <td>{formatINR(m.revenue)}</td>
                        <td>
                          <span
                            className={
                              "eventura-tag " +
                              (m.profitMargin >= 40
                                ? "eventura-tag-green"
                                : m.profitMargin >= 32
                                ? "eventura-tag-blue"
                                : "eventura-tag-amber")
                            }
                          >
                            {m.profitMargin}%
                          </span>
                        </td>
                        <td>{m.eventsCount}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="eventura-small-text" style={{ marginTop: "0.5rem" }}>
                You can mirror these numbers with your real Tally / accounting
                later from the Finance tab.
              </p>
            </div>

            <div className="eventura-panel">
              <h2 className="eventura-panel-title">HR cost vs revenue</h2>
              <ul className="eventura-bullets">
                <li>Monthly HR cost: {formatINR(hrKPI.hrCost)}</li>
                <li>Revenue this month: {formatINR(hrKPI.revenue)}</li>
                <li>
                  HR as % of revenue:{" "}
                  {((hrKPI.hrCost / hrKPI.revenue) * 100).toFixed(1)}%
                </li>
                <li>
                  Core staff: {hrKPI.coreStaff} · Freelancers:{" "}
                  {hrKPI.freelancers}
                </li>
              </ul>
              <p className="eventura-small-text">
                Ideal HR cost for Eventura: keep below ~20% of revenue at early
                stage and add freelancers during peaks.
              </p>
              <div className="eventura-actions" style={{ marginTop: "0.8rem" }}>
                <Link href="/hr" className="eventura-button-secondary">
                  Open HR & Crew dashboard
                </Link>
              </div>
            </div>
          </section>

          {/* Pipeline & Leads */}
          <section className="eventura-columns">
            <div className="eventura-panel">
              <h2 className="eventura-panel-title">
                Event pipeline – next 60–90 days
              </h2>
              <div className="eventura-table-wrapper">
                <table className="eventura-table">
                  <thead>
                    <tr>
                      <th>Event</th>
                      <th>Client</th>
                      <th>Date</th>
                      <th>Type</th>
                      <th>Stage</th>
                      <th>Value</th>
                      <th>Weighted</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pipeline.map((e) => (
                      <tr key={e.id}>
                        <td>
                          <div className="eventura-list-title">{e.name}</div>
                          <div className="eventura-list-sub">{e.city}</div>
                        </td>
                        <td>{e.client}</td>
                        <td>{e.date}</td>
                        <td>{e.type}</td>
                        <td>
                          <span className="eventura-tag eventura-tag-blue">
                            {e.stage}
                          </span>
                        </td>
                        <td>{formatINR(e.value)}</td>
                        <td>
                          <span className="eventura-small-text">
                            {formatINR(Math.round(e.value * e.probability))}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="eventura-small-text" style={{ marginTop: "0.5rem" }}>
                “Weighted” is value × probability – this is what you can expect
                if the pipeline behaves normally.
              </p>
              <div className="eventura-actions" style={{ marginTop: "0.8rem" }}>
                <Link href="/events" className="eventura-button-secondary">
                  Go to Events pipeline
                </Link>
              </div>
            </div>

            <div className="eventura-panel">
              <h2 className="eventura-panel-title">
                Lead sources & conversion
              </h2>
              <div className="eventura-table-wrapper">
                <table className="eventura-table">
                  <thead>
                    <tr>
                      <th>Channel</th>
                      <th>Leads</th>
                      <th>Conversion</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leadSources.map((ls) => (
                      <tr key={ls.channel}>
                        <td>{ls.channel}</td>
                        <td>{ls.leads}</td>
                        <td>
                          <span
                            className={
                              "eventura-tag " +
                              (ls.conversionRate >= 40
                                ? "eventura-tag-green"
                                : ls.conversionRate >= 20
                                ? "eventura-tag-blue"
                                : "eventura-tag-amber")
                            }
                          >
                            {ls.conversionRate}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="eventura-small-text" style={{ marginTop: "0.5rem" }}>
                Use this to decide where to push ads & partnerships – for many
                event firms, referrals and venue tie-ups are gold.
              </p>
              <div className="eventura-actions" style={{ marginTop: "0.8rem" }}>
                <Link href="/leads" className="eventura-button-secondary">
                  Open Clients & Leads
                </Link>
              </div>
            </div>
          </section>

          {/* CEO-only alerts */}
          {isCEO && (
            <section className="eventura-panel" style={{ marginTop: "1.5rem" }}>
              <h2 className="eventura-panel-title">CEO Alerts & Focus</h2>
              <ul className="eventura-bullets">
                <li>
                  <strong>Margin target:</strong> You are around {avgMargin}%
                  avg; push premium decor & design upsells to cross 40%.
                </li>
                <li>
                  <strong>HR vs revenue:</strong>{" "}
                  {((hrKPI.hrCost / hrKPI.revenue) * 100).toFixed(1)}% – safe,
                  but don’t add fixed salaries unless pipeline grows.
                </li>
                <li>
                  <strong>Pipeline concentration:</strong> Top 2 events make up
                  a big chunk of weighted revenue – keep backup leads warm.
                </li>
                <li>
                  <strong>Strategic next move:</strong> Lock 1–2 high-margin
                  weddings per month and use corporates for stable cash flow.
                </li>
              </ul>
              <p className="eventura-small-text">
                These are static rules for now – later, this panel can become an
                AI co-pilot reading real data from Finance, Events & HR.
              </p>
            </section>
          )}

          {!isCEO && (
            <section className="eventura-panel" style={{ marginTop: "1.5rem" }}>
              <h2 className="eventura-panel-title">Staff view</h2>
              <p className="eventura-small-text">
                You are viewing a simplified dashboard. CEO view contains deeper
                finance & risk details.
              </p>
            </section>
          )}
        </div>
      </div>
    </main>
  );
}

/* ========= Shared layout: sidebar + topbar ========= */

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
          placeholder="Search events, clients, or numbers..."
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
