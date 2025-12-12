"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";

/* ========= Auth ========= */

type Role = "CEO" | "Staff";
type User = { name: string; role: Role; city: string };
const USER_KEY = "eventura-user";

/* ========= Shared storage keys (CONNECT ALL TABS) =========
   Use these same keys in each tab to keep everything synced.
*/
const DB_EVENTS = "eventura-events";
const DB_CALENDAR = "eventura-calendar-events"; // same as your upgraded calendar
const DB_LEADS = "eventura-leads";
const DB_VENDORS = "eventura-vendors";
const DB_HR_TEAM = "eventura-hr-team"; // same as upgraded HR
const DB_FIN_TX = "eventura-finance-transactions";

/* ========= Types ========= */

type EventStatus = "Tentative" | "Confirmed" | "Completed" | "Cancelled";
type EventType = "Wedding" | "Corporate" | "Social" | "Other";

type EventItem = {
  id: number;
  title: string;
  date: string; // YYYY-MM-DD
  type: EventType;
  status: EventStatus;
  city: string;
  budget?: number;
};

type CalendarEvent = {
  id: number;
  title: string;
  client: string;
  date: string; // YYYY-MM-DD
  type: EventType;
  status: EventStatus;
  estBudget?: number;
};

type LeadStage = "New" | "Contacted" | "Visit Scheduled" | "Proposal Sent" | "Won" | "Lost";
type LeadItem = {
  id: number;
  name: string;
  phone?: string;
  city: string;
  stage: LeadStage;
  estValue?: number;
  createdAt: string; // ISO
};

type VendorCategory = "Decor" | "Catering" | "Sound" | "Lights" | "Venue" | "Photography" | "Logistics" | "Other";
type VendorItem = {
  id: number;
  name: string;
  category: VendorCategory;
  city: string;
  rating?: number; // 1–5
  active: boolean;
};

type StaffRole =
  | "Event Manager"
  | "Decor Specialist"
  | "Logistics"
  | "Marketing"
  | "Sales"
  | "Accountant"
  | "Operations";
type StaffStatus = "Core" | "Freelancer" | "Trainee";
type TeamMember = {
  id: number;
  name: string;
  role: StaffRole;
  city: string;
  status: StaffStatus;
  workload: number;
  monthlySalary: number;
  eventsThisMonth: number;
  rating: number;
  skills: string[];
};

type TxType = "Income" | "Expense";
type FinanceTx = {
  id: number;
  type: TxType;
  date: string; // YYYY-MM-DD
  category: string;
  amount: number;
  note?: string;
};

/* ========= small utils ========= */

function todayYYYYMMDD() {
  const d = new Date();
  const y = d.getFullYear();
  const m = `${d.getMonth() + 1}`.padStart(2, "0");
  const day = `${d.getDate()}`.padStart(2, "0");
  return `${y}-${m}-${day}`;
}
function formatINR(v: number) {
  return "₹" + (v || 0).toLocaleString("en-IN");
}
function safeParseArray<T>(raw: string | null, fallback: T[]) {
  try {
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as T[]) : fallback;
  } catch {
    return fallback;
  }
}
function nextId(items: { id: number }[]) {
  return (items.reduce((m, x) => Math.max(m, x.id), 0) || 0) + 1;
}

/* ========= Dashboard ========= */

