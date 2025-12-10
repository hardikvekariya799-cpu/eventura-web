"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";

type Role = "CEO" | "Staff";
type User = { name: string; role: Role; city: string };

const USER_KEY = "eventura-user";
const EVENTS_KEY = "eventura-events";
const FINANCE_KEY = "eventura-finance";
// You can add LEADS_KEY, VENDORS_KEY later if needed

type StoredEvent = {
  id: number;
  client: string;
  eventName: string;
  eventType: string;
  city: string;
  date: string; // YYYY-MM-DD
  budget: string;
  status: string;
};

type FinanceEntry = {
  id: number;
  month?: string; // e.g. "2025-01"
  income: string;
  expenses: string;
  notes?: string;
};

function parseMoney(value: string): number {
  const cleaned = value.replace(/[₹, ,]/g, "");
  const n = parseFloat(cleaned);
  return isNaN(n) ? 0 : n;
}

export default function ReportsPage() {
  const [user, setUser] = useState<User | null>(null);

  const [events, setEvents] = useState<StoredEvent[]>([]);
  const [finance, setFinance] = useState<FinanceEntry[]>([]);

  const [totalEvents, setTotalEvents] = useState(0);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [totalExpenses, setTotalExpenses] = useState(0);
  const [netProfit, setNetProfit] = useState(0);
  const [avgMargin, setAvgMargin] = useState(0);

  const [eventsByCity, setEventsByCity] = useState<
    { city: string; count: number }[]
  >([]);
  const [eventsByType, setEventsByType] = useState<
    { type: string; count: number }[]
  >([]);

  // --- AUTH ---
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

  // --- LOAD DATA ---
  useEffect(() => {
    if (typeof window === "undefined") return;

    // EVENTS
    const eventsRaw = window.localStorage.getItem(EVENTS_KEY);
    if (eventsRaw) {
      try {
        const list: StoredEvent[] = JSON.parse(eventsRaw);
        setEvents(list);
      } catch (e) {
        console.error("Failed to parse events", e);
      }
    }

    // FINANCE
    const finRaw = window.localStorage.getItem(FINANCE_KEY);
    if (finRaw) {
      try {
        const list: FinanceEntry[] = JSON.parse(finRaw);
        setFinance(list);
      } catch (e) {
        console.error("Failed to parse finance", e);
      }
    }
  }, []);

  // --- COMPUTE ANALYTICS ---
  useEffect(() => {
    // Events analytics
    setTotalEvents(events.length);

    const cityMap: Record<string, number> = {};
    const typeMap: Record<string, number> = {};

    events.forEach((ev) => {
      const city = ev.city || "Unknown";
      const type = ev.eventType || "Other";

      cityMap[city] = (cityMap[city] || 0) + 1;
      typeMap[type] = (typeMap[type] || 0) + 1;
    });

    const byCity = Object.entries(cityMap)
      .map(([city, count]) => ({ city, count }))
      .sort((a, b) => b.count - a.count);
    const byType = Object.entries(typeMap)
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count);

    setEventsByCity(byCity);
    setEventsByType(byType);
  }, [events]);

  useEffect(() => {
    // Finance analytics
    let incomeSum = 0;
    let expenseSum = 0;

    finance.forEach((f) => {
      incomeSum += parseMoney(f.income || "0");
      expenseSum += parseMoney(f.expenses || "0");
    });

    setTotalRevenue(incomeSum);
    setTotalExpenses(expenseSum);

    const net = incomeSum - expenseSum;
    setNetProfit(net);

    const margin = incomeSum > 0 ? Math.round((net / incomeSum) * 100) : 0;
    setAvgMargin(margin);
  }, [finance]);

  if (!user) return null;
  const isCEO = user.role === "CEO";

  return (
    <main className="eventura-os">
      {/* Sidebar */}
      <aside className="eventura-sidebar">
        <SidebarCore user={user} active="reports" />
      </aside>

      {/* Main area */}
      <div className="eventura-main">
        <TopbarCore user={user} />

        <div className="eventura-content">
          <h1 className="eventura-title">Reports & Analytics</h1>
          <p className="eventura-subtitle">
            High-level view of Eventura performance – events, revenue, profit
            and mix by city and event type. Based on data entered in Events and
            Finance modules.
          </p>

          {/* SUMMARY KPIs */}
          <section className="eventura-kpi-row">
            <div className="eventura-card">
              <div className="eventura-card-label">Total events (all time)</div>
              <div className="eventura-card-value">
                {totalEvents}
                <span className="eventura-card-icon">🎉</span>
              </div>
              <div className="eventura-card-note">
                From Events module – all recorded events.
              </div>
            </div>

            <div className="eventura-card">
              <div className="eventura-card-label">Total revenue (all time)</div>
              <div className="eventura-card-value">
                ₹{totalRevenue.toLocaleString("en-IN")}
              </div>
              <div className="eventura-card-note">
                Sum of income in Finance records.
              </div>
            </div>

            <div className="eventura-card">
              <div className="eventura-card-label">Total expenses (all time)</div>
              <div className="eventura-card-value">
                ₹{totalExpenses.toLocaleString("en-IN")}
              </div>
              <div className="eventura-card-note">
                Sum of expenses in Finance records.
              </div>
            </div>

            <div className="eventura-card">
              <div className="eventura-card-label">Net profit & margin</div>
              <div className="eventura-card-value">
                ₹{netProfit.toLocaleString("en-IN")} ({avgMargin}%)
              </div>
              <div className="eventura-card-note">
                Approximated from Finance totals.
              </div>
            </div>
          </section>

          {/* TWO COLUMNS: Events by city + Events by type */}
          <section className="eventura-columns">
            {/* Events by city */}
            <div className="eventura-panel">
              <h2 className="eventura-panel-title">Events by city</h2>
              {eventsByCity.length === 0 ? (
                <p className="eventura-small-text">
                  No events recorded yet. Add events in the Events module to see
                  city-wise breakdown.
                </p>
              ) : (
                <div className="eventura-table-wrapper">
                  <table className="eventura-table">
                    <thead>
                      <tr>
                        <th>City</th>
                        <th>Events</th>
                      </tr>
                    </thead>
                    <tbody>
                      {eventsByCity.map((row) => (
                        <tr key={row.city}>
                          <td>{row.city}</td>
                          <td>{row.count}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Events by type */}
            <div className="eventura-panel">
              <h2 className="eventura-panel-title">Events by type</h2>
              {eventsByType.length === 0 ? (
                <p className="eventura-small-text">
                  No events recorded yet. Add event types (Wedding, Corporate,
                  Party, etc.) in the Events module.
                </p>
              ) : (
                <div className="eventura-table-wrapper">
                  <table className="eventura-table">
                    <thead>
                      <tr>
                        <th>Event type</th>
                        <th>Events</th>
                      </tr>
                    </thead>
                    <tbody>
                      {eventsByType.map((row) => (
                        <tr key={row.type}>
                          <td>{row.type}</td>
                          <td>{row.count}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </section>

          {/* FINANCE TABLE */}
          <section className="eventura-panel" style={{ marginTop: "1.5rem" }}>
            <h2 className="eventura-panel-title">Finance summary by record</h2>
            {finance.length === 0 ? (
              <p className="eventura-small-text">
                No finance entries yet. Add monthly records in the Finance
                module to see P&L summary here.
              </p>
            ) : (
              <div className="eventura-table-wrapper">
                <table className="eventura-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Month / Label</th>
                      <th>Income (₹)</th>
                      <th>Expenses (₹)</th>
                      <th>Net (₹)</th>
                      <th>Margin %</th>
                      <th>Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {finance
                      .slice()
                      .sort((a, b) => b.id - a.id)
                      .map((f, index) => {
                        const income = parseMoney(f.income || "0");
                        const expenses = parseMoney(f.expenses || "0");
                        const net = income - expenses;
                        const margin =
                          income > 0
                            ? Math.round((net / income) * 100)
                            : 0;
                        return (
                          <tr key={f.id}>
                            <td>{index + 1}</td>
                            <td>{f.month || "—"}</td>
                            <td>{income.toLocaleString("en-IN")}</td>
                            <td>{expenses.toLocaleString("en-IN")}</td>
                            <td>{net.toLocaleString("en-IN")}</td>
                            <td>{margin}%</td>
                            <td>{f.notes || ""}</td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <footer className="eventura-footer">
            Eventura · Reports & Analytics · © {new Date().getFullYear()}
          </footer>
        </div>
      </div>
    </main>
  );
}

/* Shared layout helpers */

function SidebarCore({ user, active }: { user: User; active: string }) {
  const isCEO = user.role === "CEO";
  return (
    <>
      <div className="eventura-sidebar-header">
        <div className="eventura-logo-circle">E</div>
        <div className="eventura-logo-text">
          <div className="eventura-logo-name">Eventura OS</div>
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
      </nav>
      <div className="eventura-sidebar-footer">
        <div className="eventura-sidebar-role">Role: {user.role}</div>
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
          placeholder="Search (coming soon)"
          disabled
        />
      </div>
      <div className="eventura-topbar-right">
        <div className="eventura-user-avatar">
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
