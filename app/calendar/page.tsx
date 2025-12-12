"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";

/* ========= Shared types & constants ========= */

type Role = "CEO" | "Staff";
type User = { name: string; role: Role; city: string };

const USER_KEY = "eventura-user";
const CAL_EVENTS_KEY = "eventura-calendar-events";

type EventType = "Wedding" | "Corporate" | "Social" | "Other";
type EventStatus = "Tentative" | "Confirmed" | "Completed" | "Cancelled";

type CalendarEvent = {
  id: number;
  title: string;
  client: string;
  date: string; // YYYY-MM-DD
  startTime?: string; // HH:MM
  endTime?: string; // HH:MM
  location?: string;
  type: EventType;
  status: EventStatus;
  crew: string[];
  estBudget?: number;
};

/* ========= Seed data ========= */

const seedEvents: CalendarEvent[] = [
  {
    id: 1,
    title: "Patel Wedding Sangeet",
    client: "Patel Family",
    date: "2025-12-14",
    startTime: "19:00",
    endTime: "23:30",
    location: "Surat – Royal Banquet",
    type: "Wedding",
    status: "Confirmed",
    crew: ["Shubh", "Priya Shah", "Jay Patel", "Decor Crew A"],
    estBudget: 800000,
  },
  {
    id: 2,
    title: "XYZ Textiles Annual Gala",
    client: "XYZ Textiles",
    date: "2025-12-16",
    startTime: "18:00",
    endTime: "22:00",
    location: "Surat – Hotel",
    type: "Corporate",
    status: "Tentative",
    crew: ["Shubh", "Riya Mehta", "Logistics Crew A"],
    estBudget: 600000,
  },
  {
    id: 3,
    title: "Mehta Engagement",
    client: "Mehta Family",
    date: "2025-12-18",
    startTime: "17:00",
    endTime: "22:00",
    location: "Surat – Farmhouse",
    type: "Wedding",
    status: "Confirmed",
    crew: ["Trainee Planner", "Priya Shah"],
    estBudget: 450000,
  },
];

/* ========= Helpers ========= */

function formatINR(value?: number): string {
  if (value == null || isNaN(value)) return "₹0";
  return "₹" + value.toLocaleString("en-IN");
}

function eventStatusClass(status: EventStatus): string {
  switch (status) {
    case "Confirmed":
      return "eventura-tag-green";
    case "Tentative":
      return "eventura-tag-blue";
    case "Completed":
      return "eventura-tag-amber";
    case "Cancelled":
      return "eventura-tag-amber";
    default:
      return "eventura-tag-blue";
  }
}

function eventTypeLabel(type: EventType): string {
  switch (type) {
    case "Wedding":
      return "💍 Wedding";
    case "Corporate":
      return "🏢 Corporate";
    case "Social":
      return "🎉 Social";
    default:
      return "✨ Other";
  }
}

