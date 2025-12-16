"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";

/* ================= AUTH (Always ask password on open) ================= */

type Role = "CEO" | "Staff";
type User = { name: string; role: Role; city: string };

const USER_KEY = "eventura-user";

/**
 * IMPORTANT:
 * Put your password in Vercel env as:
 * NEXT_PUBLIC_EVENTURA_APP_PASSWORD=yourpassword
 *
 * For local:
 * create .env.local:
 * NEXT_PUBLIC_EVENTURA_APP_PASSWORD=yourpassword
 *
 * NOTE: This is client-side password gating (good for internal tool MVP).
 */
const APP_PASSWORD =
  process.env.NEXT_PUBLIC_EVENTURA_APP_PASSWORD || "eventura@123";

/* ================= Local DB keys (safe reads) ================= */

const DB_EVENTS = "eventura-events";
const DB_FIN = "eventura-finance-transactions";
const DB_TASKS = "eventura-tasks"; // optional if you have tasks
const DB_LEADS = "eventura-leads"; // optional if you have leads

type EventItem = {
  id: number;
  date: string; // YYYY-MM-DD
  title: string;
  status?: string;
  city?: string;
  budget?: number;
};

type TxType = "Income" | "Expense";
type FinanceTx = {
  id: number;
  date: string; // YYYY-MM-DD
  type: TxType;
  amount: number;
  note?: string;
  category?: string;
};

type TaskItem = {
  id: number;
  title: string;
  status?: "Todo" | "Doing" | "Done";
  dueDate?: string; // YYYY-MM-DD
  assignee?: string;
};

type LeadItem = {
  id: number;
  name: string;
  stage?: string;
  budget?: number;
  city?: string;
};

function safeParse<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function fmtINR(n: number) {
  try {
    return "₹" + (n || 0).toLocaleString("en-IN");
  } catch {
    return "₹" + String(n || 0);
  }
}

function todayISO() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function daysBetween(aISO: string, bISO: string) {
  const a = new Date(aISO + "T00:00:00");
  const b = new Date(bISO + "T00:00:00");
  const diff = b.getTime() - a.getTime();
  return Math.round(diff / (1000 * 60 * 60 * 24));
}

function tagColorByStatus(s?: string) {
  const v = (s || "").toLowerCase();
  if (v.includes("confirm")) return "eventura-tag-green";
  if (v.includes("complete")) return "eventura-tag-blue";
  if (v.includes("cancel")) return "eventura-tag-amber";
  if (v.includes("tent")) return "eventura-tag-amber";
  return "eventura-tag-blue";
}

/* ================= PAGE ================= */

