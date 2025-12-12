"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";

/* ========= Shared types ========= */

type Role = "CEO" | "Staff";
type User = { name: string; role: Role; city: string };

const USER_KEY = "eventura-user";

type EventType = "Wedding" | "Corporate" | "Birthday" | "Baby" | "Other";

type EventStatus = "Lead" | "Tentative" | "Confirmed" | "Pre-Event" | "Completed" | "Cancelled";

type CalendarEvent = {
  id: number;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:MM
  endTime: string; // HH:MM
  title: string;
  type: EventType;
  status: EventStatus;
  city: string;
  venue: string;
  clientName: string;
  owner: string; // internal owner (e.g., Shubh)
  budget: number;
  expectedRevenue: number;
  expectedCost: number;
  vendors: string[];
  crew: string[]; // names
  tags: string[];
  isVIP?: boolean;
  proposalSentDate?: string;
};

type ChecklistItem = {
  id: number;
  eventId: number;
  label: string;
  department: "Decor" | "Logistics" | "Catering" | "Finance" | "Client";
  dueDate: string; // YYYY-MM-DD
  done: boolean;
};

type ViewMode = "month" | "week" | "day" | "list";

type Filters = {
  city: string;
  type: string;
  status: string;
  owner: string;
  tag: string;
};

type DayLoadLevel = "light" | "medium" | "heavy";

/* ========= Seed data (mock real Eventura data) ========= */

const seedEvents: CalendarEvent[] = [
  {
    id: 1,
    date: "2025-12-14",
    startTime: "18:00",
    endTime: "23:30",
    title: "Patel Wedding – Sangeet Night",
    type: "Wedding",
    status: "Confirmed",
    city: "Surat",
    venue: "Greenleaf Banquet",
    clientName: "Patel Family",
    owner: "Shubh",
    budget: 550000,
    expectedRevenue: 550000,
    expectedCost: 340000,
    vendors: ["Royal Decor Studio", "DJ Vibes", "Happy Caterers"],
    crew: ["Shubh Parekh", "Priya Shah", "Jay Patel", "Decor Crew A"],
    tags: ["VIP", "Big-budget", "NRI"],
    isVIP: true,
    proposalSentDate: "2025-11-20",
  },
  {
    id: 2,
    date: "2025-12-16",
    startTime: "19:30",
    endTime: "23:00",
    title: "Corporate Gala – XYZ Textiles",
    type: "Corporate",
    status: "Confirmed",
    city: "Surat",
    venue: "The Grand Meridian",
    clientName: "XYZ Textiles Ltd.",
    owner: "Hardik",
    budget: 420000,
    expectedRevenue: 420000,
    expectedCost: 260000,
    vendors: ["Premium Decor Co.", "Urban Lights AV"],
    crew: ["Shubh Parekh", "Riya Mehta", "Logistics Crew A"],
    tags: ["Corporate", "Repeat client"],
    isVIP: false,
    proposalSentDate: "2025-11-25",
  },
  {
    id: 3,
    date: "2025-12-18",
    startTime: "17:00",
    endTime: "22:30",
    title: "Mehta Engagement",
    type: "Wedding",
    status: "Tentative",
    city: "Surat",
    venue: "Skyline Lawn",
    clientName: "Mehta Family",
    owner: "Shubh",
    budget: 310000,
    expectedRevenue: 310000,
    expectedCost: 190000,
    vendors: ["Royal Decor Studio"],
    crew: ["Trainee Planner", "Priya Shah"],
    tags: ["Lead", "New client"],
    isVIP: false,
    proposalSentDate: "2025-12-05",
  },
  {
    id: 4,
    date: "2025-12-20",
    startTime: "11:00",
    endTime: "15:00",
    title: "Advait First Birthday",
    type: "Birthday",
    status: "Confirmed",
    city: "Surat",
    venue: "Lotus Party Plot",
    clientName: "Desai Family",
    owner: "Dixit",
    budget: 120000,
    expectedRevenue: 120000,
    expectedCost: 70000,
    vendors: ["FunTime Decor", "Sweet Treats Catering"],
    crew: ["Dixit Bhuva", "Decor Crew A"],
    tags: ["Birthday"],
    isVIP: false,
    proposalSentDate: "2025-11-28",
  },
  {
    id: 5,
    date: "2025-12-24",
    startTime: "19:00",
    endTime: "23:30",
    title: "Christmas Corporate Mixer – Nova Finserv",
    type: "Corporate",
    status: "Lead",
    city: "Ahmedabad",
    venue: "Skyline Ballroom",
    clientName: "Nova Finserv",
    owner: "Hardik",
    budget: 380000,
    expectedRevenue: 380000,
    expectedCost: 230000,
    vendors: [],
    crew: ["Hardik Vekariya"],
    tags: ["Corporate", "Lead"],
    isVIP: true,
    proposalSentDate: "2025-12-10",
  },
];

