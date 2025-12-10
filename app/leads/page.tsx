"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";

type Role = "CEO" | "Staff";
type User = { name: string; role: Role };

type Lead = {
  id: number;
  name: string;
  source: string;
  budget: string;
  contact: string;
  status: string;
  notes: string;
};

const USER_KEY = "eventura-user";
const LEADS_KEY = "eventura-leads";

export default function LeadsPage() {
  const [user, setUser] = useState<User | null>(null);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [form, setForm] = useState<Omit<Lead, "id">>({
    name: "",
    source: "",
    budget: "",
    contact: "",
    status: "New",
    notes: "",
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    const raw = window.localStorage.getItem(USER_KEY);
    if (!raw) {
      window.location.href = "/login";
      return;
    }
    try {
      setUser(JSON.parse(raw));
    } catch {
      window.localStorage.removeItem(USER_KEY);
      window.location.href = "/login";
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const raw = window.localStorage.getItem(LEADS_KEY);
    if (raw) {
      try {
        setLeads(JSON.parse(raw));
      } catch (e) {
        console.error("Failed to parse leads", e);
      }
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(LEADS_KEY, JSON.stringify(leads));
  }, [leads]);

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
    if (!form.name) {
      alert("Lead name is required.");
      return;
    }

    const newLead: Lead = {
      id: Date.now(),
      ...form,
    };
    setLeads((prev) => [newLead, ...prev]);
    setForm({
      name: "",
      source: "",
      budget: "",
      contact: "",
      status: "New",
      notes: "",
    });
  }

  function handleClear() {
    if (!confirm("Clear all leads?")) return;
    setLeads([]);
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(LEADS_KEY);
    }
  }

  if (!user) return null;
  const isCEO = user.role === "CEO";

  return (
    <main className="eventura-page">
      <div className="eventura-shell">
        <header className="eventura-header">
          <div>
            <h1 className="eventura-title">Leads – Eventura CRM</h1>
            <p className="eventura-subtitle">
              Track leads from enquiry to converted client.
            </p>
          </div>
        </header>

        <nav className="eventura-nav">
          <Link href="/" className="eventura-nav-link">
            Dashboard
          </Link>
          <Link href="/events" className="eventura-nav-link">
            Events
          </Link>
          <Link
            href="/leads"
            className="eventura-nav-link eventura-nav-link-active"
          >
            Leads
          </Link>
          {isCEO && (
            <Link href="/finance" className="eventura-nav-link">
              Finance
            </Link>
          )}
        </nav>

        <section className="eventura-columns">
          <div>
            <h2 className="eventura-section-title">Add new lead</h2>
            <form className="eventura-form" onSubmit={handleSubmit}>
              <div className="eventura-form-grid">
                <div className="eventura-field">
                  <label className="eventura-label" htmlFor="name">
                    Lead name / contact
                  </label>
                  <input
                    id="name"
                    name="name"
                    className="eventura-input"
                    value={form.name}
                    onChange={handleChange}
                    placeholder="e.g. Mehta Family / Rakesh Mehta"
                  />
                </div>

                <div className="eventura-field">
                  <label className="eventura-label" htmlFor="source">
                    Source
                  </label>
                  <input
                    id="source"
                    name="source"
                    className="eventura-input"
                    value={form.source}
                    onChange={handleChange}
                    placeholder="Instagram / Vendor / Referral / Walk-in"
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
                    placeholder="e.g. 20,00,000"
                  />
                </div>

                <div className="eventura-field">
                  <label className="eventura-label" htmlFor="contact">
                    Contact details
                  </label>
                  <input
                    id="contact"
                    name="contact"
                    className="eventura-input"
                    value={form.contact}
                    onChange={handleChange}
                    placeholder="Phone / Email / City"
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
                    <option>Follow-Up</option>
                    <option>Converted</option>
                    <option>Lost</option>
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
                  placeholder="Extra context about this lead…"
                />
              </div>

              <div className="eventura-actions">
                <button type="submit" className="eventura-button">
                  Save lead
                </button>
                <button
                  type="button"
                  className="eventura-button-secondary"
                  onClick={handleClear}
                >
                  Clear all leads
                </button>
              </div>
            </form>
          </div>

          <div className="eventura-panel">
            <h2 className="eventura-panel-title">Lead pipeline</h2>
            {leads.length === 0 ? (
              <p style={{ fontSize: "0.8rem", color: "#9ca3af" }}>
                No leads yet. Add using the form on the left.
              </p>
            ) : (
              <ul className="eventura-list">
                {leads.map((lead) => (
                  <li key={lead.id} className="eventura-list-item">
                    <div>
                      <p className="eventura-list-title">{lead.name}</p>
                      <p className="eventura-list-sub">
                        {lead.source || "Source N/A"} · Budget: ₹
                        {lead.budget || "0"}
                      </p>
                      {lead.contact && (
                        <p
                          className="eventura-list-sub"
                          style={{ marginTop: "0.1rem" }}
                        >
                          Contact: {lead.contact}
                        </p>
                      )}
                      {lead.notes && (
                        <p
                          className="eventura-list-sub"
                          style={{ marginTop: "0.15rem" }}
                        >
                          Notes: {lead.notes}
                        </p>
                      )}
                    </div>
                    <span className="eventura-tag eventura-tag-blue">
                      {lead.status}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        <footer className="eventura-footer">
          Eventura · Leads CRM · © {new Date().getFullYear()}
        </footer>
      </div>
    </main>
  );
}
