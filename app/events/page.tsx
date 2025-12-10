"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";

type EventItem = {
  id: number;
  client: string;
  date: string;
  venue: string;
  guests: string;
  budget: string;
  status: string;
  notes: string;
};

const STORAGE_KEY = "eventura-events";

export default function EventsPage() {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [form, setForm] = useState<Omit<EventItem, "id">>({
    client: "",
    date: "",
    venue: "",
    guests: "",
    budget: "",
    status: "Proposal sent",
    notes: "",
  });

  // Load events from localStorage on first load
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        setEvents(JSON.parse(raw));
      }
    } catch (e) {
      console.error("Failed to load events from storage", e);
    }
  }, []);

  // Save events to localStorage whenever they change
  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
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
      alert("Client name and date are required.");
      return;
    }

    const newEvent: EventItem = {
      id: Date.now(),
      ...form,
    };

    setEvents((prev) => [newEvent, ...prev]);
    setForm({
      client: "",
      date: "",
      venue: "",
      guests: "",
      budget: "",
      status: "Proposal sent",
      notes: "",
    });
  }

  function handleClear() {
    if (!confirm("Clear all saved events?")) return;
    setEvents([]);
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  }

  function statusTagClass(status: string) {
    if (status === "Confirmed") return "eventura-tag eventura-tag-green";
    if (status === "Pending advance") return "eventura-tag eventura-tag-amber";
    return "eventura-tag eventura-tag-blue";
  }

  return (
    <main className="eventura-page">
      <div className="eventura-shell">
        {/* Header */}
        <header className="eventura-header">
          <div>
            <h1 className="eventura-title">Events – Eventura</h1>
            <p className="eventura-subtitle">
              Add new events, track status, and quickly see your event pipeline.
            </p>
          </div>
        </header>

        {/* Nav */}
        <nav className="eventura-nav">
          <Link href="/" className="eventura-nav-link">
            Dashboard
          </Link>
          <Link
            href="/events"
            className="eventura-nav-link eventura-nav-link-active"
          >
            Events
          </Link>
          <Link href="/finance" className="eventura-nav-link">
            Finance
          </Link>
        </nav>

        {/* Layout: form + list */}
        <section className="eventura-columns">
          {/* Form panel */}
          <div>
            <h2 className="eventura-section-title">Add new event</h2>
            <form className="eventura-form" onSubmit={handleSubmit}>
              <div className="eventura-form-grid">
                <div className="eventura-field">
                  <label className="eventura-label" htmlFor="client">
                    Client / Event name
                  </label>
                  <input
                    id="client"
                    name="client"
                    className="eventura-input"
                    value={form.client}
                    onChange={handleChange}
                    placeholder="e.g. Patel Wedding Sangeet"
                  />
                </div>

                <div className="eventura-field">
                  <label className="eventura-label" htmlFor="date">
                    Date
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
                  <label className="eventura-label" htmlFor="venue">
                    Venue
                  </label>
                  <input
                    id="venue"
                    name="venue"
                    className="eventura-input"
                    value={form.venue}
                    onChange={handleChange}
                    placeholder="Farm / hotel / indoor"
                  />
                </div>

                <div className="eventura-field">
                  <label className="eventura-label" htmlFor="guests">
                    Guests
                  </label>
                  <input
                    id="guests"
                    name="guests"
                    className="eventura-input"
                    value={form.guests}
                    onChange={handleChange}
                    placeholder="e.g. 300"
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
                    placeholder="e.g. 18,00,000"
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
                    <option>Proposal sent</option>
                    <option>Pending advance</option>
                    <option>Confirmed</option>
                    <option>Completed</option>
                  </select>
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
                  placeholder="Special requirements, vendor notes, styling ideas…"
                />
              </div>

              <div className="eventura-actions">
                <button type="submit" className="eventura-button">
                  Save event
                </button>
                <button
                  type="button"
                  className="eventura-button-secondary"
                  onClick={handleClear}
                >
                  Clear all events
                </button>
              </div>
            </form>
          </div>

          {/* List panel */}
          <div className="eventura-panel">
            <h2 className="eventura-panel-title">Event pipeline</h2>
            {events.length === 0 ? (
              <p style={{ fontSize: "0.8rem", color: "#9ca3af" }}>
                No events saved yet. Add an event using the form on the left.
              </p>
            ) : (
              <ul className="eventura-list">
                {events.map((ev) => (
                  <li key={ev.id} className="eventura-list-item">
                    <div>
                      <p className="eventura-list-title">{ev.client}</p>
                      <p className="eventura-list-sub">
                        {ev.date} · {ev.venue || "Venue TBC"} ·{" "}
                        {ev.guests ? `${ev.guests} guests` : "Guest count TBC"}
                      </p>
                      {ev.budget && (
                        <p
                          className="eventura-list-sub"
                          style={{ marginTop: "0.1rem" }}
                        >
                          Budget: ₹{ev.budget}
                        </p>
                      )}
                      {ev.notes && (
                        <p
                          className="eventura-list-sub"
                          style={{ marginTop: "0.15rem" }}
                        >
                          Notes: {ev.notes}
                        </p>
                      )}
                    </div>
                    <span className={statusTagClass(ev.status)}>
                      {ev.status}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        <footer className="eventura-footer">
          Eventura · Events module · © {new Date().getFullYear()}
        </footer>
      </div>
    </main>
  );
}