function getYYYYMMDD(date: Date): string {
  const y = date.getFullYear();
  const m = `${date.getMonth() + 1}`.padStart(2, "0");
  const d = `${date.getDate()}`.padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function parseDateStr(str: string): Date {
  const [y, m, d] = str.split("-").map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

/* ========= Page ========= */

export default function CalendarPage() {
  const [user, setUser] = useState<User | null>(null);

  // 🔧 Start with empty, we’ll load from localStorage or seed
  const [events, setEvents] = useState<CalendarEvent[]>([]);

  const [viewMonth, setViewMonth] = useState<Date>(() => new Date());
  const [selectedDate, setSelectedDate] = useState<string>(() =>
    getYYYYMMDD(new Date())
  );

  const [editingId, setEditingId] = useState<number | null>(null);

  const [form, setForm] = useState<{
    title: string;
    client: string;
    date: string;
    startTime: string;
    endTime: string;
    location: string;
    type: EventType;
    status: EventStatus;
    crew: string; // comma string in form
    estBudget: string;
  }>({
    title: "",
    client: "",
    date: getYYYYMMDD(new Date()),
    startTime: "",
    endTime: "",
    location: "",
    type: "Wedding",
    status: "Tentative",
    crew: "",
    estBudget: "",
  });

  // Auth
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

  // 🔧 Load events from localStorage OR seed once
  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      const stored = window.localStorage.getItem(CAL_EVENTS_KEY);

      if (stored) {
        const parsed: CalendarEvent[] = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          // ✅ Even [] is valid – don’t bring back seeds
          setEvents(parsed);
          return;
        }
      }

      // ✅ No stored data → use seed once and save
      setEvents(seedEvents);
      window.localStorage.setItem(CAL_EVENTS_KEY, JSON.stringify(seedEvents));
    } catch {
      // If anything breaks, at least show seed data
      setEvents(seedEvents);
    }
  }, []);

  // Save events on change
  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(CAL_EVENTS_KEY, JSON.stringify(events));
  }, [events]);

  // Derived data
  const sortedEvents = useMemo(
    () =>
      [...events].sort(
        (a, b) => parseDateStr(a.date).getTime() - parseDateStr(b.date).getTime()
      ),
    [events]
  );

  const eventsForSelectedDate = useMemo(
    () => sortedEvents.filter((e) => e.date === selectedDate),
    [sortedEvents, selectedDate]
  );

  const upcomingEvents = useMemo(() => {
    const today = new Date();
    const start = today.setHours(0, 0, 0, 0);
    return sortedEvents.filter(
      (e) => parseDateStr(e.date).getTime() >= start
    );
  }, [sortedEvents]);

  // Month list for left panel
  const monthLabel = useMemo(
    () =>
      viewMonth.toLocaleString("default", { month: "long", year: "numeric" }),
    [viewMonth]
  );

  const daysInMonth = useMemo(() => {
    const year = viewMonth.getFullYear();
    const month = viewMonth.getMonth();
    return new Date(year, month + 1, 0).getDate();
  }, [viewMonth]);

  const monthDays = useMemo(() => {
    const year = viewMonth.getFullYear();
    const month = viewMonth.getMonth();
    const list: { dateStr: string; label: string; hasEvents: boolean }[] = [];

    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(year, month, d);
      const dateStr = getYYYYMMDD(date);
      const hasEvents = events.some((e) => e.date === dateStr);
      list.push({
        dateStr,
        label: d.toString(),
        hasEvents,
      });
    }

    return list;
  }, [viewMonth, daysInMonth, events]);

  const handlePrevMonth = () => {
    setViewMonth(
      (prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1)
    );
  };

  const handleNextMonth = () => {
    setViewMonth(
      (prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1)
    );
  };

  const startNewEvent = (date?: string) => {
    const d = date || selectedDate || getYYYYMMDD(new Date());
    setEditingId(null);
    setSelectedDate(d);
    setForm({
      title: "",
      client: "",
      date: d,
      startTime: "",
      endTime: "",
      location: "",
      type: "Wedding",
      status: "Tentative",
      crew: "",
      estBudget: "",
    });
  };

  const startEditEvent = (ev: CalendarEvent) => {
    setEditingId(ev.id);
    setSelectedDate(ev.date);
    setForm({
      title: ev.title,
      client: ev.client,
      date: ev.date,
      startTime: ev.startTime || "",
      endTime: ev.endTime || "",
      location: ev.location || "",
      type: ev.type,
      status: ev.status,
      crew: ev.crew.join(", "),
      estBudget: ev.estBudget != null ? ev.estBudget.toString() : "",
    });
  };

  const handleFormChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSaveEvent = (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.title.trim()) {
      alert("Title is required");
      return;
    }
    if (!form.date) {
      alert("Date is required");
      return;
    }

    const crewArr = form.crew
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    const estBudgetNumber = form.estBudget
      ? Number(form.estBudget)
      : undefined;

    if (editingId == null) {
      const maxId = events.reduce((max, ev) => Math.max(max, ev.id), 0);
      const newEvent: CalendarEvent = {
        id: maxId + 1,
        title: form.title.trim(),
        client: form.client.trim(),
        date: form.date,
        startTime: form.startTime || undefined,
        endTime: form.endTime || undefined,
        location: form.location || undefined,
        type: form.type,
        status: form.status,
        crew: crewArr,
        estBudget:
          estBudgetNumber != null && !isNaN(estBudgetNumber)
            ? estBudgetNumber
            : undefined,
      };
      setEvents([...events, newEvent]);
    } else {
      setEvents(
        events.map((ev) =>
          ev.id === editingId
            ? {
                ...ev,
                title: form.title.trim(),
                client: form.client.trim(),
                date: form.date,
                startTime: form.startTime || undefined,
                endTime: form.endTime || undefined,
                location: form.location || undefined,
                type: form.type,
                status: form.status,
                crew: crewArr,
                estBudget:
                  estBudgetNumber != null && !isNaN(estBudgetNumber)
                    ? estBudgetNumber
                    : undefined,
              }
            : ev
        )
      );
    }

    setSelectedDate(form.date);
    setEditingId(null);
    setForm((prev) => ({
      ...prev,
      title: "",
      client: "",
      crew: "",
      estBudget: "",
    }));
  };

  const handleDeleteEvent = (ev: CalendarEvent) => {
    if (!window.confirm(`Delete event "${ev.title}"?`)) return;
    setEvents(events.filter((e) => e.id !== ev.id));
    if (editingId === ev.id) {
      setEditingId(null);
    }
  };

  if (!user) return null;

  return (
    <main className="eventura-os">
      <aside className="eventura-sidebar">
        <SidebarCore user={user} active="calendar" />
      </aside>

      <div className="eventura-main">
        <TopbarCore user={user} />

        <div className="eventura-content">
          {/* Header */}
          <div className="eventura-header-row">
            <div>
              <h1 className="eventura-page-title">Calendar & Event Planner</h1>
              <p className="eventura-subtitle">
                Clean view of all bookings – select a day, then add / edit /
                delete events on the right.
              </p>
            </div>
            <div className="eventura-chips-row">
              <button
                type="button"
                className="eventura-tag eventura-tag-blue"
                onClick={() => startNewEvent()}
              >
                + New event
              </button>
            </div>
          </div>

          {/* Main layout: left month / middle list / right editor */}
          <section className="eventura-columns">
            {/* LEFT: Month & days */}
            <div className="eventura-panel" style={{ minWidth: 220 }}>
              <div className="eventura-panel-header-row">
                <h2 className="eventura-panel-title">Month</h2>
              </div>
              <div className="eventura-chips-row" style={{ marginBottom: 8 }}>
                <button
                  type="button"
                  className="eventura-tag eventura-tag-amber"
                  onClick={handlePrevMonth}
                >
                  ◀
                </button>
                <span className="eventura-card-label">{monthLabel}</span>
                <button
                  type="button"
                  className="eventura-tag eventura-tag-amber"
                  onClick={handleNextMonth}
                >
                  ▶
                </button>
              </div>
              <div
                style={{
                  maxHeight: 400,
                  overflowY: "auto",
                  borderTop: "1px solid rgba(148, 163, 184, 0.3)",
                  marginTop: 8,
                }}
              >
                {monthDays.map((d) => {
                  const isSelected = d.dateStr === selectedDate;
                  const hasEvents = d.hasEvents;
                  return (
                    <button
                      key={d.dateStr}
                      type="button"
                      onClick={() => {
                        setSelectedDate(d.dateStr);
                        setForm((prev) => ({ ...prev, date: d.dateStr }));
                      }}
                      style={{
                        width: "100%",
                        textAlign: "left",
                        padding: "0.35rem 0.5rem",
                        border: "none",
                        background: "transparent",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        cursor: "pointer",
                        borderRadius: "0.375rem",
                        marginBottom: 2,
                        ...(isSelected
                          ? {
                              background:
                                "linear-gradient(to right, rgba(250, 204, 21, 0.18), rgba(156, 163, 175, 0.15))",
                            }
                          : {}),
                      }}
                    >
                      <span>
                        <span
                          style={{
                            display: "inline-block",
                            width: 20,
                            fontWeight: 600,
                          }}
                        >
                          {d.label}
                        </span>
                        <span
                          style={{
                            fontSize: "0.7rem",
                            marginLeft: 6,
                            color: "#9ca3af",
                          }}
                        >
                          {new Date(d.dateStr).toLocaleDateString("default", {
                            weekday: "short",
                          })}
                        </span>
                      </span>
                      {hasEvents && (
                        <span className="eventura-tag eventura-tag-blue">
                          ●
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* MIDDLE: Events on selected day + upcoming */}
            <div className="eventura-panel">
              <h2 className="eventura-panel-title">
                Events on {selectedDate || "selected date"}
              </h2>
              <div className="eventura-table-wrapper">
                <table className="eventura-table">
                  <thead>
                    <tr>
                      <th>Time</th>
                      <th>Event</th>
                      <th>Client</th>
                      <th>Type</th>
                      <th>Status</th>
                      <th>Budget</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {eventsForSelectedDate.length === 0 && (
                      <tr>
                        <td colSpan={7} className="eventura-small-text">
                          No events for this day. Click “New event” or select a
                          date on the left and add from the form.
                        </td>
                      </tr>
                    )}
                    {eventsForSelectedDate.map((ev) => (
                      <tr key={ev.id}>
                        <td>
                          {ev.startTime || "--"}
                          {ev.endTime ? `–${ev.endTime}` : ""}
                        </td>
                        <td>
                          <div className="eventura-list-title">
                            {ev.title}
                          </div>
                          {ev.location && (
                            <div className="eventura-list-sub">
                              {ev.location}
                            </div>
                          )}
                        </td>
                        <td>{ev.client}</td>
                        <td>{eventTypeLabel(ev.type)}</td>
                        <td>
                          <span
                            className={
                              "eventura-tag " + eventStatusClass(ev.status)
                            }
                          >
                            {ev.status}
                          </span>
                        </td>
                        <td>{formatINR(ev.estBudget)}</td>
                        <td style={{ whiteSpace: "nowrap" }}>
                          <button
                            type="button"
                            className="eventura-tag eventura-tag-blue"
                            onClick={() => startEditEvent(ev)}
                            style={{ marginRight: 4 }}
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            className="eventura-tag eventura-tag-amber"
                            onClick={() => handleDeleteEvent(ev)}
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <h3
                className="eventura-subsection-title"
                style={{ marginTop: "1rem" }}
              >
                Upcoming events (all)
              </h3>
              <div className="eventura-table-wrapper">
                <table className="eventura-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Event</th>
                      <th>Client</th>
                      <th>Type</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {upcomingEvents.length === 0 && (
                      <tr>
                        <td colSpan={5} className="eventura-small-text">
                          No upcoming events in the calendar.
                        </td>
                      </tr>
                    )}
                    {upcomingEvents.map((ev) => (
                      <tr key={ev.id}>
                        <td>{ev.date}</td>
                        <td>{ev.title}</td>
                        <td>{ev.client}</td>
                        <td>{eventTypeLabel(ev.type)}</td>
                        <td>
                          <span
                            className={
                              "eventura-tag " + eventStatusClass(ev.status)
                            }
                          >
                            {ev.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* RIGHT: Event form */}
            <div className="eventura-panel" style={{ maxWidth: 360 }}>
              <h2 className="eventura-panel-title">
                {editingId == null ? "Add new event" : "Edit event"}
              </h2>
              <form
                onSubmit={handleSaveEvent}
                className="eventura-form"
                style={{ display: "flex", flexDirection: "column", gap: 8 }}
              >
                <label className="eventura-form-label">
                  <span>Title *</span>
                  <input
                    className="eventura-search"
                    name="title"
                    value={form.title}
                    onChange={handleFormChange}
                    placeholder="Eg. Royal Wedding Reception"
                  />
                </label>

                <label className="eventura-form-label">
                  <span>Client</span>
                  <input
                    className="eventura-search"
                    name="client"
                    value={form.client}
                    onChange={handleFormChange}
                    placeholder="Client / company name"
                  />
                </label>

                <label className="eventura-form-label">
                  <span>Date *</span>
                  <input
                    type="date"
                    className="eventura-search"
                    name="date"
                    value={form.date}
                    onChange={(e) => {
                      handleFormChange(e);
                      setSelectedDate(e.target.value);
                    }}
                  />
                </label>

                <div style={{ display: "flex", gap: 8 }}>
                  <label className="eventura-form-label" style={{ flex: 1 }}>
                    <span>Start</span>
                    <input
                      type="time"
                      className="eventura-search"
                      name="startTime"
                      value={form.startTime}
                      onChange={handleFormChange}
                    />
                  </label>
                  <label className="eventura-form-label" style={{ flex: 1 }}>
                    <span>End</span>
                    <input
                      type="time"
                      className="eventura-search"
                      name="endTime"
                      value={form.endTime}
                      onChange={handleFormChange}
                    />
                  </label>
                </div>

                <label className="eventura-form-label">
                  <span>Location</span>
                  <input
                    className="eventura-search"
                    name="location"
                    value={form.location}
                    onChange={handleFormChange}
                    placeholder="Venue / city"
                  />
                </label>

                <div style={{ display: "flex", gap: 8 }}>
                  <label className="eventura-form-label" style={{ flex: 1 }}>
                    <span>Type</span>
                    <select
                      className="eventura-search"
                      name="type"
                      value={form.type}
                      onChange={handleFormChange}
                    >
                      <option value="Wedding">Wedding</option>
                      <option value="Corporate">Corporate</option>
                      <option value="Social">Social</option>
                      <option value="Other">Other</option>
                    </select>
                  </label>

                  <label className="eventura-form-label" style={{ flex: 1 }}>
                    <span>Status</span>
                    <select
                      className="eventura-search"
                      name="status"
                      value={form.status}
                      onChange={handleFormChange}
                    >
                      <option value="Tentative">Tentative</option>
                      <option value="Confirmed">Confirmed</option>
                      <option value="Completed">Completed</option>
                      <option value="Cancelled">Cancelled</option>
                    </select>
                  </label>
                </div>

                <label className="eventura-form-label">
                  <span>Estimated budget (₹)</span>
                  <input
                    className="eventura-search"
                    name="estBudget"
                    value={form.estBudget}
                    onChange={handleFormChange}
                    placeholder="Eg. 1200000"
                  />
                </label>

                <label className="eventura-form-label">
                  <span>Crew (comma separated)</span>
                  <textarea
                    className="eventura-search"
                    name="crew"
                    value={form.crew}
                    onChange={handleFormChange}
                    placeholder="Eg. Hardik, Shubh, Priya, Logistics Crew A"
                    rows={3}
                  />
                </label>

                <div
                  style={{
                    display: "flex",
                    gap: 8,
                    marginTop: 8,
                    justifyContent: "space-between",
                  }}
                >
                  <button
                    type="submit"
                    className="eventura-button-secondary"
                    style={{ flex: 1 }}
                  >
                    {editingId == null ? "Add event" : "Save changes"}
                  </button>
                  {editingId != null && (
                    <button
                      type="button"
                      className="eventura-tag eventura-tag-amber"
                      style={{ flex: 0.8 }}
                      onClick={() => {
                        setEditingId(null);
                        startNewEvent(selectedDate);
                      }}
                    >
                      Cancel edit
                    </button>
                  )}
                </div>
              </form>
              <p className="eventura-small-text" style={{ marginTop: "0.5rem" }}>
                All changes stay in this browser (localStorage). Later we can
                connect this with your Events & Finance tabs for full sync.
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
          placeholder="Search events, clients, or dates..."
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
