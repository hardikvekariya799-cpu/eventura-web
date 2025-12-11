"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";

/* ===== Shared types & storage keys ===== */

type Role = "CEO" | "Staff";
type User = { name: string; role: Role; city: string };

const USER_KEY = "eventura-user";
const LEADS_KEY = "eventura-leads";
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

type EventItem = {
  id: number;
  clientName: string;
  eventName: string;
  eventType: EventType;
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

type LeadStage =
  | "New"
  | "Contacted"
  | "Proposal Sent"
  | "Negotiation"
  | "Follow-Up"
  | "Confirmed"
  | "Lost";

type LeadSource =
  | "Instagram"
  | "Facebook"
  | "Website"
  | "Referral"
  | "Venue Partner"
  | "Google Ads"
  | "Walk-in"
  | "Other";

type InteractionType = "WhatsApp" | "Call" | "Email" | "Meeting" | "Site Visit";

type Interaction = {
  id: number;
  type: InteractionType;
  note: string;
  at: string; // ISO datetime
};

type LeadTaskStatus = "Open" | "Done";

type LeadTask = {
  id: number;
  title: string;
  assignee: string;
  dueDate: string;
  priority: "Low" | "Medium" | "High";
  status: LeadTaskStatus;
};

type LeadItem = {
  id: number;
  clientName: string;
  contactPhone: string;
  contactEmail: string;
  city: string;
  relationship: string; // Bride / Groom / Corporate Contact etc.
  socialHandle: string;
  eventType: EventType;
  eventDate: string; // tentative/fixed date
  guestCount: string;
  venuePreference: string;
  stylePreference: string;
  colourPreference: string;
  foodPreference: string;
  budgetMin: string;
  budgetMax: string;
  leadSource: LeadSource | "";
  stage: LeadStage;
  assignedTo: string;
  notes: string;

  interactions?: Interaction[];
  tasks?: LeadTask[];

  aiScore?: number; // 0-100
  conversionProbability?: number; // %
  lastContactAt?: string;
  convertedEventId?: number | null;
};

function parseMoney(value: string): number {
  const cleaned = value.replace(/[₹, ,]/g, "");
  const n = parseFloat(cleaned);
  return isNaN(n) ? 0 : n;
}

function formatCurrency(value: number): string {
  return value.toLocaleString("en-IN", { maximumFractionDigits: 0 });
}

/* ====== MAIN PAGE ====== */

export default function LeadsPage() {
  const [user, setUser] = useState<User | null>(null);
  const [leads, setLeads] = useState<LeadItem[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);

  const [search, setSearch] = useState("");
  const [filterCity, setFilterCity] = useState<string>("All");
  const [filterStage, setFilterStage] = useState<LeadStage | "All">("All");
  const [filterSource, setFilterSource] = useState<string>("All");

  const [viewMode, setViewMode] = useState<"table" | "cards">("table");

  const [form, setForm] = useState<Omit<LeadItem, "id">>({
    clientName: "",
    contactPhone: "",
    contactEmail: "",
    city: "",
    relationship: "",
    socialHandle: "",
    eventType: "Wedding",
    eventDate: "",
    guestCount: "",
    venuePreference: "",
    stylePreference: "",
    colourPreference: "",
    foodPreference: "",
    budgetMin: "",
    budgetMax: "",
    leadSource: "",
    stage: "New",
    assignedTo: "",
    notes: "",
    interactions: [],
    tasks: [],
    aiScore: undefined,
    conversionProbability: undefined,
    lastContactAt: undefined,
    convertedEventId: null,
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
      if (!form.assignedTo) {
        setForm((prev) => ({ ...prev, assignedTo: u.name }));
      }
    } catch {
      window.localStorage.removeItem(USER_KEY);
      window.location.href = "/login";
    }
  }, []);

  // load leads
  useEffect(() => {
    if (typeof window === "undefined") return;
    const raw = window.localStorage.getItem(LEADS_KEY);
    if (raw) {
      try {
        const parsed: LeadItem[] = JSON.parse(raw).map((l: any) => ({
          ...l,
          interactions: l.interactions ?? [],
          tasks: l.tasks ?? [],
        }));
        setLeads(parsed);
        if (parsed.length > 0) setSelectedId(parsed[0].id);
      } catch {
        // ignore
      }
    } else {
      // seed example
      const seed: LeadItem[] = [
        {
          id: Date.now(),
          clientName: "Mehta Family",
          contactPhone: "+91-98765-00001",
          contactEmail: "mehta@example.com",
          city: "Surat",
          relationship: "Bride side",
          socialHandle: "@mehta_bride",
          eventType: "Wedding",
          eventDate: "",
          guestCount: "300",
          venuePreference: "Indoor, 4-star hotel",
          stylePreference: "Royal pastel theme",
          colourPreference: "Ivory, blush, gold",
          foodPreference: "Veg, live counters",
          budgetMin: "1200000",
          budgetMax: "1800000",
          leadSource: "Instagram",
          stage: "Proposal Sent",
          assignedTo: "Hardik",
          notes: "Loves floral decor, hates too much red.",
          interactions: [],
          tasks: [],
          aiScore: 82,
          conversionProbability: 78,
          lastContactAt: new Date().toISOString(),
          convertedEventId: null,
        },
      ];
      setLeads(seed);
      setSelectedId(seed[0].id);
      window.localStorage.setItem(LEADS_KEY, JSON.stringify(seed));
    }
  }, []);

  // persist leads
  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(LEADS_KEY, JSON.stringify(leads));
  }, [leads]);

  function handleFormChange(
    e:
      | React.ChangeEvent<HTMLInputElement>
      | React.ChangeEvent<HTMLTextAreaElement>
      | React.ChangeEvent<HTMLSelectElement>
  ) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  function resetForm() {
    setEditingId(null);
    setForm({
      clientName: "",
      contactPhone: "",
      contactEmail: "",
      city: "",
      relationship: "",
      socialHandle: "",
      eventType: "Wedding",
      eventDate: "",
      guestCount: "",
      venuePreference: "",
      stylePreference: "",
      colourPreference: "",
      foodPreference: "",
      budgetMin: "",
      budgetMax: "",
      leadSource: "",
      stage: "New",
      assignedTo: user?.name ?? "",
      notes: "",
      interactions: [],
      tasks: [],
      aiScore: undefined,
      conversionProbability: undefined,
      lastContactAt: undefined,
      convertedEventId: null,
    });
  }

  function computeAiScore(lead: Omit<LeadItem, "id">): {
    score: number;
    probability: number;
  } {
    let score = 50;

    // budget range
    const min = parseMoney(lead.budgetMin || "0");
    const max = parseMoney(lead.budgetMax || "0");
    const avg = (min + max) / 2;
    if (avg > 1500000) score += 15;
    else if (avg > 800000) score += 8;
    else if (avg < 300000) score -= 10;

    // source quality
    if (lead.leadSource === "Referral" || lead.leadSource === "Venue Partner") {
      score += 12;
    } else if (lead.leadSource === "Instagram" || lead.leadSource === "Website") {
      score += 5;
    } else if (lead.leadSource === "Google Ads") {
      score += 2;
    }

    // event type
    if (lead.eventType === "Wedding" || lead.eventType === "Corporate") {
      score += 5;
    }

    // rough engagement from notes length
    if (lead.notes && lead.notes.length > 50) score += 3;

    // clamp
    if (score > 99) score = 99;
    if (score < 5) score = 5;

    const probability = Math.round(score - 10 + Math.random() * 10); // a noisy % for fun
    return {
      score,
      probability: Math.max(5, Math.min(99, probability)),
    };
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.clientName || !form.contactPhone || !form.city) {
      alert("Client name, phone and city are required.");
      return;
    }

    const { score, probability } = computeAiScore(form);

    if (editingId == null) {
      const newLead: LeadItem = {
        id: Date.now(),
        ...form,
        interactions: form.interactions ?? [],
        tasks: form.tasks ?? [],
        aiScore: score,
        conversionProbability: probability,
        lastContactAt: form.lastContactAt,
        convertedEventId: null,
      };
      setLeads((prev) => [newLead, ...prev]);
      setSelectedId(newLead.id);
    } else {
      setLeads((prev) =>
        prev.map((l) =>
          l.id === editingId
            ? {
                ...l,
                ...form,
                interactions: form.interactions ?? [],
                tasks: form.tasks ?? [],
                aiScore: score,
                conversionProbability: probability,
              }
            : l
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
      contactPhone: lead.contactPhone,
      contactEmail: lead.contactEmail,
      city: lead.city,
      relationship: lead.relationship,
      socialHandle: lead.socialHandle,
      eventType: lead.eventType,
      eventDate: lead.eventDate,
      guestCount: lead.guestCount,
      venuePreference: lead.venuePreference,
      stylePreference: lead.stylePreference,
      colourPreference: lead.colourPreference,
      foodPreference: lead.foodPreference,
      budgetMin: lead.budgetMin,
      budgetMax: lead.budgetMax,
      leadSource: lead.leadSource,
      stage: lead.stage,
      assignedTo: lead.assignedTo,
      notes: lead.notes,
      interactions: lead.interactions ?? [],
      tasks: lead.tasks ?? [],
      aiScore: lead.aiScore,
      conversionProbability: lead.conversionProbability,
      lastContactAt: lead.lastContactAt,
      convertedEventId: lead.convertedEventId ?? null,
    });
    setSelectedId(id);
  }

  function handleDelete(id: number) {
    if (!confirm("Delete this lead permanently?")) return;
    setLeads((prev) => {
      const next = prev.filter((l) => l.id !== id);
      if (selectedId === id) setSelectedId(next.length ? next[0].id : null);
      if (editingId === id) resetForm();
      return next;
    });
  }

  function updateLead(updated: LeadItem) {
    setLeads((prev) => prev.map((l) => (l.id === updated.id ? updated : l)));
  }

  const filteredLeads = useMemo(
    () =>
      leads.filter((lead) => {
        const matchSearch =
          !search ||
          lead.clientName.toLowerCase().includes(search.toLowerCase()) ||
          lead.city.toLowerCase().includes(search.toLowerCase()) ||
          (lead.contactPhone || "").toLowerCase().includes(search.toLowerCase());
        const matchCity =
          filterCity === "All" ? true : lead.city === filterCity;
        const matchStage =
          filterStage === "All" ? true : lead.stage === filterStage;
        const matchSource =
          filterSource === "All"
            ? true
            : (lead.leadSource || "") === filterSource;
        return matchSearch && matchCity && matchStage && matchSource;
      }),
    [leads, search, filterCity, filterStage, filterSource]
  );

  const selectedLead = leads.find((l) => l.id === selectedId) ?? null;

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
          {/* Header */}
          <div className="eventura-header-row">
            <div>
              <h1 className="eventura-page-title">Clients & Leads</h1>
              <p className="eventura-subtitle">
                Advanced CRM to track leads, proposals and conversions for Eventura.
              </p>
            </div>
            <div className="eventura-actions">
              <button
                type="button"
                className="eventura-button"
                onClick={resetForm}
              >
                + Add New Lead
              </button>
            </div>
          </div>

          {/* Filters + view toggle */}
          <div className="eventura-panel" style={{ marginBottom: "1rem" }}>
            <div className="eventura-form-grid">
              <div className="eventura-field">
                <input
                  className="eventura-input"
                  placeholder="Search by client, phone or city..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <div className="eventura-field">
                <select
                  className="eventura-input"
                  value={filterCity}
                  onChange={(e) => setFilterCity(e.target.value)}
                >
                  <option value="All">All cities</option>
                  <option value="Surat">Surat</option>
                  <option value="Ahmedabad">Ahmedabad</option>
                  <option value="Rajkot">Rajkot</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div className="eventura-field">
                <select
                  className="eventura-input"
                  value={filterStage}
                  onChange={(e) =>
                    setFilterStage(e.target.value as LeadStage | "All")
                  }
                >
                  <option value="All">All stages</option>
                  <option value="New">New</option>
                  <option value="Contacted">Contacted</option>
                  <option value="Proposal Sent">Proposal Sent</option>
                  <option value="Negotiation">Negotiation</option>
                  <option value="Follow-Up">Follow-Up</option>
                  <option value="Confirmed">Confirmed</option>
                  <option value="Lost">Lost</option>
                </select>
              </div>
              <div className="eventura-field">
                <select
                  className="eventura-input"
                  value={filterSource}
                  onChange={(e) => setFilterSource(e.target.value)}
                >
                  <option value="All">All sources</option>
                  <option value="Instagram">Instagram</option>
                  <option value="Facebook">Facebook</option>
                  <option value="Website">Website</option>
                  <option value="Referral">Referral</option>
                  <option value="Venue Partner">Venue Partner</option>
                  <option value="Google Ads">Google Ads</option>
                  <option value="Walk-in">Walk-in</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div className="eventura-field">
                <div className="eventura-toggle-group">
                  <button
                    type="button"
                    className={
                      "toggle-pill" +
                      (viewMode === "table" ? " toggle-pill-active" : "")
                    }
                    onClick={() => setViewMode("table")}
                  >
                    Table
                  </button>
                  <button
                    type="button"
                    className={
                      "toggle-pill" +
                      (viewMode === "cards" ? " toggle-pill-active" : "")
                    }
                    onClick={() => setViewMode("cards")}
                  >
                    Cards
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* 3-column layout: Form | List | Detail */}
          <div
            className="eventura-columns"
            style={{
              gridTemplateColumns: "minmax(0,1.2fr) minmax(0,1.5fr) minmax(0,1.6fr)",
            }}
          >
            {/* Form */}
            <div className="eventura-panel">
              <h2 className="eventura-panel-title">
                {editingId ? "Edit lead" : "Add lead"}
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
                      placeholder="e.g. Mehta Family / XYZ Textiles"
                    />
                  </div>
                  <div className="eventura-field">
                    <label className="eventura-label" htmlFor="contactPhone">
                      Phone
                    </label>
                    <input
                      id="contactPhone"
                      name="contactPhone"
                      className="eventura-input"
                      value={form.contactPhone}
                      onChange={handleFormChange}
                      placeholder="+91-..."
                    />
                  </div>
                </div>

                <div className="eventura-form-grid">
                  <div className="eventura-field">
                    <label className="eventura-label" htmlFor="contactEmail">
                      Email
                    </label>
                    <input
                      id="contactEmail"
                      name="contactEmail"
                      className="eventura-input"
                      value={form.contactEmail}
                      onChange={handleFormChange}
                      placeholder="client@example.com"
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
                      placeholder="Surat / Ahmedabad / Rajkot / Destination"
                    />
                  </div>
                </div>

                <div className="eventura-form-grid">
                  <div className="eventura-field">
                    <label className="eventura-label" htmlFor="relationship">
                      Relationship
                    </label>
                    <input
                      id="relationship"
                      name="relationship"
                      className="eventura-input"
                      value={form.relationship}
                      onChange={handleFormChange}
                      placeholder="Bride / Groom / Corporate / Family"
                    />
                  </div>
                  <div className="eventura-field">
                    <label className="eventura-label" htmlFor="socialHandle">
                      Social handle
                    </label>
                    <input
                      id="socialHandle"
                      name="socialHandle"
                      className="eventura-input"
                      value={form.socialHandle}
                      onChange={handleFormChange}
                      placeholder="@instagram"
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
                    <label className="eventura-label" htmlFor="eventDate">
                      Event date (tentative)
                    </label>
                    <input
                      id="eventDate"
                      name="eventDate"
                      type="date"
                      className="eventura-input"
                      value={form.eventDate}
                      onChange={handleFormChange}
                    />
                  </div>
                </div>

                <div className="eventura-form-grid">
                  <div className="eventura-field">
                    <label className="eventura-label" htmlFor="guestCount">
                      Guest count
                    </label>
                    <input
                      id="guestCount"
                      name="guestCount"
                      className="eventura-input"
                      value={form.guestCount}
                      onChange={handleFormChange}
                      placeholder="e.g. 300"
                    />
                  </div>
                  <div className="eventura-field">
                    <label className="eventura-label" htmlFor="venuePreference">
                      Venue preference
                    </label>
                    <input
                      id="venuePreference"
                      name="venuePreference"
                      className="eventura-input"
                      value={form.venuePreference}
                      onChange={handleFormChange}
                      placeholder="Farmhouse / 5-star / Indoor"
                    />
                  </div>
                </div>

                <div className="eventura-form-grid">
                  <div className="eventura-field">
                    <label className="eventura-label" htmlFor="stylePreference">
                      Style / theme
                    </label>
                    <input
                      id="stylePreference"
                      name="stylePreference"
                      className="eventura-input"
                      value={form.stylePreference}
                      onChange={handleFormChange}
                      placeholder="Royal, pastel, boho..."
                    />
                  </div>
                  <div className="eventura-field">
                    <label className="eventura-label" htmlFor="colourPreference">
                      Colours
                    </label>
                    <input
                      id="colourPreference"
                      name="colourPreference"
                      className="eventura-input"
                      value={form.colourPreference}
                      onChange={handleFormChange}
                      placeholder="Ivory, gold, emerald..."
                    />
                  </div>
                </div>

                <div className="eventura-form-grid">
                  <div className="eventura-field">
                    <label className="eventura-label" htmlFor="foodPreference">
                      Food preference
                    </label>
                    <input
                      id="foodPreference"
                      name="foodPreference"
                      className="eventura-input"
                      value={form.foodPreference}
                      onChange={handleFormChange}
                      placeholder="Pure veg / Jain / Non-veg"
                    />
                  </div>
                  <div className="eventura-field">
                    <label className="eventura-label">Budget range (₹)</label>
                    <div className="eventura-form-grid">
                      <input
                        name="budgetMin"
                        className="eventura-input"
                        value={form.budgetMin}
                        onChange={handleFormChange}
                        placeholder="Min"
                      />
                      <input
                        name="budgetMax"
                        className="eventura-input"
                        value={form.budgetMax}
                        onChange={handleFormChange}
                        placeholder="Max"
                      />
                    </div>
                  </div>
                </div>

                <div className="eventura-form-grid">
                  <div className="eventura-field">
                    <label className="eventura-label" htmlFor="leadSource">
                      Lead source
                    </label>
                    <select
                      id="leadSource"
                      name="leadSource"
                      className="eventura-input"
                      value={form.leadSource}
                      onChange={handleFormChange}
                    >
                      <option value="">Select source</option>
                      <option>Instagram</option>
                      <option>Facebook</option>
                      <option>Website</option>
                      <option>Referral</option>
                      <option>Venue Partner</option>
                      <option>Google Ads</option>
                      <option>Walk-in</option>
                      <option>Other</option>
                    </select>
                  </div>
                  <div className="eventura-field">
                    <label className="eventura-label" htmlFor="assignedTo">
                      Assigned to
                    </label>
                    <input
                      id="assignedTo"
                      name="assignedTo"
                      className="eventura-input"
                      value={form.assignedTo}
                      onChange={handleFormChange}
                      placeholder="Hardik / Shubh / Dixit"
                    />
                  </div>
                </div>

                <div className="eventura-form-grid">
                  <div className="eventura-field">
                    <label className="eventura-label" htmlFor="stage">
                      Stage
                    </label>
                    <select
                      id="stage"
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

                <div className="eventura-field" style={{ marginTop: "0.5rem" }}>
                  <label className="eventura-label" htmlFor="notes">
                    Notes
                  </label>
                  <textarea
                    id="notes"
                    name="notes"
                    className="eventura-textarea"
                    value={form.notes}
                    onChange={handleFormChange}
                    placeholder="Key details, objections, preferences..."
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
                      Cancel edit
                    </button>
                  )}
                </div>
              </form>
            </div>

            {/* Leads list */}
            <div className="eventura-panel">
              <h2 className="eventura-panel-title">
                Leads overview ({filteredLeads.length})
              </h2>
              <p className="eventura-small-text">
                AI lead score and conversion probability are calculated automatically
                when you save a lead.
              </p>

              {viewMode === "table" ? (
                <div className="eventura-table-wrapper" style={{ marginTop: "0.5rem" }}>
                  {filteredLeads.length === 0 ? (
                    <p style={{ fontSize: "0.8rem", color: "#9ca3af" }}>
                      No leads match this filter.
                    </p>
                  ) : (
                    <table className="eventura-table">
                      <thead>
                        <tr>
                          <th>Score</th>
                          <th>Client</th>
                          <th>Type</th>
                          <th>City</th>
                          <th>Budget</th>
                          <th>Source</th>
                          <th>Stage</th>
                          <th>Owner</th>
                          <th />
                        </tr>
                      </thead>
                      <tbody>
                        {filteredLeads.map((lead) => {
                          const min = parseMoney(lead.budgetMin || "0");
                          const max = parseMoney(lead.budgetMax || "0");
                          const avg = (min + max) / 2;
                          const score = lead.aiScore ?? 50;
                          const scoreColor =
                            score >= 90
                              ? "eventura-tag-green"
                              : score >= 60
                              ? "eventura-tag-blue"
                              : "eventura-tag-amber";

                          return (
                            <tr
                              key={lead.id}
                              className={
                                lead.id === selectedId ? "eventura-row-active" : ""
                              }
                              onClick={() => setSelectedId(lead.id)}
                            >
                              <td>
                                <span className={`eventura-tag ${scoreColor}`}>
                                  {score}
                                </span>
                              </td>
                              <td>
                                <div className="eventura-list-title">
                                  {lead.clientName}
                                </div>
                                <div className="eventura-list-sub">
                                  {lead.contactPhone}
                                </div>
                              </td>
                              <td>{lead.eventType}</td>
                              <td>{lead.city}</td>
                              <td>
                                {min || max
                                  ? `₹${formatCurrency(min)} – ₹${formatCurrency(max)}`
                                  : "–"}
                              </td>
                              <td>{lead.leadSource || "–"}</td>
                              <td>{lead.stage}</td>
                              <td>{lead.assignedTo || "Unassigned"} </td>
                              <td>
                                <div style={{ display: "flex", gap: "0.3rem" }}>
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
              ) : (
                <div
                  className="cards-grid"
                  style={{
                    marginTop: "0.5rem",
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(220px,1fr))",
                    gap: "0.6rem",
                  }}
                >
                  {filteredLeads.length === 0 ? (
                    <p style={{ fontSize: "0.8rem", color: "#9ca3af" }}>
                      No leads match this filter.
                    </p>
                  ) : (
                    filteredLeads.map((lead) => {
                      const score = lead.aiScore ?? 50;
                      const scoreColor =
                        score >= 90
                          ? "eventura-tag-green"
                          : score >= 60
                          ? "eventura-tag-blue"
                          : "eventura-tag-amber";
                      return (
                        <div
                          key={lead.id}
                          className={
                            "eventura-card" +
                            (lead.id === selectedId ? " eventura-row-active" : "")
                          }
                          style={{ cursor: "pointer" }}
                          onClick={() => setSelectedId(lead.id)}
                        >
                          <div className="eventura-card-label">
                            {lead.eventType} · {lead.city}
                          </div>
                          <div className="eventura-card-value">
                            {lead.clientName}
                          </div>
                          <div className="eventura-card-note">
                            {lead.stage} · {lead.leadSource || "Unknown"}
                          </div>
                          <div style={{ marginTop: "0.4rem" }}>
                            <span className={`eventura-tag ${scoreColor}`}>
                              Score {score}
                            </span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>

            {/* Detail panel */}
            <div className="eventura-panel">
              {!selectedLead ? (
                <p style={{ fontSize: "0.8rem", color: "#9ca3af" }}>
                  Select a lead from the list to see full CRM details and 1-click
                  conversion to Event.
                </p>
              ) : (
                <LeadDetail
                  lead={selectedLead}
                  onUpdate={updateLead}
                  isCEO={isCEO}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

/* ===== Lead detail with tabs & convert-to-event ===== */

type LeadTab =
  | "overview"
  | "timeline"
  | "pricing"
  | "tasks"
  | "analytics"
  | "convert";

function LeadDetail({
  lead,
  onUpdate,
  isCEO,
}: {
  lead: LeadItem;
  onUpdate: (lead: LeadItem) => void;
  isCEO: boolean;
}) {
  const [tab, setTab] = useState<LeadTab>("overview");
  const [interactionDraft, setInteractionDraft] = useState({
    type: "WhatsApp" as InteractionType,
    note: "",
  });
  const [taskDraft, setTaskDraft] = useState({
    title: "",
    assignee: "",
    dueDate: "",
    priority: "Medium" as LeadTask["priority"],
  });

  // Derived AI insight
  const score = lead.aiScore ?? 50;
  const probability = lead.conversionProbability ?? 50;

  const avgBudget = useMemo(() => {
    const min = parseMoney(lead.budgetMin || "0");
    const max = parseMoney(lead.budgetMax || "0");
    if (!min && !max) return 0;
    if (!max) return min;
    if (!min) return max;
    return (min + max) / 2;
  }, [lead.budgetMin, lead.budgetMax]);

  function updateStage(stage: LeadStage) {
    onUpdate({ ...lead, stage });
  }

  function addInteraction(e: React.FormEvent) {
    e.preventDefault();
    if (!interactionDraft.note.trim()) return;
    const now = new Date().toISOString();
    const next: Interaction[] = [
      ...(lead.interactions ?? []),
      {
        id: Date.now(),
        type: interactionDraft.type,
        note: interactionDraft.note.trim(),
        at: now,
      },
    ];
    onUpdate({ ...lead, interactions: next, lastContactAt: now });
    setInteractionDraft((prev) => ({ ...prev, note: "" }));
  }

  function addTask(e: React.FormEvent) {
    e.preventDefault();
    if (!taskDraft.title.trim()) return;
    const next: LeadTask[] = [
      ...(lead.tasks ?? []),
      {
        id: Date.now(),
        title: taskDraft.title.trim(),
        assignee: taskDraft.assignee || lead.assignedTo || "Unassigned",
        dueDate: taskDraft.dueDate,
        priority: taskDraft.priority,
        status: "Open",
      },
    ];
    onUpdate({ ...lead, tasks: next });
    setTaskDraft({
      title: "",
      assignee: "",
      dueDate: "",
      priority: "Medium",
    });
  }

  function toggleTask(id: number) {
    const next = (lead.tasks ?? []).map((t) =>
      t.id === id ? { ...t, status: t.status === "Open" ? "Done" : "Open" } : t
    );
    onUpdate({ ...lead, tasks: next });
  }

  function convertToEvent() {
    if (typeof window === "undefined") return;
    if (lead.convertedEventId) {
      alert("This lead is already converted to an event.");
      return;
    }

    const title =
      lead.eventType === "Wedding"
        ? `${lead.clientName} ${lead.eventType}`
        : `${lead.clientName} – ${lead.eventType}`;

    let events: EventItem[] = [];
    const raw = window.localStorage.getItem(EVENTS_KEY);
    if (raw) {
      try {
        events = JSON.parse(raw);
      } catch {
        events = [];
      }
    }

    const newEvent: EventItem = {
      id: Date.now(),
      clientName: lead.clientName,
      eventName: title,
      eventType: lead.eventType,
      city: lead.city,
      venue: lead.venuePreference || "",
      date: lead.eventDate || "",
      guests: lead.guestCount || "",
      budget: String(avgBudget || ""),
      status: "Confirmed",
      leadSource: (lead.leadSource as any) || "Other",
      owner: lead.assignedTo || "Hardik",
      notes:
        lead.notes ||
        `Converted from lead: ${lead.clientName} (${lead.eventType})`,
    };

    const nextEvents = [newEvent, ...events];
    window.localStorage.setItem(EVENTS_KEY, JSON.stringify(nextEvents));

    const updatedLead: LeadItem = {
      ...lead,
      stage: "Confirmed",
      convertedEventId: newEvent.id,
    };
    onUpdate(updatedLead);

    alert("Lead converted to Event! Check Events tab.");
  }

  return (
    <div className="lead-detail">
      <div className="eventura-header-row">
        <div>
          <h2 className="eventura-panel-title">{lead.clientName}</h2>
          <p className="eventura-subtitle">
            {lead.eventType} · {lead.city} · Stage: {lead.stage}
          </p>
        </div>
        <div style={{ textAlign: "right", fontSize: "0.75rem" }}>
          <div>
            <span
              className={
                "eventura-tag " +
                (score >= 90
                  ? "eventura-tag-green"
                  : score >= 60
                  ? "eventura-tag-blue"
                  : "eventura-tag-amber")
              }
            >
              Score {score}
            </span>
          </div>
          <div style={{ marginTop: "0.2rem" }}>
            Chance to close: {probability}%
          </div>
          {lead.lastContactAt && (
            <div style={{ marginTop: "0.2rem", color: "#9ca3af" }}>
              Last contact:{" "}
              {new Date(lead.lastContactAt).toLocaleString("en-IN")}
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="eventura-tabs">
        <TabButton label="Overview" active={tab === "overview"} onClick={() => setTab("overview")} />
        <TabButton
          label="Communication"
          active={tab === "timeline"}
          onClick={() => setTab("timeline")}
        />
        <TabButton
          label="Proposal & Pricing"
          active={tab === "pricing"}
          onClick={() => setTab("pricing")}
        />
        <TabButton
          label="Tasks"
          active={tab === "tasks"}
          onClick={() => setTab("tasks")}
        />
        <TabButton
          label="Analytics"
          active={tab === "analytics"}
          onClick={() => setTab("analytics")}
        />
        <TabButton
          label="Convert"
          active={tab === "convert"}
          onClick={() => setTab("convert")}
        />
      </div>

      {/* Tab content */}
      {tab === "overview" && (
        <div className="tab-body">
          <h3 className="eventura-panel-title">Profile overview</h3>
          <div className="eventura-columns" style={{ marginTop: "0.7rem" }}>
            <div>
              <h4 className="eventura-subsection-title">Client</h4>
              <ul className="eventura-bullets">
                <li>Phone: {lead.contactPhone || "–"}</li>
                <li>Email: {lead.contactEmail || "–"}</li>
                <li>Relationship: {lead.relationship || "–"}</li>
                <li>Social: {lead.socialHandle || "–"}</li>
              </ul>

              <h4 className="eventura-subsection-title">Event</h4>
              <ul className="eventura-bullets">
                <li>Type: {lead.eventType}</li>
                <li>
                  Date:{" "}
                  {lead.eventDate
                    ? new Date(lead.eventDate).toLocaleDateString("en-IN")
                    : "Not fixed"}
                </li>
                <li>Guests: {lead.guestCount || "–"}</li>
                <li>Venue pref: {lead.venuePreference || "–"}</li>
              </ul>
            </div>
            <div>
              <h4 className="eventura-subsection-title">Preferences</h4>
              <ul className="eventura-bullets">
                <li>Style/theme: {lead.stylePreference || "–"}</li>
                <li>Colours: {lead.colourPreference || "–"}</li>
                <li>Food: {lead.foodPreference || "–"}</li>
              </ul>

              <h4 className="eventura-subsection-title">Budget & AI insight</h4>
              <ul className="eventura-bullets">
                <li>
                  Budget:{" "}
                  {lead.budgetMin || lead.budgetMax
                    ? `₹${formatCurrency(
                        parseMoney(lead.budgetMin || "0")
                      )} – ₹${formatCurrency(
                        parseMoney(lead.budgetMax || "0")
                      )}`
                    : "Not shared"}
                </li>
                <li>Source: {lead.leadSource || "Unknown"}</li>
                <li>
                  AI view:{" "}
                  {avgBudget
                    ? avgBudget > 1500000
                      ? "Premium seeker – offer Platinum concepts."
                      : avgBudget > 800000
                      ? "Mid-high – offer Gold concepts."
                      : "Budget-sensitive – design cost-optimized plan."
                    : "Share options and help them fix budget."}
                </li>
                {isCEO && (
                  <li>
                    Owner: {lead.assignedTo || "Unassigned"} (you can reassign in
                    form)
                  </li>
                )}
              </ul>
            </div>
          </div>
          {lead.notes && (
            <div style={{ marginTop: "0.7rem" }}>
              <h4 className="eventura-subsection-title">Internal notes</h4>
              <p className="eventura-small-text">{lead.notes}</p>
            </div>
          )}
          <div style={{ marginTop: "0.7rem" }}>
            <h4 className="eventura-subsection-title">Quick stage update</h4>
            <div className="eventura-chips-row">
              {(["New", "Contacted", "Proposal Sent", "Negotiation", "Follow-Up", "Confirmed", "Lost"] as LeadStage[]).map(
                (s) => (
                  <button
                    key={s}
                    type="button"
                    className={
                      "eventura-tag " +
                      (lead.stage === s
                        ? "eventura-tag-blue"
                        : "eventura-tag-amber")
                    }
                    onClick={() => updateStage(s)}
                  >
                    {s}
                  </button>
                )
              )}
            </div>
          </div>
        </div>
      )}

      {tab === "timeline" && (
        <div className="tab-body">
          <h3 className="eventura-panel-title">Communication timeline</h3>
          <p className="eventura-small-text">
            Log calls, WhatsApp chats, emails and meetings here. Later this can
            sync with WhatsApp Business / email API.
          </p>

          <form
            onSubmit={addInteraction}
            style={{ marginTop: "0.6rem", display: "grid", gap: "0.4rem" }}
          >
            <div className="eventura-form-grid">
              <div className="eventura-field">
                <select
                  className="eventura-input"
                  value={interactionDraft.type}
                  onChange={(e) =>
                    setInteractionDraft((prev) => ({
                      ...prev,
                      type: e.target.value as InteractionType,
                    }))
                  }
                >
                  <option>WhatsApp</option>
                  <option>Call</option>
                  <option>Email</option>
                  <option>Meeting</option>
                  <option>Site Visit</option>
                </select>
              </div>
              <div className="eventura-field">
                <input
                  className="eventura-input"
                  placeholder='e.g. "Shared moodboard", "Client asked for revised budget"'
                  value={interactionDraft.note}
                  onChange={(e) =>
                    setInteractionDraft((prev) => ({
                      ...prev,
                      note: e.target.value,
                    }))
                  }
                />
              </div>
            </div>
            <div className="eventura-actions">
              <button type="submit" className="eventura-button-secondary">
                + Log interaction
              </button>
            </div>
          </form>

          <ul className="eventura-list" style={{ marginTop: "0.6rem" }}>
            {(lead.interactions ?? []).length === 0 ? (
              <p style={{ fontSize: "0.8rem", color: "#9ca3af" }}>
                No communication logged yet.
              </p>
            ) : (
              (lead.interactions ?? [])
                .slice()
                .sort(
                  (a, b) =>
                    new Date(b.at).getTime() - new Date(a.at).getTime()
                )
                .map((it) => (
                  <li key={it.id} className="eventura-list-item">
                    <div>
                      <div className="eventura-list-title">{it.type}</div>
                      <div className="eventura-list-sub">{it.note}</div>
                    </div>
                    <span className="eventura-tag eventura-tag-blue">
                      {new Date(it.at).toLocaleString("en-IN")}
                    </span>
                  </li>
                ))
            )}
          </ul>
        </div>
      )}

      {tab === "pricing" && (
        <div className="tab-body">
          <h3 className="eventura-panel-title">Proposal & pricing ideas</h3>
          <p className="eventura-small-text">
            Full PDF proposal builder and WhatsApp/email sending can be wired in
            later. For now, use these prompts and budget ranges as your guide.
          </p>

          <div className="eventura-columns" style={{ marginTop: "0.7rem" }}>
            <div>
              <h4 className="eventura-subsection-title">Recommended package</h4>
              <ul className="eventura-bullets">
                {avgBudget === 0 && (
                  <li>Budget not fixed → suggest 2–3 package levels.</li>
                )}
                {avgBudget > 0 && avgBudget <= 800000 && (
                  <li>
                    Suggest: Wedding Silver / Corporate Standard package with
                    smart decor and focused experience.
                  </li>
                )}
                {avgBudget > 800000 && avgBudget <= 1800000 && (
                  <li>
                    Suggest: Wedding Gold / Corporate Premium – richer decor,
                    better artists, better lighting.
                  </li>
                )}
                {avgBudget > 1800000 && (
                  <li>
                    Suggest: Wedding Platinum / Signature – custom mandap,
                    designer entrance, artist acts.
                  </li>
                )}
                <li>
                  Try to keep gross margin &gt; 30% after vendor payouts and
                  internal costs.
                </li>
              </ul>
            </div>
            <div>
              <h4 className="eventura-subsection-title">Upsell ideas</h4>
              <ul className="eventura-bullets">
                <li>LED wall / cinematic entry tunnel</li>
                <li>Premium mandap / stage backdrop upgrade</li>
                <li>Live artist (singer, band, folk performance)</li>
                <li>Photo-booth with instant prints</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {tab === "tasks" && (
        <div className="tab-body">
          <h3 className="eventura-panel-title">Team tasks & follow-ups</h3>
          <p className="eventura-small-text">
            Assign work to sales / planners: calls, proposals, venue visits, etc.
          </p>

          <form
            onSubmit={addTask}
            style={{ marginTop: "0.6rem", display: "grid", gap: "0.4rem" }}
          >
            <div className="eventura-form-grid">
              <div className="eventura-field">
                <input
                  className="eventura-input"
                  placeholder='Task – e.g. "Call to confirm sangeet date"'
                  value={taskDraft.title}
                  onChange={(e) =>
                    setTaskDraft((prev) => ({ ...prev, title: e.target.value }))
                  }
                />
              </div>
            </div>
            <div className="eventura-form-grid">
              <div className="eventura-field">
                <input
                  className="eventura-input"
                  placeholder="Assignee"
                  value={taskDraft.assignee}
                  onChange={(e) =>
                    setTaskDraft((prev) => ({
                      ...prev,
                      assignee: e.target.value,
                    }))
                  }
                />
              </div>
              <div className="eventura-field">
                <input
                  type="date"
                  className="eventura-input"
                  value={taskDraft.dueDate}
                  onChange={(e) =>
                    setTaskDraft((prev) => ({
                      ...prev,
                      dueDate: e.target.value,
                    }))
                  }
                />
              </div>
              <div className="eventura-field">
                <select
                  className="eventura-input"
                  value={taskDraft.priority}
                  onChange={(e) =>
                    setTaskDraft((prev) => ({
                      ...prev,
                      priority: e.target.value as LeadTask["priority"],
                    }))
                  }
                >
                  <option>Low</option>
                  <option>Medium</option>
                  <option>High</option>
                </select>
              </div>
            </div>
            <div className="eventura-actions">
              <button type="submit" className="eventura-button-secondary">
                + Add task
              </button>
            </div>
          </form>

          <ul className="eventura-list" style={{ marginTop: "0.6rem" }}>
            {(lead.tasks ?? []).length === 0 ? (
              <p style={{ fontSize: "0.8rem", color: "#9ca3af" }}>
                No tasks yet. Add follow-ups above.
              </p>
            ) : (
              (lead.tasks ?? [])
                .slice()
                .sort((a, b) => (a.dueDate || "").localeCompare(b.dueDate || ""))
                .map((task) => (
                  <li key={task.id} className="eventura-list-item">
                    <div>
                      <div className="eventura-list-title">{task.title}</div>
                      <div className="eventura-list-sub">
                        {task.assignee || "Unassigned"} ·{" "}
                        {task.dueDate
                          ? new Date(task.dueDate).toLocaleDateString("en-IN")
                          : "No due date"}{" "}
                        · Priority: {task.priority}
                      </div>
                    </div>
                    <button
                      type="button"
                      className={
                        "eventura-tag " +
                        (task.status === "Done"
                          ? "eventura-tag-green"
                          : "eventura-tag-amber")
                      }
                      onClick={() => toggleTask(task.id)}
                    >
                      {task.status === "Done" ? "Mark open" : "Mark done"}
                    </button>
                  </li>
                ))
            )}
          </ul>
        </div>
      )}

      {tab === "analytics" && (
        <div className="tab-body">
          <h3 className="eventura-panel-title">Lead analytics (per-lead view)</h3>
          <p className="eventura-small-text">
            High-level hints based on current data. In future we can add charts and
            full history.
          </p>
          <ul className="eventura-bullets" style={{ marginTop: "0.6rem" }}>
            <li>
              Engagement:{" "}
              {(lead.interactions ?? []).length === 0
                ? "No interactions logged yet."
                : `${(lead.interactions ?? []).length} interaction(s) logged.`}
            </li>
            <li>
              Task load:{" "}
              {(lead.tasks ?? []).length === 0
                ? "No tasks assigned."
                : `${(lead.tasks ?? []).filter((t) => t.status === "Open").length
                  } open / ${(lead.tasks ?? []).length} total tasks.`}
            </li>
            <li>
              AI guess:{" "}
              {probability >= 80
                ? "Very high chance – push to close with a clear deadline."
                : probability >= 60
                ? "Warm – keep value-based follow-ups."
                : "Low confidence – either increase budget or simplify offer."}
            </li>
            <li>
              Possible objection:{" "}
              {avgBudget && avgBudget < 500000
                ? "Budget mismatch – they may feel full-service planning is expensive."
                : "Time / trust / too many options – focus on clarity and social proof."}
            </li>
          </ul>
        </div>
      )}

      {tab === "convert" && (
        <div className="tab-body">
          <h3 className="eventura-panel-title">Convert to event</h3>
          <p className="eventura-small-text">
            This will create a new Event in the Events module, copy all key data,
            set status to Confirmed and mark this lead as Confirmed.
          </p>
          <ul className="eventura-bullets" style={{ marginTop: "0.6rem" }}>
            <li>Client name and city will be copied.</li>
            <li>Event type, date, guests and budget range will map to Event.</li>
            <li>
              Source and owner will follow current lead values (assignedTo &amp;
              leadSource).
            </li>
          </ul>
          {lead.convertedEventId ? (
            <p
              style={{
                marginTop: "0.6rem",
                fontSize: "0.8rem",
                color: "#4ade80",
              }}
            >
              ✅ Already converted to Event. You can manage it from the Events tab.
            </p>
          ) : (
            <div className="eventura-actions" style={{ marginTop: "0.8rem" }}>
              <button
                type="button"
                className="eventura-button"
                onClick={convertToEvent}
              >
                Convert to Event
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ===== Small UI helpers ===== */

function TabButton({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={"eventura-tab" + (active ? " eventura-tab-active" : "")}
      onClick={onClick}
    >
      {label}
    </button>
  );
}

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
          placeholder="Search leads, clients, vendors..."
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
