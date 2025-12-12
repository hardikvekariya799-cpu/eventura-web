"use client";

import React, { useEffect, useMemo, useState } from "react";

/* ================= AUTH ================= */

type Role = "CEO" | "Staff";
type User = { name: string; role: Role; city: string };
const USER_KEY = "eventura-user";

/* ================= DB KEYS (CONNECTED) ================= */

const DB_EVENTS = "eventura-events";
const DB_FIN = "eventura-finance-transactions";
const DB_HR = "eventura-hr-team";

/* ================= TYPES ================= */

type EventStatus = "Tentative" | "Confirmed" | "Completed" | "Cancelled";

type EventItem = {
  id: number;
  title: string;
  status: EventStatus;
  budget?: number;
  date: string; // YYYY-MM-DD
  city?: string;
};

type TxType = "Income" | "Expense";

type FinanceTx = {
  id: number;
  type: TxType;
  date: string; // YYYY-MM-DD
  category: string;
  amount: number;
  note?: string;
};

type TeamMember = {
  id: number;
  status: "Core" | "Freelancer" | "Trainee";
  monthlySalary: number;
};

/* ================= UTILS ================= */

const INR = (v: number) => "₹" + Math.round(v || 0).toLocaleString("en-IN");

function today() {
  return new Date().toISOString().slice(0, 10);
}

