"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";

type Role = "CEO" | "Staff";
type User = { name: string; role: Role; city: string };
type EventItem = {
  id: number;
  client: string;
  eventName: string;
  eventType: string;
  city: string;
  date: string; // YYYY-MM-DD
  budget: string;
  status: string;
};

const USER_KEY = "eventura-user";
const EVENTS_KEY = "eventura-events";

export default function CalendarPage() {
  const [user, setUser] = useState<User | null>(null);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [currentMonth, setCurrentMonth] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

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
    } catch {
      window.localStorage.removeItem(USER_KEY);
      window.location.href = "/login";
    }
  }, []);

  // Load events
  useEffect(() => {
    if (typeof window === "undefined") return;
    const raw = window.localStorage.getItem(EVENTS_KEY);
    if (raw) {
      try {
        setEvents(JSON.parse(raw));
      } catch (e) {
        console.error("Failed to parse events", e);
      }
    }
  }, []);

  if (!user) return null;

  const year = currentMonth.getFullYear();
  const monthIndex = currentMonth.getMonth(); // 0-11
  const monthLabel = currentMonth.toLocaleDateString("en-IN", {
    month: "long",
    year: "numeric",
  });

  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();

  function getDateString(day: number): string {
    const mm = String(monthIndex + 1).padStart(2, "0");
    const dd = String(day).padStart(2, "0");
    return `${year}-${mm}-${dd}`;
  }

  function eventsForDate(dateStr: string) {
    return events.filter((ev) => ev.date === dateStr);
  }

  function changeMonth(offset: number) {
    setCurrentMonth(
      (prev) => new Date(prev.getFullYear(), prev.getMonth() + offset, 1)
    );
    setSelectedDate(null);
  }

  const selectedEvents = selectedDate ? eventsForDate(selectedDate) : [];

  return (
    <main className="eventura-os">
      <aside className="eventura-sidebar">
        <SidebarCore user={user} active="calendar" />
      </aside>

      <div className="eventura-main">
        <TopbarCore user={user} />

        <div className="eventura-content">
          <h1 className="eventura-title">Calendar</h1>

          <section className="eventura-columns">
            {/* Month grid */}
            <div className="eventura-panel">
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "0.75rem",
                }}
              >
                <button
                  className="eventura-button-secondary"
                  type="button"
                  onClick={() => changeMonth(-1)}
                >
                  ← Prev
                </button>
                <div style={{ fontSize: "0.9rem", fontWeight: 600 }}>
                  {monthLabel}
                </div>
                <button
                  className="eventura-button-secondary"
                  type="button"
                  onClick={() => changeMonth(1)}
                >
                  Next →
                </button>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(7, 1fr)",
                  gap: "6px",
                  fontSize: "0.75rem",
                }}
              >
                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
                  <div
                    key={d}
                    style={{
                      textAlign: "center",
                      color: "#9ca3af",
                      marginBottom: "0.25rem",
                    }}
                  >
                    {d}
                  </div>
                ))}

                {Array.from({ length: daysInMonth }).map((_, i) => {
                  const day = i + 1;
                  const dateStr = getDateString(day);
                  const count = eventsForDate(dateStr).length;
                  const isSelected = selectedDate === dateStr;

                  return (
                    <button
                      key={dateStr}
                      type="button"
                      onClick={() => setSelectedDate(dateStr)}
                      style={{
                        height: "55px",
                        borderRadius: "10px",
                        border: isSelected
                          ? "1px solid #a855f7"
                          : "1px solid #1f2937",
                        background: isSelected
                          ? "radial-gradient(circle at top, #a855f7, #4c1d95)"
                          : "#020617",
                        color: "#e5e7eb",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "3px",
                      }}
                    >
                      <span>{day}</span>
                      {count > 0 && (
                        <span style={{ fontSize: "0.65rem", color: "#facc15" }}>
                          {count} evt
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Right side: selected date events */}
            <div className="eventura-panel">
              <h2 className="eventura-panel-title">
                {selectedDate ? `Events on ${selectedDate}` : "Select a date"}
              </h2>

              {!selectedDate && (
                <p className="eventura-small-text">
                  Click on a date in the calendar to see its events.
                </p>
              )}

              {selectedDate && (
                <>
                  <Link
                    href={`/events?date=${selectedDate}`}
                    className="eventura-button"
                  >
                    + Add event on this date
                  </Link>

                  {selectedEvents.length === 0 ? (
                    <p
                      className="eventura-small-text"
                      style={{ marginTop: "0.75rem" }}
                    >
                      No events yet on this date.
                    </p>
                  ) : (
                    <ul className="eventura-list" style={{ marginTop: "0.9rem" }}>
                      {selectedEvents.map((ev) => (
                        <li key={ev.id} className="eventura-list-item">
                          <div>
                            <div className="eventura-list-title">
                              {ev.client} – {ev.eventName || ev.eventType}
                            </div>
                            <div className="eventura-list-sub">
                              {ev.city} · Budget: ₹{ev.budget}
                            </div>
                          </div>
                          <span className="eventura-tag eventura-tag-blue">
                            {ev.status}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </>
              )}
            </div>
          </section>

          <footer className="eventura-footer">
            Eventura · Calendar module · © {new Date().getFullYear()}
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