export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null);

  // Password gate every time Dashboard loads
  const [pwOpen, setPwOpen] = useState(true);
  const [pw, setPw] = useState("");
  const [pwError, setPwError] = useState("");

  // Data
  const [events, setEvents] = useState<EventItem[]>([]);
  const [fin, setFin] = useState<FinanceTx[]>([]);
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [leads, setLeads] = useState<LeadItem[]>([]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Force login check (redirect if not logged in)
    const raw = window.localStorage.getItem(USER_KEY);
    const u = safeParse<User>(raw);
    if (!u) {
      window.location.href = "/login";
      return;
    }
    setUser(u);

    // Load dashboard data (safe)
    setEvents(safeParse<EventItem[]>(window.localStorage.getItem(DB_EVENTS)) || []);
    setFin(safeParse<FinanceTx[]>(window.localStorage.getItem(DB_FIN)) || []);
    setTasks(safeParse<TaskItem[]>(window.localStorage.getItem(DB_TASKS)) || []);
    setLeads(safeParse<LeadItem[]>(window.localStorage.getItem(DB_LEADS)) || []);

    // Always open password modal on load/refresh
    setPwOpen(true);
    setPw("");
    setPwError("");
  }, []);

  const isCEO = user?.role === "CEO";
  const today = todayISO();

  const dashboard = useMemo(() => {
    // Upcoming events (next 14 days)
    const upcoming = [...events]
      .filter((e) => e.date >= today)
      .sort((a, b) => (a.date > b.date ? 1 : -1))
      .slice(0, 6);

    // This month events (rough)
    const ym = today.slice(0, 7);
    const monthEvents = events.filter((e) => e.date.startsWith(ym));

    // Finance month snapshot
    const monthFin = fin.filter((t) => t.date?.startsWith(ym));
    const income = monthFin
      .filter((t) => t.type === "Income")
      .reduce((s, t) => s + (Number(t.amount) || 0), 0);
    const expense = monthFin
      .filter((t) => t.type === "Expense")
      .reduce((s, t) => s + (Number(t.amount) || 0), 0);
    const net = income - expense;

    // Overdue tasks
    const overdue = tasks
      .filter((t) => (t.status || "Todo") !== "Done" && t.dueDate && t.dueDate < today)
      .sort((a, b) => ((a.dueDate || "") > (b.dueDate || "") ? 1 : -1))
      .slice(0, 6);

    // Leads quick
    const activeLeads = leads.slice(0, 6);

    // Health insights (auto)
    const confirmed = monthEvents.filter((e) => (e.status || "").toLowerCase().includes("confirm")).length;
    const tentative = monthEvents.filter((e) => (e.status || "").toLowerCase().includes("tent")).length;

    const alerts: { type: "good" | "warn"; text: string }[] = [];

    if (overdue.length > 0) {
      alerts.push({ type: "warn", text: `You have ${overdue.length} overdue tasks. Fix today to avoid last-minute stress.` });
    } else {
      alerts.push({ type: "good", text: "No overdue tasks. Execution is on track." });
    }

    if (tentative > 0) {
      alerts.push({ type: "warn", text: `${tentative} events are still Tentative this month. Confirm vendors + advance payments.` });
    } else {
      alerts.push({ type: "good", text: "Events pipeline looks stable — no tentative risks this month." });
    }

    if (net < 0) {
      alerts.push({ type: "warn", text: "This month finance net is negative. Review expenses + vendor cost control." });
    } else {
      alerts.push({ type: "good", text: "Finance health looks positive this month." });
    }

    return {
      upcoming,
      monthEvents,
      income,
      expense,
      net,
      confirmed,
      tentative,
      overdue,
      activeLeads,
      alerts,
    };
  }, [events, fin, tasks, leads, today]);

  if (!user) return null;

  const unlock = () => {
    const attempt = pw.trim();
    if (!attempt) {
      setPwError("Enter password");
      return;
    }
    if (attempt !== APP_PASSWORD) {
      setPwError("Wrong password");
      return;
    }
    setPwError("");
    setPwOpen(false);
  };

  return (
    <main className="eventura-os">
      <aside className="eventura-sidebar">
        <SidebarCore user={user} active="dashboard" />
      </aside>

      <div className="eventura-main">
        <TopbarCore user={user} />

        <div className="eventura-content">
          {/* ===== Modern header ===== */}
          <div className="eventura-header-row" style={{ alignItems: "flex-end" }}>
            <div>
              <h1 className="eventura-page-title">Eventura Command Center</h1>
              <p className="eventura-subtitle">
                Modern ops dashboard: events, finance, leads, tasks — with smart alerts.
              </p>
            </div>

            <div className="eventura-actions" style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap" }}>
              <Link href="/events" className="eventura-button">
                ➕ Add Event
              </Link>
              <Link href="/calendar" className="eventura-button-secondary">
                📅 Calendar
              </Link>
              <Link href="/leads" className="eventura-button-secondary">
                👥 Leads
              </Link>
              {isCEO && (
                <Link href="/finance" className="eventura-button-secondary">
                  💰 Finance
                </Link>
              )}
            </div>
          </div>

          {/* ===== KPI Row ===== */}
          <section className="eventura-grid">
            <div className="eventura-card eventura-card-glow">
              <p className="eventura-card-label">This month events</p>
              <p className="eventura-card-value">{dashboard.monthEvents.length}</p>
              <p className="eventura-card-note">
                <span className="eventura-tag eventura-tag-green">{dashboard.confirmed} confirmed</span>{" "}
                <span className="eventura-tag eventura-tag-amber">{dashboard.tentative} tentative</span>
              </p>
            </div>

            <div className="eventura-card eventura-card-glow">
              <p className="eventura-card-label">Finance (month)</p>
              <p className="eventura-card-value">{fmtINR(dashboard.net)}</p>
              <p className="eventura-card-note">
                Income: {fmtINR(dashboard.income)} · Expense: {fmtINR(dashboard.expense)}
              </p>
            </div>

            <div className="eventura-card eventura-card-glow">
              <p className="eventura-card-label">Overdue tasks</p>
              <p className="eventura-card-value">{dashboard.overdue.length}</p>
              <p className="eventura-card-note">
                {dashboard.overdue.length ? "Action needed today." : "All good."}
              </p>
            </div>

            <div className="eventura-card eventura-card-glow">
              <p className="eventura-card-label">Active leads</p>
              <p className="eventura-card-value">{leads.length}</p>
              <p className="eventura-card-note">Keep follow-ups scheduled.</p>
            </div>
          </section>

          {/* ===== Smart Alerts + Widgets ===== */}
          <section className="eventura-columns">
            {/* Left: smart alerts */}
            <div className="eventura-panel">
              <h2 className="eventura-panel-title">Smart Insights (Auto)</h2>

              <div className="eventura-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
                {dashboard.alerts.map((a, idx) => (
                  <div key={idx} className="eventura-card">
                    <p className="eventura-card-label">
                      {a.type === "warn" ? "⚠ Action" : "✅ Good"}
                    </p>
                    <p className="eventura-small-text" style={{ marginTop: 6 }}>
                      {a.text}
                    </p>
                  </div>
                ))}
              </div>

              <div className="eventura-actions" style={{ marginTop: "0.8rem", display: "flex", gap: "0.6rem", flexWrap: "wrap" }}>
                <Link className="eventura-button-secondary" href="/hr">
                  🧑‍💼 HR & Team
                </Link>
                <Link className="eventura-button-secondary" href="/vendors">
                  🤝 Vendors
                </Link>
                <Link className="eventura-button-secondary" href="/inventory">
                  📦 Inventory
                </Link>
              </div>
            </div>

            {/* Right: quick overview cards */}
            <div className="eventura-panel">
              <h2 className="eventura-panel-title">Upcoming (next)</h2>

              <div className="eventura-table-wrapper">
                <table className="eventura-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Event</th>
                      <th>Status</th>
                      <th>In</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dashboard.upcoming.map((e) => {
                      const d = daysBetween(today, e.date);
                      return (
                        <tr key={e.id}>
                          <td>{e.date}</td>
                          <td>
                            <div className="eventura-list-title">{e.title}</div>
                            <div className="eventura-list-sub">{e.city || user.city}</div>
                          </td>
                          <td>
                            <span className={"eventura-tag " + tagColorByStatus(e.status)}>
                              {e.status || "Planned"}
                            </span>
                          </td>
                          <td>
                            <span className="eventura-small-text">
                              {d === 0 ? "Today" : d === 1 ? "Tomorrow" : `${d} days`}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                    {dashboard.upcoming.length === 0 && (
                      <tr>
                        <td colSpan={4} style={{ color: "#9ca3af" }}>
                          No upcoming events found. Add events to see planning view.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <h3 className="eventura-subsection-title" style={{ marginTop: "0.9rem" }}>
                Overdue Tasks
              </h3>

              <div className="eventura-table-wrapper">
                <table className="eventura-table">
                  <thead>
                    <tr>
                      <th>Task</th>
                      <th>Due</th>
                      <th>Assignee</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dashboard.overdue.map((t) => (
                      <tr key={t.id}>
                        <td>
                          <div className="eventura-list-title">{t.title}</div>
                          <div className="eventura-list-sub">{t.status || "Todo"}</div>
                        </td>
                        <td>
                          <span className="eventura-tag eventura-tag-amber">{t.dueDate}</span>
                        </td>
                        <td>{t.assignee || "—"}</td>
                      </tr>
                    ))}
                    {dashboard.overdue.length === 0 && (
                      <tr>
                        <td colSpan={3} style={{ color: "#9ca3af" }}>
                          No overdue tasks 🎉
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <p className="eventura-small-text" style={{ marginTop: "0.6rem" }}>
                Tip: Add your real tasks DB into <b>{DB_TASKS}</b> to make this fully automated.
              </p>
            </div>
          </section>
        </div>
      </div>

      {/* ===== Password modal (every open/refresh) ===== */}
      {pwOpen && (
        <div className="eventura-modal-overlay" role="dialog" aria-modal="true">
          <div className="eventura-modal">
            <div className="eventura-header-row">
              <div>
                <h2 className="eventura-panel-title" style={{ margin: 0 }}>
                  🔐 Enter Password to Open Eventura OS
                </h2>
                <p className="eventura-small-text" style={{ marginTop: 6 }}>
                  Security: password is required every time you open the dashboard.
                </p>
              </div>
            </div>

            <div className="eventura-grid" style={{ marginTop: "0.8rem" }}>
              <div className="eventura-card" style={{ gridColumn: "1 / -1" }}>
                <p className="eventura-card-label">Password</p>
                <input
                  className="eventura-search"
                  type="password"
                  value={pw}
                  autoFocus
                  onChange={(e) => {
                    setPw(e.target.value);
                    setPwError("");
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") unlock();
                  }}
                  placeholder="Enter Eventura password"
                />
                {pwError && (
                  <div className="eventura-small-text" style={{ marginTop: 6, color: "#F97373" }}>
                    {pwError}
                  </div>
                )}
              </div>
            </div>

            <div className="eventura-actions" style={{ marginTop: "0.9rem", display: "flex", gap: "0.6rem" }}>
              <button className="eventura-button" onClick={unlock}>
                ✅ Unlock
              </button>
              <button
                className="eventura-button-secondary"
                onClick={() => {
                  // logout for safety
                  if (typeof window !== "undefined") {
                    window.localStorage.removeItem(USER_KEY);
                    window.location.href = "/login";
                  }
                }}
              >
                🚪 Logout
              </button>
            </div>

            <p className="eventura-small-text" style={{ marginTop: "0.8rem" }}>
              Set password using env: <b>NEXT_PUBLIC_EVENTURA_APP_PASSWORD</b> (Vercel + .env.local)
            </p>
          </div>
        </div>
      )}
    </main>
  );
}

/* ================= Shared layout: sidebar + topbar ================= */

function SidebarCore({ user, active }: { user: User; active: string }) {
  const isCEO = user.role === "CEO";
  return (
    <>
      <div className="eventura-sidebar-header">
        <div className="eventura-logo-circle">E</div>
        <div className="eventura-logo-text">
          <div className="eventura-logo-name">Eventura OS</div>
          <div className="eventura-logo-tagline">Events that speak your style</div>
        </div>
      </div>
      <nav className="eventura-sidebar-nav">
        <SidebarLink href="/" label="Dashboard" icon="📊" active={active === "dashboard"} />
        <SidebarLink href="/events" label="Events" icon="🎉" active={active === "events"} />
        <SidebarLink href="/calendar" label="Calendar" icon="📅" active={active === "calendar"} />
        <SidebarLink href="/leads" label="Clients & Leads" icon="👥" active={active === "leads"} />
        <SidebarLink href="/vendors" label="Vendors" icon="🤝" active={active === "vendors"} />
        {isCEO && <SidebarLink href="/finance" label="Finance" icon="💰" active={active === "finance"} />}
        <SidebarLink href="/hr" label="HR & Team" icon="🧑‍💼" active={active === "hr"} />
        <SidebarLink href="/inventory" label="Inventory & Assets" icon="📦" active={active === "inventory"} />
        {isCEO && <SidebarLink href="/reports" label="Reports & Analytics" icon="📈" active={active === "reports"} />}
        {isCEO && <SidebarLink href="/settings" label="Settings & Access" icon="⚙️" active={active === "settings"} />}
      </nav>
      <div className="eventura-sidebar-footer">
        <div className="eventura-sidebar-role">Role: {user.role === "CEO" ? "CEO / Super Admin" : "Staff"}</div>
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
        <input className="eventura-search" placeholder="Search events, leads, vendors..." />
      </div>
      <div className="eventura-topbar-right">
        <button className="eventura-topbar-icon" title="Notifications">🔔</button>
        <div className="eventura-user-avatar" title={user.name}>
          {user.name.charAt(0).toUpperCase()}
        </div>
      </div>
    </header>
  );
}

function SidebarLink(props: { href: string; label: string; icon: string; active?: boolean }) {
  const className = "eventura-sidebar-link" + (props.active ? " eventura-sidebar-link-active" : "");
  return (
    <Link href={props.href} className={className}>
      <span className="eventura-sidebar-icon">{props.icon}</span>
      <span>{props.label}</span>
    </Link>
  );
}
