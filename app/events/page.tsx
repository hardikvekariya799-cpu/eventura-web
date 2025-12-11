"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";

type Role = "CEO" | "Staff";
type User = { name: string; role: Role; city: string };

const USER_KEY = "eventura-user";
const EVENTS_KEY = "eventura-events-v2";

type EventStatus = "Planning" | "In Execution" | "Completed" | "Cancelled";
type EventType = "Wedding" | "Corporate" | "Party" | "Festival" | "Other";

type EventTask = {
  id: number;
  label: string;
  dueDate: string; // ISO string
  done: boolean;
  critical: boolean;
};

type PaymentStage = {
  label: string;
  duePercent: number;
  status: "Pending" | "Paid" | "Overdue";
};

type VendorScore = {
  vendorName: string;
  category: string;
  score: number; // 0–100
  notes?: string;
};

type EventIssue = {
  id: number;
  time: string;
  text: string;
  resolved: boolean;
};

type EventuraEvent = {
  id: number;
  name: string;
  clientName: string;
  type: EventType;
  city: string;
  date: string; // yyyy-mm-dd
  guestCount: number;
  budget: number;
  status: EventStatus;
  createdAt: string;

  // Planning
  autoTimeline: EventTask[];
  tasks: EventTask[];
  moodboard: string[]; // URLs or notes
  venueLayoutNotes: string;

  // Finance
  revenue: number;
  variableCost: number;
  fixedCost: number;
  vendorPayoutPercent: number;
  paymentPlan: PaymentStage[];

  // Vendors
  vendorScores: VendorScore[];
  blacklistFlag: boolean;

  // Execution
  issues: EventIssue[];

  // Post-event
  clientScore?: number; // 1–10
  learnings?: string;
};

function parseNumber(value: string): number {
  const cleaned = value.replace(/[₹, ]/g, "");
  const n = parseFloat(cleaned);
  return isNaN(n) ? 0 : n;
}

function formatCurrency(n: number): string {
  return "₹" + n.toLocaleString("en-IN", { maximumFractionDigits: 0 });
}

function addDays(date: Date, delta: number): Date {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + delta);
  return copy;
}

function formatShort(date: Date): string {
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
  });
}

// Generate auto timeline based on event date
function generateAutoTimeline(dateStr: string): EventTask[] {
  const base = new Date(dateStr + "T00:00:00");
  if (isNaN(base.getTime())) return [];

  const milestones = [
    { label: "Venue booking", offset: -60, critical: true },
    { label: "Vendor confirmations", offset: -45, critical: true },
    { label: "Decor mockups ready", offset: -30, critical: true },
    { label: "Logistics planning", offset: -7, critical: true },
    { label: "Material loading", offset: -3, critical: true },
    { label: "Event day execution", offset: 0, critical: true },
    { label: "Post-event payment follow-up", offset: 3, critical: false },
  ];

  return milestones.map((m, idx) => {
    const d = addDays(base, m.offset);
    return {
      id: Date.now() + idx,
      label: m.label,
      dueDate: d.toISOString(),
      done: false,
      critical: m.critical,
    };
  });
}

