"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";

/** BASIC SHARED TYPES (same style as other pages) **/

type Role = "CEO" | "Staff";
type User = { name: string; role: Role; city: string };

const USER_KEY = "eventura-user";
const LEADS_KEY = "eventura-leads";
const EVENTS_KEY = "eventura-events";

type LeadStage =
  | "New"
  | "Contacted"
  | "Proposal Sent"
  | "Negotiation"
  | "Follow-Up"
  | "Confirmed"
  | "Lost";

type LeadItem = {
  id: number;
  clientName: string;
  phone: string;
  email: string;
  city: string;
  eventType: string;
  eventDate: string;
  budgetMin: string;
  budgetMax: string;
  source: string;
  stage: LeadStage;
  owner: string;
  notes: string;
  aiScore: number;
  probability: number;
};

type EventStatus =
  | "New Lead"
  | "Proposal Sent"
  | "Negotiation"
  | "Confirmed"
  | "Planning"
  | "In Execution"
  | "Completed"
  | "Cancelled";

type EventItem = {
  id: number;
  clientName: string;
  eventName: string;
  eventType: string;
  city: string;
  venue: string;
  date: string;
  guests: string;
  budget: string;
  status: EventStatus;
  leadSource: string;
  owner: string;
  notes: string;
};

/** SMALL HELPERS **/

function parseMoney(v: string): number {
  const cleaned = v.replace(/[₹, ]/g, "");
  const n = parseFloat(cleaned);
  return isNaN(n) ? 0 : n;
}

function formatCurrency(n: number): string {
  return n.toLocaleString("en-IN", { maximumFractionDigits: 0 });
}

/** MAIN PAGE COMPONENT **/

