"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";

/* ========= Shared keys & types ========= */

type Role = "CEO" | "Staff";
type User = { name: string; role: Role; city: string };

const USER_KEY = "eventura-user";
const VENDORS_KEY = "eventura-vendors";
const EVENTS_KEY = "eventura-events";
const FINANCE_KEY = "eventura-finance-board";

type VendorCategory =
  | "Decor"
  | "Catering"
  | "Photography"
  | "Venue"
  | "Entertainment"
  | "Logistics"
  | "Lights & Sound"
  | "Other";

type VendorRecord = {
  id: number;
  name: string;
  category: VendorCategory;
  companyType: string;
  contactPerson: string;
  phone: string;
  email: string;
  gstNumber: string;
  licenseDetails: string;
  citiesServed: string;
  crewSize: string;
  basePriceFrom: string;
  specializationTags: string;

  // AI-ish fields
  aiIdealFor: string;
  aiSuccessRate: number;
  aiBudgetRange: string;
  aiRiskLevel: "Low" | "Medium" | "High";

  // Pricing basic summary
  pricingNotes: string;

  // Contract
  contractExpiry: string; // YYYY-MM-DD
  hasCancellationClause: boolean;
  hasRefundClause: boolean;
  hasPenaltyClause: boolean;
  hasDeliveryClause: boolean;

  // Performance
  scoreOnTime: number;
  scoreDesignAccuracy: number;
  scoreClientSatisfaction: number;
  scoreBehavior: number;
  scorePriceStability: number;
  scoreMaterialQuality: number;

  // Inventory summary text
  inventorySummary: string;

  // Availability & risk
  availabilityNotes: string;
  doubleBookingRisk: "Low" | "Medium" | "High";
  cancellationRisk: "Low" | "Medium" | "High";

  // Finance link
  walletBalance: string; // positive = payable to vendor
  outstandingEvents: number;

  // Compliance / risk
  highRisk: boolean;
  blacklisted: boolean;

  // Internal notes
  internalNotes: string;
};

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
  status:
    | "New Lead"
    | "Proposal Sent"
    | "Negotiation"
    | "Confirmed"
    | "Planning"
    | "In Execution"
    | "Completed"
    | "Cancelled";
  leadSource: string;
  owner: string;
  notes: string;
};

type FinanceRow = {
  id: number;
  label: string;
  month: string;
  income: string;
  expense: string;
  category:
    | "Client Payment"
    | "Vendor Payment"
    | "Salary"
    | "Office & Rent"
    | "Marketing"
    | "Travel"
    | "Investment"
    | "Other";
  notes: string;
};

/* ========= Helpers ========= */

function parseMoney(v: string): number {
  const cleaned = v.replace(/[₹, ]/g, "");
  const n = parseFloat(cleaned);
  return isNaN(n) ? 0 : n;
}

function formatCurrency(n: number): string {
  return n.toLocaleString("en-IN", { maximumFractionDigits: 0 });
}

/* ========= Main Vendors Page ========= */

