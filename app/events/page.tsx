"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";

type Role = "CEO" | "Staff";
type User = { name: string; role: Role; city: string };

const USER_KEY = "eventura-user";
const EVENTS_KEY = "eventura-events";

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
  amount: string;
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
  date: string; // ISO yyyy-mm-dd
  guests: string;
  budget: string;
  status: EventStatus;
  leadSource: string;
  owner: string;
  notes: string;
  vendors?: VendorAssignment[];
  issues?: IssueItem[];
};

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
      if (!form.owner) {
        setForm((prev) => ({ ...prev, owner: u.name }));
      }
    } catch {
      window.localStorage.removeItem(USER_KEY);
      window.location.href = "/login";
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // load events
  useEffect(() => {
    if (typeof window === "undefined") return;
    const raw = window.localStorage.getItem(EVENTS_KEY);
    if (raw) {
      try {
        const parsed: EventItem[] = JSON.parse(raw).map((e: any) => ({
          ...e,
          vendors: e.vendors ?? [],
          issues: e.issues ?? [],
        }));
        setEvents(parsed);
        if (parsed.length > 0) {
          setSelectedId(parsed[0].id);
        }
      } catch {
        // ignore
      }
    } else {
      // seed example data once
      const seed: EventItem[] = [
        {
          id: Date.now(),
          clientName: "Patel Family",
          eventName: "Patel Wedding Sangeet",
          eventType: "Wedding",
          city: "Surat",
          venue: "Laxmi Farm",
          date: new Date().toISOString().slice(0, 10),
          guests: "450",
          budget: "1850000",
          status: "Planning",
          leadSource: "Instagram",
          owner: "Hardik",
          notes: "Royal floral + gold theme; live dhol & DJ.",
          vendors: [
            {
              id: 1,
              name: "Royal Decor Studio",
              category: "Decor",
              amount: "650000",
              status: "Planned",
            },
            {
              id: 2,
              name: "Shree Caterers",
              category: "Catering",
              amount: "750000",
              status: "Planned",
            },
          ],
          issues: [],
        },
      ];
      setEvents(seed);
      setSelectedId(seed[0].id);
      window.localStorage.setItem(EVENTS_KEY, JSON.stringify(seed));
    }
  }, []);

  // persist events
  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(EVENTS_KEY, JSON.stringify(events));
  }, [events]);

  function handleFormChange(
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
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
      status: "New Lead",
      leadSource: "",
      owner: user?.name ?? "",
      notes: "",
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
      };
      setEvents((prev) => [newEvent, ...prev]);
      setSelectedId(newEvent.id);
    } else {
      setEvents((prev) =>
        prev.map((ev) =>
          ev.id === editingId
            ? {
                ...ev,
                ...form,
                vendors: form.vendors ?? [],
                issues: form.issues ?? [],
              }
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
    });
    setSelectedId(ev.id);
  }

  function handleDelete(eventId: number) {
    if (!confirm("Delete this event? This cannot be undone.")) return;
    setEvents((prev) => {
      const next = prev.filter((e) => e.id !== eventId);
      if (selectedId === eventId) {
        setSelectedId(next.length ? next[0].id : null);
      }
      if (editingId === eventId) {
        resetForm();
      }
      return next;
    });
  }

  function handleUpdateEvent(updated: EventItem) {
    setEvents((prev) => prev.map((e) => (e.id === updated.id ? updated : e)));
  }

  const filteredEvents = events.filter((ev) => {
    const matchSearch =
      !search ||
      ev.clientName.toLowerCase().includes(search.toLowerCase()) ||
      ev.eventName.toLowerCase().includes(search.toLowerCase()) ||
      ev.city.toLowerCase().includes(search.toLowerCase());
    const matchStatus =
      statusFilter === "All" ? true : ev.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const selectedEvent = events.find((ev) => ev.id === selectedId) ?? null;

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
          {/* Header row */}
          <div className="eventura-header-row">
            <div>
              <h1 className="eventura-page-title">Events</h1>
              <p className="eventura-subtitle">
                Plan, track and analyse every Eventura project end-to-end.
              </p>
            </div>
            <div className="eventura-actions">
              <button
                className="eventura-button"
                type="button"
                onClick={resetForm}
              >
                + New Event
              </button>
            </div>
          </div>

          {/* Form + List + Detail */}
          <div className="eventura-columns">
            {/* LEFT SIDE: form + list */}
            <div>
              {/* Form */}
              <div className="eventura-panel">
                <h2 className="eventura-panel-title">
                  {editingId ? "Edit event" : "Create new event"}
                </h2>
                <form className="eventura-form" onSubmit={handleSubmit}>
                  <div className="eventura-form-grid">
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
                      <label className="eventura-label" htmlFor="eventName">
                        Event name
                      </label>
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
                      <label className="eventura-label" htmlFor="eventType">
                        Event type
                      </label>
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
                      <label className="eventura-label" htmlFor="status">
                        Status
                      </label>
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
                      <label className="eventura-label" htmlFor="city">
                        City
                      </label>
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
                      <label className="eventura-label" htmlFor="venue">
                        Venue
                      </label>
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
                      <label className="eventura-label" htmlFor="guests">
                        Guests (approx)
                      </label>
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
                    <div className="eventura-field">
                      <label className="eventura-label" htmlFor="leadSource">
                        Lead source
                      </label>
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
                      <label className="eventura-label" htmlFor="owner">
                        Owner / manager
                      </label>
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

                  <div
                    className="eventura-field"
                    style={{ marginTop: "0.7rem" }}
                  >
                    <label className="eventura-label" htmlFor="notes">
                      Notes
                    </label>
                    <textarea
                      id="notes"
                      name="notes"
                      className="eventura-textarea"
                      value={form.notes}
                      onChange={handleFormChange}
                      placeholder="Client preferences, colour palette, must-have elements..."
                    />
                  </div>

                  <div className="eventura-actions">
                    <button type="submit" className="eventura-button">
                      {editingId ? "Update event" : "Save event"}
                    </button>
                    {editingId && (
                      <button
                        type="button"
                        className="eventura-button-secondary"
                        onClick={resetForm}
                      >
                        Cancel edit
                      </button>
                    )}
                  </div>
                </form>
              </div>

              {/* List */}
              <div className="eventura-panel" style={{ marginTop: "1rem" }}>
                <h2 className="eventura-panel-title">Event list</h2>
                <div
                  className="eventura-form-grid"
                  style={{ marginBottom: "0.6rem" }}
                >
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
                      value={statusFilter}
                      onChange={(e) =>
                        setStatusFilter(
                          e.target.value as EventStatus | "All"
                        )
                      }
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
                  <p
                    style={{
                      fontSize: "0.8rem",
                      color: "#9ca3af",
                      marginTop: "0.4rem",
                    }}
                  >
                    No events match this filter.
                  </p>
                ) : (
                  <ul className="eventura-list">
                    {filteredEvents.map((ev) => (
                      <li
                        key={ev.id}
                        className="eventura-list-item"
                        style={{
                          cursor: "pointer",
                          backgroundColor:
                            ev.id === selectedId
                              ? "rgba(15,23,42,0.8)"
                              : "transparent",
                          borderRadius: "0.7rem",
                          padding: "0.5rem 0.55rem",
                        }}
                        onClick={() => setSelectedId(ev.id)}
                      >
                        <div>
                          <div className="eventura-list-title">
                            {ev.eventName}
                          </div>
                          <div className="eventura-list-sub">
                            {ev.clientName} · {ev.city} ·{" "}
                            {ev.date || "No date"} · {ev.eventType}
                          </div>
                        </div>
                        <div style={{ display: "flex", gap: "0.3rem" }}>
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
                    ))}
                  </ul>
                )}
              </div>
            </div>

            {/* RIGHT SIDE: detail & smart features */}
            <div className="eventura-panel">
              {!selectedEvent ? (
                <p style={{ fontSize: "0.8rem", color: "#9ca3af" }}>
                  Select an event from the list to see its smart planning,
                  vendors, P&amp;L and issues.
                </p>
              ) : (
                <EventDetail
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

/* ========== Event Detail & Smart Features ========== */

function EventDetail({
  event,
  isCEO,
  onUpdate,
}: {
  event: EventItem;
  isCEO: boolean;
  onUpdate: (e: EventItem) => void;
}) {
  const eventDate = event.date ? new Date(event.date) : null;
  const today = new Date();
  const daysToEvent =
    eventDate != null
      ? Math.round(
          (eventDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
        )
      : null;

  const guests = parseInt(event.guests || "0", 10) || 0;
  const basePerHead =
    event.eventType === "Wedding"
      ? 3500
      : event.eventType === "Corporate"
      ? 2800
      : 2200;
  const suggestedBudget = guests > 0 ? guests * basePerHead : 0;
  const currentBudget = parseMoney(event.budget || "0");
  const budgetGap = currentBudget > 0 ? currentBudget - suggestedBudget : 0;

  const vendorTotal = (event.vendors ?? []).reduce(
    (sum, v) => sum + parseMoney(v.amount),
    0
  );

  const revenue = currentBudget || suggestedBudget;
  const variableCost = vendorTotal || revenue * 0.7;
  const profit = revenue - variableCost;
  const margin = revenue > 0 ? (profit / revenue) * 100 : 0;

  const riskStatus =
    daysToEvent != null &&
    daysToEvent <= 7 &&
    (event.status === "New Lead" ||
      event.status === "Proposal Sent" ||
      event.status === "Negotiation")
      ? "HIGH"
      : "NORMAL";

  const timeline = buildTimeline(eventDate);

  // local add-forms for vendors & issues
  const [vendorDraft, setVendorDraft] = useState({
    name: "",
    category: "",
    amount: "",
    status: "Planned" as VendorStatus,
  });
  const [issueDraft, setIssueDraft] = useState("");

  function updateVendors(next: VendorAssignment[]) {
    onUpdate({
      ...event,
      vendors: next,
    });
  }

  function updateIssues(next: IssueItem[]) {
    onUpdate({
      ...event,
      issues: next,
    });
  }

  function handleAddVendor(e: React.FormEvent) {
    e.preventDefault();
    if (!vendorDraft.name || !vendorDraft.category || !vendorDraft.amount) {
      alert("Vendor name, category and amount are required.");
      return;
    }
    const next: VendorAssignment[] = [
      ...(event.vendors ?? []),
      {
        id: Date.now(),
        ...vendorDraft,
      },
    ];
    updateVendors(next);
    setVendorDraft({
      name: "",
      category: "",
      amount: "",
      status: "Planned",
    });
  }

  function handleDeleteVendor(id: number) {
    const next = (event.vendors ?? []).filter((v) => v.id !== id);
    updateVendors(next);
  }

  function handleVendorStatusChange(id: number, status: VendorStatus) {
    const next = (event.vendors ?? []).map((v) =>
      v.id === id ? { ...v, status } : v
    );
    updateVendors(next);
  }

  function handleAddIssue(e: React.FormEvent) {
    e.preventDefault();
    if (!issueDraft.trim()) return;
    const next: IssueItem[] = [
      ...(event.issues ?? []),
      {
        id: Date.now(),
        text: issueDraft.trim(),
        status: "Open",
        createdAt: new Date().toISOString(),
      },
    ];
    updateIssues(next);
    setIssueDraft("");
  }

  // ✅ FIXED: keep IssueStatus + IssueItem[]
  function handleToggleIssue(id: number) {
    const next: IssueItem[] = (event.issues ?? []).map((iss: IssueItem) =>
      iss.id === id
        ? {
            ...iss,
            status: (iss.status === "Open"
              ? "Resolved"
              : "Open") as IssueStatus,
          }
        : iss
    );
    updateIssues(next);
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
        <div style={{ textAlign: "right", fontSize: "0.72rem" }}>
          <div className="eventura-tag eventura-tag-blue">
            Status: {event.status}
          </div>
          {daysToEvent != null && (
            <div style={{ marginTop: "0.2rem", color: "#9ca3af" }}>
              {daysToEvent >= 0
                ? `Event in ${daysToEvent} day(s)`
                : `Event was ${Math.abs(daysToEvent)} day(s) ago`}
            </div>
          )}
          {riskStatus === "HIGH" && (
            <div
              className="eventura-tag eventura-tag-amber"
              style={{ marginTop: "0.2rem" }}
            >
              ⚠ Delay Risk – close date, early pipeline
            </div>
          )}
        </div>
      </div>

      {/* GRID: timeline + budget/P&L */}
      <div className="eventura-columns" style={{ marginTop: "0.8rem" }}>
        {/* Timeline / planning */}
        <div>
          <h3 className="eventura-panel-title">Smart timeline</h3>
          <p className="eventura-small-text">
            Auto-generated from event date. Changes automatically if you update
            the date in the event form.
          </p>
          <ul className="eventura-list" style={{ marginTop: "0.4rem" }}>
            {timeline.map((t) => (
              <li key={t.label} className="eventura-list-item">
                <div>
                  <div className="eventura-list-title">{t.label}</div>
                  <div className="eventura-list-sub">
                    Target: {t.displayDate}
                  </div>
                </div>
                <span
                  className={
                    "eventura-tag " +
                    (t.isPast ? "eventura-tag-amber" : "eventura-tag-green")
                  }
                >
                  {t.isPast ? "Check" : "Upcoming"}
                </span>
              </li>
            ))}
          </ul>
        </div>

        {/* Budget & event P&L */}
        <div>
          <h3 className="eventura-panel-title">Budget & event P&amp;L</h3>
          <p className="eventura-small-text">
            Uses your quoted budget and vendor payouts as real-time P&amp;L for
            this event.
          </p>

          <div className="eventura-kpi-row" style={{ marginTop: "0.5rem" }}>
            <div className="eventura-card">
              <div className="eventura-card-label">Guests</div>
              <div className="eventura-card-value">{guests || "–"}</div>
              <div className="eventura-card-note">
                Type: {event.eventType}
              </div>
            </div>

            <div className="eventura-card">
              <div className="eventura-card-label">Suggested budget</div>
              <div className="eventura-card-value">
                ₹{formatCurrency(suggestedBudget)}
              </div>
              <div className="eventura-card-note">
                ~₹{formatCurrency(basePerHead)} / guest
              </div>
            </div>
          </div>

          <div className="eventura-kpi-row" style={{ marginTop: "0.5rem" }}>
            <div className="eventura-card">
              <div className="eventura-card-label">Quoted revenue</div>
              <div className="eventura-card-value">
                ₹{formatCurrency(currentBudget)}
              </div>
              <div className="eventura-card-note">
                Gap vs suggested:{" "}
                {budgetGap === 0
                  ? "aligned"
                  : budgetGap > 0
                  ? `+₹${formatCurrency(budgetGap)}`
                  : `-₹${formatCurrency(Math.abs(budgetGap))}`}
              </div>
            </div>
            <div className="eventura-card">
              <div className="eventura-card-label">Vendor payouts</div>
              <div className="eventura-card-value">
                ₹{formatCurrency(vendorTotal)}
              </div>
              <div className="eventura-card-note">
                Used in profit calculation
              </div>
            </div>
          </div>

          {isCEO && (
            <div className="eventura-kpi-row" style={{ marginTop: "0.5rem" }}>
              <div className="eventura-card">
                <div className="eventura-card-label">Estimated margin</div>
                <div className="eventura-card-value">
                  {margin ? margin.toFixed(1) : "–"}%
                </div>
                <div className="eventura-card-note">
                  Profit approx: ₹{formatCurrency(profit || 0)}
                </div>
              </div>
            </div>
          )}
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
          <h3 className="eventura-panel-title">
            Vendors & payouts (linked to Finance thinking)
          </h3>
          <p className="eventura-small-text">
            Track decorators, caterers, photographers, etc. Their total is used
            as variable cost in this event P&amp;L.
          </p>

          <form
            className="eventura-form"
            onSubmit={handleAddVendor}
            style={{ marginTop: "0.5rem" }}
          >
            <div className="eventura-form-grid">
              <div className="eventura-field">
                <input
                  className="eventura-input"
                  placeholder="Vendor name"
                  value={vendorDraft.name}
                  onChange={(e) =>
                    setVendorDraft((prev) => ({
                      ...prev,
                      name: e.target.value,
                    }))
                  }
                />
              </div>
              <div className="eventura-field">
                <input
                  className="eventura-input"
                  placeholder="Category (Decor / Catering / Photo)"
                  value={vendorDraft.category}
                  onChange={(e) =>
                    setVendorDraft((prev) => ({
                      ...prev,
                      category: e.target.value,
                    }))
                  }
                />
              </div>
            </div>
            <div className="eventura-form-grid" style={{ marginTop: "0.4rem" }}>
              <div className="eventura-field">
                <input
                  className="eventura-input"
                  placeholder="Amount (₹)"
                  value={vendorDraft.amount}
                  onChange={(e) =>
                    setVendorDraft((prev) => ({
                      ...prev,
                      amount: e.target.value,
                    }))
                  }
                />
              </div>
              <div className="eventura-field">
                <select
                  className="eventura-input"
                  value={vendorDraft.status}
                  onChange={(e) =>
                    setVendorDraft((prev) => ({
                      ...prev,
                      status: e.target.value as VendorStatus,
                    }))
                  }
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
              <p
                style={{
                  fontSize: "0.8rem",
                  color: "#9ca3af",
                }}
              >
                No vendors added yet. Add decorator, caterer, photographer, etc.
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
                          onChange={(e) =>
                            handleVendorStatusChange(
                              v.id,
                              e.target.value as VendorStatus
                            )
                          }
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
            Ground staff can note problems like delays, shortages, vendor
            issues.
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
            <button type="submit" className="eventura-button-secondary">
              + Add
            </button>
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
                      {new Date(iss.createdAt).toLocaleString("en-IN")} ·{" "}
                      {iss.status === "Open" ? "Open" : "Resolved"}
                    </div>
                  </div>
                  <button
                    type="button"
                    className={
                      "eventura-tag " +
                      (iss.status === "Open"
                        ? "eventura-tag-amber"
                        : "eventura-tag-green")
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
      </div>
    </div>
  );
}

/* ======= Shared sidebar/topbar like other pages ======= */

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

/* ===== Helper for timeline ===== */

type TimelineItem = {
  label: string;
  displayDate: string;
  isPast: boolean;
};

function buildTimeline(eventDate: Date | null): TimelineItem[] {
  if (!eventDate) {
    return [
      {
        label: "Set event date",
        displayDate: "No date selected",
        isPast: false,
      },
    ];
  }

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

  return steps.map((step) => {
    const d = new Date(eventDate);
    d.setDate(d.getDate() + step.offsetDays);
    const displayDate = d.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
    const isPast = d.getTime() < today.getTime();
    return {
      label: step.label,
      displayDate,
      isPast,
    };
  });
}