export default function LeadsPage() {
  const [user, setUser] = useState<User | null>(null);
  const [leads, setLeads] = useState<LeadItem[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);

  const [search, setSearch] = useState("");
  const [filterStage, setFilterStage] = useState<LeadStage | "All">("All");

  const [form, setForm] = useState({
    clientName: "",
    phone: "",
    email: "",
    city: "",
    eventType: "Wedding",
    eventDate: "",
    budgetMin: "",
    budgetMax: "",
    source: "",
    stage: "New" as LeadStage,
    owner: "",
    notes: "",
  });

  /** AUTH – REQUIRE LOGIN **/

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

  /** LOAD LEADS FROM LOCALSTORAGE **/

  useEffect(() => {
    if (typeof window === "undefined") return;
    const raw = window.localStorage.getItem(LEADS_KEY);
    if (!raw) {
      const seed: LeadItem[] = [
        {
          id: Date.now(),
          clientName: "Mehta Family",
          phone: "+91-98765-00001",
          email: "mehta@example.com",
          city: "Surat",
          eventType: "Wedding",
          eventDate: "",
          budgetMin: "1200000",
          budgetMax: "1800000",
          source: "Instagram",
          stage: "Proposal Sent",
          owner: "Hardik",
          notes: "Loves pastel decor + floral mandap.",
          aiScore: 82,
          probability: 78,
        },
      ];
      setLeads(seed);
      setSelectedId(seed[0].id);
      window.localStorage.setItem(LEADS_KEY, JSON.stringify(seed));
      return;
    }
    try {
      const parsed: LeadItem[] = JSON.parse(raw);
      setLeads(parsed);
      if (parsed.length > 0) setSelectedId(parsed[0].id);
    } catch {
      // ignore bad data
    }
  }, []);

  /** SAVE LEADS WHEN CHANGED **/

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(LEADS_KEY, JSON.stringify(leads));
  }, [leads]);

  /** FORM HANDLERS **/

  function handleFormChange(
    e:
      | React.ChangeEvent<HTMLInputElement>
      | React.ChangeEvent<HTMLSelectElement>
      | React.ChangeEvent<HTMLTextAreaElement>
  ) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  function computeScore(data: typeof form): { score: number; prob: number } {
    let score = 50;
    const avg =
      (parseMoney(data.budgetMin || "0") +
        parseMoney(data.budgetMax || "0")) /
      2;

    if (avg > 1500000) score += 15;
    else if (avg > 800000) score += 8;
    else if (avg < 300000) score -= 10;

    if (data.source === "Referral" || data.source === "Venue Partner")
      score += 12;
    else if (data.source === "Instagram" || data.source === "Website")
      score += 5;

    if (data.eventType === "Wedding" || data.eventType === "Corporate")
      score += 5;

    if (score > 99) score = 99;
    if (score < 5) score = 5;

    const prob = Math.max(5, Math.min(99, score + (Math.random() * 10 - 5)));
    return { score: Math.round(score), prob: Math.round(prob) };
  }

  function resetForm() {
    setEditingId(null);
    setForm({
      clientName: "",
      phone: "",
      email: "",
      city: "",
      eventType: "Wedding",
      eventDate: "",
      budgetMin: "",
      budgetMax: "",
      source: "",
      stage: "New",
      owner: user?.name ?? "",
      notes: "",
    });
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.clientName || !form.phone || !form.city) {
      alert("Client name, phone and city are required.");
      return;
    }

    const { score, prob } = computeScore(form);

    if (editingId == null) {
      const newLead: LeadItem = {
        id: Date.now(),
        ...form,
        aiScore: score,
        probability: prob,
      };
      setLeads((prev) => [newLead, ...prev]);
      setSelectedId(newLead.id);
    } else {
      setLeads((prev) =>
        prev.map((l) =>
          l.id === editingId ? { ...l, ...form, aiScore: score, probability: prob } : l
        )
      );
    }

    resetForm();
  }

  function handleEdit(id: number) {
    const lead = leads.find((l) => l.id === id);
    if (!lead) return;
    setEditingId(id);
    setForm({
      clientName: lead.clientName,
      phone: lead.phone,
      email: lead.email,
      city: lead.city,
      eventType: lead.eventType,
      eventDate: lead.eventDate,
      budgetMin: lead.budgetMin,
      budgetMax: lead.budgetMax,
      source: lead.source,
      stage: lead.stage,
      owner: lead.owner,
      notes: lead.notes,
    });
    setSelectedId(id);
  }

  function handleDelete(id: number) {
    if (!confirm("Delete this lead?")) return;
    setLeads((prev) => {
      const next = prev.filter((l) => l.id !== id);
      if (selectedId === id) setSelectedId(next.length ? next[0].id : null);
      if (editingId === id) resetForm();
      return next;
    });
  }

  function updateStage(id: number, stage: LeadStage) {
    setLeads((prev) =>
      prev.map((l) => (l.id === id ? { ...l, stage } : l))
    );
  }

  function convertToEvent(lead: LeadItem) {
    if (typeof window === "undefined") return;

    let events: EventItem[] = [];
    const raw = window.localStorage.getItem(EVENTS_KEY);
    if (raw) {
      try {
        events = JSON.parse(raw);
      } catch {
        events = [];
      }
    }

    const avgBudget =
      (parseMoney(lead.budgetMin || "0") +
        parseMoney(lead.budgetMax || "0")) /
      2;

    const newEvent: EventItem = {
      id: Date.now(),
      clientName: lead.clientName,
      eventName:
        lead.eventType === "Wedding"
          ? `${lead.clientName} Wedding`
          : `${lead.clientName} – ${lead.eventType}`,
      eventType: lead.eventType,
      city: lead.city,
      venue: "",
      date: lead.eventDate || "",
      guests: "",
      budget: avgBudget ? String(Math.round(avgBudget)) : "",
      status: "Confirmed",
      leadSource: lead.source || "Other",
      owner: lead.owner || "Hardik",
      notes: `Converted from lead: ${lead.clientName}`,
    };

    const nextEvents = [newEvent, ...events];
    window.localStorage.setItem(EVENTS_KEY, JSON.stringify(nextEvents));

    setLeads((prev) =>
      prev.map((l) =>
        l.id === lead.id ? { ...l, stage: "Confirmed" } : l
      )
    );

    alert("Lead converted to Event. Check Events tab.");
  }

  /** FILTERED VIEW **/

  const filteredLeads = leads.filter((lead) => {
    const matchStage =
      filterStage === "All" ? true : lead.stage === filterStage;
    const s = search.toLowerCase();
    const matchSearch =
      !s ||
      lead.clientName.toLowerCase().includes(s) ||
      lead.city.toLowerCase().includes(s) ||
      lead.phone.toLowerCase().includes(s);
    return matchStage && matchSearch;
  });

  const selectedLead = leads.find((l) => l.id === selectedId) || null;

  if (!user) return null;

  const isCEO = user.role === "CEO";

  return (
    <main className="eventura-os">
      <aside className="eventura-sidebar">
        <SidebarCore user={user} active="leads" />
      </aside>

      <div className="eventura-main">
        <TopbarCore user={user} />

        <div className="eventura-content">
          {/* HEADER */}
          <div className="eventura-header-row">
            <div>
              <h1 className="eventura-page-title">Clients & Leads</h1>
              <p className="eventura-subtitle">
                Track all enquiries, stages and conversion. Convert confirmed
                leads into Events in one click.
              </p>
            </div>
            <div className="eventura-actions">
              <button
                type="button"
                className="eventura-button"
                onClick={resetForm}
              >
                + New lead
              </button>
            </div>
          </div>

          {/* FILTER BAR */}
          <div className="eventura-panel" style={{ marginBottom: "1rem" }}>
            <div className="eventura-form-grid">
              <div className="eventura-field">
                <input
                  className="eventura-input"
                  placeholder="Search by name, phone, city..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <div className="eventura-field">
                <select
                  className="eventura-input"
                  value={filterStage}
                  onChange={(e) =>
                    setFilterStage(
                      e.target.value === "All"
                        ? "All"
                        : (e.target.value as LeadStage)
                    )
                  }
                >
                  <option value="All">All stages</option>
                  <option>New</option>
                  <option>Contacted</option>
                  <option>Proposal Sent</option>
                  <option>Negotiation</option>
                  <option>Follow-Up</option>
                  <option>Confirmed</option>
                  <option>Lost</option>
                </select>
              </div>
            </div>
          </div>

          {/* 3 COLUMNS: FORM | LIST | DETAIL */}
          <div
            className="eventura-columns"
            style={{
              gridTemplateColumns:
                "minmax(0, 1.2fr) minmax(0, 1.4fr) minmax(0, 1.4fr)",
            }}
          >
            {/* FORM */}
            <div className="eventura-panel">
              <h2 className="eventura-panel-title">
                {editingId ? "Edit lead" : "Add lead"}
              </h2>
              <form className="eventura-form" onSubmit={handleSubmit}>
                <div className="eventura-form-grid">
                  <div className="eventura-field">
                    <label className="eventura-label">Client name</label>
                    <input
                      name="clientName"
                      className="eventura-input"
                      value={form.clientName}
                      onChange={handleFormChange}
                    />
                  </div>
                  <div className="eventura-field">
                    <label className="eventura-label">Phone</label>
                    <input
                      name="phone"
                      className="eventura-input"
                      value={form.phone}
                      onChange={handleFormChange}
                    />
                  </div>
                </div>

                <div className="eventura-form-grid">
                  <div className="eventura-field">
                    <label className="eventura-label">Email</label>
                    <input
                      name="email"
                      className="eventura-input"
                      value={form.email}
                      onChange={handleFormChange}
                    />
                  </div>
                  <div className="eventura-field">
                    <label className="eventura-label">City</label>
                    <input
                      name="city"
                      className="eventura-input"
                      value={form.city}
                      onChange={handleFormChange}
                    />
                  </div>
                </div>

                <div className="eventura-form-grid">
                  <div className="eventura-field">
                    <label className="eventura-label">Event type</label>
                    <select
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
                    <label className="eventura-label">Event date</label>
                    <input
                      type="date"
                      name="eventDate"
                      className="eventura-input"
                      value={form.eventDate}
                      onChange={handleFormChange}
                    />
                  </div>
                </div>

                <div className="eventura-form-grid">
                  <div className="eventura-field">
                    <label className="eventura-label">Budget min (₹)</label>
                    <input
                      name="budgetMin"
                      className="eventura-input"
                      value={form.budgetMin}
                      onChange={handleFormChange}
                    />
                  </div>
                  <div className="eventura-field">
                    <label className="eventura-label">Budget max (₹)</label>
                    <input
                      name="budgetMax"
                      className="eventura-input"
                      value={form.budgetMax}
                      onChange={handleFormChange}
                    />
                  </div>
                </div>

                <div className="eventura-form-grid">
                  <div className="eventura-field">
                    <label className="eventura-label">Source</label>
                    <input
                      name="source"
                      className="eventura-input"
                      value={form.source}
                      onChange={handleFormChange}
                      placeholder="Instagram / Referral / Venue…"
                    />
                  </div>
                  <div className="eventura-field">
                    <label className="eventura-label">Stage</label>
                    <select
                      name="stage"
                      className="eventura-input"
                      value={form.stage}
                      onChange={handleFormChange}
                    >
                      <option>New</option>
                      <option>Contacted</option>
                      <option>Proposal Sent</option>
                      <option>Negotiation</option>
                      <option>Follow-Up</option>
                      <option>Confirmed</option>
                      <option>Lost</option>
                    </select>
                  </div>
                </div>

                <div className="eventura-field">
                  <label className="eventura-label">Owner</label>
                  <input
                    name="owner"
                    className="eventura-input"
                    value={form.owner}
                    onChange={handleFormChange}
                    placeholder="Hardik / Shubh / Dixit"
                  />
                </div>

                <div className="eventura-field">
                  <label className="eventura-label">Notes</label>
                  <textarea
                    name="notes"
                    className="eventura-textarea"
                    value={form.notes}
                    onChange={handleFormChange}
                    placeholder="Client preferences, objections, etc."
                  />
                </div>

                <div className="eventura-actions">
                  <button type="submit" className="eventura-button">
                    {editingId ? "Update lead" : "Save lead"}
                  </button>
                  {editingId && (
                    <button
                      type="button"
                      className="eventura-button-secondary"
                      onClick={resetForm}
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </form>
            </div>

            {/* LIST */}
            <div className="eventura-panel">
              <h2 className="eventura-panel-title">
                Leads ({filteredLeads.length})
              </h2>
              <div className="eventura-table-wrapper" style={{ marginTop: "0.5rem" }}>
                {filteredLeads.length === 0 ? (
                  <p style={{ fontSize: "0.8rem", color: "#9ca3af" }}>
                    No leads yet. Add from the left panel.
                  </p>
                ) : (
                  <table className="eventura-table">
                    <thead>
                      <tr>
                        <th>Score</th>
                        <th>Client</th>
                        <th>City</th>
                        <th>Budget</th>
                        <th>Stage</th>
                        <th />
                      </tr>
                    </thead>
                    <tbody>
                      {filteredLeads.map((lead) => {
                        const score = lead.aiScore;
                        const scoreClass =
                          score >= 90
                            ? "eventura-tag-green"
                            : score >= 60
                            ? "eventura-tag-blue"
                            : "eventura-tag-amber";

                        const min = parseMoney(lead.budgetMin || "0");
                        const max = parseMoney(lead.budgetMax || "0");

                        return (
                          <tr
                            key={lead.id}
                            className={
                              lead.id === selectedId ? "eventura-row-active" : ""
                            }
                            onClick={() => setSelectedId(lead.id)}
                          >
                            <td>
                              <span className={`eventura-tag ${scoreClass}`}>
                                {score}
                              </span>
                            </td>
                            <td>
                              <div className="eventura-list-title">
                                {lead.clientName}
                              </div>
                              <div className="eventura-list-sub">
                                {lead.phone}
                              </div>
                            </td>
                            <td>{lead.city}</td>
                            <td>
                              {min || max
                                ? `₹${formatCurrency(min)} – ₹${formatCurrency(
                                    max
                                  )}`
                                : "–"}
                            </td>
                            <td>{lead.stage}</td>
                            <td>
                              <div
                                style={{
                                  display: "flex",
                                  gap: "0.3rem",
                                  justifyContent: "flex-end",
                                }}
                              >
                                <button
                                  type="button"
                                  className="eventura-tag eventura-tag-blue"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleEdit(lead.id);
                                  }}
                                >
                                  Edit
                                </button>
                                <button
                                  type="button"
                                  className="eventura-tag eventura-tag-amber"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDelete(lead.id);
                                  }}
                                >
                                  Delete
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </div>

            {/* DETAIL */}
            <div className="eventura-panel">
              {!selectedLead ? (
                <p style={{ fontSize: "0.8rem", color: "#9ca3af" }}>
                  Select a lead to see details and convert to Event.
                </p>
              ) : (
                <>
                  <h2 className="eventura-panel-title">
                    {selectedLead.clientName}
                  </h2>
                  <p className="eventura-subtitle">
                    {selectedLead.eventType} · {selectedLead.city}
                  </p>

                  <ul className="eventura-bullets" style={{ marginTop: "0.6rem" }}>
                    <li>Phone: {selectedLead.phone || "–"}</li>
                    <li>Email: {selectedLead.email || "–"}</li>
                    <li>Source: {selectedLead.source || "–"}</li>
                    <li>Owner: {selectedLead.owner || "Unassigned"}</li>
                    <li>
                      Budget:{" "}
                      {selectedLead.budgetMin || selectedLead.budgetMax
                        ? `₹${formatCurrency(
                            parseMoney(selectedLead.budgetMin || "0")
                          )} – ₹${formatCurrency(
                            parseMoney(selectedLead.budgetMax || "0")
                          )}`
                        : "Not shared"}
                    </li>
                    <li>Stage: {selectedLead.stage}</li>
                    <li>
                      Chance to close: {selectedLead.probability}% (AI estimate)
                    </li>
                  </ul>

                  {selectedLead.notes && (
                    <>
                      <h3
                        className="eventura-subsection-title"
                        style={{ marginTop: "0.6rem" }}
                      >
                        Notes
                      </h3>
                      <p className="eventura-small-text">{selectedLead.notes}</p>
                    </>
                  )}

                  <h3
                    className="eventura-subsection-title"
                    style={{ marginTop: "0.6rem" }}
                  >
                    Quick stage update
                  </h3>
                  <div className="eventura-chips-row">
                    {([
                      "New",
                      "Contacted",
                      "Proposal Sent",
                      "Negotiation",
                      "Follow-Up",
                      "Confirmed",
                      "Lost",
                    ] as LeadStage[]).map((s) => (
                      <button
                        key={s}
                        type="button"
                        className={
                          "eventura-tag " +
                          (selectedLead.stage === s
                            ? "eventura-tag-blue"
                            : "eventura-tag-amber")
                        }
                        onClick={() => updateStage(selectedLead.id, s)}
                      >
                        {s}
                      </button>
                    ))}
                  </div>

                  <div className="eventura-actions" style={{ marginTop: "0.8rem" }}>
                    <button
                      type="button"
                      className="eventura-button"
                      onClick={() => convertToEvent(selectedLead)}
                    >
                      Convert to Event
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

/** SHARED LAYOUT COMPONENTS (SIDEBAR + TOPBAR) **/

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
          placeholder="Search events, leads, vendors..."
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
