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
  status: string; // New / Proposal Sent / Negotiation / Confirmed / Completed
};

const USER_KEY = "eventura-user";
const EVENTS_KEY = "eventura-events";

export default function EventsPage() {
  const [user, setUser] = useState<User | null>(null);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [form, setForm] = useState<Omit<EventItem, "id">>({
    client: "",
    eventName: "",
    eventType: "",
    city: "",
    date: "",
    budget: "",
    status: "New",
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

    // pre-fill date from ?date=YYYY-MM-DD (when coming from calendar)
    const params = new URLSearchParams(window.location.search);
    const dateParam = params.get("date");
    if (dateParam) {
      setForm((prev) => ({ ...prev, date: dateParam }));
    }
  }, []);

  // Save events automatically
  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(EVENTS_KEY, JSON.stringify(events));
  }, [events]);

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); // important: stops page from refreshing & deleting input

    if (!form.client || !form.date) {
      alert("Client name and date are required.");
      return;
    }

    const newEvent: EventItem = {
      id: Date.now(),
      ...form,
    };

    setEvents((prev) => [newEvent, ...prev]);

    // keep values? or clear?
    // We’ll clear, but you can comment this out if you want them to stay.
    setForm({
      client: "",
      eventName: "",
      eventType: "",
      city: "",
      date: "",
      budget: "",
      status: "New",
    });
  }

  function handleDelete(id: number) {
    if (!confirm("Delete this event?")) return;
    setEvents((prev) => prev.filter((e) => e.id !== id));
  }

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
          <h1 className="eventura-title">Events</h1>
          <p className="eventura-subtitle">
            Create and manage all Eventura events. These records power your
            dashboard, pipeline and calendar.
          </p>

          <section className="eventura-columns">
            {/* Form */}
            <div>
              <h2 className="eventura-panel-title">Add event</h2>
              <form className="eventura-form" onSubmit={handleSubmit}>
                <div className="eventura-form-grid">
                  <div className="eventura-field">
                    <label className="eventura-label" htmlFor="client">
                      Client name
                    </label>
                    <input
                      id="client"
                      name="client"
                      className="eventura-input"
                      value={form.client}
                      onChange={handleChange}
                      placeholder="e.g. Mehta Family"
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
                      onChange={handleChange}
                      placeholder="e.g. Wedding Sangeet"
                    />
                  </div>

                  <div className="eventura-field">
                    <label className="eventura-label" htmlFor="eventType">
                      Event type
                    </label>
                    <input
                      id="eventType"
                      name="eventType"
                      className="eventura-input"
                      value={form.eventType}
                      onChange={handleChange}
                      placeholder="Wedding / Corporate / Party / Festival"
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
                      onChange={handleChange}
                      placeholder="Surat / Ahmedabad / Rajkot"
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
                      onChange={handleChange}
                    />
                  </div>

                  <div className="eventura-field">
                    <label className="eventura-label" htmlFor="budget">
                      Budget (₹)
                    </label>
                    <input
                      id="budget"
                      name="budget"
                      className="eventura-input"
                      value={form.budget}
                      onChange={handleChange}
                      placeholder="e.g. 18,50,000"
                    />
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
                      onChange={handleChange}
                    >
                      <option value="New">New</option>
                      <option value="Proposal Sent">Proposal Sent</option>
                      <option value="Negotiation">Negotiation</option>
                      <option value="Confirmed">Confirmed</option>
                      <option value="Completed">Completed</option>
                    </select>
                  </div>
                </div>

                <div className="eventura-actions">
                  <button type="submit" className="eventura-button">
                    Save event
                  </button>
                </div>
              </form>
            </div>

            {/* List */}
            <div className="eventura-panel">
              <h2 className="eventura-panel-title">All events</h2>
              {events.length === 0 ? (
                <p className="eventura-small-text">
                  No events yet. Add your first event using the form.
                </p>
              ) : (
                <div className="eventura-table-wrapper">
                  <table className="eventura-table">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Client</th>
                        <th>Event</th>
                        <th>City</th>
                        <th>Budget (₹)</th>
                        <th>Status</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {events
                        .slice()
                        .sort((a, b) => (a.date > b.date ? 1 : -1))
                        .map((ev) => (
                          <tr key={ev.id}>
                            <td>{ev.date}</td>
                            <td>{ev.client}</td>
                            <td>{ev.eventName || ev.eventType}</td>
                            <td>{ev.city}</td>
                            <td>{ev.budget}</td>
                            <td>{ev.status}</td>
                            <td>
                              <button
                                className="eventura-button-secondary"
                                type="button"
                                onClick={() => handleDelete(ev.id)}
                              >
                                Delete
                              </button>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}

/* Re-use common layout pieces */

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
          placeholder="Search events..."
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
