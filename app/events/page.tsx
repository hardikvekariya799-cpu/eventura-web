"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";

type Role = "CEO" | "Staff";
type User = { name: string; role: Role; city: string };

type EventItem = {
  id: number;
  client: string;
  type: string;
  date: string;
  city: string;
  venue: string;
  guests: string;
  budget: string;
  revenue: string;
  margin: string;
  status: string;
  owner: string;
  notes: string;
};

const USER_KEY = "eventura-user";
const EVENTS_KEY = "eventura-events";

export default function EventsPage() {
  const [user, setUser] = useState<User | null>(null);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [form, setForm] = useState<Omit<EventItem, "id">>({
    client: "",
    type: "Wedding",
    date: "",
    city: "Surat",
    venue: "",
    guests: "",
    budget: "",
    revenue: "",
    margin: "",
    status: "New",
    owner: "",
    notes: "",
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
      setForm((prev) => ({ ...prev, owner: u.name }));
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
      } catch (e) {
        console.error("Failed to parse events", e);
      }
    }
  }, []);

  // save events
  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(EVENTS_KEY, JSON.stringify(events));
  }, [events]);

  function handleChange(
    e:
      | React.ChangeEvent<HTMLInputElement>
      | React.ChangeEvent<HTMLSelectElement>
      | React.ChangeEvent<HTMLTextAreaElement>
  ) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.client || !form.date) {
      alert("Client name and event date are required.");
      return;
    }
    const newEvent: EventItem = {
      id: Date.now(),
      ...form,
    };
    setEvents((prev) => [newEvent, ...prev]);
    setForm((prev) => ({
      ...prev,
      client: "",
      date: "",
      venue: "",
      guests: "",
      budget: "",
      revenue: "",
      margin: "",
      status: "New",
      notes: "",
    }));
  }

  function handleDelete(id: number) {
    if (!confirm("Delete this event?")) return;
    setEvents((prev) => prev.filter((ev) => ev.id !== id));
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
          <h1 className="eventura-page-title">Events</h1>
          <p className="eventura-subtitle">
            Manage all events across Surat, Ahmedabad, and Rajkot.
          </p>

          <section className="eventura-columns">
            {/* Form */}
            <div className="eventura-panel">
              <h2 className="eventura-panel-title">Create / Edit event</h2>
              <form className="eventura-form" onSubmit={handleSubmit}>
                <div className="eventura-form-grid">
                  <div className="eventura-field">
                    <label className="eventura-label" htmlFor="client">
                      Client & Event name
                    </label>
                    <input
                      id="client"
                      name="client"
                      className="eventura-input"
                      value={form.client}
                      onChange={handleChange}
                      placeholder="Patel Wedding Sangeet"
                    />
                  </div>

                  <div className="eventura-field">
                    <label className="eventura-label" htmlFor="type">
                      Event type
                    </label>
                    <select
                      id="type"
                      name="type"
                      className="eventura-select"
                      value={form.type}
                      onChange={handleChange}
                    >
                      <option>Wedding</option>
                      <option>Corporate</option>
                      <option>Party</option>
                      <option>Festival</option>
                      <option>Exhibition</option>
                    </select>
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
                    <label className="eventura-label" htmlFor="city">
                      City
                    </label>
                    <select
                      id="city"
                      name="city"
                      className="eventura-select"
                      value={form.city}
                      onChange={handleChange}
                    >
                      <option>Surat</option>
                      <option>Ahmedabad</option>
                      <option>Rajkot</option>
                    </select>
                  </div>

                  <div className="eventura-field">
                    <label className="eventura-label" htmlFor="venue">
                      Venue
                    </label>
                    <input
                      id="venue"
                      name="venue"
                      className="eventura-input"
                      value={form.venue}
                      onChange={handleChange}
                      placeholder="Laxmi Farm / Taj / Indoor"
                    />
                  </div>

                  <div className="eventura-field">
                    <label className="eventura-label" htmlFor="guests">
                      Guest count
                    </label>
                    <input
                      id="guests"
                      name="guests"
                      className="eventura-input"
                      value={form.guests}
                      onChange={handleChange}
                      placeholder="e.g. 450"
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
                    <label className="eventura-label" htmlFor="revenue">
                      Expected revenue (₹)
                    </label>
                    <input
                      id="revenue"
                      name="revenue"
                      className="eventura-input"
                      value={form.revenue}
                      onChange={handleChange}
                      placeholder="Client billing, e.g. 22,00,000"
                    />
                  </div>

                  <div className="eventura-field">
                    <label className="eventura-label" htmlFor="margin">
                      Expected profit %
                    </label>
                    <input
                      id="margin"
                      name="margin"
                      className="eventura-input"
                      value={form.margin}
                      onChange={handleChange}
                      placeholder="e.g. 28"
                    />
                  </div>

                  <div className="eventura-field">
                    <label className="eventura-label" htmlFor="status">
                      Status
                    </label>
                    <select
                      id="status"
                      name="status"
                      className="eventura-select"
                      value={form.status}
                      onChange={handleChange}
                    >
                      <option>New</option>
                      <option>Proposal Sent</option>
                      <option>Negotiation</option>
                      <option>Confirmed</option>
                      <option>Completed</option>
                    </select>
                  </div>

                  <div className="eventura-field">
                    <label className="eventura-label" htmlFor="owner">
                      Owner (staff)
                    </label>
                    <input
                      id="owner"
                      name="owner"
                      className="eventura-input"
                      value={form.owner}
                      onChange={handleChange}
                    />
                  </div>
                </div>

                <div className="eventura-field" style={{ marginTop: "0.75rem" }}>
                  <label className="eventura-label" htmlFor="notes">
                    Notes
                  </label>
                  <textarea
                    id="notes"
                    name="notes"
                    className="eventura-textarea"
                    value={form.notes}
                    onChange={handleChange}
                    placeholder="Client preferences, special instructions…"
                  />
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
              <h2 className="eventura-panel-title">Event list</h2>
              {events.length === 0 ? (
                <p className="eventura-small-text">
                  No events yet. Create your first event using the form.
                </p>
              ) : (
                <div className="eventura-table-wrapper">
                  <table className="eventura-table">
                    <thead>
                      <tr>
                        <th>Event ID</th>
                        <th>Client & Event</th>
                        <th>Type</th>
                        <th>Date</th>
                        <th>City</th>
                        <th>Budget (₹)</th>
                        <th>Revenue (₹)</th>
                        <th>Profit %</th>
                        <th>Status</th>
                        <th>Owner</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {events.map((ev) => (
                        <tr key={ev.id}>
                          <td>{ev.id}</td>
                          <td>{ev.client}</td>
                          <td>{ev.type}</td>
                          <td>{ev.date}</td>
                          <td>{ev.city}</td>
                          <td>{ev.budget}</td>
                          <td>{ev.revenue}</td>
                          <td>{ev.margin}</td>
                          <td>{ev.status}</td>
                          <td>{ev.owner}</td>
                          <td>
                            <button
                              className="eventura-link-button"
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

/* Reuse core sidebar + topbar to look like Dashboard */

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
        <SidebarLink href="/" label="Dashboard" icon="📊" active={active === "dashboard"} />
        <SidebarLink href="/events" label="Events" icon="🎉" active={active === "events"} />
        <SidebarLink href="/calendar" label="Calendar" icon="📅" active={active === "calendar"} />
        <SidebarLink href="/leads" label="Clients & Leads" icon="👥" active={active === "leads"} />
        <SidebarLink href="/vendors" label="Vendors" icon="🤝" active={active === "vendors"} />
        {isCEO && (
          <SidebarLink href="/finance" label="Finance" icon="💰" active={active === "finance"} />
        )}
        <SidebarLink href="/hr" label="HR & Team" icon="🧑‍💼" active={active === "hr"} />
        <SidebarLink href="/inventory" label="Inventory & Assets" icon="📦" active={active === "inventory"} />
        {isCEO && (
          <SidebarLink href="/reports" label="Reports & Analytics" icon="📈" active={active === "reports"} />
        )}
        {isCEO && (
          <SidebarLink href="/settings" label="Settings & Access" icon="⚙️" active={active === "settings"} />
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
