"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";

/* ===================== STORAGE KEYS ===================== */
const USER_KEY = "eventura-user";
const EVENTS_KEY = "eventura-events";
const FIN_KEY = "eventura-finance-transactions";

/* ===================== AUTH TYPES ===================== */
type Role = "CEO" | "Staff";
type User = { name: string; role: Role; city: string };

/* ===================== EVENTS TYPES ===================== */
type EventPhase = "Not Started" | "Planning" | "In Progress" | "Completed" | "Cancelled";

type EventType = "Wedding" | "Corporate" | "Party" | "Festival" | "Other";

type VendorStatus = "Planned" | "Advance Paid" | "Paid" | "Cancelled";
type VendorAssignment = {
  id: number;
  name: string;
  category: string;
  amount: string; // string input
  status: VendorStatus;
};

type IssueStatus = "Open" | "Resolved";
type IssueItem = {
  id: number;
  text: string;
  status: IssueStatus;
  createdAt: string;
};

type EventItem = {
  id: number;
  clientName: string;
  eventName: string;
  eventType: EventType;
  city: string;
  venue: string;
  date: string; // YYYY-MM-DD
  guests: string;
  budget: string; // revenue quote string
  leadSource: string;
  owner: string;
  notes: string;
  cancelled?: boolean;
  vendors: VendorAssignment[];
  issues: IssueItem[];
};

/* ===================== FINANCE TYPES (localStorage bridge) ===================== */
type TxType = "Income" | "Expense";
type FinanceTx = {
  id: number;
  date: string; // YYYY-MM-DD
  type: TxType;
  category: string; // "Event Revenue", "Vendor Payout", etc.
  description: string;
  amount: number; // number
  refEventId?: number;
  refEventName?: string;
  createdBy: string;
};

/* ===================== HELPERS ===================== */
function safeJSONParse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function parseMoney(value: string): number {
  const cleaned = (value || "").replace(/[₹, ]/g, "");
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : 0;
}

function formatINR(n: number): string {
  return n.toLocaleString("en-IN", { maximumFractionDigits: 0 });
}