const seedChecklist: ChecklistItem[] = [
  {
    id: 101,
    eventId: 1,
    label: "Finalize Sangeet stage 3D layout",
    department: "Decor",
    dueDate: "2025-12-05",
    done: true,
  },
  {
    id: 102,
    eventId: 1,
    label: "Confirm DJ playlist with client",
    department: "Client",
    dueDate: "2025-12-10",
    done: false,
  },
  {
    id: 103,
    eventId: 1,
    label: "Advance payment to caterer",
    department: "Finance",
    dueDate: "2025-12-09",
    done: true,
  },
  {
    id: 104,
    eventId: 2,
    label: "Corporate backdrop design approval",
    department: "Decor",
    dueDate: "2025-12-08",
    done: false,
  },
  {
    id: 105,
    eventId: 3,
    label: "Send revised engagement proposal",
    department: "Finance",
    dueDate: "2025-12-12",
    done: false,
  },
  {
    id: 106,
    eventId: 4,
    label: "Book clown & kids entertainment",
    department: "Logistics",
    dueDate: "2025-12-15",
    done: false,
  },
];

/* ========= Helper functions ========= */

function classifyLoad(eventsForDay: CalendarEvent[]): DayLoadLevel {
  const count = eventsForDay.length;
  if (count === 0) return "light";
  if (count === 1) return "light";
  if (count === 2) return "medium";
  return "heavy";
}

function loadClassName(level: DayLoadLevel): string {
  if (level === "light") return "eventura-tag eventura-tag-green";
  if (level === "medium") return "eventura-tag eventura-tag-blue";
  return "eventura-tag eventura-tag-amber";
}

function detectConflicts(eventsForDay: CalendarEvent[]) {
  const crewMap: Record<string, number> = {};
  const venueMap: Record<string, number> = {};
  const vendorMap: Record<string, number> = {};

  eventsForDay.forEach((ev) => {
    ev.crew.forEach((c) => {
      crewMap[c] = (crewMap[c] || 0) + 1;
    });
    venueMap[ev.venue] = (venueMap[ev.venue] || 0) + 1;
    ev.vendors.forEach((v) => {
      vendorMap[v] = (vendorMap[v] || 0) + 1;
    });
  });

  const crewConflicts = Object.values(crewMap).some((v) => v > 1);
  const venueConflicts = Object.values(venueMap).some((v) => v > 1);
  const vendorConflicts = Object.values(vendorMap).some((v) => v > 1);

  return { crewConflicts, venueConflicts, vendorConflicts };
}

