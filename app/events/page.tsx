"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";

/* ===================== AUTH / KEYS ===================== */

type Role = "CEO" | "Staff";
type User = { name: string; role: Role; city: string };

const USER_KEY = "eventura-user";
const EVENTS_KEY = "eventura-events";
const FIN_TX_KEY = "eventura-finance-transactions";

/* ===================== TYPES ===================== */

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

type VendorStatus = "Planned" | "Advance Paid" | "Paid" | "Cancelled";

type VendorAssignment = {
  id: number;
  name: string;
  category: string;
  amount: string; // store raw as string
  status: VendorStatus;
};

type IssueStatus = "Open" | "Resolved";
type IssueItem = {
  id: number;
  text: string;
  status: IssueStatus;
  createdAt: string;
};

type TrackStage = "Not started" | "In planning" | "In execution" | "Completed" | "Cancelled";

type ActivityItem = {
  id: number;
  at: string; // ISO
  by: string;
  action: string;
};

type ChecklistItem = {
  id: number;
  text: string;
  done: boolean;
  phase: "Planning" | "Execution";
};

type EventItem = {
  id: number;
  clientName: string;
  eventName: string;
  eventType: EventType;
  city: string;
  venue: string;
  date: string; // yyyy-mm-dd
  guests: string;
  budget: string; // revenue expected
  status: EventStatus;
  leadSource: string;
  owner: string;
  notes: string;

  // New: tracking + ops
  stage?: TrackStage;
  progress?: number; // 0-100
  startedAt?: string; // ISO
  completedAt?: string; // ISO
  checklist?: ChecklistItem[];
  activity?: ActivityItem[];

  // Existing
  vendors?: VendorAssignment[];
  issues?: IssueItem[];

  // Finance link helpers
  advanceReceived?: string; // ₹ string
};

type TxType = "Income" | "Expense";
type FinanceTx = {
  id: number;
  date: string; // yyyy-mm-dd
  type: TxType;
  category: string;
  amount: number; // number
  description: string;
  eventId?: number;
  eventName?: string;
  createdBy?: string;
};

/* ===================== HELPERS ===================== */

function safeNowISO() {
  return new Date().toISOString();
}
function todayYMD() {
  return new Date().toISOString().slice(0, 10);
}
function parseMoney(value: string): number {
  const cleaned = (value || "").toString().replace(/[₹, ]/g, "");
  const n = parseFloat(cleaned);
  return isNaN(n) ? 0 : n;
}
function formatINR(value: number): string {
  return value.toLocaleString("en-IN", { maximumFractionDigits: 0 });
}
function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}
function stageFromStatus(status: EventStatus): TrackStage {
  if (status === "Completed") return "Completed";
  if (status === "Cancelled") return "Cancelled";
  if (status === "In Execution") return "In execution";
  if (status === "Planning" || status === "Confirmed") return "In planning";
  return "Not started";
}
function progressFromStatus(status: EventStatus): number {
  // Simple but realistic mapping
  const map: Record<EventStatus, number> = {
    "New Lead": 5,
    "Proposal Sent": 15,
    Negotiation: 25,
    Confirmed: 40,
    Planning: 60,
    "In Execution": 85,
    Completed: 100,
    Cancelled: 0,
  };
  return map[status] ?? 0;
}
function statusColor(status: EventStatus) {
  if (status === "Completed") return "eventura-tag-green";
  if (status === "Cancelled") return "eventura-tag-amber";
  if (status === "In Execution") return "eventura-tag-blue";
  if (status === "Planning" || status === "Confirmed") return "eventura-tag-blue";
  return "eventura-tag-amber";
}

function defaultChecklist(): ChecklistItem[] {
  return [
    { id: 1, text: "Venue confirmed", done: false, phase: "Planning" },
    { id: 2, text: "Vendors finalized", done: false, phase: "Planning" },
    { id: 3, text: "Decor mockup approved", done: false, phase: "Planning" },
    { id: 4, text: "Logistics plan ready", done: false, phase: "Planning" },
    { id: 5, text: "Material loaded", done: false, phase: "Execution" },
    { id: 6, text: "Stage setup completed", done: false, phase: "Execution" },
    { id: 7, text: "Sound & lights tested", done: false, phase: "Execution" },
    { id: 8, text: "Client sign-off / handover", done: false, phase: "Execution" },
  ];
}

function pushActivity(ev: EventItem, by: string, action: string): EventItem {
  const a: ActivityItem = { id: Date.now(), at: safeNowISO(), by, action };
  return { ...ev, activity: [a, ...(ev.activity ?? [])] };
}