/** LIVE phase derived from date (and cancelled flag) */
function deriveEventPhase(event: EventItem): EventPhase {
  if (event.cancelled) return "Cancelled";
  if (!event.date) return "Not Started";

  const today = new Date();
  const d = new Date(event.date);
  // normalize times
  today.setHours(0, 0, 0, 0);
  d.setHours(0, 0, 0, 0);

  const diffDays = Math.round((d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays > 30) return "Not Started";
  if (diffDays > 1) return "Planning";
  if (diffDays >= -1 && diffDays <= 1) return "In Progress";
  return "Completed";
}

function phaseProgress(phase: EventPhase): number {
  if (phase === "Not Started") return 20;
  if (phase === "Planning") return 45;
  if (phase === "In Progress") return 75;
  if (phase === "Completed") return 100;
  return 100; // Cancelled
}

function phaseTagClass(phase: EventPhase): string {
  if (phase === "Completed") return "eventura-tag-green";
  if (phase === "In Progress") return "eventura-tag-blue";
  if (phase === "Planning") return "eventura-tag-amber";
  if (phase === "Cancelled") return "eventura-tag-amber";
  return "eventura-tag-blue";
}

/* ===== timeline ===== */
type TimelineItem = { label: string; displayDate: string; isPast: boolean };
function buildTimeline(eventDate: string): TimelineItem[] {
  if (!eventDate) {
    return [{ label: "Set event date", displayDate: "No date selected", isPast: false }];
  }
  const base = new Date(eventDate);
  base.setHours(0, 0, 0, 0);

  const steps = [
    { label: "Venue booking", offsetDays: -60 },
    { label: "Vendor confirmations", offsetDays: -45 },
    { label: "Decor mockups ready", offsetDays: -30 },
    { label: "Logistics planning", offsetDays: -7 },
    { label: "Material loading", offsetDays: -3 },
    { label: "Event day – execution", offsetDays: 0 },
    { label: "Post-event payment & review", offsetDays: 2 },
  ];

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return steps.map((s) => {
    const d = new Date(base);
    d.setDate(d.getDate() + s.offsetDays);
    const displayDate = d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
    return { label: s.label, displayDate, isPast: d.getTime() < today.getTime() };
  });
}

/* ===================== SEED ===================== */
function seedEvents(ownerName: string): EventItem[] {
  return [
    {
      id: Date.now(),
      clientName: "Patel Family",
      eventName: "Patel Wedding Sangeet",
      eventType: "Wedding",
      city: "Surat",
      venue: "Laxmi Farm",
      date: todayISO(),
      guests: "450",
      budget: "1850000",
      leadSource: "Instagram",
      owner: ownerName || "Hardik",
      notes: "Royal floral + gold theme; live dhol & DJ.",
      cancelled: false,
      vendors: [
        { id: 1, name: "Royal Decor Studio", category: "Decor", amount: "650000", status: "Planned" },
        { id: 2, name: "Shree Caterers", category: "Catering", amount: "750000", status: "Planned" },
      ],
      issues: [],
    },
  ];
}

/* ===================== PAGE ===================== */
export default function EventsPage() {
  const [user, setUser] = useState<User | null>(null);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);

  const [search, setSearch] = useState("");
  const [phaseFilter, setPhaseFilter] = useState<EventPhase | "All">("All");

  const [form, setForm] = useState<Omit<EventItem, "id">>({
    clientName: "",
    eventName: "",
    eventType: "Wedding",
    city: "",
    venue: "",
    date: "",
    guests: "",
    budget: "",
    leadSource: "",
    owner: "",
    notes: "",
    cancelled: false,
    vendors: [],
    issues: [],
  });

  /* ===== AUTH ===== */
  useEffect(() => {
    if (typeof window === "undefined") return;
    const raw = window.localStorage.getItem(USER_KEY);
    if (!raw) {
      window.location.href = "/login";
      return;
    }
    const u = safeJSONParse<User | null>(raw, null);
    if (!u) {
      window.localStorage.removeItem(USER_KEY);
      window.location.href = "/login";
      return;
    }
    setUser(u);
    setForm((p) => ({ ...p, owner: p.owner || u.name }));
  }, []);

  /* ===== LOAD EVENTS ===== */
  useEffect(() => {
    if (typeof window === "undefined") return;
    const raw = window.localStorage.getItem(EVENTS_KEY);
    const parsed = safeJSONParse<any[]>(raw, []);
    if (parsed.length > 0) {
      const normalized: EventItem[] = parsed.map((e) => ({
        id: Number(e.id),
        clientName: String(e.clientName || ""),
        eventName: String(e.eventName || ""),
        eventType: (e.eventType as EventType) || "Other",
        city: String(e.city || ""),
        venue: String(e.venue || ""),
        date: String(e.date || ""),
        guests: String(e.guests || ""),
        budget: String(e.budget || ""),
        leadSource: String(e.leadSource || ""),
        owner: String(e.owner || ""),
        notes: String(e.notes || ""),
        cancelled: Boolean(e.cancelled || false),
        vendors: Array.isArray(e.vendors) ? e.vendors : [],
        issues: Array.isArray(e.issues) ? e.issues : [],
      }));
      setEvents(normalized);
      setSelectedId(normalized[0]?.id ?? null);
      return;
    }

    // seed only once
    const ownerName = safeJSONParse<User | null>(window.localStorage.getItem(USER_KEY), null)?.name || "Hardik";
    const seed = seedEvents(ownerName);
    setEvents(seed);
    setSelectedId(seed[0]?.id ?? null);
    window.localStorage.setItem(EVENTS_KEY, JSON.stringify(seed));
  }, []);

  /* ===== SAVE EVENTS ===== */
  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(EVENTS_KEY, JSON.stringify(events));
  }, [events]);

  function handleFormChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) {
    const { name, value } = e.target;
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
      leadSource: "",
      owner: user?.name ?? "",
      notes: "",
      cancelled: false,
      vendors: [],
      issues: [],
    });
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.clientName || !form.eventName || !form.date) {
      alert("Client name, event name and date are required.");
      return;
    }

    if (editingId == null) {
      const newEvent: EventItem = {
        id: Date.now(),
        ...form,
        vendors: form.vendors ?? [],
        issues: form.issues ?? [],
      };
      setEvents((prev) => [newEvent, ...prev]);
      setSelectedId(newEvent.id);
    } else {
      setEvents((prev) =>
        prev.map((ev) =>
          ev.id === editingId
            ? { ...ev, ...form, vendors: form.vendors ?? [], issues: form.issues ?? [] }
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
    setSelectedId(ev.id);
    setForm({
      clientName: ev.clientName,
      eventName: ev.eventName,
      eventType: ev.eventType,
      city: ev.city,
      venue: ev.venue,
      date: ev.date,
      guests: ev.guests,
      budget: ev.budget,
      leadSource: ev.leadSource,
      owner: ev.owner,
      notes: ev.notes,
      cancelled: Boolean(ev.cancelled || false),
      vendors: ev.vendors ?? [],
      issues: ev.issues ?? [],
    });
  }

  function handleDelete(eventId: number) {
    if (!confirm("Delete this event? This cannot be undone.")) return;
    setEvents((prev) => {
      const next = prev.filter((e) => e.id !== eventId);
      if (selectedId === eventId) setSelectedId(next[0]?.id ?? null);
      if (editingId === eventId) resetForm();
      return next;
    });
  }

  function handleUpdateEvent(updated: EventItem) {
    setEvents((prev) => prev.map((e) => (e.id === updated.id ? updated : e)));
  }

  const filteredEvents = useMemo(() => {
    return events.filter((ev) => {
      const phase = deriveEventPhase(ev);
      const matchPhase = phaseFilter === "All" ? true : phase === phaseFilter;

      const q = search.trim().toLowerCase();
      const matchSearch =
        !q ||
        ev.clientName.toLowerCase().includes(q) ||
        ev.eventName.toLowerCase().includes(q) ||
        ev.city.toLowerCase().includes(q);

      return matchPhase && matchSearch;
    });
  }, [events, search, phaseFilter]);

  const selectedEvent = events.find((ev) => ev.id === selectedId) ?? null;

  if (!user) return null;

  const isCEO = user.role === "CEO";

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
                Live tracking (Not Started → Planning → In Progress → Completed) + Finance connection.
              </p>
            </div>
            <div className="eventura-actions">
              <button className="eventura-button" type="button" onClick={resetForm}>
                + New Event
              </button>
            </div>
          </div>

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
                  </div>

                  <div className="eventura-form-grid">
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
                  </div>

                  <div className="eventura-form-grid">
                    <div className="eventura-field">
                      <label className="eventura-label" htmlFor="guests">Guests (approx)</label>
                      <input
                        id="guests"
                        name="guests"
                        className="eventura-input"
                        value={form.guests}
                        onChange={handleFormChange}
                        placeholder="e.g. 450"
                      />
                    </div>
                    <div className="eventura-field">
                      <label className="eventura-label" htmlFor="budget">Quoted revenue (₹)</label>
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

                  <div className="eventura-form-grid">
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
                  </div>

                  <div className="eventura-field" style={{ marginTop: "0.7rem" }}>
                    <label className="eventura-label" htmlFor="notes">Notes</label>
                    <textarea
                      id="notes"
                      name="notes"
                      className="eventura-textarea"
                      value={form.notes}
                      onChange={handleFormChange}
                      placeholder="Client preferences, colour palette, must-have elements..."
                    />
                  </div>

                  <div className="eventura-actions" style={{ marginTop: "0.6rem" }}>
                    <button type="submit" className="eventura-button">
                      {editingId ? "Update event" : "Save event"}
                    </button>
                    {editingId && (
                      <button type="button" className="eventura-button-secondary" onClick={resetForm}>
                        Cancel edit
                      </button>
                    )}
                  </div>
                </form>
              </div>

              <div className="eventura-panel" style={{ marginTop: "1rem" }}>
                <h2 className="eventura-panel-title">Event list</h2>

                <div className="eventura-form-grid" style={{ marginBottom: "0.6rem" }}>
                  <div className="eventura-field">
                    <input
                      className="eventura-input"
                      placeholder="Search by client, event or city..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                    />
                  </div>

                  <div className="eventura-field">
                    <select
                      className="eventura-input"
                      value={phaseFilter}
                      onChange={(e) => setPhaseFilter(e.target.value as EventPhase | "All")}
                    >
                      <option value="All">All phases</option>
                      <option value="Not Started">Not Started</option>
                      <option value="Planning">Planning</option>
                      <option value="In Progress">In Progress</option>
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
                      const phase = deriveEventPhase(ev);
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
                          <div>
                            <div className="eventura-list-title">{ev.eventName}</div>
                            <div className="eventura-list-sub">
                              {ev.clientName} · {ev.city} · {ev.date || "No date"} · {ev.eventType}
                            </div>
                            <div style={{ marginTop: "0.25rem" }}>
                              <span className={"eventura-tag " + phaseTagClass(phase)}>
                                {phase}
                              </span>
                            </div>
                          </div>

                          <div style={{ display: "flex", gap: "0.35rem", alignItems: "flex-start" }}>
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
                  Select an event from the list to see live tracking, vendors, issues and finance connection.
                </p>
              ) : (
                <EventDetail
                  event={selectedEvent}
                  user={user}
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
  event,
  user,
  isCEO,
  onUpdate,
}: {
  event: EventItem;
  user: User;
  isCEO: boolean;
  onUpdate: (e: EventItem) => void;
}) {
  const phase = deriveEventPhase(event);
  const progress = phaseProgress(phase);
  const timeline = buildTimeline(event.date);

  const guests = parseInt(event.guests || "0", 10) || 0;

  const basePerHead =
    event.eventType === "Wedding" ? 3500 : event.eventType === "Corporate" ? 2800 : 2200;

  const suggestedBudget = guests > 0 ? guests * basePerHead : 0;
  const quotedRevenue = parseMoney(event.budget || "0");

  const vendorTotal = (event.vendors ?? []).reduce((sum, v) => sum + parseMoney(v.amount || "0"), 0);
  const revenue = quotedRevenue || suggestedBudget;
  const profit = revenue - vendorTotal;
  const margin = revenue > 0 ? (profit / revenue) * 100 : 0;

  const [vendorDraft, setVendorDraft] = useState({
    name: "",
    category: "",
    amount: "",
    status: "Planned" as VendorStatus,
  });
  const [issueDraft, setIssueDraft] = useState("");

  function updateVendors(next: VendorAssignment[]) {
    onUpdate({ ...event, vendors: next });
  }
  function updateIssues(next: IssueItem[]) {
    onUpdate({ ...event, issues: next });
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
    updateVendors((event.vendors ?? []).filter((v) => v.id !== id));
  }

  function handleVendorStatusChange(id: number, status: VendorStatus) {
    updateVendors((event.vendors ?? []).map((v) => (v.id === id ? { ...v, status } : v)));
  }

  function handleAddIssue(e: React.FormEvent) {
    e.preventDefault();
    const text = issueDraft.trim();
    if (!text) return;

    const next: IssueItem[] = [
      ...(event.issues ?? []),
      { id: Date.now(), text, status: "Open", createdAt: new Date().toISOString() },
    ];
    updateIssues(next);
    setIssueDraft("");
  }

  function handleToggleIssue(id: number) {
    const next: IssueItem[] = (event.issues ?? []).map((iss) =>
      iss.id === id ? { ...iss, status: iss.status === "Open" ? "Resolved" : "Open" } : iss
    );
    updateIssues(next);
  }

  function toggleCancelled() {
    onUpdate({ ...event, cancelled: !event.cancelled });
  }

  /** Writes finance transaction into localStorage (Finance tab can read it) */
  function pushFinanceTx(tx: Omit<FinanceTx, "id">) {
    if (typeof window === "undefined") return;
    const existing = safeJSONParse<FinanceTx[]>(window.localStorage.getItem(FIN_KEY), []);
    const full: FinanceTx = { id: Date.now(), ...tx };
    window.localStorage.setItem(FIN_KEY, JSON.stringify([full, ...existing]));
    alert("Sent to Finance ✅ (saved in Finance transactions)");
  }

  function sendRevenueToFinance() {
    pushFinanceTx({
      date: event.date || todayISO(),
      type: "Income",
      category: "Event Revenue",
      description: `${event.eventName} – ${event.clientName}`,
      amount: revenue,
      refEventId: event.id,
      refEventName: event.eventName,
      createdBy: user.name,
    });
  }

  function sendVendorCostToFinance() {
    pushFinanceTx({
      date: event.date || todayISO(),
      type: "Expense",
      category: "Vendor Payouts",
      description: `${event.eventName} – Vendors total`,
      amount: vendorTotal,
      refEventId: event.id,
      refEventName: event.eventName,
      createdBy: user.name,
    });
  }

  return (
    <div className="eventura-event-detail">
      <div className="eventura-header-row">
        <div>
          <h2 className="eventura-panel-title">{event.eventName}</h2>
          <p className="eventura-subtitle">
            {event.clientName} · {event.city} · {event.eventType}
          </p>
        </div>

        <div style={{ textAlign: "right" }}>
          <span className={"eventura-tag " + phaseTagClass(phase)}>{phase}</span>
          <div style={{ marginTop: "0.35rem" }}>
            <button
              type="button"
              className="eventura-tag eventura-tag-amber"
              onClick={toggleCancelled}
              title="Mark Cancelled / Un-cancel"
            >
              {event.cancelled ? "Un-cancel" : "Cancel"}
            </button>
          </div>
        </div>
      </div>

      {/* LIVE TRACKING CARD */}
      <div className="eventura-card" style={{ marginTop: "0.7rem" }}>
        <div className="eventura-card-label">Live track record</div>
        <div className="eventura-card-value">{phase}</div>

        <div style={{ marginTop: "0.5rem", width: "100%" }}>
          <div
            style={{
              height: "10px",
              borderRadius: "999px",
              background: "rgba(255,255,255,0.08)",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                height: "100%",
                width: `${progress}%`,
                background: "rgba(168,85,247,0.9)",
              }}
            />
          </div>
          <div className="eventura-card-note" style={{ marginTop: "0.4rem" }}>
            Auto-calculated from event date (no manual status mistakes).
          </div>
        </div>
      </div>

      {/* SMART TIMELINE */}
      <div style={{ marginTop: "0.9rem" }}>
        <h3 className="eventura-panel-title">Smart timeline</h3>
        <p className="eventura-small-text">
          Auto-generated steps for planning & execution. Updates if you change event date.
        </p>

        <ul className="eventura-list" style={{ marginTop: "0.4rem" }}>
          {timeline.map((t) => (
            <li key={t.label} className="eventura-list-item">
              <div>
                <div className="eventura-list-title">{t.label}</div>
                <div className="eventura-list-sub">Target: {t.displayDate}</div>
              </div>
              <span className={"eventura-tag " + (t.isPast ? "eventura-tag-amber" : "eventura-tag-green")}>
                {t.isPast ? "Check" : "Upcoming"}
              </span>
            </li>
          ))}
        </ul>
      </div>

      {/* FINANCE CONNECTION */}
      <div style={{ marginTop: "1rem" }}>
        <h3 className="eventura-panel-title">Finance connection</h3>
        <p className="eventura-small-text">
          Revenue from budget + Vendor payouts become event P&L. You can send both into Finance tab automatically.
        </p>

        <div className="eventura-kpi-row" style={{ marginTop: "0.6rem" }}>
          <div className="eventura-card">
            <div className="eventura-card-label">Quoted / Revenue</div>
            <div className="eventura-card-value">₹{formatINR(revenue)}</div>
            <div className="eventura-card-note">
              Suggested: ₹{formatINR(suggestedBudget)} (~₹{formatINR(basePerHead)}/guest)
            </div>
          </div>

          <div className="eventura-card">
            <div className="eventura-card-label">Vendor cost</div>
            <div className="eventura-card-value">₹{formatINR(vendorTotal)}</div>
            <div className="eventura-card-note">From vendors list</div>
          </div>

          {isCEO && (
            <div className="eventura-card">
              <div className="eventura-card-label">Profit / Margin</div>
              <div className="eventura-card-value">₹{formatINR(profit)}</div>
              <div className="eventura-card-note">{margin.toFixed(1)}% margin</div>
            </div>
          )}
        </div>

        <div className="eventura-actions" style={{ marginTop: "0.6rem", display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
          <button type="button" className="eventura-button-secondary" onClick={sendRevenueToFinance}>
            Send Revenue to Finance
          </button>
          <button type="button" className="eventura-button-secondary" onClick={sendVendorCostToFinance}>
            Send Vendor Cost to Finance
          </button>
          <Link href="/finance" className="eventura-button-secondary">
            Open Finance tab
          </Link>
        </div>
      </div>

      {/* VENDORS + ISSUES */}
      <div
        className="eventura-columns"
        style={{
          marginTop: "1rem",
          gridTemplateColumns: "minmax(0,1.1fr) minmax(0,1fr)",
        }}
      >
        {/* Vendors */}
        <div className="eventura-panel" style={{ background: "transparent" }}>
          <h3 className="eventura-panel-title">Vendors & payouts</h3>
          <p className="eventura-small-text">
            Add vendors and amounts. This total is used as event cost.
          </p>

          <form className="eventura-form" onSubmit={handleAddVendor} style={{ marginTop: "0.5rem" }}>
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

            <div className="eventura-form-grid" style={{ marginTop: "0.4rem" }}>
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

            <div className="eventura-actions" style={{ marginTop: "0.4rem" }}>
              <button type="submit" className="eventura-button-secondary">
                + Add vendor
              </button>
            </div>
          </form>

          <div className="eventura-table-wrapper" style={{ marginTop: "0.6rem" }}>
            {(event.vendors ?? []).length === 0 ? (
              <p style={{ fontSize: "0.8rem", color: "#9ca3af" }}>
                No vendors added yet.
              </p>
            ) : (
              <table className="eventura-table">
                <thead>
                  <tr>
                    <th>Vendor</th>
                    <th>Category</th>
                    <th>Amount (₹)</th>
                    <th>Status</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {(event.vendors ?? []).map((v) => (
                    <tr key={v.id}>
                      <td>{v.name}</td>
                      <td>{v.category}</td>
                      <td>{v.amount}</td>
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

        {/* Issues */}
        <div className="eventura-panel" style={{ background: "transparent" }}>
          <h3 className="eventura-panel-title">Issues & on-ground alerts</h3>
          <p className="eventura-small-text">
            Staff can note problems like delays, shortages, vendor issues.
          </p>

          <form
            onSubmit={handleAddIssue}
            style={{ marginTop: "0.5rem", display: "flex", gap: "0.4rem" }}
          >
            <input
              className="eventura-input"
              placeholder='e.g. "Flower shortage on stage", "DJ late by 30 min"'
              value={issueDraft}
              onChange={(e) => setIssueDraft(e.target.value)}
            />
            <button type="submit" className="eventura-button-secondary">+ Add</button>
          </form>

          <ul className="eventura-list" style={{ marginTop: "0.6rem" }}>
            {(event.issues ?? []).length === 0 ? (
              <p style={{ fontSize: "0.8rem", color: "#9ca3af" }}>
                No issues reported yet.
              </p>
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
                    className={"eventura-tag " + (iss.status === "Open" ? "eventura-tag-amber" : "eventura-tag-green")}
                    onClick={() => handleToggleIssue(iss.id)}
                  >
                    {iss.status === "Open" ? "Mark resolved" : "Re-open"}
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>
      </div>
    </div>
  );
}

/* ===================== SHARED UI ===================== */
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