function safeArray<T>(key: string): T[] {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const data = JSON.parse(raw);
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

function nextId(items: { id: number }[]) {
  return (items.reduce((m, x) => Math.max(m, x.id), 0) || 0) + 1;
}

function clampPct(v: number) {
  if (Number.isNaN(v)) return 0;
  return Math.max(0, Math.min(100, v));
}

/* ================= PAGE ================= */

export default function FinancePage() {
  const [user, setUser] = useState<User | null>(null);

  const [events, setEvents] = useState<EventItem[]>([]);
  const [tx, setTx] = useState<FinanceTx[]>([]);
  const [team, setTeam] = useState<TeamMember[]>([]);

  // GST + Settings
  const [gst, setGst] = useState<number>(18);

  // Add Transaction form
  const [form, setForm] = useState({
    type: "Income" as TxType,
    date: today(),
    category: "",
    amount: "",
    note: "",
  });

  // Inline editing
  const [editingTxId, setEditingTxId] = useState<number | null>(null);
  const [editingTx, setEditingTx] = useState<FinanceTx | null>(null);

  const [editingEventId, setEditingEventId] = useState<number | null>(null);
  const [editingEvent, setEditingEvent] = useState<EventItem | null>(null);

  // AI What-If
  const [whatIfEvents, setWhatIfEvents] = useState(0);
  const [whatIfHr, setWhatIfHr] = useState(0);
  const [whatIfExpenseCut, setWhatIfExpenseCut] = useState(0);

  /* ===== Auth ===== */
  useEffect(() => {
    const raw = localStorage.getItem(USER_KEY);
    if (!raw) return (window.location.href = "/login");
    try {
      const u: User = JSON.parse(raw);
      setUser(u);
    } catch {
      localStorage.removeItem(USER_KEY);
      window.location.href = "/login";
    }
  }, []);

  /* ===== Load Connected Data ===== */
  useEffect(() => {
    setEvents(safeArray<EventItem>(DB_EVENTS));
    setTx(safeArray<FinanceTx>(DB_FIN));
    setTeam(safeArray<TeamMember>(DB_HR));

    // optional stored GST
    const storedGst = localStorage.getItem("eventura-fin-gst");
    if (storedGst) setGst(Number(storedGst) || 18);
  }, []);

  /* ===== Persist ===== */
  useEffect(() => {
    localStorage.setItem(DB_FIN, JSON.stringify(tx));
  }, [tx]);

  useEffect(() => {
    localStorage.setItem(DB_EVENTS, JSON.stringify(events));
  }, [events]);

  useEffect(() => {
    localStorage.setItem("eventura-fin-gst", String(gst));
  }, [gst]);

  /* ================= CALCULATIONS ================= */

  const coreHrCost = useMemo(
    () =>
      team
        .filter((m) => m.status === "Core")
        .reduce((s, m) => s + (m.monthlySalary || 0), 0),
    [team]
  );

  const confirmedEventRevenue = useMemo(() => {
    return events
      .filter((e) => e.status === "Confirmed" || e.status === "Completed")
      .reduce((s, e) => s + (e.budget || 0), 0);
  }, [events]);

  const manualIncome = useMemo(
    () => tx.filter((t) => t.type === "Income").reduce((s, t) => s + t.amount, 0),
    [tx]
  );

  const manualExpense = useMemo(
    () => tx.filter((t) => t.type === "Expense").reduce((s, t) => s + t.amount, 0),
    [tx]
  );

  const totalRevenue = confirmedEventRevenue + manualIncome;
  const gstAmount = (totalRevenue * clampPct(gst)) / 100;
  const netRevenue = totalRevenue - gstAmount;

  const profit = netRevenue - manualExpense - coreHrCost;

  // Ratios
  const ratios = useMemo(() => {
    const revenue = totalRevenue || 1;
    const profitMargin = (profit / revenue) * 100;
    const hrRatio = (coreHrCost / revenue) * 100;
    const expenseRatio = (manualExpense / revenue) * 100;
    const netMargin = (profit / revenue) * 100;

    const activeEvents = events.filter((e) => e.status !== "Cancelled").length || 1;
    const revenuePerEvent = totalRevenue / activeEvents;

    const dailyBurn = manualExpense / 30;
    const runwayMonths = manualExpense > 0 ? netRevenue / manualExpense : 0;

    return {
      profitMargin,
      netMargin,
      hrRatio,
      expenseRatio,
      revenuePerEvent,
      dailyBurn,
      runwayMonths,
    };
  }, [totalRevenue, profit, coreHrCost, manualExpense, netRevenue, events]);

  /* ================= AI INSIGHTS ================= */

  const aiInsights = useMemo(() => {
    const list: string[] = [];

    if (totalRevenue === 0) list.push("⚠ No revenue found. Confirm event budgets or add income transactions.");
    if (ratios.netMargin < 20) list.push("⚠ Net margin below 20%. Reduce costs or increase pricing.");
    if (ratios.hrRatio > 35) list.push("🚨 HR cost > 35% of revenue. Use freelancers or optimize workload.");
    if (ratios.expenseRatio > 55) list.push("⚠ Expenses > 55% of revenue. Vendor negotiation needed.");
    if (ratios.revenuePerEvent < 400000) list.push("📉 Revenue per event is low. Push premium décor / add-ons.");
    if (ratios.runwayMonths > 0 && ratios.runwayMonths < 3) list.push("🚨 Cash runway under 3 months. Cut spend or speed collections.");

    // Smart event note
    const tentativeHighBudget = events.filter((e) => e.status === "Tentative" && (e.budget || 0) >= 500000);
    if (tentativeHighBudget.length > 0) {
      list.push(`💡 You have ${tentativeHighBudget.length} high-budget tentative event(s). Close them to improve cashflow.`);
    }

    if (list.length === 0) list.push("✅ Finance looks healthy. Keep margins stable and track vendor costs.");

    return list;
  }, [totalRevenue, ratios, events]);

  /* ================= WHAT-IF SIM ================= */

  const whatIf = useMemo(() => {
    // simple model assumptions:
    const avgWeddingRevenue = 600000; // can be adjusted later
    const addRevenue = whatIfEvents * avgWeddingRevenue;

    const hrIncrease = (coreHrCost * clampPct(whatIfHr)) / 100;
    const expenseCut = (manualExpense * clampPct(whatIfExpenseCut)) / 100;

    const projectedProfit =
      (netRevenue + addRevenue) - (manualExpense - expenseCut) - (coreHrCost + hrIncrease);

    const notes: string[] = [];
    if (projectedProfit < 0) notes.push("🚨 Projected loss. Reduce costs or add more bookings.");
    if (projectedProfit >= 0 && projectedProfit < 300000) notes.push("⚠ Profit is thin. Be careful with spend.");
    if (projectedProfit >= 500000) notes.push("🚀 Strong projected profit. Scaling looks safe.");

    if (whatIfEvents >= 3) notes.push("📈 Check HR capacity before adding 3+ events.");
    if (whatIfHr > 15) notes.push("⚠ HR increase above 15% can hurt margins quickly.");

    return { projectedProfit, notes };
  }, [whatIfEvents, whatIfHr, whatIfExpenseCut, netRevenue, manualExpense, coreHrCost]);

  /* ================= CRUD ================= */

  const addTx = () => {
    const amt = Number(form.amount);
    if (!form.category.trim()) return alert("Category required");
    if (!form.date) return alert("Date required");
    if (!amt || isNaN(amt) || amt <= 0) return alert("Valid amount required");

    const item: FinanceTx = {
      id: nextId(tx),
      type: form.type,
      date: form.date,
      category: form.category.trim(),
      amount: amt,
      note: form.note.trim() || undefined,
    };

    setTx([item, ...tx]);
    setForm({ ...form, category: "", amount: "", note: "" });
  };

  const deleteTx = (id: number) => {
    if (!confirm("Delete this transaction?")) return;
    setTx(tx.filter((t) => t.id !== id));
  };

  const startEditTx = (t: FinanceTx) => {
    setEditingTxId(t.id);
    setEditingTx({ ...t });
  };

  const saveEditTx = () => {
    if (!editingTxId || !editingTx) return;
    if (!editingTx.category.trim()) return alert("Category required");
    if (!editingTx.date) return alert("Date required");
    if (!editingTx.amount || editingTx.amount <= 0) return alert("Valid amount required");

    setTx(tx.map((t) => (t.id === editingTxId ? { ...editingTx, category: editingTx.category.trim() } : t)));
    setEditingTxId(null);
    setEditingTx(null);
  };

  const cancelEditTx = () => {
    setEditingTxId(null);
    setEditingTx(null);
  };

  const deleteEvent = (id: number) => {
    if (!confirm("Delete this event from Events DB?")) return;
    setEvents(events.filter((e) => e.id !== id));
  };

  const startEditEvent = (e: EventItem) => {
    setEditingEventId(e.id);
    setEditingEvent({ ...e });
  };

  const saveEditEvent = () => {
    if (!editingEventId || !editingEvent) return;
    if (!editingEvent.title.trim()) return alert("Event title required");
    if (!editingEvent.date) return alert("Event date required");

    setEvents(
      events.map((e) =>
        e.id === editingEventId
          ? {
              ...editingEvent,
              title: editingEvent.title.trim(),
              budget: editingEvent.budget && editingEvent.budget > 0 ? editingEvent.budget : 0,
            }
          : e
      )
    );
    setEditingEventId(null);
    setEditingEvent(null);
  };

  const cancelEditEvent = () => {
    setEditingEventId(null);
    setEditingEvent(null);
  };

  /* ================= GUARD ================= */

  if (!user) return null;
  if (user.role !== "CEO") return <div style={{ padding: 20 }}>Finance is CEO-only.</div>;

  /* ================= UI ================= */

  const syncedRevenueRows = events
    .filter((e) => e.status === "Confirmed" || e.status === "Completed")
    .sort((a, b) => a.date.localeCompare(b.date));

  return (
    <main className="eventura-os">
      <div className="eventura-content">
        <div className="eventura-header-row">
          <div>
            <h1 className="eventura-page-title">Finance Intelligence</h1>
            <p className="eventura-subtitle">
              Connected to Events + HR + Dashboard. Everything is editable & removable.
            </p>
          </div>
        </div>

        {/* KPI */}
        <section className="eventura-grid">
          <Card label="Event Revenue (Auto)" value={INR(confirmedEventRevenue)} note="From Confirmed/Completed events" />
          <Card label="Manual Income" value={INR(manualIncome)} note="From transactions" />
          <Card label="Total Revenue" value={INR(totalRevenue)} note="Auto + Manual" />
          <Card label={`GST (${clampPct(gst)}%)`} value={INR(gstAmount)} note="Editable GST rate" />
          <Card label="Net Revenue" value={INR(netRevenue)} note="After GST" />
          <Card label="HR Cost (Core)" value={INR(coreHrCost)} note="From HR team DB" />
          <Card label="Expenses" value={INR(manualExpense)} note="From transactions" />
          <Card label="Net Profit" value={INR(profit)} note="Net Rev - Expense - HR" />
        </section>

        {/* Ratios */}
        <section className="eventura-columns">
          <div className="eventura-panel">
            <h2 className="eventura-panel-title">Automatic Ratio Analysis</h2>

            <div className="eventura-table-wrapper">
              <table className="eventura-table">
                <thead>
                  <tr>
                    <th>Metric</th>
                    <th>Value</th>
                    <th>Meaning</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Net Margin</td>
                    <td>{ratios.netMargin.toFixed(1)}%</td>
                    <td>Profit after GST, expenses, HR</td>
                  </tr>
                  <tr>
                    <td>HR Cost Ratio</td>
                    <td>{ratios.hrRatio.toFixed(1)}%</td>
                    <td>Core salary cost vs revenue</td>
                  </tr>
                  <tr>
                    <td>Expense Ratio</td>
                    <td>{ratios.expenseRatio.toFixed(1)}%</td>
                    <td>Ops + vendor expenses vs revenue</td>
                  </tr>
                  <tr>
                    <td>Revenue per Event</td>
                    <td>{INR(ratios.revenuePerEvent)}</td>
                    <td>Helps pricing + package strategy</td>
                  </tr>
                  <tr>
                    <td>Daily Burn (Expense/30)</td>
                    <td>{INR(ratios.dailyBurn)}</td>
                    <td>Spending speed indicator</td>
                  </tr>
                  <tr>
                    <td>Cash Runway (months)</td>
                    <td>{ratios.runwayMonths.toFixed(1)}</td>
                    <td>Net revenue divided by expenses</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div style={{ display: "flex", gap: 10, marginTop: 10, flexWrap: "wrap" }}>
              <label className="eventura-small-text" style={{ display: "flex", alignItems: "center", gap: 8 }}>
                GST %
                <input
                  className="eventura-search"
                  style={{ width: 120 }}
                  type="number"
                  value={gst}
                  onChange={(e) => setGst(clampPct(Number(e.target.value)))}
                />
              </label>
            </div>
          </div>

          <div className="eventura-panel">
            <h2 className="eventura-panel-title">AI Finance Co-Pilot</h2>
            <ul className="eventura-bullets">
              {aiInsights.map((x, i) => (
                <li key={i}>{x}</li>
              ))}
            </ul>

            <h3 className="eventura-subsection-title" style={{ marginTop: 14 }}>
              What-If Simulator (AI)
            </h3>

            <div style={{ display: "grid", gap: 8 }}>
              <label className="eventura-small-text">
                Add Weddings (assume ₹6,00,000 each)
                <input
                  className="eventura-search"
                  type="number"
                  value={whatIfEvents}
                  onChange={(e) => setWhatIfEvents(Math.max(0, Number(e.target.value) || 0))}
                />
              </label>

              <label className="eventura-small-text">
                HR increase %
                <input
                  className="eventura-search"
                  type="number"
                  value={whatIfHr}
                  onChange={(e) => setWhatIfHr(clampPct(Number(e.target.value)))}
                />
              </label>

              <label className="eventura-small-text">
                Expense cut %
                <input
                  className="eventura-search"
                  type="number"
                  value={whatIfExpenseCut}
                  onChange={(e) => setWhatIfExpenseCut(clampPct(Number(e.target.value)))}
                />
              </label>

              <div className="eventura-card">
                <p className="eventura-card-label">Projected Profit</p>
                <p className="eventura-card-value">{INR(whatIf.projectedProfit)}</p>
                <ul className="eventura-bullets" style={{ marginTop: 8 }}>
                  {whatIf.notes.map((n, i) => (
                    <li key={i}>{n}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* Event Revenue (Editable) + Transactions (Editable) */}
        <section className="eventura-columns">
          {/* EVENT REVENUE LIST */}
          <div className="eventura-panel">
            <h2 className="eventura-panel-title">Event Revenue (Auto-Synced)</h2>
            <p className="eventura-small-text">
              Only <b>Confirmed</b> and <b>Completed</b> events count as revenue. You can edit budgets/status here.
            </p>

            <div className="eventura-table-wrapper">
              <table className="eventura-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Event</th>
                    <th>Status</th>
                    <th>Budget</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {syncedRevenueRows.length === 0 && (
                    <tr>
                      <td colSpan={5} className="eventura-small-text">
                        No Confirmed/Completed events with budgets yet.
                      </td>
                    </tr>
                  )}

                  {syncedRevenueRows.map((e) => (
                    <tr key={e.id}>
                      <td>{e.date}</td>
                      <td>
                        <div className="eventura-list-title">{e.title}</div>
                        <div className="eventura-list-sub">{e.city || "Surat"}</div>
                      </td>
                      <td>{e.status}</td>
                      <td>{INR(e.budget || 0)}</td>
                      <td style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        <button
                          className="eventura-tag eventura-tag-blue"
                          type="button"
                          onClick={() => startEditEvent(e)}
                        >
                          Edit
                        </button>
                        <button
                          className="eventura-tag eventura-tag-amber"
                          type="button"
                          onClick={() => deleteEvent(e.id)}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* EDIT EVENT */}
            {editingEventId && editingEvent && (
              <div className="eventura-card" style={{ marginTop: 12 }}>
                <p className="eventura-card-label">Edit Event Revenue Item</p>

                <div style={{ display: "grid", gap: 8 }}>
                  <input
                    className="eventura-search"
                    value={editingEvent.title}
                    onChange={(ev) =>
                      setEditingEvent({ ...editingEvent, title: ev.target.value })
                    }
                    placeholder="Event title"
                  />
                  <div style={{ display: "flex", gap: 8 }}>
                    <input
                      type="date"
                      className="eventura-search"
                      value={editingEvent.date}
                      onChange={(ev) =>
                        setEditingEvent({ ...editingEvent, date: ev.target.value })
                      }
                    />
                    <select
                      className="eventura-search"
                      value={editingEvent.status}
                      onChange={(ev) =>
                        setEditingEvent({
                          ...editingEvent,
                          status: ev.target.value as EventStatus,
                        })
                      }
                    >
                      <option>Tentative</option>
                      <option>Confirmed</option>
                      <option>Completed</option>
                      <option>Cancelled</option>
                    </select>
                  </div>
                  <input
                    className="eventura-search"
                    type="number"
                    value={editingEvent.budget || 0}
                    onChange={(ev) =>
                      setEditingEvent({
                        ...editingEvent,
                        budget: Number(ev.target.value) || 0,
                      })
                    }
                    placeholder="Budget"
                  />

                  <div style={{ display: "flex", gap: 8 }}>
                    <button className="eventura-button-secondary" type="button" onClick={saveEditEvent}>
                      Save
                    </button>
                    <button className="eventura-tag eventura-tag-amber" type="button" onClick={cancelEditEvent}>
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* TRANSACTIONS */}
          <div className="eventura-panel">
            <h2 className="eventura-panel-title">Transactions (Editable Ledger)</h2>

            {/* Add form */}
            <div style={{ display: "grid", gap: 8, marginBottom: 12 }}>
              <div style={{ display: "flex", gap: 8 }}>
                <select
                  className="eventura-search"
                  value={form.type}
                  onChange={(e) => setForm({ ...form, type: e.target.value as TxType })}
                >
                  <option>Income</option>
                  <option>Expense</option>
                </select>

                <input
                  type="date"
                  className="eventura-search"
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                />
              </div>

              <input
                className="eventura-search"
                placeholder="Category (Booking / Vendor / Salary / Rent / Ads...)"
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
              />
              <input
                className="eventura-search"
                placeholder="Amount"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
              />
              <input
                className="eventura-search"
                placeholder="Note (optional)"
                value={form.note}
                onChange={(e) => setForm({ ...form, note: e.target.value })}
              />

              <button className="eventura-button-secondary" type="button" onClick={addTx}>
                Add Transaction
              </button>
            </div>

            {/* Table */}
            <div className="eventura-table-wrapper">
              <table className="eventura-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Type</th>
                    <th>Category</th>
                    <th>Amount</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {tx.length === 0 && (
                    <tr>
                      <td colSpan={5} className="eventura-small-text">
                        No transactions yet.
                      </td>
                    </tr>
                  )}
                  {tx.map((t) => (
                    <tr key={t.id}>
                      <td>{t.date}</td>
                      <td>{t.type}</td>
                      <td>
                        <div className="eventura-list-title">{t.category}</div>
                        <div className="eventura-list-sub">{t.note || ""}</div>
                      </td>
                      <td>{INR(t.amount)}</td>
                      <td style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        <button className="eventura-tag eventura-tag-blue" type="button" onClick={() => startEditTx(t)}>
                          Edit
                        </button>
                        <button className="eventura-tag eventura-tag-amber" type="button" onClick={() => deleteTx(t.id)}>
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Edit transaction */}
            {editingTxId && editingTx && (
              <div className="eventura-card" style={{ marginTop: 12 }}>
                <p className="eventura-card-label">Edit Transaction</p>

                <div style={{ display: "grid", gap: 8 }}>
                  <div style={{ display: "flex", gap: 8 }}>
                    <select
                      className="eventura-search"
                      value={editingTx.type}
                      onChange={(e) => setEditingTx({ ...editingTx, type: e.target.value as TxType })}
                    >
                      <option>Income</option>
                      <option>Expense</option>
                    </select>

                    <input
                      type="date"
                      className="eventura-search"
                      value={editingTx.date}
                      onChange={(e) => setEditingTx({ ...editingTx, date: e.target.value })}
                    />
                  </div>

                  <input
                    className="eventura-search"
                    value={editingTx.category}
                    onChange={(e) => setEditingTx({ ...editingTx, category: e.target.value })}
                    placeholder="Category"
                  />
                  <input
                    className="eventura-search"
                    type="number"
                    value={editingTx.amount}
                    onChange={(e) => setEditingTx({ ...editingTx, amount: Number(e.target.value) || 0 })}
                    placeholder="Amount"
                  />
                  <input
                    className="eventura-search"
                    value={editingTx.note || ""}
                    onChange={(e) => setEditingTx({ ...editingTx, note: e.target.value })}
                    placeholder="Note"
                  />

                  <div style={{ display: "flex", gap: 8 }}>
                    <button className="eventura-button-secondary" type="button" onClick={saveEditTx}>
                      Save
                    </button>
                    <button className="eventura-tag eventura-tag-amber" type="button" onClick={cancelEditTx}>
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}

/* ================= UI PIECES ================= */

function Card({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="eventura-card eventura-card-glow">
      <p className="eventura-card-label">{label}</p>
      <p className="eventura-card-value">{value}</p>
      {note ? <p className="eventura-card-note">{note}</p> : null}
    </div>
  );
}