function dateToLabel(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function getMonthRange(events: CalendarEvent[]) {
  // Use month of first event as "current" month
  if (events.length === 0) {
    return { year: 2025, month: 12, daysInMonth: 31 };
  }
  const d = new Date(events[0].date + "T00:00:00");
  const year = d.getFullYear();
  const month = d.getMonth(); // 0-based
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  return { year, month: month + 1, daysInMonth };
}

/* ========= Calendar page ========= */

export default function CalendarPage() {
  const [user, setUser] = useState<User | null>(null);
  const [events] = useState<CalendarEvent[]>(seedEvents);
  const [checklist] = useState<ChecklistItem[]>(seedChecklist);
  const [viewMode, setViewMode] = useState<ViewMode>("month");
  const [selectedDate, setSelectedDate] = useState<string>(seedEvents[0]?.date ?? "2025-12-14");

  const [filters, setFilters] = useState<Filters>({
    city: "All",
    type: "All",
    status: "All",
    owner: "All",
    tag: "All",
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

  const filteredEvents = useMemo(() => {
    return events.filter((ev) => {
      if (filters.city !== "All" && ev.city !== filters.city) return false;
      if (filters.type !== "All" && ev.type !== filters.type) return false;
      if (filters.status !== "All" && ev.status !== filters.status) return false;
      if (filters.owner !== "All" && ev.owner !== filters.owner) return false;
      if (filters.tag !== "All" && !ev.tags.includes(filters.tag)) return false;
      return true;
    });
  }, [events, filters]);

  const eventsByDate = useMemo(() => {
    const map: Record<string, CalendarEvent[]> = {};
    filteredEvents.forEach((ev) => {
      if (!map[ev.date]) map[ev.date] = [];
      map[ev.date].push(ev);
    });
    // sort by time
    Object.values(map).forEach((arr) =>
      arr.sort((a, b) => a.startTime.localeCompare(b.startTime))
    );
    return map;
  }, [filteredEvents]);

  const checklistByEvent = useMemo(() => {
    const map: Record<number, ChecklistItem[]> = {};
    checklist.forEach((item) => {
      if (!map[item.eventId]) map[item.eventId] = [];
      map[item.eventId].push(item);
    });
    return map;
  }, [checklist]);

  const monthMeta = useMemo(() => getMonthRange(events), [events]);

  const isCEO = user?.role === "CEO";

  const monthSummary = useMemo(() => {
    const monthEvents = filteredEvents;
    const confirmed = monthEvents.filter((e) => e.status === "Confirmed");
    const totalRevenue = confirmed.reduce((sum, e) => sum + e.expectedRevenue, 0);
    const totalCost = confirmed.reduce((sum, e) => sum + e.expectedCost, 0);
    const profit = totalRevenue - totalCost;

    const overloadedDays: string[] = [];
    const lightDays: string[] = [];

    Object.entries(eventsByDate).forEach(([date, evs]) => {
      const level = classifyLoad(evs);
      if (level === "heavy") overloadedDays.push(date);
      if (level === "light" && evs.length > 0) lightDays.push(date);
    });

    return {
      totalEvents: monthEvents.length,
      confirmedCount: confirmed.length,
      totalRevenue,
      profit,
      overloadedDays,
      lightDays,
    };
  }, [filteredEvents, eventsByDate]);

  if (!user) return null;

  /* ========= Handlers ========= */

  function handleFilterChange(
    name: keyof Filters,
    value: string
  ) {
    setFilters((prev) => ({ ...prev, [name]: value }));
  }

  function openDate(date: string) {
    setSelectedDate(date);
    setViewMode("day");
  }

  /* ========= Render ========= */

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
              <h1 className="eventura-page-title">Calendar & Capacity Control</h1>
              <p className="eventura-subtitle">
                See all Eventura bookings, crew load and money on one smart calendar.
              </p>
            </div>
            <div className="eventura-chips-row">
              <button
                type="button"
                className={
                  "eventura-tag " +
                  (viewMode === "month" ? "eventura-tag-blue" : "eventura-tag-amber")
                }
                onClick={() => setViewMode("month")}
              >
                Month
              </button>
              <button
                type="button"
                className={
                  "eventura-tag " +
                  (viewMode === "week" ? "eventura-tag-blue" : "eventura-tag-amber")
                }
                onClick={() => setViewMode("week")}
              >
                Week
              </button>
              <button
                type="button"
                className={
                  "eventura-tag " +
                  (viewMode === "day" ? "eventura-tag-blue" : "eventura-tag-amber")
                }
                onClick={() => setViewMode("day")}
              >
                Day
              </button>
              <button
                type="button"
                className={
                  "eventura-tag " +
                  (viewMode === "list" ? "eventura-tag-blue" : "eventura-tag-amber")
                }
                onClick={() => setViewMode("list")}
              >
                List / Pipeline
              </button>
            </div>
          </div>

          {/* Filters & CEO summary */}
          <section className="eventura-columns">
            <div className="eventura-panel">
              <h2 className="eventura-panel-title">Filters</h2>
              <div className="eventura-form-grid">
                <div className="eventura-field">
                  <label className="eventura-label">City</label>
                  <select
                    className="eventura-input"
                    value={filters.city}
                    onChange={(e) => handleFilterChange("city", e.target.value)}
                  >
                    <option value="All">All</option>
                    <option value="Surat">Surat</option>
                    <option value="Ahmedabad">Ahmedabad</option>
                  </select>
                </div>
                <div className="eventura-field">
                  <label className="eventura-label">Event type</label>
                  <select
                    className="eventura-input"
                    value={filters.type}
                    onChange={(e) => handleFilterChange("type", e.target.value)}
                  >
                    <option value="All">All</option>
                    <option value="Wedding">Wedding</option>
                    <option value="Corporate">Corporate</option>
                    <option value="Birthday">Birthday</option>
                    <option value="Baby">Baby</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div className="eventura-field">
                  <label className="eventura-label">Status</label>
                  <select
                    className="eventura-input"
                    value={filters.status}
                    onChange={(e) => handleFilterChange("status", e.target.value)}
                  >
                    <option value="All">All</option>
                    <option value="Lead">Lead</option>
                    <option value="Tentative">Tentative</option>
                    <option value="Confirmed">Confirmed</option>
                    <option value="Pre-Event">Pre-Event</option>
                    <option value="Completed">Completed</option>
                    <option value="Cancelled">Cancelled</option>
                  </select>
                </div>
                <div className="eventura-field">
                  <label className="eventura-label">Owner</label>
                  <select
                    className="eventura-input"
                    value={filters.owner}
                    onChange={(e) => handleFilterChange("owner", e.target.value)}
                  >
                    <option value="All">All</option>
                    <option value="Hardik">Hardik</option>
                    <option value="Shubh">Shubh</option>
                    <option value="Dixit">Dixit</option>
                  </select>
                </div>
                <div className="eventura-field">
                  <label className="eventura-label">Tag</label>
                  <select
                    className="eventura-input"
                    value={filters.tag}
                    onChange={(e) => handleFilterChange("tag", e.target.value)}
                  >
                    <option value="All">All</option>
                    <option value="VIP">VIP</option>
                    <option value="Big-budget">Big-budget</option>
                    <option value="Lead">Lead</option>
                    <option value="Corporate">Corporate</option>
                    <option value="Birthday">Birthday</option>
                    <option value="Repeat client">Repeat client</option>
                    <option value="New client">New client</option>
                  </select>
                </div>
              </div>
            </div>

            {isCEO && (
              <div className="eventura-panel">
                <h2 className="eventura-panel-title">CEO view – this month</h2>
                <div className="eventura-grid">
                  <div className="eventura-card eventura-card-glow">
                    <p className="eventura-card-label">Total events</p>
                    <p className="eventura-card-value">{monthSummary.totalEvents}</p>
                    <p className="eventura-card-note">
                      Confirmed: {monthSummary.confirmedCount}
                    </p>
                  </div>
                  <div className="eventura-card eventura-card-glow">
                    <p className="eventura-card-label">Projected revenue</p>
                    <p className="eventura-card-value">
                      ₹{monthSummary.totalRevenue.toLocaleString("en-IN")}
                    </p>
                    <p className="eventura-card-note">Confirmed events only</p>
                  </div>
                  <div className="eventura-card eventura-card-glow">
                    <p className="eventura-card-label">Projected profit</p>
                    <p className="eventura-card-value">
                      ₹{monthSummary.profit.toLocaleString("en-IN")}
                    </p>
                    <p className="eventura-card-note">
                      Revenue minus expected vendor costs
                    </p>
                  </div>
                  <div className="eventura-card eventura-card-glow">
                    <p className="eventura-card-label">Risk days</p>
                    <p className="eventura-card-value">
                      {monthSummary.overloadedDays.length} overloaded
                    </p>
                    <p className="eventura-card-note">
                      Focus on staff and vendor planning.
                    </p>
                  </div>
                </div>
                <div className="eventura-actions" style={{ marginTop: "0.8rem" }}>
                  <Link href="/finance" className="eventura-button-secondary">
                    Open Finance for this month
                  </Link>
                </div>
              </div>
            )}
          </section>

          {/* Main view area */}
          {viewMode === "month" && (
            <MonthView
              monthMeta={monthMeta}
              eventsByDate={eventsByDate}
              selectedDate={selectedDate}
              onSelectDate={openDate}
            />
          )}

          {viewMode === "week" && (
            <WeekView
              selectedDate={selectedDate}
              events={filteredEvents}
              eventsByDate={eventsByDate}
              onSelectDate={openDate}
            />
          )}

          {viewMode === "day" && (
            <DayView
              selectedDate={selectedDate}
              events={filteredEvents}
              checklistByEvent={checklistByEvent}
            />
          )}

          {viewMode === "list" && (
            <ListView events={filteredEvents} checklistByEvent={checklistByEvent} />
          )}

          <footer className="eventura-footer">
            Eventura · Calendar & Capacity module · © {new Date().getFullYear()}
          </footer>
        </div>
      </div>
    </main>
  );
}

/* ========= Month view ========= */

function MonthView(props: {
  monthMeta: { year: number; month: number; daysInMonth: number };
  eventsByDate: Record<string, CalendarEvent[]>;
  selectedDate: string;
  onSelectDate: (date: string) => void;
}) {
  const { monthMeta, eventsByDate, selectedDate, onSelectDate } = props;
  const { year, month, daysInMonth } = monthMeta;

  const monthLabel = new Date(year, month - 1, 1).toLocaleDateString("en-IN", {
    month: "long",
    year: "numeric",
  });

  const daysArray = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  return (
    <section className="eventura-panel">
      <div className="eventura-panel-header">
        <h2 className="eventura-panel-title">Month view – {monthLabel}</h2>
        <p className="eventura-small-text">
          Click a day to open detailed day planning, tasks and finance.
        </p>
      </div>
      <div
        className="eventura-grid"
        style={{ gridTemplateColumns: "repeat(7, minmax(0, 1fr))" }}
      >
        {daysArray.map((day) => {
          const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(
            day
          ).padStart(2, "0")}`;
          const evs = eventsByDate[dateStr] || [];
          const load = classifyLoad(evs);
          const conflicts = detectConflicts(evs);
          const isSelected = selectedDate === dateStr;

          return (
            <button
              key={dateStr}
              type="button"
              className={
                "eventura-card eventura-calendar-day" +
                (isSelected ? " eventura-calendar-day-selected" : "")
              }
              onClick={() => onSelectDate(dateStr)}
            >
              <div className="eventura-calendar-day-header">
                <span className="eventura-calendar-day-number">{day}</span>
                {evs.length > 0 && (
                  <span className={loadClassName(load)}>
                    {evs.length} event{evs.length > 1 ? "s" : ""}
                  </span>
                )}
              </div>
              <div className="eventura-calendar-day-body">
                {evs.slice(0, 3).map((ev) => (
                  <div key={ev.id} className="eventura-small-text">
                    {ev.type === "Wedding" ? "💍" : ev.type === "Corporate" ? "🏢" : "🎉"}{" "}
                    {ev.title.length > 22
                      ? ev.title.slice(0, 22) + "..."
                      : ev.title}
                  </div>
                ))}
                {evs.length > 3 && (
                  <div className="eventura-small-text">+{evs.length - 3} more…</div>
                )}
              </div>
              <div className="eventura-calendar-day-footer">
                {conflicts.crewConflicts && (
                  <span className="eventura-tag eventura-tag-amber">
                    Crew conflict
                  </span>
                )}
                {conflicts.venueConflicts && (
                  <span className="eventura-tag eventura-tag-amber">
                    Venue conflict
                  </span>
                )}
                {conflicts.vendorConflicts && (
                  <span className="eventura-tag eventura-tag-amber">
                    Vendor conflict
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>
      <p className="eventura-small-text" style={{ marginTop: "0.5rem" }}>
        Green days are light, blue are moderate, amber are heavy load. Use heavy days to
        decide when to add freelancers.
      </p>
    </section>
  );
}

/* ========= Week view ========= */

function WeekView(props: {
  selectedDate: string;
  events: CalendarEvent[];
  eventsByDate: Record<string, CalendarEvent[]>;
  onSelectDate: (date: string) => void;
}) {
  const { selectedDate, eventsByDate, onSelectDate } = props;

  const start = new Date(selectedDate + "T00:00:00");
  const weekDays: string[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    const iso = d.toISOString().slice(0, 10);
    weekDays.push(iso);
  }

  const weekLabel = `${dateToLabel(weekDays[0])} – ${dateToLabel(
    weekDays[6]
  )}`;

  return (
    <section className="eventura-panel">
      <div className="eventura-panel-header">
        <h2 className="eventura-panel-title">Week view – {weekLabel}</h2>
        <p className="eventura-small-text">
          Timeline of events over the next 7 days from the selected date.
        </p>
      </div>
      <div className="eventura-week-grid">
        {weekDays.map((dateStr) => {
          const evs = eventsByDate[dateStr] || [];
          return (
            <div
              key={dateStr}
              className="eventura-week-column"
              onClick={() => onSelectDate(dateStr)}
            >
              <div className="eventura-week-column-header">
                <div className="eventura-list-title">
                  {new Date(dateStr + "T00:00:00").toLocaleDateString("en-IN", {
                    weekday: "short",
                    day: "numeric",
                    month: "short",
                  })}
                </div>
                <div className="eventura-list-sub">
                  {evs.length} event{evs.length !== 1 ? "s" : ""}
                </div>
              </div>
              <div className="eventura-week-column-body">
                {evs.length === 0 && (
                  <p className="eventura-small-text">No events this day.</p>
                )}
                {evs.map((ev) => (
                  <div key={ev.id} className="eventura-week-event-block">
                    <div className="eventura-list-title">
                      {ev.startTime} – {ev.endTime}
                    </div>
                    <div className="eventura-small-text">{ev.title}</div>
                    <div className="eventura-small-text">
                      {ev.city} · {ev.venue}
                    </div>
                    <div className="eventura-small-text">
                      Owner: {ev.owner} · Budget: ₹{ev.budget.toLocaleString("en-IN")}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

/* ========= Day view ========= */

function DayView(props: {
  selectedDate: string;
  events: CalendarEvent[];
  checklistByEvent: Record<number, ChecklistItem[]>;
}) {
  const { selectedDate, events, checklistByEvent } = props;
  const dayEvents = events
    .filter((e) => e.date === selectedDate)
    .sort((a, b) => a.startTime.localeCompare(b.startTime));

  const dayLabel = dateToLabel(selectedDate);

  const allTasksForDay: ChecklistItem[] = [];
  dayEvents.forEach((ev) => {
    const items = checklistByEvent[ev.id] || [];
    allTasksForDay.push(...items);
  });

  const overdueTasks = allTasksForDay.filter((t) => {
    if (t.done) return false;
    const today = new Date().toISOString().slice(0, 10);
    return t.dueDate < today;
  });

  return (
    <section className="eventura-columns">
      <div className="eventura-panel">
        <h2 className="eventura-panel-title">Day view – {dayLabel}</h2>
        {dayEvents.length === 0 ? (
          <p className="eventura-small-text">
            No events on this date. Great day to accept more bookings or use for
            planning.
          </p>
        ) : (
          <div className="eventura-table-wrapper">
            <table className="eventura-table">
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Event</th>
                  <th>Client & City</th>
                  <th>Money</th>
                  <th>Crew & Vendors</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {dayEvents.map((ev) => {
                  const tasks = checklistByEvent[ev.id] || [];
                  const doneCount = tasks.filter((t) => t.done).length;
                  const totalCount = tasks.length;

                  const margin = ev.expectedRevenue - ev.expectedCost;

                  return (
                    <tr key={ev.id}>
                      <td>
                        <div className="eventura-list-title">
                          {ev.startTime} – {ev.endTime}
                        </div>
                        <div className="eventura-small-text">{ev.type}</div>
                      </td>
                      <td>
                        <div className="eventura-list-title">{ev.title}</div>
                        <div className="eventura-list-sub">
                          Status: {ev.status}
                          {ev.isVIP && (
                            <span className="eventura-tag eventura-tag-amber" style={{ marginLeft: "0.4rem" }}>
                              VIP
                            </span>
                          )}
                        </div>
                        <div className="eventura-small-text">
                          Tags: {ev.tags.join(", ")}
                        </div>
                      </td>
                      <td>
                        <div className="eventura-list-title">{ev.clientName}</div>
                        <div className="eventura-small-text">
                          {ev.city} · {ev.venue}
                        </div>
                      </td>
                      <td>
                        <div className="eventura-small-text">
                          Revenue: ₹{ev.expectedRevenue.toLocaleString("en-IN")}
                        </div>
                        <div className="eventura-small-text">
                          Vendor cost: ₹{ev.expectedCost.toLocaleString("en-IN")}
                        </div>
                        <div className="eventura-small-text">
                          Margin: ₹{margin.toLocaleString("en-IN")}
                        </div>
                      </td>
                      <td>
                        <div className="eventura-small-text">
                          Crew: {ev.crew.join(", ")}
                        </div>
                        <div className="eventura-small-text">
                          Vendors:{" "}
                          {ev.vendors.length === 0
                            ? "Not fixed yet"
                            : ev.vendors.join(", ")}
                        </div>
                        <div className="eventura-small-text">
                          Tasks: {doneCount}/{totalCount} done
                        </div>
                      </td>
                      <td>
                        <div className="eventura-actions-vertical">
                          <button
                            type="button"
                            className="eventura-button-secondary"
                            onClick={() => {
                              const msg = encodeURIComponent(
                                `Hi ${ev.clientName}, just a quick reminder about your event "${ev.title}" on ${dayLabel}.`
                              );
                              const url = `https://wa.me/?text=${msg}`;
                              window.open(url, "_blank");
                            }}
                          >
                            WhatsApp client
                          </button>
                          <button
                            type="button"
                            className="eventura-button-secondary"
                            onClick={() => {
                              const msg = encodeURIComponent(
                                `Hi team, please check crew & vendor plan for "${ev.title}" on ${dayLabel}.`
                              );
                              const url = `https://wa.me/?text=${msg}`;
                              window.open(url, "_blank");
                            }}
                          >
                            WhatsApp internal
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="eventura-panel">
        <h2 className="eventura-panel-title">Tasks & checklist for this day</h2>
        {allTasksForDay.length === 0 ? (
          <p className="eventura-small-text">
            No tasks linked to events on this date yet. You can track decor, logistics,
            catering and finance from here in future versions.
          </p>
        ) : (
          <div className="eventura-table-wrapper">
            <table className="eventura-table">
              <thead>
                <tr>
                  <th>Task</th>
                  <th>Event</th>
                  <th>Department</th>
                  <th>Due</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {allTasksForDay.map((t) => {
                  const ev = events.find((e) => e.id === t.eventId);
                  if (!ev) return null;
                  const today = new Date().toISOString().slice(0, 10);
                  const isOverdue = !t.done && t.dueDate < today;
                  return (
                    <tr key={t.id}>
                      <td>{t.label}</td>
                      <td>
                        <div className="eventura-list-title">{ev.title}</div>
                        <div className="eventura-small-text">{ev.clientName}</div>
                      </td>
                      <td>{t.department}</td>
                      <td>{dateToLabel(t.dueDate)}</td>
                      <td>
                        {t.done ? (
                          <span className="eventura-tag eventura-tag-green">Done</span>
                        ) : isOverdue ? (
                          <span className="eventura-tag eventura-tag-amber">
                            Overdue
                          </span>
                        ) : (
                          <span className="eventura-tag eventura-tag-blue">
                            Pending
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {overdueTasks.length > 0 && (
          <>
            <h3 className="eventura-subsection-title" style={{ marginTop: "0.8rem" }}>
              Overdue tasks (alert)
            </h3>
            <ul className="eventura-bullets">
              {overdueTasks.map((t) => {
                const ev = events.find((e) => e.id === t.eventId);
                if (!ev) return null;
                return (
                  <li key={t.id}>
                    {t.label} –{" "}
                    <span className="eventura-small-text">
                      {ev.title} · Due {dateToLabel(t.dueDate)}
                    </span>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </div>
    </section>
  );
}

/* ========= List / pipeline view ========= */

function ListView(props: {
  events: CalendarEvent[];
  checklistByEvent: Record<number, ChecklistItem[]>;
}) {
  const { events, checklistByEvent } = props;

  const sorted = [...events].sort((a, b) => {
    if (a.date === b.date) return a.startTime.localeCompare(b.startTime);
    return a.date.localeCompare(b.date);
  });

  return (
    <section className="eventura-panel">
      <h2 className="eventura-panel-title">List & pipeline view</h2>
      <p className="eventura-small-text">
        Perfect for sales / CRM style work. Move leads from Lead {"→"} Tentative {"→"} Confirmed.
      </p>
      <div className="eventura-table-wrapper">
        <table className="eventura-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Event</th>
              <th>Client</th>
              <th>Status</th>
              <th>Owner</th>
              <th>Money</th>
              <th>Tasks</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((ev) => {
              const tasks = checklistByEvent[ev.id] || [];
              const doneCount = tasks.filter((t) => t.done).length;
              const proposalAgeDays = ev.proposalSentDate
                ? Math.round(
                    (Date.parse(new Date().toISOString().slice(0, 10)) -
                      Date.parse(ev.proposalSentDate)) /
                      (1000 * 60 * 60 * 24)
                  )
                : null;

              let statusClass = "eventura-tag eventura-tag-blue";
              if (ev.status === "Lead") statusClass = "eventura-tag eventura-tag-amber";
              if (ev.status === "Confirmed") statusClass = "eventura-tag eventura-tag-green";
              if (ev.status === "Cancelled") statusClass = "eventura-tag eventura-tag-amber";

              return (
                <tr key={ev.id}>
                  <td>{dateToLabel(ev.date)}</td>
                  <td>
                    <div className="eventura-list-title">{ev.title}</div>
                    <div className="eventura-small-text">
                      {ev.city} · {ev.type}
                    </div>
                  </td>
                  <td>
                    <div className="eventura-list-title">{ev.clientName}</div>
                    <div className="eventura-small-text">
                      Tags: {ev.tags.join(", ")}
                    </div>
                  </td>
                  <td>
                    <span className={statusClass}>{ev.status}</span>
                    {ev.status === "Lead" && proposalAgeDays !== null && proposalAgeDays >= 7 && (
                      <div className="eventura-small-text">
                        Follow-up: proposal sent {proposalAgeDays} days ago.
                      </div>
                    )}
                  </td>
                  <td>{ev.owner}</td>
                  <td>
                    <div className="eventura-small-text">
                      Budget: ₹{ev.budget.toLocaleString("en-IN")}
                    </div>
                    <div className="eventura-small-text">
                      Revenue: ₹{ev.expectedRevenue.toLocaleString("en-IN")}
                    </div>
                  </td>
                  <td>
                    <div className="eventura-small-text">
                      {doneCount}/{tasks.length} tasks done
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
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
          placeholder="Search events, clients, venues..."
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
