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
  const [events, setEvents] = useState<CalendarEvent[]>(seedEvents);
  const [viewMonth, setViewMonth] = useState<Date>(() => {
    // Default to current month
    return new Date();
  });

  // Auth (same logic as HR / Dashboard)
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

  // Load events from localStorage
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const stored = window.localStorage.getItem(CAL_EVENTS_KEY);
      if (stored) {
        const parsed: CalendarEvent[] = JSON.parse(stored);
        if (Array.isArray(parsed)) setEvents(parsed);
      }
    } catch {
      // ignore
    }
  }, []);

  // Persist events to localStorage
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

  const upcomingEvents = useMemo(() => {
    const today = new Date();
    return sortedEvents.filter(
      (e) => parseDateStr(e.date).getTime() >= today.setHours(0, 0, 0, 0)
    );
  }, [sortedEvents]);

  // Month grid
  const monthLabel = useMemo(() => {
    return viewMonth.toLocaleString("default", {
      month: "long",
      year: "numeric",
    });
  }, [viewMonth]);

  const monthDays = useMemo(() => {
    const year = viewMonth.getFullYear();
    const month = viewMonth.getMonth(); // 0-11

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    const startWeekday = firstDay.getDay(); // 0 (Sun) - 6 (Sat)
    const daysInMonth = lastDay.getDate();

    const cells: {
      date: Date | null;
      key: string;
      isCurrentMonth: boolean;
    }[] = [];

    // Fill blanks before 1st
    for (let i = 0; i < startWeekday; i++) {
      cells.push({
        date: null,
        key: `blank-${i}`,
        isCurrentMonth: false,
      });
    }

    // Fill actual days
    for (let d = 1; d <= daysInMonth; d++) {
      cells.push({
        date: new Date(year, month, d),
        key: `day-${d}`,
        isCurrentMonth: true,
      });
    }

    // Make full weeks (42 cells = 6 weeks)
    while (cells.length < 42) {
      cells.push({
        date: null,
        key: `blank-tail-${cells.length}`,
        isCurrentMonth: false,
      });
    }

    return cells;
  }, [viewMonth]);

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

  const handleAddEvent = (date?: string) => {
    const defaultDate = date || getYYYYMMDD(new Date());
    const title = window.prompt("Event title:", "New Event");
    if (!title) return;

    const client = window.prompt("Client name:", "") || "";
    const dateStr =
      window.prompt("Event date (YYYY-MM-DD):", defaultDate) || defaultDate;
    const startTime =
      window.prompt("Start time (HH:MM, optional):", "18:00") || undefined;
    const endTime =
      window.prompt("End time (HH:MM, optional):", "22:00") || undefined;
    const location =
      window.prompt("Location:", "Surat") || "Surat";

    const typeRaw =
      window.prompt(
        "Type (Wedding / Corporate / Social / Other):",
        "Wedding"
      ) || "Wedding";
    const type = (typeRaw as EventType) || "Wedding";

    const statusRaw =
      window.prompt(
        "Status (Tentative / Confirmed / Completed / Cancelled):",
        "Tentative"
      ) || "Tentative";
    const status = (statusRaw as EventStatus) || "Tentative";

    const estBudget = Number(
      window.prompt("Estimated budget (₹, optional):", "0")
    );
    const crewRaw =
      window.prompt(
        "Crew (comma separated, optional):",
        "Hardik, Shubh, Priya"
      ) || "";
    const crew = crewRaw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    const maxId = events.reduce((max, e) => Math.max(max, e.id), 0);
    const newEvent: CalendarEvent = {
      id: maxId + 1,
      title,
      client,
      date: dateStr,
      startTime,
      endTime,
      location,
      type,
      status,
      estBudget: isNaN(estBudget) ? undefined : estBudget,
      crew,
    };

    setEvents([...events, newEvent]);
  };

  const handleEditEvent = (event: CalendarEvent) => {
    const title =
      window.prompt("Event title:", event.title) || event.title;
    const client =
      window.prompt("Client name:", event.client) || event.client;
    const dateStr =
      window.prompt("Event date (YYYY-MM-DD):", event.date) || event.date;
    const startTime =
      window.prompt(
        "Start time (HH:MM, optional):",
        event.startTime || ""
      ) || event.startTime;
    const endTime =
      window.prompt(
        "End time (HH:MM, optional):",
        event.endTime || ""
      ) || event.endTime;
    const location =
      window.prompt("Location:", event.location || "") ||
      event.location ||
      "";

    const typeRaw =
      window.prompt(
        "Type (Wedding / Corporate / Social / Other):",
        event.type
      ) || event.type;
    const type = (typeRaw as EventType) || event.type;

    const statusRaw =
      window.prompt(
        "Status (Tentative / Confirmed / Completed / Cancelled):",
        event.status
      ) || event.status;
    const status = (statusRaw as EventStatus) || event.status;

    const estBudget = Number(
      window.prompt(
        "Estimated budget (₹, optional):",
        event.estBudget?.toString() || "0"
      )
    );
    const crewRaw =
      window.prompt(
        "Crew (comma separated, optional):",
        event.crew.join(", ")
      ) || event.crew.join(", ");
    const crew = crewRaw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    setEvents(
      events.map((e) =>
        e.id === event.id
          ? {
              ...e,
              title,
              client,
              date: dateStr,
              startTime: startTime || undefined,
              endTime: endTime || undefined,
              location,
              type,
              status,
              estBudget: isNaN(estBudget) ? undefined : estBudget,
              crew,
            }
          : e
      )
    );
  };

  const handleDeleteEvent = (event: CalendarEvent) => {
    if (!window.confirm(`Delete event "${event.title}"?`)) return;
    setEvents(events.filter((e) => e.id !== event.id));
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
                Plan weddings, corporates and socials by date – add, edit or
                remove events directly from this calendar.
              </p>
            </div>
            <div className="eventura-chips-row">
              <button
                type="button"
                className="eventura-tag eventura-tag-blue"
                onClick={() => handleAddEvent()}
              >
                + Quick add event
              </button>
            </div>
          </div>

          {/* Calendar + Upcoming */}
          <section className="eventura-columns">
            {/* Calendar grid */}
            <div className="eventura-panel">
              <div className="eventura-panel-header-row">
                <h2 className="eventura-panel-title">Month view</h2>
                <div className="eventura-chips-row">
                  <button
                    type="button"
                    className="eventura-tag eventura-tag-amber"
                    onClick={handlePrevMonth}
                  >
                    ◀ Prev
                  </button>
                  <span className="eventura-card-label">{monthLabel}</span>
                  <button
                    type="button"
                    className="eventura-tag eventura-tag-amber"
                    onClick={handleNextMonth}
                  >
                    Next ▶
                  </button>
                </div>
              </div>

              <div className="eventura-calendar-grid">
                <div className="eventura-calendar-header">
                  <div>Sun</div>
                  <div>Mon</div>
                  <div>Tue</div>
                  <div>Wed</div>
                  <div>Thu</div>
                  <div>Fri</div>
                  <div>Sat</div>
                </div>
                <div className="eventura-calendar-body">
                  {monthDays.map((cell) => {
                    if (!cell.date) {
                      return (
                        <div key={cell.key} className="eventura-calendar-cell empty" />
                      );
                    }
                    const dateStr = getYYYYMMDD(cell.date);
                    const dayEvents = events.filter((e) => e.date === dateStr);
                    const dayNum = cell.date.getDate();

                    return (
                      <button
                        key={cell.key}
                        type="button"
                        className={
                          "eventura-calendar-cell" +
                          (cell.isCurrentMonth ? "" : " faded")
                        }
                        onClick={() => handleAddEvent(dateStr)}
                      >
                        <div className="eventura-calendar-day-number">
                          {dayNum}
                        </div>
                        <div className="eventura-calendar-events">
                          {dayEvents.slice(0, 3).map((e) => (
                            <div
                              key={e.id}
                              className={
                                "eventura-tag eventura-tag-pill " +
                                eventStatusClass(e.status)
                              }
                              title={`${e.title} (${e.client})`}
                            >
                              {e.title.length > 14
                                ? e.title.slice(0, 14) + "…"
                                : e.title}
                            </div>
                          ))}
                          {dayEvents.length > 3 && (
                            <div className="eventura-small-text">
                              +{dayEvents.length - 3} more
                            </div>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <p className="eventura-small-text" style={{ marginTop: "0.5rem" }}>
                Click any date cell to add a new event. Use the list on the
                right to edit or delete existing bookings.
              </p>
            </div>

            {/* Upcoming events list */}
            <div className="eventura-panel">
              <div className="eventura-panel-header-row">
                <h2 className="eventura-panel-title">Upcoming events</h2>
                <span className="eventura-card-label">
                  {upcomingEvents.length} scheduled
                </span>
              </div>

              <div className="eventura-table-wrapper">
                <table className="eventura-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Event</th>
                      <th>Client</th>
                      <th>Type</th>
                      <th>Status</th>
                      <th>Budget</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {upcomingEvents.length === 0 && (
                      <tr>
                        <td colSpan={7} className="eventura-small-text">
                          No upcoming events. Add one from the calendar or using
                          “Quick add event”.
                        </td>
                      </tr>
                    )}
                    {upcomingEvents.map((e) => (
                      <tr key={e.id}>
                        <td>{e.date}</td>
                        <td>
                          <div className="eventura-list-title">{e.title}</div>
                          {e.location && (
                            <div className="eventura-list-sub">
                              {e.location}
                            </div>
                          )}
                          {e.startTime && (
                            <div className="eventura-small-text">
                              {e.startTime}
                              {e.endTime ? ` – ${e.endTime}` : ""}
                            </div>
                          )}
                        </td>
                        <td>{e.client}</td>
                        <td>{eventTypeLabel(e.type)}</td>
                        <td>
                          <span
                            className={
                              "eventura-tag " + eventStatusClass(e.status)
                            }
                          >
                            {e.status}
                          </span>
                        </td>
                        <td>{formatINR(e.estBudget)}</td>
                        <td style={{ whiteSpace: "nowrap" }}>
                          <button
                            type="button"
                            className="eventura-tag eventura-tag-blue"
                            onClick={() => handleEditEvent(e)}
                            style={{ marginRight: "0.25rem" }}
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            className="eventura-tag eventura-tag-amber"
                            onClick={() => handleDeleteEvent(e)}
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <p className="eventura-small-text" style={{ marginTop: "0.5rem" }}>
                Crew, budget and status are editable. Later this can connect with
                your Finance, HR & Vendors tabs for full execution view.
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