export default function VendorsPage() {
  const [user, setUser] = useState<User | null>(null);
  const [vendors, setVendors] = useState<VendorRecord[]>([]);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [financeRows, setFinanceRows] = useState<FinanceRow[]>([]);

  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState<VendorCategory | "All">(
    "All"
  );
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<
    "overview" | "pricing" | "contracts" | "performance" | "inventory" | "availability" | "communication"
  >("overview");

  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState({
    name: "",
    category: "Decor" as VendorCategory,
    companyType: "",
    contactPerson: "",
    phone: "",
    email: "",
    gstNumber: "",
    licenseDetails: "",
    citiesServed: "",
    crewSize: "",
    basePriceFrom: "",
    specializationTags: "",
    contractExpiry: "",
  });

  /* ==== Auth ==== */

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

  /* ==== Load data from localStorage ==== */

  useEffect(() => {
    if (typeof window === "undefined") return;

    const rawV = window.localStorage.getItem(VENDORS_KEY);
    if (!rawV) {
      // Seed with one premium vendor
      const seed: VendorRecord[] = [
        {
          id: Date.now(),
          name: "Maa Royal Decorators",
          category: "Decor",
          companyType: "Proprietorship",
          contactPerson: "Amit Patel",
          phone: "+91-98765-11111",
          email: "maa.royal.decor@example.com",
          gstNumber: "24ABCDE1234Q1Z5",
          licenseDetails: "Local vendor trade license verified",
          citiesServed: "Surat, Navsari, Bharuch",
          crewSize: "18–25",
          basePriceFrom: "350000",
          specializationTags:
            "Luxury Decor, Floral Mandap, Royal Stage, LED Entry Tunnel",

          aiIdealFor: "Big fat weddings, sangeet, royal mandap setups",
          aiSuccessRate: 93,
          aiBudgetRange: "₹3.5L – ₹12L",
          aiRiskLevel: "Low",

          pricingNotes:
            "Weekday discount 10% on decor; destination wedding surcharge 15%.",

          contractExpiry: "",
          hasCancellationClause: true,
          hasRefundClause: true,
          hasPenaltyClause: true,
          hasDeliveryClause: true,

          scoreOnTime: 95,
          scoreDesignAccuracy: 90,
          scoreClientSatisfaction: 95,
          scoreBehavior: 98,
          scorePriceStability: 80,
          scoreMaterialQuality: 92,

          inventorySummary:
            "Owns 4 premium mandaps, 2 LED stages, 200+ centerpieces, 3km fairy lights.",

          availabilityNotes:
            "Peak season (Dec–Feb) booking load very high; book 60–90 days in advance.",
          doubleBookingRisk: "Medium",
          cancellationRisk: "Low",

          walletBalance: "120000", // payable to vendor
          outstandingEvents: 2,

          highRisk: false,
          blacklisted: false,

          internalNotes:
            "Very reliable for luxury weddings. Avoid overloading same weekend with more than 2 back-to-back events.",
        },
      ];
      setVendors(seed);
      setSelectedId(seed[0].id);
      window.localStorage.setItem(VENDORS_KEY, JSON.stringify(seed));
    } else {
      try {
        const parsed: VendorRecord[] = JSON.parse(rawV);
        setVendors(parsed);
        if (parsed.length > 0) setSelectedId(parsed[0].id);
      } catch {
        // ignore
      }
    }

    // events
    const rawE = window.localStorage.getItem(EVENTS_KEY);
    if (rawE) {
      try {
        const parsedE: EventItem[] = JSON.parse(rawE);
        setEvents(parsedE);
      } catch {
        // ignore
      }
    }

    // finance
    const rawF = window.localStorage.getItem(FINANCE_KEY);
    if (rawF) {
      try {
        const parsedF: FinanceRow[] = JSON.parse(rawF);
        setFinanceRows(parsedF);
      } catch {
        // ignore
      }
    }
  }, []);

  // Persist vendors
  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(VENDORS_KEY, JSON.stringify(vendors));
  }, [vendors]);

  /* ==== Form & actions ==== */

  function handleFormChange(
    e:
      | React.ChangeEvent<HTMLInputElement>
      | React.ChangeEvent<HTMLSelectElement>
      | React.ChangeEvent<HTMLTextAreaElement>
  ) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  function computeAiFields(
    category: VendorCategory,
    basePriceFrom: string,
    citiesServed: string
  ): Pick<
    VendorRecord,
    "aiIdealFor" | "aiSuccessRate" | "aiBudgetRange" | "aiRiskLevel"
  > {
    let aiIdealFor = "";
    let aiSuccessRate = 85;
    let aiBudgetRange = "";
    let aiRiskLevel: "Low" | "Medium" | "High" = "Medium";

    const base = parseMoney(basePriceFrom || "0");
    if (category === "Decor") {
      aiIdealFor = "Wedding décor, mandap & stage design";
    } else if (category === "Catering") {
      aiIdealFor = "Wedding catering, corporate gala dinner";
    } else if (category === "Photography") {
      aiIdealFor = "Pre-wedding & wedding photography, corporate shoots";
    } else if (category === "Venue") {
      aiIdealFor = "Banquet & lawn-based weddings, corporate offsites";
    } else if (category === "Entertainment") {
      aiIdealFor = "Sangeet nights, corporate shows, artist management";
    } else if (category === "Logistics") {
      aiIdealFor = "Material, guest and artist transport logistics";
    } else if (category === "Lights & Sound") {
      aiIdealFor = "Sangeet, receptions and DJ nights";
    } else {
      aiIdealFor = "Support vendor for customised events";
    }

    if (base >= 500000) {
      aiBudgetRange = `₹${formatCurrency(base)} – ₹${formatCurrency(
        base * 3
      )}`;
      aiSuccessRate = 92;
      aiRiskLevel = "Low";
    } else if (base >= 200000) {
      aiBudgetRange = `₹${formatCurrency(base)} – ₹${formatCurrency(
        base * 2.5
      )}`;
      aiSuccessRate = 88;
      aiRiskLevel = "Medium";
    } else if (base > 0) {
      aiBudgetRange = `₹${formatCurrency(base)} – ₹${formatCurrency(
        base * 2
      )}`;
      aiSuccessRate = 80;
      aiRiskLevel = "Medium";
    } else {
      aiBudgetRange = "Budget not set";
      aiSuccessRate = 75;
      aiRiskLevel = "High";
    }

    if (citiesServed.toLowerCase().includes("surat")) {
      aiSuccessRate += 3;
    }
    if (aiSuccessRate > 99) aiSuccessRate = 99;

    return {
      aiIdealFor,
      aiSuccessRate,
      aiBudgetRange,
      aiRiskLevel,
    };
  }

  function resetForm() {
    setEditingId(null);
    setForm({
      name: "",
      category: "Decor",
      companyType: "",
      contactPerson: "",
      phone: "",
      email: "",
      gstNumber: "",
      licenseDetails: "",
      citiesServed: "",
      crewSize: "",
      basePriceFrom: "",
      specializationTags: "",
      contractExpiry: "",
    });
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name || !form.category || !form.contactPerson) {
      alert("Vendor name, category and contact person are required.");
      return;
    }

    const ai = computeAiFields(
      form.category,
      form.basePriceFrom,
      form.citiesServed
    );

    if (editingId == null) {
      const newVendor: VendorRecord = {
        id: Date.now(),
        name: form.name,
        category: form.category,
        companyType: form.companyType,
        contactPerson: form.contactPerson,
        phone: form.phone,
        email: form.email,
        gstNumber: form.gstNumber,
        licenseDetails: form.licenseDetails,
        citiesServed: form.citiesServed,
        crewSize: form.crewSize,
        basePriceFrom: form.basePriceFrom,
        specializationTags: form.specializationTags,

        aiIdealFor: ai.aiIdealFor,
        aiSuccessRate: ai.aiSuccessRate,
        aiBudgetRange: ai.aiBudgetRange,
        aiRiskLevel: ai.aiRiskLevel,

        pricingNotes: "",

        contractExpiry: form.contractExpiry,
        hasCancellationClause: false,
        hasRefundClause: false,
        hasPenaltyClause: false,
        hasDeliveryClause: false,

        scoreOnTime: 85,
        scoreDesignAccuracy: 85,
        scoreClientSatisfaction: 85,
        scoreBehavior: 90,
        scorePriceStability: 80,
        scoreMaterialQuality: 85,

        inventorySummary: "",

        availabilityNotes: "",
        doubleBookingRisk: "Medium",
        cancellationRisk: "Medium",

        walletBalance: "0",
        outstandingEvents: 0,

        highRisk: false,
        blacklisted: false,

        internalNotes: "",
      };
      setVendors((prev) => [newVendor, ...prev]);
      setSelectedId(newVendor.id);
    } else {
      setVendors((prev) =>
        prev.map((v) =>
          v.id === editingId
            ? {
                ...v,
                ...form,
                ...ai,
              }
            : v
        )
      );
    }

    resetForm();
  }

  function handleEdit(id: number) {
    const v = vendors.find((x) => x.id === id);
    if (!v) return;
    setEditingId(id);
    setForm({
      name: v.name,
      category: v.category,
      companyType: v.companyType,
      contactPerson: v.contactPerson,
      phone: v.phone,
      email: v.email,
      gstNumber: v.gstNumber,
      licenseDetails: v.licenseDetails,
      citiesServed: v.citiesServed,
      crewSize: v.crewSize,
      basePriceFrom: v.basePriceFrom,
      specializationTags: v.specializationTags,
      contractExpiry: v.contractExpiry,
    });
    setSelectedId(id);
  }

  function handleDelete(id: number) {
    if (!confirm("Delete this vendor?")) return;
    setVendors((prev) => {
      const next = prev.filter((v) => v.id !== id);
      if (selectedId === id) setSelectedId(next.length ? next[0].id : null);
      if (editingId === id) resetForm();
      return next;
    });
  }

  function toggleFlag(id: number, field: "highRisk" | "blacklisted") {
    setVendors((prev) =>
      prev.map((v) =>
        v.id === id
          ? {
              ...v,
              [field]: !v[field],
            }
          : v
      )
    );
  }

  function updateWallet(id: number, value: string) {
    setVendors((prev) =>
      prev.map((v) => (v.id === id ? { ...v, walletBalance: value } : v))
    );
  }

  /* ==== Derived data & connections ==== */

  const filteredVendors = vendors.filter((v) => {
    const s = search.toLowerCase();
    const matchSearch =
      !s ||
      v.name.toLowerCase().includes(s) ||
      v.category.toLowerCase().includes(s) ||
      v.citiesServed.toLowerCase().includes(s);
    const matchCat =
      filterCategory === "All" ? true : v.category === filterCategory;
    return matchSearch && matchCat;
  });

  const selectedVendor = filteredVendors.find((v) => v.id === selectedId) ?? null;

  // Events that match this vendor (by city & category keywords in notes)
  const vendorEvents = useMemo(() => {
    if (!selectedVendor) return [];
    return events.filter((e) => {
      const cityOk =
        !selectedVendor.citiesServed ||
        selectedVendor.citiesServed
          .toLowerCase()
          .includes(e.city.toLowerCase());
      const notes = e.notes.toLowerCase();
      const nameHit =
        notes.includes(selectedVendor.name.toLowerCase()) ||
        e.venue.toLowerCase().includes(selectedVendor.name.toLowerCase());
      return cityOk && nameHit;
    });
  }, [events, selectedVendor]);

  // Finance: vendor payments summary
  const vendorFinance = useMemo(() => {
    if (!selectedVendor) return { totalPaid: 0, totalPlanned: 0 };
    let totalPaid = 0;
    let totalPlanned = 0;
    for (const row of financeRows) {
      const note = row.notes.toLowerCase();
      if (
        row.category === "Vendor Payment" &&
        note.includes(selectedVendor.name.toLowerCase())
      ) {
        const expense = parseMoney(row.expense || "0");
        totalPlanned += expense;
        if (note.includes("paid") || note.includes("final")) {
          totalPaid += expense;
        }
      }
    }
    return { totalPaid, totalPlanned };
  }, [financeRows, selectedVendor]);

  if (!user) return null;

  const isCEO = user.role === "CEO";

  return (
    <main className="eventura-os">
      <aside className="eventura-sidebar">
        <SidebarCore user={user} active="vendors" />
      </aside>

      <div className="eventura-main">
        <TopbarCore user={user} />

        <div className="eventura-content">
          {/* Header */}
          <div className="eventura-header-row">
            <div>
              <h1 className="eventura-page-title">Vendors</h1>
              <p className="eventura-subtitle">
                Manage decor, catering, photography, venues & more. AI insights,
                contracts, performance and payouts – all inside Eventura OS.
              </p>
            </div>
            <div className="eventura-actions">
              <button
                type="button"
                className="eventura-button"
                onClick={resetForm}
              >
                + New vendor
              </button>
            </div>
          </div>

          {/* Top summary cards */}
          <section className="eventura-grid">
            <div className="eventura-card eventura-card-glow">
              <p className="eventura-card-label">Total vendors</p>
              <p className="eventura-card-value">{vendors.length}</p>
              <p className="eventura-card-note">
                Across decor, catering, venues, lights, logistics & more.
              </p>
            </div>
            <div className="eventura-card eventura-card-glow">
              <p className="eventura-card-label">Blacklisted / High risk</p>
              <p className="eventura-card-value">
                {
                  vendors.filter((v) => v.blacklisted || v.highRisk)
                    .length
                }
              </p>
              <p className="eventura-card-note">
                Only CEO can override and use blocked vendors.
              </p>
            </div>
            <div className="eventura-card eventura-card-glow">
              <p className="eventura-card-label">Vendor payouts this month</p>
              <p className="eventura-card-value">
                ₹
                {formatCurrency(
                  financeRows
                    .filter((r) => r.category === "Vendor Payment")
                    .reduce(
                      (sum, r) => sum + parseMoney(r.expense || "0"),
                      0
                    )
                )}
              </p>
              <p className="eventura-card-note">
                Connected to Finance board (Vendor Payment category).
              </p>
            </div>
          </section>

          {/* Filters */}
          <section className="eventura-panel" style={{ marginBottom: "1rem" }}>
            <div className="eventura-form-grid">
              <div className="eventura-field">
                <input
                  className="eventura-input"
                  placeholder="Search vendors by name, category, city..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <div className="eventura-field">
                <select
                  className="eventura-input"
                  value={filterCategory}
                  onChange={(e) =>
                    setFilterCategory(
                      e.target.value === "All"
                        ? "All"
                        : (e.target.value as VendorCategory)
                    )
                  }
                >
                  <option value="All">All categories</option>
                  <option>Decor</option>
                  <option>Catering</option>
                  <option>Photography</option>
                  <option>Venue</option>
                  <option>Entertainment</option>
                  <option>Logistics</option>
                  <option>Lights & Sound</option>
                  <option>Other</option>
                </select>
              </div>
            </div>
          </section>

          {/* 3-column layout: form | list | detail+tabs */}
          <div
            className="eventura-columns"
            style={{
              gridTemplateColumns:
                "minmax(0, 1.4fr) minmax(0, 1.4fr) minmax(0, 2fr)",
            }}
          >
            {/* Column 1: Add/Edit Vendor */}
            <div className="eventura-panel">
              <h2 className="eventura-panel-title">
                {editingId ? "Edit vendor" : "Add vendor"}
              </h2>
              <form className="eventura-form" onSubmit={handleSubmit}>
                <div className="eventura-field">
                  <label className="eventura-label">Vendor name</label>
                  <input
                    name="name"
                    className="eventura-input"
                    value={form.name}
                    onChange={handleFormChange}
                    placeholder="Maa Royal Decorators"
                  />
                </div>
                <div className="eventura-form-grid">
                  <div className="eventura-field">
                    <label className="eventura-label">Category</label>
                    <select
                      name="category"
                      className="eventura-input"
                      value={form.category}
                      onChange={handleFormChange}
                    >
                      <option>Decor</option>
                      <option>Catering</option>
                      <option>Photography</option>
                      <option>Venue</option>
                      <option>Entertainment</option>
                      <option>Logistics</option>
                      <option>Lights & Sound</option>
                      <option>Other</option>
                    </select>
                  </div>
                  <div className="eventura-field">
                    <label className="eventura-label">Company type</label>
                    <input
                      name="companyType"
                      className="eventura-input"
                      value={form.companyType}
                      onChange={handleFormChange}
                      placeholder="Proprietorship / Partnership / Pvt Ltd"
                    />
                  </div>
                </div>

                <div className="eventura-form-grid">
                  <div className="eventura-field">
                    <label className="eventura-label">Contact person</label>
                    <input
                      name="contactPerson"
                      className="eventura-input"
                      value={form.contactPerson}
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
                    <label className="eventura-label">GST / License</label>
                    <input
                      name="gstNumber"
                      className="eventura-input"
                      value={form.gstNumber}
                      onChange={handleFormChange}
                      placeholder="GST + key license info"
                    />
                  </div>
                </div>

                <div className="eventura-field">
                  <label className="eventura-label">License details</label>
                  <input
                    name="licenseDetails"
                    className="eventura-input"
                    value={form.licenseDetails}
                    onChange={handleFormChange}
                    placeholder="Trade license, insurance, etc."
                  />
                </div>

                <div className="eventura-field">
                  <label className="eventura-label">Cities served</label>
                  <input
                    name="citiesServed"
                    className="eventura-input"
                    value={form.citiesServed}
                    onChange={handleFormChange}
                    placeholder="Surat, Ahmedabad, Rajkot…"
                  />
                </div>

                <div className="eventura-form-grid">
                  <div className="eventura-field">
                    <label className="eventura-label">Crew size</label>
                    <input
                      name="crewSize"
                      className="eventura-input"
                      value={form.crewSize}
                      onChange={handleFormChange}
                      placeholder="10–20"
                    />
                  </div>
                  <div className="eventura-field">
                    <label className="eventura-label">
                      Base pricing from (₹)
                    </label>
                    <input
                      name="basePriceFrom"
                      className="eventura-input"
                      value={form.basePriceFrom}
                      onChange={handleFormChange}
                      placeholder="350000"
                    />
                  </div>
                </div>

                <div className="eventura-field">
                  <label className="eventura-label">Specialization tags</label>
                  <input
                    name="specializationTags"
                    className="eventura-input"
                    value={form.specializationTags}
                    onChange={handleFormChange}
                    placeholder="Luxury decor, LED wall, Punjabi catering…"
                  />
                </div>

                <div className="eventura-field">
                  <label className="eventura-label">Contract expiry</label>
                  <input
                    type="date"
                    name="contractExpiry"
                    className="eventura-input"
                    value={form.contractExpiry}
                    onChange={handleFormChange}
                  />
                </div>

                <div className="eventura-actions">
                  <button type="submit" className="eventura-button">
                    {editingId ? "Update vendor" : "Save vendor"}
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

            {/* Column 2: Vendor List */}
            <div className="eventura-panel">
              <h2 className="eventura-panel-title">
                Vendor list ({filteredVendors.length})
              </h2>
              <div className="eventura-table-wrapper" style={{ marginTop: "0.5rem" }}>
                {filteredVendors.length === 0 ? (
                  <p style={{ fontSize: "0.8rem", color: "#9ca3af" }}>
                    No vendors found. Add one from the left panel.
                  </p>
                ) : (
                  <table className="eventura-table">
                    <thead>
                      <tr>
                        <th>Score</th>
                        <th>Vendor</th>
                        <th>Category</th>
                        <th>Cities</th>
                        <th />
                      </tr>
                    </thead>
                    <tbody>
                      {filteredVendors.map((v) => {
                        const score = v.aiSuccessRate;
                        const scoreClass =
                          score >= 90
                            ? "eventura-tag-green"
                            : score >= 75
                            ? "eventura-tag-blue"
                            : "eventura-tag-amber";
                        return (
                          <tr
                            key={v.id}
                            className={
                              v.id === selectedId ? "eventura-row-active" : ""
                            }
                            onClick={() => {
                              setSelectedId(v.id);
                              setActiveTab("overview");
                            }}
                          >
                            <td>
                              <span className={`eventura-tag ${scoreClass}`}>
                                {score}%
                              </span>
                            </td>
                            <td>
                              <div className="eventura-list-title">{v.name}</div>
                              <div className="eventura-list-sub">
                                {v.contactPerson} · {v.phone}
                              </div>
                            </td>
                            <td>{v.category}</td>
                            <td>{v.citiesServed || "–"}</td>
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
                                    handleEdit(v.id);
                                  }}
                                >
                                  Edit
                                </button>
                                <button
                                  type="button"
                                  className="eventura-tag eventura-tag-amber"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDelete(v.id);
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

            {/* Column 3: Detail Tabs */}
            <div className="eventura-panel">
              {!selectedVendor ? (
                <p style={{ fontSize: "0.8rem", color: "#9ca3af" }}>
                  Select a vendor to see overview, pricing, contracts,
                  performance and more.
                </p>
              ) : (
                <>
                  <h2 className="eventura-panel-title">
                    {selectedVendor.name}
                  </h2>
                  <p className="eventura-subtitle">
                    {selectedVendor.category} · {selectedVendor.citiesServed ||
                      "Cities not set"}
                  </p>

                  {/* Tabs */}
                  <div className="eventura-tabs-row">
                    <TabButton
                      label="Overview"
                      active={activeTab === "overview"}
                      onClick={() => setActiveTab("overview")}
                    />
                    <TabButton
                      label="Pricing"
                      active={activeTab === "pricing"}
                      onClick={() => setActiveTab("pricing")}
                    />
                    <TabButton
                      label="Contracts"
                      active={activeTab === "contracts"}
                      onClick={() => setActiveTab("contracts")}
                    />
                    <TabButton
                      label="Performance"
                      active={activeTab === "performance"}
                      onClick={() => setActiveTab("performance")}
                    />
                    <TabButton
                      label="Inventory"
                      active={activeTab === "inventory"}
                      onClick={() => setActiveTab("inventory")}
                    />
                    <TabButton
                      label="Availability"
                      active={activeTab === "availability"}
                      onClick={() => setActiveTab("availability")}
                    />
                    <TabButton
                      label="Communication"
                      active={activeTab === "communication"}
                      onClick={() => setActiveTab("communication")}
                    />
                  </div>

                  {/* TAB CONTENT */}
                  <div style={{ marginTop: "0.75rem" }}>
                    {activeTab === "overview" && (
                      <OverviewTab
                        vendor={selectedVendor}
                        vendorEvents={vendorEvents}
                        vendorFinance={vendorFinance}
                        onToggleFlag={toggleFlag}
                      />
                    )}
                    {activeTab === "pricing" && (
                      <PricingTab vendor={selectedVendor} />
                    )}
                    {activeTab === "contracts" && (
                      <ContractsTab vendor={selectedVendor} />
                    )}
                    {activeTab === "performance" && (
                      <PerformanceTab vendor={selectedVendor} />
                    )}
                    {activeTab === "inventory" && (
                      <InventoryTab vendor={selectedVendor} />
                    )}
                    {activeTab === "availability" && (
                      <AvailabilityTab vendor={selectedVendor} />
                    )}
                    {activeTab === "communication" && (
                      <CommunicationTab
                        vendor={selectedVendor}
                        onWalletChange={(value) =>
                          updateWallet(selectedVendor.id, value)
                        }
                        vendorFinance={vendorFinance}
                      />
                    )}
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

/* ==== Tabs components ==== */

function OverviewTab(props: {
  vendor: VendorRecord;
  vendorEvents: EventItem[];
  vendorFinance: { totalPaid: number; totalPlanned: number };
  onToggleFlag: (id: number, field: "highRisk" | "blacklisted") => void;
}) {
  const { vendor, vendorEvents, vendorFinance, onToggleFlag } = props;
  const planned = vendorFinance.totalPlanned;
  const paid = vendorFinance.totalPaid;
  const remaining = planned - paid;

  const contractWarning =
    vendor.contractExpiry &&
    new Date(vendor.contractExpiry) <
      new Date(Date.now() + 24 * 60 * 60 * 1000 * 30); // < 30 days

  return (
    <>
      <h3 className="eventura-subsection-title">Profile & AI insights</h3>
      <ul className="eventura-bullets">
        <li>
          Company type: {vendor.companyType || "Not set"}
        </li>
        <li>Contact: {vendor.contactPerson || "–"} · {vendor.phone || "–"}</li>
        <li>Email: {vendor.email || "–"}</li>
        <li>GST / License: {vendor.gstNumber || "Not set"}</li>
        <li>Crew size: {vendor.crewSize || "Not set"}</li>
        <li>Base price from: ₹
          {vendor.basePriceFrom
            ? formatCurrency(parseMoney(vendor.basePriceFrom))
            : "0"}
        </li>
        <li>Specialization: {vendor.specializationTags || "–"}</li>
      </ul>

      <div
        className="eventura-panel"
        style={{
          marginTop: "0.6rem",
          background:
            "radial-gradient(circle at top, rgba(129, 140, 248,0.3), rgba(15,23,42,0.98))",
        }}
      >
        <p className="eventura-card-label">AI Insights</p>
        <p className="eventura-small-text">
          Ideal for: {vendor.aiIdealFor || "Not calculated"}
        </p>
        <p className="eventura-small-text">
          Success rate: {vendor.aiSuccessRate}% · Budget range:{" "}
          {vendor.aiBudgetRange}
        </p>
        <p className="eventura-small-text">
          Risk level: {vendor.aiRiskLevel}
        </p>
      </div>

      <h3 className="eventura-subsection-title" style={{ marginTop: "0.7rem" }}>
        Connected Events
      </h3>
      {vendorEvents.length === 0 ? (
        <p className="eventura-small-text">
          No events auto-linked yet. Add vendor name into event notes or venue
          field to auto-connect.
        </p>
      ) : (
        <ul className="eventura-bullets">
          {vendorEvents.map((e) => (
            <li key={e.id}>
              {e.eventName} · {e.city} · {e.status} · Budget:{" "}
              {e.budget ? `₹${formatCurrency(parseMoney(e.budget))}` : "–"}
            </li>
          ))}
        </ul>
      )}

      <h3 className="eventura-subsection-title" style={{ marginTop: "0.7rem" }}>
        Finance (linked to Vendor Payments)
      </h3>
      <ul className="eventura-bullets">
        <li>
          Planned payouts: ₹{formatCurrency(planned)}
        </li>
        <li>
          Marked as paid: ₹{formatCurrency(paid)}
        </li>
        <li>
          Remaining (based on Finance notes): ₹{formatCurrency(remaining)}
        </li>
        <li>
          Vendor wallet balance (manual): ₹
          {formatCurrency(parseMoney(vendor.walletBalance || "0"))}
        </li>
      </ul>

      <h3 className="eventura-subsection-title" style={{ marginTop: "0.7rem" }}>
        Risk & Compliance
      </h3>
      <div className="eventura-chips-row">
        <button
          type="button"
          className={
            "eventura-tag " +
            (vendor.highRisk ? "eventura-tag-amber" : "eventura-tag-blue")
          }
          onClick={() => onToggleFlag(vendor.id, "highRisk")}
        >
          {vendor.highRisk ? "High risk (click to clear)" : "Mark as high risk"}
        </button>
        <button
          type="button"
          className={
            "eventura-tag " +
            (vendor.blacklisted ? "eventura-tag-amber" : "eventura-tag-blue")
          }
          onClick={() => onToggleFlag(vendor.id, "blacklisted")}
        >
          {vendor.blacklisted
            ? "Blacklisted (CEO override only)"
            : "Mark as blacklisted"}
        </button>
      </div>
      {contractWarning && (
        <p
          className="eventura-small-text"
          style={{ marginTop: "0.5rem", color: "#facc15" }}
        >
          ⚠ Contract expiring soon. Renew agreement with this vendor.
        </p>
      )}

      {vendor.internalNotes && (
        <>
          <h3
            className="eventura-subsection-title"
            style={{ marginTop: "0.7rem" }}
          >
            Internal notes
          </h3>
          <p className="eventura-small-text">{vendor.internalNotes}</p>
        </>
      )}
    </>
  );
}

function PricingTab({ vendor }: { vendor: VendorRecord }) {
  return (
    <>
      <h3 className="eventura-subsection-title">Pricing & Packages</h3>
      <p className="eventura-small-text">
        Use this section as your quick reference to vendor&apos;s typical decor /
        catering / artist pricing. Detailed line items can be stored in Google
        Sheets and linked here in future.
      </p>

      <ul className="eventura-bullets" style={{ marginTop: "0.6rem" }}>
        <li>
          Base pricing: ₹
          {vendor.basePriceFrom
            ? formatCurrency(parseMoney(vendor.basePriceFrom))
            : "Not set"}
        </li>
        <li>Tiered pricing: weekday vs weekend; peak season; destination.</li>
        <li>Use Finance board to capture exact payouts per event.</li>
      </ul>

      <div
        className="eventura-panel"
        style={{
          marginTop: "0.7rem",
          background:
            "radial-gradient(circle at top, rgba(168,85,247,0.3), rgba(15,23,42,0.98))",
        }}
      >
        <p className="eventura-card-label">AI Pricing ideas (placeholder)</p>
        <p className="eventura-small-text">
          In future, Eventura OS can auto-suggest decor / catering rates based on
          past 12 months, city and season. For now, treat this as a reference
          board only.
        </p>
      </div>
    </>
  );
}

function ContractsTab({ vendor }: { vendor: VendorRecord }) {
  return (
    <>
      <h3 className="eventura-subsection-title">Contracts & Compliance</h3>
      <ul className="eventura-bullets">
        <li>Contract expiry: {vendor.contractExpiry || "Not set"}</li>
        <li>
          Cancellation clause: {vendor.hasCancellationClause ? "Yes" : "No"}
        </li>
        <li>Refund clause: {vendor.hasRefundClause ? "Yes" : "No"}</li>
        <li>Penalty clause: {vendor.hasPenaltyClause ? "Yes" : "No"}</li>
        <li>Delivery obligations: {vendor.hasDeliveryClause ? "Yes" : "No"}</li>
      </ul>
      <p className="eventura-small-text" style={{ marginTop: "0.6rem" }}>
        You can upload actual PDFs in a cloud folder (Google Drive / OneDrive) and
        store links here in future iterations.
      </p>
      <div
        className="eventura-panel"
        style={{
          marginTop: "0.7rem",
          background:
            "radial-gradient(circle at top, rgba(248,250,252,0.06), rgba(15,23,42,0.98))",
        }}
      >
        <p className="eventura-card-label">AI clause checker (concept)</p>
        <p className="eventura-small-text">
          Future AI will scan uploaded contracts for missing cancellation,
          refund, penalty and delivery clauses and highlight risk areas before you
          sign.
        </p>
      </div>
    </>
  );
}

function PerformanceTab({ vendor }: { vendor: VendorRecord }) {
  return (
    <>
      <h3 className="eventura-subsection-title">Performance scorecard</h3>
      <table className="eventura-table" style={{ fontSize: "0.8rem" }}>
        <tbody>
          <tr>
            <td>On-time delivery</td>
            <td>{vendor.scoreOnTime}%</td>
            <td>Delays & setup punctuality</td>
          </tr>
          <tr>
            <td>Design accuracy</td>
            <td>{vendor.scoreDesignAccuracy}%</td>
            <td>Matches moodboard and client brief</td>
          </tr>
          <tr>
            <td>Client satisfaction</td>
            <td>{vendor.scoreClientSatisfaction}%</td>
            <td>Ratings from Eventura clients</td>
          </tr>
          <tr>
            <td>Professional behavior</td>
            <td>{vendor.scoreBehavior}%</td>
            <td>Team attitude & cooperation</td>
          </tr>
          <tr>
            <td>Price stability</td>
            <td>{vendor.scorePriceStability}%</td>
            <td>Consistency of rates season-on-season</td>
          </tr>
          <tr>
            <td>Material quality</td>
            <td>{vendor.scoreMaterialQuality}%</td>
            <td>Props, florals & equipment condition</td>
          </tr>
        </tbody>
      </table>
      <p className="eventura-small-text" style={{ marginTop: "0.6rem" }}>
        Future upgrade can connect this directly with event feedback forms & staff
        ratings per event.
      </p>
    </>
  );
}

function InventoryTab({ vendor }: { vendor: VendorRecord }) {
  return (
    <>
      <h3 className="eventura-subsection-title">
        Inventory & assets (vendor specific)
      </h3>
      {vendor.inventorySummary ? (
        <p className="eventura-small-text">{vendor.inventorySummary}</p>
      ) : (
        <p className="eventura-small-text">
          Use this area to note what this vendor owns: mandaps, stages,
          centerpieces, lights, furniture, florals, LED walls etc.
        </p>
      )}
    </>
  );
}

function AvailabilityTab({ vendor }: { vendor: VendorRecord }) {
  return (
    <>
      <h3 className="eventura-subsection-title">Availability & scheduling</h3>
      <ul className="eventura-bullets">
        <li>
          Availability notes: {vendor.availabilityNotes || "Not set yet"}
        </li>
        <li>Double booking risk: {vendor.doubleBookingRisk}</li>
        <li>Cancellation risk: {vendor.cancellationRisk}</li>
      </ul>
      <p className="eventura-small-text" style={{ marginTop: "0.6rem" }}>
        In future, this can sync with your Events calendar and public holidays to
        show real-time risk of double bookings.
      </p>
    </>
  );
}

function CommunicationTab(props: {
  vendor: VendorRecord;
  vendorFinance: { totalPaid: number; totalPlanned: number };
  onWalletChange: (value: string) => void;
}) {
  const { vendor, vendorFinance, onWalletChange } = props;
  const remaining = vendorFinance.totalPlanned - vendorFinance.totalPaid;
  return (
    <>
      <h3 className="eventura-subsection-title">Communication & payments</h3>
      <ul className="eventura-bullets">
        <li>
          Use WhatsApp Business templates for booking confirmation, payment
          reminders and event-day instructions.
        </li>
        <li>
          Store important disputes / special instructions as internal notes in
          future version.
        </li>
      </ul>

      <h3
        className="eventura-subsection-title"
        style={{ marginTop: "0.7rem" }}
      >
        Vendor wallet
      </h3>
      <ul className="eventura-bullets">
        <li>
          Planned payouts (Finance Vendor Payments): ₹
          {formatCurrency(vendorFinance.totalPlanned)}
        </li>
        <li>
          Marked paid (from Finance notes): ₹
          {formatCurrency(vendorFinance.totalPaid)}
        </li>
        <li>
          Remaining (based on Finance notes): ₹
          {formatCurrency(remaining)}
        </li>
      </ul>
      <div className="eventura-field" style={{ marginTop: "0.4rem" }}>
        <label className="eventura-label">
          Manual wallet balance for this vendor (₹)
        </label>
        <input
          className="eventura-input"
          value={vendor.walletBalance}
          onChange={(e) => onWalletChange(e.target.value)}
        />
      </div>
      <p className="eventura-small-text" style={{ marginTop: "0.4rem" }}>
        This is a manual field to match your real accounting balances. It helps
        you quickly see how much is still due without opening full books.
      </p>
    </>
  );
}

/* ==== Reusable small UI pieces ==== */

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
      className={
        "eventura-tab-button" + (active ? " eventura-tab-button-active" : "")
      }
      onClick={onClick}
    >
      {label}
    </button>
  );
}

/* ========= Shared sidebar/topbar ========= */

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
          placeholder="Search vendors, events, finance…"
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