export default function EventsPage() {
  const [user, setUser] = useState<User | null>(null);
  const [events, setEvents] = useState<EventuraEvent[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);

  // simple event form
  const [form, setForm] = useState({
    name: "",
    clientName: "",
    type: "Wedding" as EventType,
    city: "Surat",
    date: "",
    guestCount: "",
    budget: "",
  });

  // issue input
  const [issueText, setIssueText] = useState("");

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

  // load events
  useEffect(() => {
    if (typeof window === "undefined") return;
    const raw = window.localStorage.getItem(EVENTS_KEY);
    if (raw) {
      try {
        setEvents(JSON.parse(raw));
      } catch {
        // ignore
      }
    }
  }, []);

  // persist events
  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(EVENTS_KEY, JSON.stringify(events));
  }, [events]);

  const selectedEvent = useMemo(
    () => events.find((e) => e.id === selectedId) ?? null,
    [events, selectedId]
  );

  function handleFormChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  function handleCreateEvent(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name || !form.clientName || !form.date) {
      alert("Please fill event name, client and date.");
      return;
    }

    const budget = parseNumber(form.budget);
    const guestCount = parseNumber(form.guestCount);
    const revenue = budget || guestCount * 1500;
    const variableCost = Math.round(revenue * 0.7);
    const fixedCost = Math.round(revenue * 0.2);
    const autoTimeline = generateAutoTimeline(form.date);

    const paymentPlan: PaymentStage[] = [
      { label: "Advance (50%)", duePercent: 50, status: "Pending" },
      { label: "Pre-event (40%)", duePercent: 40, status: "Pending" },
      { label: "Post-event (10%)", duePercent: 10, status: "Pending" },
    ];

    const vendorScores: VendorScore[] = [
      {
        vendorName: "Default Decor Partner",
        category: "Decor",
        score: 85,
        notes: "Reliable for weddings",
      },
    ];

    const newEvent: EventuraEvent = {
      id: Date.now(),
      name: form.name.trim(),
      clientName: form.clientName.trim(),
      type: form.type,
      city: form.city,
      date: form.date,
      guestCount,
      budget: revenue,
      status: "Planning",
      createdAt: new Date().toISOString(),
      autoTimeline,
      tasks: autoTimeline,
      moodboard: [],
      venueLayoutNotes: "",
      revenue,
      variableCost,
      fixedCost,
      vendorPayoutPercent: 70,
      paymentPlan,
      vendorScores,
      blacklistFlag: false,
      issues: [],
    };

    setEvents((prev) => [newEvent, ...prev]);
    setSelectedId(newEvent.id);
    setForm({
      name: "",
      clientName: "",
      type: "Wedding",
      city: "Surat",
      date: "",
      guestCount: "",
      budget: "",
    });
  }

  function updateEvent(id: number, updater: (ev: EventuraEvent) => EventuraEvent) {
    setEvents((prev) => prev.map((e) => (e.id === id ? updater(e) : e)));
  }

  function handleTaskToggle(eventId: number, taskId: number) {
    updateEvent(eventId, (ev) => ({
      ...ev,
      tasks: ev.tasks.map((t) =>
        t.id === taskId ? { ...t, done: !t.done } : t
      ),
    }));
  }

  function handleStatusChange(eventId: number, status: EventStatus) {
    updateEvent(eventId, (ev) => ({ ...ev, status }));
  }

  function handlePaymentStatusChange(
    eventId: number,
    index: number,
    status: PaymentStage["status"]
  ) {
    updateEvent(eventId, (ev) => {
      const updated = [...ev.paymentPlan];
      updated[index] = { ...updated[index], status };
      return { ...ev, paymentPlan: updated };
    });
  }

  function handleBlacklistToggle(eventId: number) {
    updateEvent(eventId, (ev) => ({ ...ev, blacklistFlag: !ev.blacklistFlag }));
  }

  function handleIssueAdd() {
    if (!selectedEvent || !issueText.trim()) return;
    const issue: EventIssue = {
      id: Date.now(),
      text: issueText.trim(),
      time: new Date().toISOString(),
      resolved: false,
    };
    updateEvent(selectedEvent.id, (ev) => ({
      ...ev,
      issues: [issue, ...ev.issues],
    }));
    setIssueText("");
  }

  function handleIssueToggle(eventId: number, issueId: number) {
    updateEvent(eventId, (ev) => ({
      ...ev,
      issues: ev.issues.map((i) =>
        i.id === issueId ? { ...i, resolved: !i.resolved } : i
      ),
    }));
  }

  function handleMoodboardAdd() {
    if (!selectedEvent) return;
    const url = prompt(
      "Paste image URL or short note for moodboard (stage, mandap, color palette etc.)"
    );
    if (!url) return;
    updateEvent(selectedEvent.id, (ev) => ({
      ...ev,
      moodboard: [url, ...ev.moodboard],
    }));
  }

  function handleVenueLayoutChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    if (!selectedEvent) return;
    const value = e.target.value;
    updateEvent(selectedEvent.id, (ev) => ({
      ...ev,
      venueLayoutNotes: value,
    }));
  }

  function computeCriticalPath(ev: EventuraEvent) {
    const now = new Date();
    const overdueCritical = ev.tasks.filter(
      (t) =>
        t.critical &&
        !t.done &&
        new Date(t.dueDate).getTime() < now.getTime()
    );
    const delayRisk = overdueCritical.length > 0;
    return { delayRisk, overdueCritical };
  }

  function computeFinance(ev: EventuraEvent) {
    const revenue = ev.revenue;
    const variable = ev.variableCost;
    const fixed = ev.fixedCost;
    const totalCost = variable + fixed;
    const profit = revenue - totalCost;
    const marginPct = revenue > 0 ? (profit / revenue) * 100 : 0;
    return { revenue, variable, fixed, totalCost, profit, marginPct };
  }

  function computeEventScore(ev: EventuraEvent) {
    const finance = computeFinance(ev);
    const vendorAvg =
      ev.vendorScores.length > 0
        ? ev.vendorScores.reduce((s, v) => s + v.score, 0) /
          ev.vendorScores.length
        : 70;
    const issuePenalty = ev.issues.filter((i) => !i.resolved).length * 3;
    const base = Math.min(Math.max(finance.marginPct, 0), 40); // max 40 points
    const vendorPart = (vendorAvg / 100) * 30; // 30 points
    const clientPart = (ev.clientScore ?? 8) * 3; // up to 30
    let score = base + vendorPart + clientPart - issuePenalty;
    if (ev.blacklistFlag) score -= 15;
    return Math.max(0, Math.min(100, Math.round(score)));
  }

  if (!user) return null;

  const isCEO = user.role === "CEO";

  return (
    <main className="eventura-os">
      {/* Sidebar */}
      <aside className="eventura-sidebar">
        <SidebarCore user={user} active="events" />
      </aside>

      {/* Main */}
      <div className="eventura-main">
        <TopbarCore user={user} />

        <div className="eventura-content">
          <div className="eventura-header-row">
            <div>
              <h1 className="eventura-page-title">Events</h1>
              <p className="eventura-subtitle">
                Plan, execute and analyse every event — with automatic timelines,
                Gantt-style view, P&L and on-ground tracking.
              </p>
            </div>
            <button
              className="eventura-button"
              onClick={() => {
                const top = document.getElementById("event-form");
                if (top) top.scrollIntoView({ behavior: "smooth" });
              }}
            >
              + New Event
            </button>
          </div>

          {/* MAIN GRID: LEFT = LIST + FORM, RIGHT = DETAIL */}
          <section className="events-grid">
            {/* LEFT SIDE – list + create form */}
            <div className="eventura-panel">
              <h2 className="eventura-panel-title">Event list</h2>
              {events.length === 0 ? (
                <p className="eventura-small-text">
                  No events yet. Create your first event using the form below.
                </p>
              ) : (
                <div className="eventura-table-wrapper">
                  <table className="eventura-table events-table">
                    <thead>
                      <tr>
                        <th>Client & Event</th>
                        <th>Date & City</th>
                        <th>Budget</th>
                        <th>Status</th>
                        <th>Margin</th>
                      </tr>
                    </thead>
                    <tbody>
                      {events.map((ev) => {
                        const finance = computeFinance(ev);
                        const margin = finance.marginPct;
                        const risk = computeCriticalPath(ev).delayRisk;
                        return (
                          <tr
                            key={ev.id}
                            className={
                              "events-row" +
                              (selectedId === ev.id ? " events-row-active" : "")
                            }
                            onClick={() => setSelectedId(ev.id)}
                          >
                            <td>
                              <div className="events-client">
                                <div className="events-main-text">
                                  {ev.clientName} – {ev.name}
                                </div>
                                <div className="events-sub-text">
                                  {ev.type} · {ev.guestCount} guests
                                </div>
                              </div>
                            </td>
                            <td>
                              <div className="events-sub-text">
                                {ev.date} · {ev.city}
                              </div>
                            </td>
                            <td>{formatCurrency(ev.revenue)}</td>
                            <td>
                              <span className={`events-status events-status-${ev.status.toLowerCase().replace(" ", "")}`}>
                                {ev.status}
                              </span>
                              {risk && (
                                <span className="events-delay-tag">
                                  ⚠ Delay risk
                                </span>
                              )}
                            </td>
                            <td
                              style={{
                                color:
                                  margin >= 25
                                    ? "#4ade80"
                                    : margin >= 15
                                    ? "#facc15"
                                    : "#f97373",
                              }}
                            >
                              {margin.toFixed(1)}%
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Create form */}
              <div id="event-form" style={{ marginTop: "1rem" }}>
                <h3 className="eventura-panel-title">
                  Create new event (smart planner)
                </h3>
                <form className="eventura-form" onSubmit={handleCreateEvent}>
                  <div className="eventura-form-grid">
                    <div className="eventura-field">
                      <label className="eventura-label" htmlFor="name">
                        Event name
                      </label>
                      <input
                        id="name"
                        name="name"
                        className="eventura-input"
                        value={form.name}
                        onChange={handleFormChange}
                        placeholder="e.g. Patel Wedding Reception"
                      />
                    </div>
                    <div className="eventura-field">
                      <label className="eventura-label" htmlFor="clientName">
                        Client name
                      </label>
                      <input
                        id="clientName"
                        name="clientName"
                        className="eventura-input"
                        value={form.clientName}
                        onChange={handleFormChange}
                        placeholder="e.g. Patel Family"
                      />
                    </div>
                    <div className="eventura-field">
                      <label className="eventura-label" htmlFor="type">
                        Event type
                      </label>
                      <select
                        id="type"
                        name="type"
                        className="eventura-input"
                        value={form.type}
                        onChange={handleFormChange}
                      >
                        <option>Wedding</option>
                        <option>Corporate</option>
                        <option>Party</option>
                        <option>Festival</option>
                        <option>Other</option>
                      </select>
                    </div>
                    <div className="eventura-field">
                      <label className="eventura-label" htmlFor="city">
                        City
                      </label>
                      <input
                        id="city"
                        name="city"
                        className="eventura-input"
                        value={form.city}
                        onChange={handleFormChange}
                        placeholder="e.g. Surat"
                      />
                    </div>
                    <div className="eventura-field">
                      <label className="eventura-label" htmlFor="date">
                        Event date
                      </label>
                      <input
                        id="date"
                        name="date"
                        type="date"
                        className="eventura-input"
                        value={form.date}
                        onChange={handleFormChange}
                      />
                    </div>
                    <div className="eventura-field">
                      <label className="eventura-label" htmlFor="guestCount">
                        Guest count
                      </label>
                      <input
                        id="guestCount"
                        name="guestCount"
                        className="eventura-input"
                        value={form.guestCount}
                        onChange={handleFormChange}
                        placeholder="e.g. 450"
                      />
                    </div>
                    <div className="eventura-field">
                      <label className="eventura-label" htmlFor="budget">
                        Budget / expected revenue (₹)
                      </label>
                      <input
                        id="budget"
                        name="budget"
                        className="eventura-input"
                        value={form.budget}
                        onChange={handleFormChange}
                        placeholder="e.g. 18,50,000"
                      />
                    </div>
                  </div>
                  <div className="eventura-actions" style={{ marginTop: "0.75rem" }}>
                    <button type="submit" className="eventura-button">
                      Create event with auto timeline
                    </button>
                  </div>
                </form>
              </div>
            </div>

            {/* RIGHT SIDE – detail view */}
            <div className="eventura-panel">
              {!selectedEvent ? (
                <p className="eventura-small-text">
                  Select an event from the left to see timeline, Gantt view,
                  P&L and operations.
                </p>
              ) : (
                <EventDetail
                  ev={selectedEvent}
                  isCEO={isCEO}
                  onStatusChange={handleStatusChange}
                  onTaskToggle={handleTaskToggle}
                  onPaymentStatusChange={handlePaymentStatusChange}
                  onBlacklistToggle={handleBlacklistToggle}
                  onIssueAdd={handleIssueAdd}
                  onIssueToggle={handleIssueToggle}
                  issueText={issueText}
                  setIssueText={setIssueText}
                  onMoodboardAdd={handleMoodboardAdd}
                  onVenueLayoutChange={handleVenueLayoutChange}
                  computeCriticalPath={computeCriticalPath}
                  computeFinance={computeFinance}
                  computeEventScore={computeEventScore}
                />
              )}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}

/* ========== DETAIL COMPONENT ========== */

function EventDetail(props: {
  ev: EventuraEvent;
  isCEO: boolean;
  onStatusChange: (id: number, status: EventStatus) => void;
  onTaskToggle: (eventId: number, taskId: number) => void;
  onPaymentStatusChange: (
    eventId: number,
    idx: number,
    status: PaymentStage["status"]
  ) => void;
  onBlacklistToggle: (eventId: number) => void;
  onIssueAdd: () => void;
  onIssueToggle: (eventId: number, issueId: number) => void;
  issueText: string;
  setIssueText: (v: string) => void;
  onMoodboardAdd: () => void;
  onVenueLayoutChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  computeCriticalPath: (
    ev: EventuraEvent
  ) => { delayRisk: boolean; overdueCritical: EventTask[] };
  computeFinance: (
    ev: EventuraEvent
  ) => {
    revenue: number;
    variable: number;
    fixed: number;
    totalCost: number;
    profit: number;
    marginPct: number;
  };
  computeEventScore: (ev: EventuraEvent) => number;
}) {
  const {
    ev,
    isCEO,
    onStatusChange,
    onTaskToggle,
    onPaymentStatusChange,
    onBlacklistToggle,
    onIssueAdd,
    onIssueToggle,
    issueText,
    setIssueText,
    onMoodboardAdd,
    onVenueLayoutChange,
    computeCriticalPath,
    computeFinance,
    computeEventScore,
  } = props;

  const critical = computeCriticalPath(ev);
  const finance = computeFinance(ev);
  const score = computeEventScore(ev);

  const eventDate = new Date(ev.date + "T00:00:00");

  return (
    <div className="event-detail">
      <div className="event-detail-header">
        <div>
          <h2 className="eventura-panel-title">
            {ev.clientName} – {ev.name}
          </h2>
          <p className="eventura-small-text">
            {ev.type} · {ev.date} · {ev.city} · {ev.guestCount} guests
          </p>
        </div>
        <div className="event-detail-status">
          <select
            className="eventura-input event-status-select"
            value={ev.status}
            onChange={(e) =>
              onStatusChange(ev.id, e.target.value as EventStatus)
            }
          >
            <option>Planning</option>
            <option>In Execution</option>
            <option>Completed</option>
            <option>Cancelled</option>
          </select>
          {critical.delayRisk && (
            <span className="events-delay-tag">⚠ Delay risk</span>
          )}
        </div>
      </div>

      {/* GRID: Timeline / Gantt / Finance / Ops */}
      <div className="event-detail-grid">
        {/* TIMELINE + GANTT */}
        <div>
          <h3 className="eventura-section-title">
            Smart timeline & Gantt view
          </h3>
          <p className="eventura-small-text">
            Auto-generated timeline from event date. Tick tasks as they are
            completed — critical ones affect delay risk.
          </p>

          <ul className="timeline-list">
            {ev.tasks.map((t) => {
              const d = new Date(t.dueDate);
              const overdue =
                !t.done && d.getTime() < new Date().getTime() && t.critical;
              return (
                <li key={t.id} className="timeline-item">
                  <label className="timeline-label">
                    <input
                      type="checkbox"
                      checked={t.done}
                      onChange={() => onTaskToggle(ev.id, t.id)}
                    />
                    <span>{t.label}</span>
                  </label>
                  <div className="timeline-meta">
                    <span>{formatShort(d)}</span>
                    {t.critical && (
                      <span className="timeline-tag timeline-tag-critical">
                        Critical
                      </span>
                    )}
                    {overdue && (
                      <span className="timeline-tag timeline-tag-overdue">
                        Overdue
                      </span>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>

          <div className="gantt-wrapper">
            <div className="gantt-axis">
              <span>{formatShort(addDays(eventDate, -60))}</span>
              <span>{formatShort(eventDate)}</span>
              <span>{formatShort(addDays(eventDate, 7))}</span>
            </div>
            {ev.tasks.map((t) => {
              const start = new Date(t.dueDate);
              const diffDays = Math.round(
                (start.getTime() - addDays(eventDate, -60).getTime()) /
                  (1000 * 60 * 60 * 24)
              );
              const total = 67; // -60 to +7 days
              const leftPct = Math.max(0, Math.min(100, (diffDays / total) * 100));
              return (
                <div key={t.id} className="gantt-row">
                  <span className="gantt-label">{t.label}</span>
                  <div className="gantt-bar-track">
                    <div
                      className={
                        "gantt-bar" +
                        (t.done ? " gantt-bar-done" : "") +
                        (t.critical ? " gantt-bar-critical" : "")
                      }
                      style={{ left: `${leftPct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* FINANCE & P&L */}
        <div>
          <h3 className="eventura-section-title">Per-event P&L</h3>
          <p className="eventura-small-text">
            Real-time profitability of this event. For deep accounting, use the
            Finance module and your external books.
          </p>
          <div className="event-finance-cards">
            <div className="event-fin-card">
              <div className="event-fin-label">Revenue</div>
              <div className="event-fin-value">
                {formatCurrency(finance.revenue)}
              </div>
            </div>
            <div className="event-fin-card">
              <div className="event-fin-label">Variable cost</div>
              <div className="event-fin-value">
                {formatCurrency(finance.variable)}
              </div>
            </div>
            <div className="event-fin-card">
              <div className="event-fin-label">Fixed cost</div>
              <div className="event-fin-value">
                {formatCurrency(finance.fixed)}
              </div>
            </div>
            <div className="event-fin-card">
              <div className="event-fin-label">Profit</div>
              <div className="event-fin-value">
                {formatCurrency(finance.profit)}
              </div>
              <div className="event-fin-sub">
                Margin {finance.marginPct.toFixed(1)}%
              </div>
            </div>
          </div>

          <h4 className="eventura-section-subtitle">Client payment timeline</h4>
          <ul className="payment-list">
            {ev.paymentPlan.map((p, idx) => (
              <li key={idx} className="payment-item">
                <div>
                  <div className="payment-label">{p.label}</div>
                  <div className="payment-sub">
                    {p.duePercent}% of total ·{" "}
                    {formatCurrency(
                      Math.round((p.duePercent / 100) * finance.revenue)
                    )}
                  </div>
                </div>
                <select
                  className="eventura-input payment-status"
                  value={p.status}
                  onChange={(e) =>
                    onPaymentStatusChange(
                      ev.id,
                      idx,
                      e.target.value as PaymentStage["status"]
                    )
                  }
                >
                  <option>Pending</option>
                  <option>Paid</option>
                  <option>Overdue</option>
                </select>
              </li>
            ))}
          </ul>

          {isCEO && (
            <div className="event-blacklist-row">
              <label>
                <input
                  type="checkbox"
                  checked={ev.blacklistFlag}
                  onChange={() => onBlacklistToggle(ev.id)}
                />{" "}
                Suggest vendor blacklist for repeated issues
              </label>
            </div>
          )}
        </div>
      </div>

      {/* MOODBOARD + VENUE + VENDORS + OPS */}
      <div className="event-detail-grid event-detail-grid-bottom">
        {/* Moodboard & venue layout */}
        <div>
          <h3 className="eventura-section-title">Moodboard & layout</h3>
          <p className="eventura-small-text">
            Save references for mandap, stage, lighting and layout. Use URLs or
            short labels.
          </p>

          <button
            type="button"
            className="eventura-button-secondary"
            onClick={onMoodboardAdd}
          >
            + Add moodboard item
          </button>

          {ev.moodboard.length === 0 ? (
            <p className="eventura-small-text" style={{ marginTop: "0.5rem" }}>
              No moodboard items yet.
            </p>
          ) : (
            <ul className="moodboard-list">
              {ev.moodboard.map((m, idx) => (
                <li key={idx} className="moodboard-item">
                  {m}
                </li>
              ))}
            </ul>
          )}

          <h4 className="eventura-section-subtitle" style={{ marginTop: "0.75rem" }}>
            Venue layout notes (mini CAD)
          </h4>
          <textarea
            className="eventura-textarea"
            value={ev.venueLayoutNotes}
            onChange={onVenueLayoutChange}
            placeholder="Example: Stage on north side, 50 tables of 8, buffet near south wall, DJ near stage left, VIP sofa cluster near main entry..."
          />
        </div>

        {/* Vendors & operations */}
        <div>
          <h3 className="eventura-section-title">
            Vendors, issues & event scorecard
          </h3>
          <p className="eventura-small-text">
            Track vendor performance, on-ground issues and overall event score.
          </p>

          <div className="vendor-score-grid">
            {ev.vendorScores.map((v, idx) => (
              <div key={idx} className="vendor-score-card">
                <div className="vendor-name">{v.vendorName}</div>
                <div className="vendor-category">{v.category}</div>
                <div className="vendor-score">
                  Score:{" "}
                  <span
                    style={{
                      color:
                        v.score >= 80
                          ? "#4ade80"
                          : v.score >= 60
                          ? "#facc15"
                          : "#f97373",
                    }}
                  >
                    {v.score}/100
                  </span>
                </div>
                {v.notes && (
                  <div className="vendor-notes">“{v.notes}”</div>
                )}
              </div>
            ))}
          </div>

          <h4 className="eventura-section-subtitle" style={{ marginTop: "0.8rem" }}>
            Live issues (event day)
          </h4>
          <div className="issue-input-row">
            <input
              className="eventura-input"
              placeholder='e.g. "Flower shortage at entrance", "DJ delayed"'
              value={issueText}
              onChange={(e) => setIssueText(e.target.value)}
            />
            <button
              type="button"
              className="eventura-button-secondary"
              onClick={onIssueAdd}
            >
              + Add issue
            </button>
          </div>
          {ev.issues.length === 0 ? (
            <p className="eventura-small-text" style={{ marginTop: "0.4rem" }}>
              No issues logged yet.
            </p>
          ) : (
            <ul className="issue-list">
              {ev.issues.map((i) => (
                <li key={i.id} className="issue-item">
                  <div>
                    <div className="issue-text">{i.text}</div>
                    <div className="issue-time">
                      {new Date(i.time).toLocaleTimeString("en-IN", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </div>
                  </div>
                  <button
                    type="button"
                    className={
                      "issue-toggle" + (i.resolved ? " issue-toggle-on" : "")
                    }
                    onClick={() => onIssueToggle(ev.id, i.id)}
                  >
                    {i.resolved ? "Resolved" : "Open"}
                  </button>
                </li>
              ))}
            </ul>
          )}

          <div className="event-scorecard">
            <div className="event-score-main">{score}/100</div>
            <div className="event-score-label">Event scorecard</div>
            <div className="event-score-sub">
              Based on margin, vendors, issues & client experience.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ========== SHARED LAYOUT COMPONENTS ========== */

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