export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null);

  // Connected datasets
  const [events, setEvents] = useState<EventItem[]>([]);
  const [calendar, setCalendar] = useState<CalendarEvent[]>([]);
  const [leads, setLeads] = useState<LeadItem[]>([]);
  const [vendors, setVendors] = useState<VendorItem[]>([]);
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [tx, setTx] = useState<FinanceTx[]>([]);

  // Quick add forms
  const [qaEvent, setQaEvent] = useState({
    title: "",
    date: todayYYYYMMDD(),
    type: "Wedding" as EventType,
    status: "Tentative" as EventStatus,
    city: "Surat",
    budget: "",
  });
  const [qaLead, setQaLead] = useState({
    name: "",
    phone: "",
    city: "Surat",
    stage: "New" as LeadStage,
    estValue: "",
  });
  const [qaVendor, setQaVendor] = useState({
    name: "",
    category: "Decor" as VendorCategory,
    city: "Surat",
    rating: "4.5",
    active: true,
  });
  const [qaTx, setQaTx] = useState({
    type: "Income" as TxType,
    date: todayYYYYMMDD(),
    category: "Booking",
    amount: "",
    note: "",
  });

  /* ===== Auth ===== */
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

  /* ===== Load connected data (single source of truth = localStorage) ===== */
  useEffect(() => {
    if (typeof window === "undefined") return;

    const loadedEvents = safeParseArray<EventItem>(localStorage.getItem(DB_EVENTS), []);
    const loadedCal = safeParseArray<CalendarEvent>(localStorage.getItem(DB_CALENDAR), []);
    const loadedLeads = safeParseArray<LeadItem>(localStorage.getItem(DB_LEADS), []);
    const loadedVendors = safeParseArray<VendorItem>(localStorage.getItem(DB_VENDORS), []);
    const loadedTeam = safeParseArray<TeamMember>(localStorage.getItem(DB_HR_TEAM), []);
    const loadedTx = safeParseArray<FinanceTx>(localStorage.getItem(DB_FIN_TX), []);

    setEvents(loadedEvents);
    setCalendar(loadedCal);
    setLeads(loadedLeads);
    setVendors(loadedVendors);
    setTeam(loadedTeam);
    setTx(loadedTx);
  }, []);

  /* ===== Persist changes back to localStorage (so all tabs stay connected) ===== */
  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem(DB_EVENTS, JSON.stringify(events));
  }, [events]);
  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem(DB_CALENDAR, JSON.stringify(calendar));
  }, [calendar]);
  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem(DB_LEADS, JSON.stringify(leads));
  }, [leads]);
  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem(DB_VENDORS, JSON.stringify(vendors));
  }, [vendors]);
  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem(DB_HR_TEAM, JSON.stringify(team));
  }, [team]);
  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem(DB_FIN_TX, JSON.stringify(tx));
  }, [tx]);

  /* ===== KPI calculations ===== */
  const kpis = useMemo(() => {
    const today = todayYYYYMMDD();

    const upcomingEvents = events.filter((e) => e.date >= today && e.status !== "Cancelled");
    const upcomingCal = calendar.filter((e) => e.date >= today && e.status !== "Cancelled");

    const openLeads = leads.filter((l) => !["Won", "Lost"].includes(l.stage));
    const wonLeads = leads.filter((l) => l.stage === "Won");
    const activeVendors = vendors.filter((v) => v.active).length;

    const core = team.filter((m) => m.status === "Core");
    const avgWorkload =
      core.reduce((s, m) => s + (m.workload || 0), 0) / (core.length || 1);

    const monthSalary = core.reduce((s, m) => s + (m.monthlySalary || 0), 0);

    const income = tx.filter((t) => t.type === "Income").reduce((s, t) => s + t.amount, 0);
    const expense = tx.filter((t) => t.type === "Expense").reduce((s, t) => s + t.amount, 0);
    const profit = income - expense;

    return {
      upcomingEvents: upcomingEvents.length,
      upcomingCalendar: upcomingCal.length,
      openLeads: openLeads.length,
      wonLeads: wonLeads.length,
      activeVendors,
      coreCount: core.length,
      avgWorkload: Math.round(avgWorkload || 0),
      monthSalary,
      income,
      expense,
      profit,
    };
  }, [events, calendar, leads, vendors, team, tx]);

  /* ===== Recent lists (editable/removable) ===== */
  const recentLeads = useMemo(
    () =>
      [...leads]
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 6),
    [leads]
  );

  const upcomingCalendar = useMemo(
    () => [...calendar].sort((a, b) => a.date.localeCompare(b.date)).slice(0, 6),
    [calendar]
  );

  const recentTx = useMemo(
    () => [...tx].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 6),
    [tx]
  );

  const isCEO = user?.role === "CEO";
  if (!user) return null;

  /* ===== Actions (Add/Delete) ===== */
  const addQuickEvent = () => {
    if (!qaEvent.title.trim()) return alert("Event title required");
    const budget = qaEvent.budget ? Number(qaEvent.budget) : undefined;
    const item: EventItem = {
      id: nextId(events),
      title: qaEvent.title.trim(),
      date: qaEvent.date,
      type: qaEvent.type,
      status: qaEvent.status,
      city: qaEvent.city.trim() || "Surat",
      budget: budget && !isNaN(budget) ? budget : undefined,
    };
    setEvents([...events, item]);
    setQaEvent((p) => ({ ...p, title: "", budget: "" }));
  };

  const addQuickLead = () => {
    if (!qaLead.name.trim()) return alert("Lead name required");
    const est = qaLead.estValue ? Number(qaLead.estValue) : undefined;
    const item: LeadItem = {
      id: nextId(leads),
      name: qaLead.name.trim(),
      phone: qaLead.phone.trim() || undefined,
      city: qaLead.city.trim() || "Surat",
      stage: qaLead.stage,
      estValue: est && !isNaN(est) ? est : undefined,
      createdAt: new Date().toISOString(),
    };
    setLeads([item, ...leads]);
    setQaLead((p) => ({ ...p, name: "", phone: "", estValue: "" }));
  };

  const addQuickVendor = () => {
    if (!qaVendor.name.trim()) return alert("Vendor name required");
    const r = qaVendor.rating ? Number(qaVendor.rating) : undefined;
    const item: VendorItem = {
      id: nextId(vendors),
      name: qaVendor.name.trim(),
      category: qaVendor.category,
      city: qaVendor.city.trim() || "Surat",
      rating: r && !isNaN(r) ? r : undefined,
      active: qaVendor.active,
    };
    setVendors([item, ...vendors]);
    setQaVendor((p) => ({ ...p, name: "" }));
  };

  const addQuickTx = () => {
    const amount = Number(qaTx.amount);
    if (!qaTx.category.trim()) return alert("Category required");
    if (!qaTx.date) return alert("Date required");
    if (!amount || isNaN(amount) || amount <= 0) return alert("Valid amount required");
    const item: FinanceTx = {
      id: nextId(tx),
      type: qaTx.type,
      date: qaTx.date,
      category: qaTx.category.trim(),
      amount,
      note: qaTx.note.trim() || undefined,
    };
    setTx([item, ...tx]);
    setQaTx((p) => ({ ...p, amount: "", note: "" }));
  };

  const remove = (kind: "event" | "calendar" | "lead" | "vendor" | "tx", id: number) => {
    if (!window.confirm("Delete this item?")) return;
    if (kind === "event") setEvents(events.filter((x) => x.id !== id));
    if (kind === "calendar") setCalendar(calendar.filter((x) => x.id !== id));
    if (kind === "lead") setLeads(leads.filter((x) => x.id !== id));
    if (kind === "vendor") setVendors(vendors.filter((x) => x.id !== id));
    if (kind === "tx") setTx(tx.filter((x) => x.id !== id));
  };

  const clearDatabase = (key: string, label: string) => {
    if (!window.confirm(`Clear all data for: ${label}?`)) return;
    localStorage.setItem(key, "[]");
    // reload state from storage
    if (key === DB_EVENTS) setEvents([]);
    if (key === DB_CALENDAR) setCalendar([]);
    if (key === DB_LEADS) setLeads([]);
    if (key === DB_VENDORS) setVendors([]);
    if (key === DB_FIN_TX) setTx([]);
    // HR team clearing is powerful—only allow CEO
    if (key === DB_HR_TEAM && isCEO) setTeam([]);
  };

  return (
    <main className="eventura-os">
      <aside className="eventura-sidebar">
        <SidebarCore user={user} active="dashboard" />
      </aside>

      <div className="eventura-main">
        <TopbarCore user={user} />

        <div className="eventura-content">
          <div className="eventura-header-row">
            <div>
              <h1 className="eventura-page-title">CEO Dashboard</h1>
              <p className="eventura-subtitle">
                Connected control center — numbers update from Events, Calendar, Leads, Vendors, HR and Finance.
              </p>
            </div>
            <div className="eventura-chips-row">
              <Link className="eventura-tag eventura-tag-blue" href="/events">Open Events</Link>
              <Link className="eventura-tag eventura-tag-blue" href="/calendar">Open Calendar</Link>
              <Link className="eventura-tag eventura-tag-blue" href="/leads">Open Leads</Link>
              <Link className="eventura-tag eventura-tag-blue" href="/vendors">Open Vendors</Link>
              <Link className="eventura-tag eventura-tag-blue" href="/hr">Open HR</Link>
              {isCEO && <Link className="eventura-tag eventura-tag-blue" href="/finance">Open Finance</Link>}
            </div>
          </div>

          {/* KPI CARDS */}
          <section className="eventura-grid">
            <div className="eventura-card eventura-card-glow">
              <p className="eventura-card-label">Upcoming Events</p>
              <p className="eventura-card-value">{kpis.upcomingEvents}</p>
              <p className="eventura-card-note">From Events tab (DB_EVENTS)</p>
            </div>
            <div className="eventura-card eventura-card-glow">
              <p className="eventura-card-label">Calendar bookings</p>
              <p className="eventura-card-value">{kpis.upcomingCalendar}</p>
              <p className="eventura-card-note">From Calendar (DB_CALENDAR)</p>
            </div>
            <div className="eventura-card eventura-card-glow">
              <p className="eventura-card-label">Open Leads</p>
              <p className="eventura-card-value">{kpis.openLeads}</p>
              <p className="eventura-card-note">Pipeline not Won/Lost</p>
            </div>
            <div className="eventura-card eventura-card-glow">
              <p className="eventura-card-label">Active Vendors</p>
              <p className="eventura-card-value">{kpis.activeVendors}</p>
              <p className="eventura-card-note">Ready to book</p>
            </div>

            {isCEO && (
              <>
                <div className="eventura-card eventura-card-glow">
                  <p className="eventura-card-label">Income</p>
                  <p className="eventura-card-value">{formatINR(kpis.income)}</p>
                  <p className="eventura-card-note">From Finance TX</p>
                </div>
                <div className="eventura-card eventura-card-glow">
                  <p className="eventura-card-label">Expense</p>
                  <p className="eventura-card-value">{formatINR(kpis.expense)}</p>
                  <p className="eventura-card-note">From Finance TX</p>
                </div>
                <div className="eventura-card eventura-card-glow">
                  <p className="eventura-card-label">Profit</p>
                  <p className="eventura-card-value">{formatINR(kpis.profit)}</p>
                  <p className="eventura-card-note">Income − Expense</p>
                </div>
                <div className="eventura-card eventura-card-glow">
                  <p className="eventura-card-label">Core team</p>
                  <p className="eventura-card-value">{kpis.coreCount}</p>
                  <p className="eventura-card-note">Avg workload: {kpis.avgWorkload}%</p>
                </div>
              </>
            )}
          </section>

          {/* MAIN: quick add + recent lists */}
          <section className="eventura-columns">
            {/* QUICK ADD PANEL */}
            <div className="eventura-panel" style={{ maxWidth: 420 }}>
              <h2 className="eventura-panel-title">Quick Add (editable data)</h2>

              <h3 className="eventura-subsection-title">Add Event</h3>
              <div className="eventura-form" style={{ display: "grid", gap: 8 }}>
                <input className="eventura-search" placeholder="Event title"
                  value={qaEvent.title} onChange={(e) => setQaEvent({ ...qaEvent, title: e.target.value })} />
                <div style={{ display: "flex", gap: 8 }}>
                  <input type="date" className="eventura-search" value={qaEvent.date}
                    onChange={(e) => setQaEvent({ ...qaEvent, date: e.target.value })} />
                  <input className="eventura-search" placeholder="City" value={qaEvent.city}
                    onChange={(e) => setQaEvent({ ...qaEvent, city: e.target.value })} />
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <select className="eventura-search" value={qaEvent.type}
                    onChange={(e) => setQaEvent({ ...qaEvent, type: e.target.value as EventType })}>
                    <option>Wedding</option><option>Corporate</option><option>Social</option><option>Other</option>
                  </select>
                  <select className="eventura-search" value={qaEvent.status}
                    onChange={(e) => setQaEvent({ ...qaEvent, status: e.target.value as EventStatus })}>
                    <option>Tentative</option><option>Confirmed</option><option>Completed</option><option>Cancelled</option>
                  </select>
                </div>
                <input className="eventura-search" placeholder="Budget (optional)"
                  value={qaEvent.budget} onChange={(e) => setQaEvent({ ...qaEvent, budget: e.target.value })} />
                <button className="eventura-button-secondary" type="button" onClick={addQuickEvent}>
                  Add to Events DB
                </button>
              </div>

              <h3 className="eventura-subsection-title" style={{ marginTop: 14 }}>Add Lead</h3>
              <div className="eventura-form" style={{ display: "grid", gap: 8 }}>
                <input className="eventura-search" placeholder="Lead name"
                  value={qaLead.name} onChange={(e) => setQaLead({ ...qaLead, name: e.target.value })} />
                <div style={{ display: "flex", gap: 8 }}>
                  <input className="eventura-search" placeholder="Phone"
                    value={qaLead.phone} onChange={(e) => setQaLead({ ...qaLead, phone: e.target.value })} />
                  <input className="eventura-search" placeholder="City"
                    value={qaLead.city} onChange={(e) => setQaLead({ ...qaLead, city: e.target.value })} />
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <select className="eventura-search" value={qaLead.stage}
                    onChange={(e) => setQaLead({ ...qaLead, stage: e.target.value as LeadStage })}>
                    <option>New</option><option>Contacted</option><option>Visit Scheduled</option>
                    <option>Proposal Sent</option><option>Won</option><option>Lost</option>
                  </select>
                  <input className="eventura-search" placeholder="Est value (₹)"
                    value={qaLead.estValue} onChange={(e) => setQaLead({ ...qaLead, estValue: e.target.value })} />
                </div>
                <button className="eventura-button-secondary" type="button" onClick={addQuickLead}>
                  Add to Leads DB
                </button>
              </div>

              <h3 className="eventura-subsection-title" style={{ marginTop: 14 }}>Add Vendor</h3>
              <div className="eventura-form" style={{ display: "grid", gap: 8 }}>
                <input className="eventura-search" placeholder="Vendor name"
                  value={qaVendor.name} onChange={(e) => setQaVendor({ ...qaVendor, name: e.target.value })} />
                <div style={{ display: "flex", gap: 8 }}>
                  <select className="eventura-search" value={qaVendor.category}
                    onChange={(e) => setQaVendor({ ...qaVendor, category: e.target.value as VendorCategory })}>
                    <option>Decor</option><option>Catering</option><option>Sound</option><option>Lights</option>
                    <option>Venue</option><option>Photography</option><option>Logistics</option><option>Other</option>
                  </select>
                  <input className="eventura-search" placeholder="City"
                    value={qaVendor.city} onChange={(e) => setQaVendor({ ...qaVendor, city: e.target.value })} />
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <input className="eventura-search" placeholder="Rating (1-5)"
                    value={qaVendor.rating} onChange={(e) => setQaVendor({ ...qaVendor, rating: e.target.value })} />
                  <select className="eventura-search" value={qaVendor.active ? "Yes" : "No"}
                    onChange={(e) => setQaVendor({ ...qaVendor, active: e.target.value === "Yes" })}>
                    <option>Yes</option><option>No</option>
                  </select>
                </div>
                <button className="eventura-button-secondary" type="button" onClick={addQuickVendor}>
                  Add to Vendors DB
                </button>
              </div>

              {isCEO && (
                <>
                  <h3 className="eventura-subsection-title" style={{ marginTop: 14 }}>Add Finance Transaction</h3>
                  <div className="eventura-form" style={{ display: "grid", gap: 8 }}>
                    <div style={{ display: "flex", gap: 8 }}>
                      <select className="eventura-search" value={qaTx.type}
                        onChange={(e) => setQaTx({ ...qaTx, type: e.target.value as TxType })}>
                        <option>Income</option><option>Expense</option>
                      </select>
                      <input type="date" className="eventura-search" value={qaTx.date}
                        onChange={(e) => setQaTx({ ...qaTx, date: e.target.value })} />
                    </div>
                    <input className="eventura-search" placeholder="Category (Booking, Vendor, Salary...)"
                      value={qaTx.category} onChange={(e) => setQaTx({ ...qaTx, category: e.target.value })} />
                    <input className="eventura-search" placeholder="Amount"
                      value={qaTx.amount} onChange={(e) => setQaTx({ ...qaTx, amount: e.target.value })} />
                    <input className="eventura-search" placeholder="Note (optional)"
                      value={qaTx.note} onChange={(e) => setQaTx({ ...qaTx, note: e.target.value })} />
                    <button className="eventura-button-secondary" type="button" onClick={addQuickTx}>
                      Add to Finance DB
                    </button>
                  </div>
                </>
              )}
            </div>

            {/* RECENT / EDITABLE LISTS */}
            <div className="eventura-panel">
              <h2 className="eventura-panel-title">Recent + Editable Lists</h2>

              <h3 className="eventura-subsection-title">Upcoming Calendar Bookings</h3>
              <div className="eventura-table-wrapper">
                <table className="eventura-table">
                  <thead>
                    <tr><th>Date</th><th>Title</th><th>Client</th><th>Status</th><th></th></tr>
                  </thead>
                  <tbody>
                    {upcomingCalendar.length === 0 && (
                      <tr><td colSpan={5} className="eventura-small-text">No calendar bookings yet.</td></tr>
                    )}
                    {upcomingCalendar.map((c) => (
                      <tr key={c.id}>
                        <td>{c.date}</td>
                        <td>{c.title}</td>
                        <td>{c.client}</td>
                        <td>{c.status}</td>
                        <td>
                          <button className="eventura-tag eventura-tag-amber" type="button"
                            onClick={() => remove("calendar", c.id)}>Delete</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <h3 className="eventura-subsection-title" style={{ marginTop: 14 }}>Recent Leads</h3>
              <div className="eventura-table-wrapper">
                <table className="eventura-table">
                  <thead>
                    <tr><th>Name</th><th>City</th><th>Stage</th><th>Value</th><th></th></tr>
                  </thead>
                  <tbody>
                    {recentLeads.length === 0 && (
                      <tr><td colSpan={5} className="eventura-small-text">No leads yet.</td></tr>
                    )}
                    {recentLeads.map((l) => (
                      <tr key={l.id}>
                        <td>
                          <div className="eventura-list-title">{l.name}</div>
                          <div className="eventura-list-sub">{l.phone || ""}</div>
                        </td>
                        <td>{l.city}</td>
                        <td>{l.stage}</td>
                        <td>{l.estValue ? formatINR(l.estValue) : "-"}</td>
                        <td>
                          <button className="eventura-tag eventura-tag-amber" type="button"
                            onClick={() => remove("lead", l.id)}>Delete</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {isCEO && (
                <>
                  <h3 className="eventura-subsection-title" style={{ marginTop: 14 }}>Recent Finance Transactions</h3>
                  <div className="eventura-table-wrapper">
                    <table className="eventura-table">
                      <thead>
                        <tr><th>Date</th><th>Type</th><th>Category</th><th>Amount</th><th></th></tr>
                      </thead>
                      <tbody>
                        {recentTx.length === 0 && (
                          <tr><td colSpan={5} className="eventura-small-text">No transactions yet.</td></tr>
                        )}
                        {recentTx.map((t) => (
                          <tr key={t.id}>
                            <td>{t.date}</td>
                            <td>{t.type}</td>
                            <td>{t.category}</td>
                            <td>{formatINR(t.amount)}</td>
                            <td>
                              <button className="eventura-tag eventura-tag-amber" type="button"
                                onClick={() => remove("tx", t.id)}>Delete</button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}

              <h3 className="eventura-subsection-title" style={{ marginTop: 14 }}>Data Controls</h3>
              <div className="eventura-chips-row">
                <button className="eventura-tag eventura-tag-amber" type="button"
                  onClick={() => clearDatabase(DB_EVENTS, "Events")}>Clear Events</button>
                <button className="eventura-tag eventura-tag-amber" type="button"
                  onClick={() => clearDatabase(DB_CALENDAR, "Calendar")}>Clear Calendar</button>
                <button className="eventura-tag eventura-tag-amber" type="button"
                  onClick={() => clearDatabase(DB_LEADS, "Leads")}>Clear Leads</button>
                <button className="eventura-tag eventura-tag-amber" type="button"
                  onClick={() => clearDatabase(DB_VENDORS, "Vendors")}>Clear Vendors</button>
                {isCEO && (
                  <>
                    <button className="eventura-tag eventura-tag-amber" type="button"
                      onClick={() => clearDatabase(DB_FIN_TX, "Finance Transactions")}>Clear Finance</button>
                    <button className="eventura-tag eventura-tag-amber" type="button"
                      onClick={() => clearDatabase(DB_HR_TEAM, "HR Team")}>Clear HR Team</button>
                  </>
                )}
              </div>

              <p className="eventura-small-text" style={{ marginTop: 10 }}>
                For full “connected tabs”, each tab must read/write the same DB keys shown at the top of this file.
                If you paste your Events/Leads/Vendors/Finance pages, I’ll update them to use these same keys.
              </p>
            </div>
          </section>
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
        <input className="eventura-search" placeholder="Search across Eventura OS..." />
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