function readFinanceTx(): FinanceTx[] {
  if (typeof window === "undefined") return [];
  const raw = window.localStorage.getItem(FIN_TX_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as FinanceTx[];
  } catch {
    return [];
  }
}
function writeFinanceTx(next: FinanceTx[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(FIN_TX_KEY, JSON.stringify(next));
}
function addFinanceTx(tx: FinanceTx) {
  const prev = readFinanceTx();
  writeFinanceTx([tx, ...prev]);
}

/* ===================== PAGE ===================== */

export default function EventsPage() {
  const [user, setUser] = useState<User | null>(null);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const [editingId, setEditingId] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<EventStatus | "All">("All");

  const [form, setForm] = useState<Omit<EventItem, "id">>({
    clientName: "",
    eventName: "",
    eventType: "Wedding",
    city: "",
    venue: "",
    date: "",
    guests: "",
    budget: "",
    status: "New Lead",
    leadSource: "",
    owner: "",
    notes: "",
    vendors: [],
    issues: [],
    stage: "Not started",
    progress: 5,
    startedAt: undefined,
    completedAt: undefined,
    checklist: defaultChecklist(),
    activity: [],
    advanceReceived: "",
  });

  // AUTH
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
      setForm((p) => ({ ...p, owner: p.owner || u.name }));
    } catch {
      window.localStorage.removeItem(USER_KEY);
      window.location.href = "/login";
    }
  }, []);

  // LOAD EVENTS
  useEffect(() => {
    if (typeof window === "undefined") return;

    const raw = window.localStorage.getItem(EVENTS_KEY);
    if (raw) {
      try {
        const parsed: EventItem[] = JSON.parse(raw).map((e: any) => {
          const status: EventStatus = e.status ?? "New Lead";
          const stage: TrackStage = e.stage ?? stageFromStatus(status);
          const progress = typeof e.progress === "number" ? e.progress : progressFromStatus(status);
          return {
            ...e,
            vendors: e.vendors ?? [],
            issues: e.issues ?? [],
            activity: e.activity ?? [],
            checklist: e.checklist ?? defaultChecklist(),
            stage,
            progress,
          } as EventItem;
        });
        setEvents(parsed);
        setSelectedId(parsed.length ? parsed[0].id : null);
        return;
      } catch {
        // fallthrough to seed
      }
    }

    // SEED (first time)
    const seed: EventItem[] = [
      {
        id: Date.now(),
        clientName: "Patel Family",
        eventName: "Patel Wedding Sangeet",
        eventType: "Wedding",
        city: "Surat",
        venue: "Laxmi Farm",
        date: todayYMD(),
        guests: "450",
        budget: "1850000",
        status: "Planning",
        leadSource: "Instagram",
        owner: "Hardik Vekariya",
        notes: "Royal floral + gold theme; live dhol & DJ.",
        vendors: [
          { id: 1, name: "Royal Decor Studio", category: "Decor", amount: "650000", status: "Planned" },
          { id: 2, name: "Shree Caterers", category: "Catering", amount: "750000", status: "Planned" },
        ],
        issues: [],
        stage: stageFromStatus("Planning"),
        progress: progressFromStatus("Planning"),
        startedAt: undefined,
        completedAt: undefined,
        checklist: defaultChecklist(),
        activity: [{ id: 11, at: safeNowISO(), by: "System", action: "Seed event created" }],
        advanceReceived: "",
      },
    ];

    setEvents(seed);
    setSelectedId(seed[0].id);
    window.localStorage.setItem(EVENTS_KEY, JSON.stringify(seed));
  }, []);

  // PERSIST EVENTS
  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(EVENTS_KEY, JSON.stringify(events));
  }, [events]);

  function handleFormChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) {
    const { name, value } = e.target;
    if (name === "status") {
      const st = value as EventStatus;
      setForm((prev) => ({
        ...prev,
        status: st,
        stage: stageFromStatus(st),
        progress: progressFromStatus(st),
      }));
      return;
    }
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  function resetForm() {
    setEditingId(null);
    setForm({
      clientName: "",
      eventName: "",
      eventType: "Wedding",
      city: "",
      venue: "",
      date: "",
      guests: "",
      budget: "",
      status: "New Lead",
      leadSource: "",
      owner: user?.name ?? "",
      notes: "",
      vendors: [],
      issues: [],
      stage: "Not started",
      progress: 5,
      startedAt: undefined,
      completedAt: undefined,
      checklist: defaultChecklist(),
      activity: [],
      advanceReceived: "",
    });
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.clientName || !form.eventName || !form.date) {
      alert("Client name, event name and date are required.");
      return;
    }

    const normalized: Omit<EventItem, "id"> = {
      ...form,
      vendors: form.vendors ?? [],
      issues: form.issues ?? [],
      checklist: form.checklist ?? defaultChecklist(),
      activity: form.activity ?? [],
      stage: stageFromStatus(form.status),
      progress: clamp(typeof form.progress === "number" ? form.progress : progressFromStatus(form.status), 0, 100),
    };

    if (editingId == null) {
      const newEvent: EventItem = {
        id: Date.now(),
        ...normalized,
      };
      setEvents((prev) => [pushActivity(newEvent, user?.name ?? "System", "Event created"), ...prev]);
      setSelectedId(newEvent.id);
    } else {
      setEvents((prev) =>
        prev.map((ev) =>
          ev.id === editingId
            ? pushActivity({ ...ev, ...normalized }, user?.name ?? "System", "Event updated")
            : ev
        )
      );
    }

    resetForm();
  }

  function handleEdit(eventId: number) {
    const ev = events.find((e) => e.id === eventId);
    if (!ev) return;
    setEditingId(ev.id);
    setForm({
      clientName: ev.clientName,
      eventName: ev.eventName,
      eventType: ev.eventType,
      city: ev.city,
      venue: ev.venue,
      date: ev.date,
      guests: ev.guests,
      budget: ev.budget,
      status: ev.status,
      leadSource: ev.leadSource,
      owner: ev.owner,
      notes: ev.notes,
      vendors: ev.vendors ?? [],
      issues: ev.issues ?? [],
      stage: ev.stage ?? stageFromStatus(ev.status),
      progress: typeof ev.progress === "number" ? ev.progress : progressFromStatus(ev.status),
      startedAt: ev.startedAt,
      completedAt: ev.completedAt,
      checklist: ev.checklist ?? defaultChecklist(),
      activity: ev.activity ?? [],
      advanceReceived: ev.advanceReceived ?? "",
    });
    setSelectedId(ev.id);
  }

  function handleDelete(eventId: number) {
    if (!confirm("Delete this event? This cannot be undone.")) return;
    setEvents((prev) => {
      const next = prev.filter((e) => e.id !== eventId);
      if (selectedId === eventId) setSelectedId(next.length ? next[0].id : null);
      if (editingId === eventId) resetForm();
      return next;
    });
  }

  function handleUpdateEvent(updated: EventItem) {
    setEvents((prev) => prev.map((e) => (e.id === updated.id ? updated : e)));
  }

  const filteredEvents = events.filter((ev) => {
    const q = search.trim().toLowerCase();
    const matchSearch =
      !q ||
      ev.clientName.toLowerCase().includes(q) ||
      ev.eventName.toLowerCase().includes(q) ||
      ev.city.toLowerCase().includes(q) ||
      ev.owner.toLowerCase().includes(q);

    const matchStatus = statusFilter === "All" ? true : ev.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const selectedEvent = events.find((ev) => ev.id === selectedId) ?? null;

  if (!user) return null;
  const isCEO = user.role === "CEO";

  // KPIs
  const kpis = useMemo(() => {
    const total = events.length;
    const completed = events.filter((e) => e.status === "Completed").length;
    const inExecution = events.filter((e) => e.status === "In Execution").length;
    const planning = events.filter((e) => e.status === "Planning" || e.status === "Confirmed").length;
    const pipeline = events.filter((e) =>
      e.status === "New Lead" || e.status === "Proposal Sent" || e.status === "Negotiation"
    ).length;
    return { total, completed, inExecution, planning, pipeline };
  }, [events]);

  return (
    <main className="eventura-os">
      <aside className="eventura-sidebar">
        <SidebarCore user={user} active="events" />
      </aside>

      <div className="eventura-main">
        <TopbarCore user={user} />

        <div className="eventura-content">
          <div className="eventura-header-row">
            <div>
              <h1 className="eventura-page-title">Events</h1>
              <p className="eventura-subtitle">
                Live tracking + timeline + vendors + issues — connected to Finance.
              </p>
            </div>
            <div className="eventura-actions" style={{ gap: "0.5rem" }}>
              <Link className="eventura-button-secondary" href="/finance">
                Open Finance
              </Link>
              <button className="eventura-button" type="button" onClick={resetForm}>
                + New Event
              </button>
            </div>
          </div>

          {/* KPI Row */}
          <section className="eventura-grid" style={{ marginBottom: "1rem" }}>
            <div className="eventura-card eventura-card-glow">
              <p className="eventura-card-label">Total</p>
              <p className="eventura-card-value">{kpis.total}</p>
              <p className="eventura-card-note">All events in system</p>
            </div>
            <div className="eventura-card eventura-card-glow">
              <p className="eventura-card-label">Pipeline</p>
              <p className="eventura-card-value">{kpis.pipeline}</p>
              <p className="eventura-card-note">Lead → Proposal → Negotiation</p>
            </div>
            <div className="eventura-card eventura-card-glow">
              <p className="eventura-card-label">Planning</p>
              <p className="eventura-card-value">{kpis.planning}</p>
              <p className="eventura-card-note">Confirmed / Planning stage</p>
            </div>
            <div className="eventura-card eventura-card-glow">
              <p className="eventura-card-label">Live now</p>
              <p className="eventura-card-value">{kpis.inExecution}</p>
              <p className="eventura-card-note">In Execution right now</p>
            </div>
          </section>

          <div className="eventura-columns">
            {/* LEFT */}
            <div>
              <div className="eventura-panel">
                <h2 className="eventura-panel-title">{editingId ? "Edit event" : "Create new event"}</h2>

                <form className="eventura-form" onSubmit={handleSubmit}>
                  <div className="eventura-form-grid">
                    <div className="eventura-field">
                      <label className="eventura-label" htmlFor="clientName">Client name</label>
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
                      <label className="eventura-label" htmlFor="eventName">Event name</label>
                      <input
                        id="eventName"
                        name="eventName"
                        className="eventura-input"
                        value={form.eventName}
                        onChange={handleFormChange}
                        placeholder="e.g. Patel Wedding Sangeet"
                      />
                    </div>
                  </div>

                  <div className="eventura-form-grid">
                    <div className="eventura-field">
                      <label className="eventura-label" htmlFor="eventType">Event type</label>
                      <select
                        id="eventType"
                        name="eventType"
                        className="eventura-input"
                        value={form.eventType}
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
                      <label className="eventura-label" htmlFor="status">Status</label>
                      <select
                        id="status"
                        name="status"
                        className="eventura-input"
                        value={form.status}
                        onChange={handleFormChange}
                      >
                        <option>New Lead</option>
                        <option>Proposal Sent</option>
                        <option>Negotiation</option>
                        <option>Confirmed</option>
                        <option>Planning</option>
                        <option>In Execution</option>
                        <option>Completed</option>
                        <option>Cancelled</option>
                      </select>
                    </div>
                  </div>

                  <div className="eventura-form-grid">
                    <div className="eventura-field">
                      <label className="eventura-label" htmlFor="date">Event date</label>
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
                      <label className="eventura-label" htmlFor="city">City</label>
                      <input
                        id="city"
                        name="city"
                        className="eventura-input"
                        value={form.city}
                        onChange={handleFormChange}
                        placeholder="Surat / Ahmedabad / Rajkot"
                      />
                    </div>
                  </div>

                  <div className="eventura-form-grid">
                    <div className="eventura-field">
                      <label className="eventura-label" htmlFor="venue">Venue</label>
                      <input
                        id="venue"
                        name="venue"
                        className="eventura-input"
                        value={form.venue}
                        onChange={handleFormChange}
                        placeholder="e.g. Laxmi Farm"
                      />
                    </div>
                    <div className="eventura-field">
                      <label className="eventura-label" htmlFor="guests">Guests</label>
                      <input
                        id="guests"
                        name="guests"
                        className="eventura-input"
                        value={form.guests}
                        onChange={handleFormChange}
                        placeholder="e.g. 450"
                      />
                    </div>
                  </div>

                  <div className="eventura-form-grid">
                    <div className="eventura-field">
                      <label className="eventura-label" htmlFor="budget">Revenue / budget (₹)</label>
                      <input
                        id="budget"
                        name="budget"
                        className="eventura-input"
                        value={form.budget}
                        onChange={handleFormChange}
                        placeholder="e.g. 18,50,000"
                      />
                    </div>
                    <div className="eventura-field">
                      <label className="eventura-label" htmlFor="leadSource">Lead source</label>
                      <input
                        id="leadSource"
                        name="leadSource"
                        className="eventura-input"
                        value={form.leadSource}
                        onChange={handleFormChange}
                        placeholder="Instagram / Referral / Venue / Google"
                      />
                    </div>
                  </div>

                  <div className="eventura-form-grid">
                    <div className="eventura-field">
                      <label className="eventura-label" htmlFor="owner">Owner / manager</label>
                      <input
                        id="owner"
                        name="owner"
                        className="eventura-input"
                        value={form.owner}
                        onChange={handleFormChange}
                        placeholder="Hardik / Shubh / Dixit"
                      />
                    </div>

                    <div className="eventura-field">
                      <label className="eventura-label" htmlFor="advanceReceived">Advance received (₹)</label>
                      <input
                        id="advanceReceived"
                        name="advanceReceived"
                        className="eventura-input"
                        value={form.advanceReceived ?? ""}
                        onChange={handleFormChange}
                        placeholder="e.g. 3,00,000"
                      />
                    </div>
                  </div>

                  <div className="eventura-field" style={{ marginTop: "0.6rem" }}>
                    <label className="eventura-label" htmlFor="notes">Notes</label>
                    <textarea
                      id="notes"
                      name="notes"
                      className="eventura-textarea"
                      value={form.notes}
                      onChange={handleFormChange}
                      placeholder="Client preferences, theme, must-have items..."
                    />
                  </div>

                  {/* Progress preview */}
                  <div style={{ marginTop: "0.7rem" }}>
                    <div className="eventura-small-text" style={{ display: "flex", justifyContent: "space-between" }}>
                      <span>Live tracking: {form.stage ?? stageFromStatus(form.status)}</span>
                      <span>{form.progress ?? progressFromStatus(form.status)}%</span>
                    </div>
                    <div style={{ height: 10, background: "rgba(148,163,184,0.25)", borderRadius: 999, marginTop: 6 }}>
                      <div
                        style={{
                          width: `${clamp(form.progress ?? progressFromStatus(form.status), 0, 100)}%`,
                          height: "100%",
                          borderRadius: 999,
                          background: "rgba(139,92,246,0.95)",
                        }}
                      />
                    </div>
                  </div>

                  <div className="eventura-actions" style={{ marginTop: "0.8rem" }}>
                    <button type="submit" className="eventura-button">
                      {editingId ? "Update event" : "Save event"}
                    </button>
                    {editingId && (
                      <button type="button" className="eventura-button-secondary" onClick={resetForm}>
                        Cancel
                      </button>
                    )}
                  </div>
                </form>
              </div>

              {/* LIST */}
              <div className="eventura-panel" style={{ marginTop: "1rem" }}>
                <h2 className="eventura-panel-title">Event list</h2>

                <div className="eventura-form-grid" style={{ marginBottom: "0.6rem" }}>
                  <div className="eventura-field">
                    <input
                      className="eventura-input"
                      placeholder="Search: client, event, city, owner..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                    />
                  </div>
                  <div className="eventura-field">
                    <select
                      className="eventura-input"
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value as EventStatus | "All")}
                    >
                      <option value="All">All statuses</option>
                      <option value="New Lead">New Lead</option>
                      <option value="Proposal Sent">Proposal Sent</option>
                      <option value="Negotiation">Negotiation</option>
                      <option value="Confirmed">Confirmed</option>
                      <option value="Planning">Planning</option>
                      <option value="In Execution">In Execution</option>
                      <option value="Completed">Completed</option>
                      <option value="Cancelled">Cancelled</option>
                    </select>
                  </div>
                </div>

                {filteredEvents.length === 0 ? (
                  <p style={{ fontSize: "0.8rem", color: "#9ca3af", marginTop: "0.4rem" }}>
                    No events match this filter.
                  </p>
                ) : (
                  <ul className="eventura-list">
                    {filteredEvents.map((ev) => {
                      const stage = ev.stage ?? stageFromStatus(ev.status);
                      const progress = typeof ev.progress === "number" ? ev.progress : progressFromStatus(ev.status);
                      return (
                        <li
                          key={ev.id}
                          className="eventura-list-item"
                          style={{
                            cursor: "pointer",
                            backgroundColor: ev.id === selectedId ? "rgba(15,23,42,0.8)" : "transparent",
                            borderRadius: "0.7rem",
                            padding: "0.55rem 0.6rem",
                          }}
                          onClick={() => setSelectedId(ev.id)}
                        >
                          <div style={{ minWidth: 0 }}>
                            <div className="eventura-list-title" style={{ display: "flex", gap: 8, alignItems: "center" }}>
                              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                {ev.eventName}
                              </span>
                              <span className={"eventura-tag " + statusColor(ev.status)}>
                                {stage}
                              </span>
                            </div>
                            <div className="eventura-list-sub">
                              {ev.clientName} · {ev.city} · {ev.date || "No date"} · {ev.eventType} · Owner: {ev.owner}
                            </div>

                            <div style={{ marginTop: 6 }}>
                              <div style={{ height: 8, background: "rgba(148,163,184,0.25)", borderRadius: 999 }}>
                                <div
                                  style={{
                                    width: `${clamp(progress, 0, 100)}%`,
                                    height: "100%",
                                    borderRadius: 999,
                                    background: "rgba(34,197,94,0.85)",
                                  }}
                                />
                              </div>
                            </div>
                          </div>

                          <div style={{ display: "flex", gap: "0.35rem", alignItems: "center" }}>
                            <button
                              type="button"
                              className="eventura-tag eventura-tag-blue"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEdit(ev.id);
                              }}
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              className="eventura-tag eventura-tag-amber"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDelete(ev.id);
                              }}
                            >
                              Delete
                            </button>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </div>

            {/* RIGHT */}
            <div className="eventura-panel">
              {!selectedEvent ? (
                <p style={{ fontSize: "0.8rem", color: "#9ca3af" }}>
                  Select an event to see live tracking, checklist, vendors, issues and finance sync.
                </p>
              ) : (
                <EventDetail
                  user={user}
                  event={selectedEvent}
                  isCEO={isCEO}
                  onUpdate={handleUpdateEvent}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

/* ===================== DETAIL ===================== */

function EventDetail({
  user,
  event,
  isCEO,
  onUpdate,
}: {
  user: User;
  event: EventItem;
  isCEO: boolean;
  onUpdate: (e: EventItem) => void;
}) {
  const stage = event.stage ?? stageFromStatus(event.status);
  const progress = typeof event.progress === "number" ? event.progress : progressFromStatus(event.status);

  const eventDate = event.date ? new Date(event.date) : null;
  const today = new Date();
  const daysToEvent =
    eventDate != null ? Math.round((eventDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)) : null;

  const revenue = parseMoney(event.budget || "0");
  const advance = parseMoney(event.advanceReceived || "0");

  const vendorTotal = (event.vendors ?? []).reduce((sum, v) => sum + parseMoney(v.amount), 0);
  const profit = revenue - vendorTotal;
  const margin = revenue > 0 ? (profit / revenue) * 100 : 0;

  // Drafts
  const [vendorDraft, setVendorDraft] = useState({
    name: "",
    category: "",
    amount: "",
    status: "Planned" as VendorStatus,
  });
  const [issueDraft, setIssueDraft] = useState("");
  const [checklist, setChecklist] = useState<ChecklistItem[]>(event.checklist ?? defaultChecklist());

  useEffect(() => {
    setChecklist(event.checklist ?? defaultChecklist());
  }, [event.id]); // rebind when selecting another event

  function updateEvent(next: Partial<EventItem>, activityAction?: string) {
    const merged: EventItem = {
      ...event,
      ...next,
      vendors: next.vendors ?? event.vendors ?? [],
      issues: next.issues ?? event.issues ?? [],
      checklist: next.checklist ?? event.checklist ?? [],
      activity: next.activity ?? event.activity ?? [],
    };

    const withTrack: EventItem = {
      ...merged,
      stage: merged.stage ?? stageFromStatus(merged.status),
      progress: typeof merged.progress === "number" ? merged.progress : progressFromStatus(merged.status),
    };

    const final = activityAction ? pushActivity(withTrack, user.name, activityAction) : withTrack;
    onUpdate(final);
  }

  /* ===== QUICK ACTIONS (LIVE TRACKING) ===== */

  function markPlanning() {
    // If going to Planning/Confirmed, log + (optional) auto finance income for advance
    updateEvent({ status: "Planning", stage: "In planning", progress: 60 }, "Moved to Planning");
  }

  function markExecutionStart() {
    updateEvent(
      { status: "In Execution", stage: "In execution", progress: 85, startedAt: event.startedAt ?? safeNowISO() },
      "Execution started"
    );
  }

  function markCompleted() {
    updateEvent(
      { status: "Completed", stage: "Completed", progress: 100, completedAt: safeNowISO() },
      "Event marked Completed"
    );

    // Finance sync: record remaining revenue as Income (if any)
    // Only if revenue > 0, and (revenue - advance) > 0
    const remaining = Math.max(0, revenue - advance);
    if (remaining > 0) {
      addFinanceTx({
        id: Date.now(),
        date: todayYMD(),
        type: "Income",
        category: "Event Revenue",
        amount: remaining,
        description: `Final payment received: ${event.eventName}`,
        eventId: event.id,
        eventName: event.eventName,
        createdBy: user.name,
      });
    }
  }

  function recordAdvanceToFinance() {
    const amt = parseMoney(event.advanceReceived || "0");
    if (amt <= 0) {
      alert("Enter advance received amount in the event form (Advance received).");
      return;
    }
    addFinanceTx({
      id: Date.now(),
      date: todayYMD(),
      type: "Income",
      category: "Advance / Booking",
      amount: amt,
      description: `Advance received: ${event.eventName} (${event.clientName})`,
      eventId: event.id,
      eventName: event.eventName,
      createdBy: user.name,
    });
    updateEvent({}, "Advance synced to Finance");
  }

  /* ===== CHECKLIST ===== */

  function toggleChecklist(itemId: number) {
    const next = checklist.map((c) => (c.id === itemId ? { ...c, done: !c.done } : c));
    setChecklist(next);
    updateEvent({ checklist: next }, "Checklist updated");
    // also auto adjust progress slightly (optional)
    const doneCount = next.filter((x) => x.done).length;
    const pct = Math.round((doneCount / next.length) * 100);
    // keep status-based progress as base, but reflect checklist completion
    const mixed = clamp(Math.round((progressFromStatus(event.status) * 0.6) + (pct * 0.4)), 0, 100);
    updateEvent({ progress: mixed }, undefined);
  }

  /* ===== VENDORS (FINANCE LINK) ===== */

  function updateVendors(next: VendorAssignment[]) {
    updateEvent({ vendors: next }, "Vendors updated");
  }

  function handleAddVendor(e: React.FormEvent) {
    e.preventDefault();
    if (!vendorDraft.name || !vendorDraft.category || !vendorDraft.amount) {
      alert("Vendor name, category and amount are required.");
      return;
    }
    const next: VendorAssignment[] = [
      ...(event.vendors ?? []),
      { id: Date.now(), ...vendorDraft },
    ];
    updateVendors(next);
    setVendorDraft({ name: "", category: "", amount: "", status: "Planned" });
  }

  function handleDeleteVendor(id: number) {
    const next = (event.vendors ?? []).filter((v) => v.id !== id);
    updateVendors(next);
  }

  function handleVendorStatusChange(id: number, status: VendorStatus) {
    const next = (event.vendors ?? []).map((v) => (v.id === id ? { ...v, status } : v));
    updateVendors(next);

    // Finance sync: when marked Paid -> add Expense tx (one-click)
    const v = (event.vendors ?? []).find((x) => x.id === id);
    if (v && status === "Paid") {
      const amt = parseMoney(v.amount);
      if (amt > 0) {
        addFinanceTx({
          id: Date.now(),
          date: todayYMD(),
          type: "Expense",
          category: `Vendor: ${v.category}`,
          amount: amt,
          description: `Vendor paid: ${v.name} (${event.eventName})`,
          eventId: event.id,
          eventName: event.eventName,
          createdBy: user.name,
        });
        updateEvent({}, `Vendor payment synced to Finance (${v.name})`);
      }
    }
  }

  /* ===== ISSUES ===== */

  function updateIssues(next: IssueItem[]) {
    updateEvent({ issues: next }, "Issues updated");
  }

  function handleAddIssue(e: React.FormEvent) {
    e.preventDefault();
    if (!issueDraft.trim()) return;
    const next: IssueItem[] = [
      ...(event.issues ?? []),
      { id: Date.now(), text: issueDraft.trim(), status: "Open", createdAt: safeNowISO() },
    ];
    updateIssues(next);
    setIssueDraft("");
  }

  function handleToggleIssue(id: number) {
    const next = (event.issues ?? []).map((iss) =>
      iss.id === id ? { ...iss, status: iss.status === "Open" ? "Resolved" : "Open" } : iss
    );
    updateIssues(next);
  }

  /* ===== RENDER ===== */

  return (
    <div className="eventura-event-detail">
      <div className="eventura-header-row">
        <div style={{ minWidth: 0 }}>
          <h2 className="eventura-panel-title" style={{ marginBottom: 4 }}>
            {event.eventName}
          </h2>
          <p className="eventura-subtitle" style={{ marginTop: 0 }}>
            {event.clientName} · {event.city} · {event.eventType} · Owner: {event.owner}
          </p>
        </div>

        <div style={{ textAlign: "right" }}>
          <div className={"eventura-tag " + statusColor(event.status)}>
            {stage} · {progress}%
          </div>
          {daysToEvent != null && (
            <div style={{ marginTop: 6, color: "#9ca3af", fontSize: "0.78rem" }}>
              {daysToEvent >= 0 ? `Event in ${daysToEvent} day(s)` : `Event was ${Math.abs(daysToEvent)} day(s) ago`}
            </div>
          )}
        </div>
      </div>

      {/* Progress Bar */}
      <div style={{ marginTop: 10 }}>
        <div style={{ height: 10, background: "rgba(148,163,184,0.25)", borderRadius: 999 }}>
          <div
            style={{
              width: `${clamp(progress, 0, 100)}%`,
              height: "100%",
              borderRadius: 999,
              background: "rgba(139,92,246,0.95)",
            }}
          />
        </div>
      </div>

      {/* Quick actions */}
      <div className="eventura-actions" style={{ marginTop: 12, gap: 8, flexWrap: "wrap" }}>
        <button type="button" className="eventura-button-secondary" onClick={markPlanning}>
          Move to Planning
        </button>
        <button type="button" className="eventura-button-secondary" onClick={markExecutionStart}>
          Start Execution
        </button>
        <button type="button" className="eventura-button" onClick={markCompleted}>
          Mark Completed
        </button>
        <button type="button" className="eventura-tag eventura-tag-blue" onClick={recordAdvanceToFinance}>
          Sync Advance to Finance
        </button>

        {isCEO && (
          <Link className="eventura-tag eventura-tag-green" href="/finance">
            Open Finance (Review)
          </Link>
        )}
      </div>

      {/* KPI Cards */}
      <div className="eventura-kpi-row" style={{ marginTop: 12 }}>
        <div className="eventura-card">
          <div className="eventura-card-label">Revenue (₹)</div>
          <div className="eventura-card-value">₹{formatINR(revenue)}</div>
          <div className="eventura-card-note">Budget / expected collection</div>
        </div>
        <div className="eventura-card">
          <div className="eventura-card-label">Advance (₹)</div>
          <div className="eventura-card-value">₹{formatINR(advance)}</div>
          <div className="eventura-card-note">Sync button adds Income tx</div>
        </div>
        <div className="eventura-card">
          <div className="eventura-card-label">Vendor cost (₹)</div>
          <div className="eventura-card-value">₹{formatINR(vendorTotal)}</div>
          <div className="eventura-card-note">Paid → Expense tx auto</div>
        </div>
        {isCEO && (
          <div className="eventura-card">
            <div className="eventura-card-label">Margin</div>
            <div className="eventura-card-value">{revenue > 0 ? margin.toFixed(1) : "–"}%</div>
            <div className="eventura-card-note">Profit: ₹{formatINR(Math.max(0, profit))}</div>
          </div>
        )}
      </div>

      {/* Checklist + Vendors + Issues + Activity */}
      <div className="eventura-columns" style={{ marginTop: 16 }}>
        {/* Checklist */}
        <div className="eventura-panel" style={{ background: "transparent" }}>
          <h3 className="eventura-panel-title">Live checklist</h3>
          <p className="eventura-small-text">
            Tick tasks as you finish them. Progress updates automatically.
          </p>

          <div style={{ marginTop: 10 }}>
            <div className="eventura-small-text" style={{ marginBottom: 6, color: "#9ca3af" }}>
              Planning
            </div>
            <ul className="eventura-list">
              {checklist
                .filter((c) => c.phase === "Planning")
                .map((c) => (
                  <li key={c.id} className="eventura-list-item">
                    <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                      <input
                        type="checkbox"
                        checked={c.done}
                        onChange={() => toggleChecklist(c.id)}
                      />
                      <div className="eventura-list-title" style={{ textDecoration: c.done ? "line-through" : "none" }}>
                        {c.text}
                      </div>
                    </div>
                    <span className={"eventura-tag " + (c.done ? "eventura-tag-green" : "eventura-tag-amber")}>
                      {c.done ? "Done" : "Pending"}
                    </span>
                  </li>
                ))}
            </ul>

            <div className="eventura-small-text" style={{ margin: "10px 0 6px", color: "#9ca3af" }}>
              Execution
            </div>
            <ul className="eventura-list">
              {checklist
                .filter((c) => c.phase === "Execution")
                .map((c) => (
                  <li key={c.id} className="eventura-list-item">
                    <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                      <input
                        type="checkbox"
                        checked={c.done}
                        onChange={() => toggleChecklist(c.id)}
                      />
                      <div className="eventura-list-title" style={{ textDecoration: c.done ? "line-through" : "none" }}>
                        {c.text}
                      </div>
                    </div>
                    <span className={"eventura-tag " + (c.done ? "eventura-tag-green" : "eventura-tag-amber")}>
                      {c.done ? "Done" : "Pending"}
                    </span>
                  </li>
                ))}
            </ul>
          </div>
        </div>

        {/* Vendors */}
        <div className="eventura-panel" style={{ background: "transparent" }}>
          <h3 className="eventura-panel-title">Vendors & payouts</h3>
          <p className="eventura-small-text">
            Mark vendor <b>Paid</b> to auto-create an Expense transaction in Finance.
          </p>

          <form className="eventura-form" onSubmit={handleAddVendor} style={{ marginTop: 10 }}>
            <div className="eventura-form-grid">
              <div className="eventura-field">
                <input
                  className="eventura-input"
                  placeholder="Vendor name"
                  value={vendorDraft.name}
                  onChange={(e) => setVendorDraft((p) => ({ ...p, name: e.target.value }))}
                />
              </div>
              <div className="eventura-field">
                <input
                  className="eventura-input"
                  placeholder="Category (Decor / Catering / Photo)"
                  value={vendorDraft.category}
                  onChange={(e) => setVendorDraft((p) => ({ ...p, category: e.target.value }))}
                />
              </div>
            </div>

            <div className="eventura-form-grid" style={{ marginTop: 8 }}>
              <div className="eventura-field">
                <input
                  className="eventura-input"
                  placeholder="Amount (₹)"
                  value={vendorDraft.amount}
                  onChange={(e) => setVendorDraft((p) => ({ ...p, amount: e.target.value }))}
                />
              </div>
              <div className="eventura-field">
                <select
                  className="eventura-input"
                  value={vendorDraft.status}
                  onChange={(e) => setVendorDraft((p) => ({ ...p, status: e.target.value as VendorStatus }))}
                >
                  <option>Planned</option>
                  <option>Advance Paid</option>
                  <option>Paid</option>
                  <option>Cancelled</option>
                </select>
              </div>
            </div>

            <div className="eventura-actions" style={{ marginTop: 8 }}>
              <button type="submit" className="eventura-button-secondary">
                + Add vendor
              </button>
            </div>
          </form>

          <div className="eventura-table-wrapper" style={{ marginTop: 12 }}>
            {(event.vendors ?? []).length === 0 ? (
              <p style={{ fontSize: "0.8rem", color: "#9ca3af" }}>No vendors yet.</p>
            ) : (
              <table className="eventura-table">
                <thead>
                  <tr>
                    <th>Vendor</th>
                    <th>Category</th>
                    <th>Amount</th>
                    <th>Status</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {(event.vendors ?? []).map((v) => (
                    <tr key={v.id}>
                      <td>{v.name}</td>
                      <td>{v.category}</td>
                      <td>₹{formatINR(parseMoney(v.amount))}</td>
                      <td>
                        <select
                          className="eventura-input"
                          value={v.status}
                          onChange={(e) => handleVendorStatusChange(v.id, e.target.value as VendorStatus)}
                        >
                          <option>Planned</option>
                          <option>Advance Paid</option>
                          <option>Paid</option>
                          <option>Cancelled</option>
                        </select>
                      </td>
                      <td>
                        <button
                          type="button"
                          className="eventura-tag eventura-tag-amber"
                          onClick={() => handleDeleteVendor(v.id)}
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* Issues + Activity */}
      <div className="eventura-columns" style={{ marginTop: 16 }}>
        <div className="eventura-panel" style={{ background: "transparent" }}>
          <h3 className="eventura-panel-title">Issues & on-ground alerts</h3>
          <form
            onSubmit={handleAddIssue}
            style={{ marginTop: 10, display: "flex", gap: "0.4rem" }}
          >
            <input
              className="eventura-input"
              placeholder='e.g. "Flower shortage on stage", "DJ late by 30 min"'
              value={issueDraft}
              onChange={(e) => setIssueDraft(e.target.value)}
            />
            <button type="submit" className="eventura-button-secondary">
              + Add
            </button>
          </form>

          <ul className="eventura-list" style={{ marginTop: 12 }}>
            {(event.issues ?? []).length === 0 ? (
              <p style={{ fontSize: "0.8rem", color: "#9ca3af" }}>No issues reported.</p>
            ) : (
              (event.issues ?? []).map((iss) => (
                <li key={iss.id} className="eventura-list-item">
                  <div>
                    <div className="eventura-list-title">{iss.text}</div>
                    <div className="eventura-list-sub">
                      {new Date(iss.createdAt).toLocaleString("en-IN")} · {iss.status}
                    </div>
                  </div>
                  <button
                    type="button"
                    className={
                      "eventura-tag " + (iss.status === "Open" ? "eventura-tag-amber" : "eventura-tag-green")
                    }
                    onClick={() => handleToggleIssue(iss.id)}
                  >
                    {iss.status === "Open" ? "Mark resolved" : "Re-open"}
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>

        <div className="eventura-panel" style={{ background: "transparent" }}>
          <h3 className="eventura-panel-title">Activity log</h3>
          <p className="eventura-small-text">Every major action is recorded here for live tracking.</p>

          <ul className="eventura-list" style={{ marginTop: 12 }}>
            {(event.activity ?? []).length === 0 ? (
              <p style={{ fontSize: "0.8rem", color: "#9ca3af" }}>No activity yet.</p>
            ) : (
              (event.activity ?? []).slice(0, 30).map((a) => (
                <li key={a.id} className="eventura-list-item">
                  <div>
                    <div className="eventura-list-title">{a.action}</div>
                    <div className="eventura-list-sub">
                      {new Date(a.at).toLocaleString("en-IN")} · by {a.by}
                    </div>
                  </div>
                  <span className="eventura-tag eventura-tag-blue">LOG</span>
                </li>
              ))
            )}
          </ul>
        </div>
      </div>

      <div style={{ marginTop: 14, color: "#9ca3af", fontSize: "0.75rem" }}>
        Started: {event.startedAt ? new Date(event.startedAt).toLocaleString("en-IN") : "—"} · Completed:{" "}
        {event.completedAt ? new Date(event.completedAt).toLocaleString("en-IN") : "—"}
      </div>
    </div>
  );
}

/* ===================== SHARED SIDEBAR/TOPBAR ===================== */

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
        <input className="eventura-search" placeholder="Search events, clients, vendors..." />
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

function SidebarLink(props: { href: string; label: string; icon: string; active?: boolean }) {
  const className = "eventura-sidebar-link" + (props.active ? " eventura-sidebar-link-active" : "");
  return (
    <Link href={props.href} className={className}>
      <span className="eventura-sidebar-icon">{props.icon}</span>
      <span>{props.label}</span>
    </Link>
  );
}
