"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";

/* ================= AUTH ================= */
type Role = "CEO" | "Staff";
type User = { name: string; role: Role; city: string };
const USER_KEY = "eventura-user";

/* ================= STORAGE KEYS (MUST MATCH OTHER TABS) ================= */
const DB_EVENTS = "eventura-events";
const DB_FIN = "eventura-finance-transactions";
const DB_HR = "eventura-hr-team";
const DB_FIN_CFG = "eventura-finance-config";

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
  eventId?: number; // optional link
};

type TeamMember = {
  id: number;
  status: "Core" | "Freelancer" | "Trainee";
  monthlySalary: number;
};

type FinanceConfig = {
  gstPct: number; // 0..100
  arConfirmedIsReceivable: boolean; // AR = confirmed budgets (until completed)
};

/* ================= UTILS ================= */
const INR = (v: number) => "₹" + Math.round(v || 0).toLocaleString("en-IN");

function today() {
  return new Date().toISOString().slice(0, 10);
}

function clampPct(v: number) {
  if (Number.isNaN(v)) return 0;
  return Math.max(0, Math.min(100, v));
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

function safeObj<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return { ...fallback, ...JSON.parse(raw) };
  } catch {
    return fallback;
  }
}

function nextId(items: { id: number }[]) {
  return (items.reduce((m, x) => Math.max(m, x.id), 0) || 0) + 1;
}

function yyyymm(d: string) {
  return (d || "").slice(0, 7);
}

/* ================= SIMPLE CANVAS CHART (NO LIBS) ================= */
function useCanvasResize() {
  const ref = useRef<HTMLCanvasElement | null>(null);
  const [w, setW] = useState(640);

  useEffect(() => {
    function onResize() {
      if (!ref.current) return;
      const parent = ref.current.parentElement;
      if (!parent) return;
      setW(Math.max(320, Math.floor(parent.getBoundingClientRect().width)));
    }
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  return { ref, w };
}

function drawMiniChart(
  canvas: HTMLCanvasElement,
  labels: string[],
  series: { name: string; values: number[] }[]
) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const W = canvas.width;
  const H = canvas.height;

  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = "rgba(255,255,255,0.03)";
  ctx.fillRect(0, 0, W, H);

  const padL = 44,
    padR = 16,
    padT = 16,
    padB = 30;
  const chartW = W - padL - padR;
  const chartH = H - padT - padB;

  const maxV = Math.max(
    1,
    ...series.flatMap((s) => s.values.map((v) => v || 0))
  );

  // grid
  ctx.strokeStyle = "rgba(255,255,255,0.10)";
  ctx.lineWidth = 1;
  for (let i = 0; i <= 4; i++) {
    const y = padT + (chartH * i) / 4;
    ctx.beginPath();
    ctx.moveTo(padL, y);
    ctx.lineTo(padL + chartW, y);
    ctx.stroke();

    const tick = Math.round(maxV * (1 - i / 4));
    ctx.fillStyle = "rgba(255,255,255,0.65)";
    ctx.font = "12px system-ui";
    ctx.fillText((tick / 1000).toFixed(0) + "k", 6, y + 4);
  }

  // x labels
  ctx.fillStyle = "rgba(255,255,255,0.65)";
  ctx.font = "12px system-ui";
  for (let i = 0; i < labels.length; i++) {
    if (labels.length <= 1) break;
    const x = padL + (chartW * i) / (labels.length - 1);
    if (i === 0 || i === labels.length - 1 || i % 2 === 1) {
      ctx.fillText(labels[i].slice(5), x - 10, padT + chartH + 20);
    }
  }

  // neutral lines with alpha
  const alphas = [1, 0.7, 0.45];
  series.forEach((s, si) => {
    ctx.strokeStyle = `rgba(255,255,255,${alphas[si % alphas.length]})`;
    ctx.lineWidth = 2;

    ctx.beginPath();
    s.values.forEach((v, i) => {
      const x = labels.length <= 1 ? padL : padL + (chartW * i) / (labels.length - 1);
      const y = padT + chartH - (chartH * (v || 0)) / maxV;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();
  });

  // legend
  ctx.font = "12px system-ui";
  ctx.fillStyle = "rgba(255,255,255,0.8)";
  let lx = padL;
  const ly = 14;
  series.forEach((s) => {
    ctx.fillText(s.name, lx, ly);
    lx += ctx.measureText(s.name).width + 14;
  });
}

/* ================= PAGE ================= */
export default function FinancePage() {
  const [user, setUser] = useState<User | null>(null);

  const [events, setEvents] = useState<EventItem[]>([]);
  const [tx, setTx] = useState<FinanceTx[]>([]);
  const [team, setTeam] = useState<TeamMember[]>([]);

  const defaultCfg: FinanceConfig = { gstPct: 18, arConfirmedIsReceivable: true };
  const [cfg, setCfg] = useState<FinanceConfig>(defaultCfg);

  const [tab, setTab] = useState<"overview" | "ledger" | "events" | "backup">("overview");
  const [filterMonth, setFilterMonth] = useState<string>("ALL");

  // Add transaction
  const [form, setForm] = useState({
    type: "Income" as TxType,
    date: today(),
    category: "",
    amount: "",
    note: "",
    eventId: "",
  });

  // Editing
  const [editingTxId, setEditingTxId] = useState<number | null>(null);
  const [editingTx, setEditingTx] = useState<FinanceTx | null>(null);

  const [editingEventId, setEditingEventId] = useState<number | null>(null);
  const [editingEvent, setEditingEvent] = useState<EventItem | null>(null);

  // Backup
  const [backupText, setBackupText] = useState("");

  // chart
  const { ref: chartRef, w: chartW } = useCanvasResize();

  /* ===== AUTH ===== */
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

  /* ===== LOAD (NO SEED OVERWRITE) ===== */
  useEffect(() => {
    setEvents(safeArray<EventItem>(DB_EVENTS));
    setTx(safeArray<FinanceTx>(DB_FIN));
    setTeam(safeArray<TeamMember>(DB_HR));
    setCfg(safeObj<FinanceConfig>(DB_FIN_CFG, defaultCfg));
  }, []);

  /* ===== PERSIST (THIS PREVENTS "DELETE COMES BACK") ===== */
  useEffect(() => {
    localStorage.setItem(DB_FIN, JSON.stringify(tx));
  }, [tx]);

  useEffect(() => {
    localStorage.setItem(DB_EVENTS, JSON.stringify(events));
  }, [events]);

  useEffect(() => {
    localStorage.setItem(DB_FIN_CFG, JSON.stringify(cfg));
  }, [cfg]);

  /* ================= DERIVED DATA ================= */

  const eventRevenueRows = useMemo(() => {
    return events
      .filter((e) => e.status === "Confirmed" || e.status === "Completed")
      .map((e) => ({ id: e.id, date: e.date, title: e.title, status: e.status, amount: e.budget || 0 }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [events]);

  const monthOptions = useMemo(() => {
    const months = new Set<string>();
    tx.forEach((t) => months.add(yyyymm(t.date)));
    events.forEach((e) => months.add(yyyymm(e.date)));
    return ["ALL", ...Array.from(months).filter(Boolean).sort()];
  }, [tx, events]);

  const filteredTx = useMemo(() => {
    if (filterMonth === "ALL") return tx;
    return tx.filter((t) => yyyymm(t.date) === filterMonth);
  }, [tx, filterMonth]);

  const filteredEventRevenue = useMemo(() => {
    if (filterMonth === "ALL") return eventRevenueRows;
    return eventRevenueRows.filter((r) => yyyymm(r.date) === filterMonth);
  }, [eventRevenueRows, filterMonth]);

  /* ================= CALC ================= */

  const coreHrCost = useMemo(
    () => team.filter((m) => m.status === "Core").reduce((s, m) => s + (m.monthlySalary || 0), 0),
    [team]
  );

  const manualIncome = useMemo(
    () => filteredTx.filter((t) => t.type === "Income").reduce((s, t) => s + t.amount, 0),
    [filteredTx]
  );

  const manualExpense = useMemo(
    () => filteredTx.filter((t) => t.type === "Expense").reduce((s, t) => s + t.amount, 0),
    [filteredTx]
  );

  const autoEventIncome = useMemo(
    () => filteredEventRevenue.reduce((s, r) => s + r.amount, 0),
    [filteredEventRevenue]
  );

  const totalRevenue = manualIncome + autoEventIncome;
  const gstAmount = (totalRevenue * clampPct(cfg.gstPct)) / 100;
  const netRevenue = totalRevenue - gstAmount;

  const netProfit = netRevenue - manualExpense - coreHrCost;

  const receivable = useMemo(() => {
    if (!cfg.arConfirmedIsReceivable) return 0;
    return events.filter((e) => e.status === "Confirmed").reduce((s, e) => s + (e.budget || 0), 0);
  }, [events, cfg.arConfirmedIsReceivable]);

  const ratios = useMemo(() => {
    const rev = totalRevenue || 1;
    return {
      netMargin: (netProfit / rev) * 100,
      hrRatio: (coreHrCost / rev) * 100,
      expenseRatio: (manualExpense / rev) * 100,
      runwayMonths: manualExpense > 0 ? netRevenue / manualExpense : 0,
    };
  }, [totalRevenue, netProfit, coreHrCost, manualExpense, netRevenue]);

  /* ================= AI INSIGHTS ================= */

  const aiInsights = useMemo(() => {
    const list: string[] = [];
    if (totalRevenue === 0) list.push("⚠ No revenue detected. Add event budgets (Confirmed/Completed) or add Income transactions.");
    if (ratios.netMargin < 20) list.push("🚨 Net margin below 20%. Increase pricing or reduce vendor costs.");
    if (ratios.hrRatio > 35) list.push("⚠ HR ratio above 35%. Consider freelancers for peak work.");
    if (ratios.expenseRatio > 55) list.push("⚠ Expenses above 55% of revenue. Audit top spending categories.");
    if (receivable > 0) list.push(`💰 Pending collections (Receivable): ${INR(receivable)}. Follow-up with clients.`);
    if (list.length === 0) list.push("✅ Finance looks stable. Maintain margin discipline and collect payments faster.");
    return list;
  }, [totalRevenue, ratios, receivable]);

  /* ================= CHART DATA ================= */

  const monthlySeries = useMemo(() => {
    const map = new Map<string, { income: number; expense: number; eventIncome: number }>();

    tx.forEach((t) => {
      const m = yyyymm(t.date);
      if (!m) return;
      if (!map.has(m)) map.set(m, { income: 0, expense: 0, eventIncome: 0 });
      const row = map.get(m)!;
      if (t.type === "Income") row.income += t.amount;
      else row.expense += t.amount;
    });

    events.forEach((e) => {
      if (e.status !== "Confirmed" && e.status !== "Completed") return;
      const m = yyyymm(e.date);
      if (!m) return;
      if (!map.has(m)) map.set(m, { income: 0, expense: 0, eventIncome: 0 });
      map.get(m)!.eventIncome += e.budget || 0;
    });

    const months = Array.from(map.keys()).sort();
    const rev = months.map((m) => (map.get(m)!.income || 0) + (map.get(m)!.eventIncome || 0));
    const exp = months.map((m) => map.get(m)!.expense || 0);
    const prof = months.map((_, i) => rev[i] - exp[i]);

    return { months, rev, exp, prof };
  }, [tx, events]);

  useEffect(() => {
    if (!chartRef.current) return;
    const canvas = chartRef.current;
    canvas.width = chartW;
    canvas.height = 220;

    drawMiniChart(canvas, monthlySeries.months, [
      { name: "Revenue", values: monthlySeries.rev },
      { name: "Expense", values: monthlySeries.exp },
      { name: "Profit", values: monthlySeries.prof },
    ]);
  }, [chartRef, chartW, monthlySeries]);

  /* ================= CRUD: TRANSACTIONS ================= */

  const addTx = () => {
    const amt = Number(form.amount);
    if (!form.date) return alert("Date required");
    if (!form.category.trim()) return alert("Category required");
    if (!amt || Number.isNaN(amt) || amt <= 0) return alert("Valid amount required");

    const item: FinanceTx = {
      id: nextId(tx),
      type: form.type,
      date: form.date,
      category: form.category.trim(),
      amount: amt,
      note: form.note.trim() || undefined,
      eventId: form.eventId ? Number(form.eventId) : undefined,
    };

    setTx([item, ...tx]);
    setForm({ type: "Income", date: today(), category: "", amount: "", note: "", eventId: "" });
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
    if (!editingTx.date) return alert("Date required");
    if (!editingTx.category.trim()) return alert("Category required");
    if (!editingTx.amount || editingTx.amount <= 0) return alert("Valid amount required");

    setTx(tx.map((t) => (t.id === editingTxId ? { ...editingTx, category: editingTx.category.trim() } : t)));
    setEditingTxId(null);
    setEditingTx(null);
  };

  const cancelEditTx = () => {
    setEditingTxId(null);
    setEditingTx(null);
  };

  /* ================= CRUD: EVENTS (FROM FINANCE) ================= */

  const startEditEvent = (e: EventItem) => {
    setEditingEventId(e.id);
    setEditingEvent({ ...e, budget: e.budget || 0 });
  };

  const saveEditEvent = () => {
    if (!editingEventId || !editingEvent) return;
    if (!editingEvent.title.trim()) return alert("Title required");
    if (!editingEvent.date) return alert("Date required");

    setEvents(
      events.map((e) =>
        e.id === editingEventId
          ? { ...editingEvent, title: editingEvent.title.trim(), budget: Math.max(0, Number(editingEvent.budget) || 0) }
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

  const deleteEvent = (id: number) => {
    if (!confirm("Delete this event from Events DB?")) return;
    setEvents(events.filter((e) => e.id !== id));
  };

  /* ================= BACKUP ================= */

  const exportJSON = async () => {
    const payload = {
      version: 1,
      exportedAt: new Date().toISOString(),
      config: cfg,
      transactions: tx,
      events,
    };
    const text = JSON.stringify(payload, null, 2);
    setBackupText(text);
    try {
      await navigator.clipboard.writeText(text);
      alert("Export copied to clipboard (also shown in the box).");
    } catch {
      alert("Export generated (shown in the box). Copy manually.");
    }
  };

  const importJSON = () => {
    if (!backupText.trim()) return alert("Paste export JSON in the box first.");
    if (!confirm("Import will replace Finance + Events + config. Continue?")) return;

    try {
      const p = JSON.parse(backupText);
      if (p.config) setCfg({ ...defaultCfg, ...p.config });
      if (Array.isArray(p.transactions)) setTx(p.transactions);
      if (Array.isArray(p.events)) setEvents(p.events);
      alert("Import completed.");
    } catch {
      alert("Import failed: invalid JSON.");
    }
  };

  /* ================= GUARD ================= */
  if (!user) return null;
  if (user.role !== "CEO") return <div style={{ padding: 20 }}>Finance is CEO-only.</div>;

  /* ================= UI ================= */

  return (
    <main className="eventura-os">
      <aside className="eventura-sidebar">
        <SidebarCore user={user} active="finance" />
      </aside>

      <div className="eventura-main">
        <TopbarCore user={user} />

        <div className="eventura-content">
          <div className="eventura-header-row">
            <div>
              <h1 className="eventura-page-title">Finance (Fixed + Working)</h1>
              <p className="eventura-subtitle">
                Auto Events revenue + editable ledger + ratios + AI insights. Deletes won’t come back.
              </p>
            </div>

            <div className="eventura-chips-row">
              <button className={"eventura-tag " + (tab === "overview" ? "eventura-tag-blue" : "eventura-tag-amber")} onClick={() => setTab("overview")}>Overview</button>
              <button className={"eventura-tag " + (tab === "ledger" ? "eventura-tag-blue" : "eventura-tag-amber")} onClick={() => setTab("ledger")}>Ledger</button>
              <button className={"eventura-tag " + (tab === "events" ? "eventura-tag-blue" : "eventura-tag-amber")} onClick={() => setTab("events")}>Events Revenue</button>
              <button className={"eventura-tag " + (tab === "backup" ? "eventura-tag-blue" : "eventura-tag-amber")} onClick={() => setTab("backup")}>Backup</button>
            </div>
          </div>

          {/* Filter row */}
          <div className="eventura-panel" style={{ marginBottom: 14 }}>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
              <div className="eventura-small-text">Month filter:</div>
              <select className="eventura-search" style={{ maxWidth: 240 }} value={filterMonth} onChange={(e) => setFilterMonth(e.target.value)}>
                {monthOptions.map((m) => (
                  <option key={m} value={m}>
                    {m === "ALL" ? "ALL (Totals)" : m}
                  </option>
                ))}
              </select>

              <div className="eventura-small-text">GST %</div>
              <input className="eventura-search" style={{ width: 120 }} type="number" value={cfg.gstPct} onChange={(e) => setCfg({ ...cfg, gstPct: clampPct(Number(e.target.value)) })} />

              <label className="eventura-small-text" style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <input type="checkbox" checked={cfg.arConfirmedIsReceivable} onChange={(e) => setCfg({ ...cfg, arConfirmedIsReceivable: e.target.checked })} />
                Confirmed = Receivable
              </label>
            </div>
          </div>

          {tab === "overview" && (
            <>
              <section className="eventura-grid">
                <Card label="Event Revenue (Auto)" value={INR(autoEventIncome)} note="Confirmed/Completed budgets" />
                <Card label="Manual Income" value={INR(manualIncome)} note="Income transactions" />
                <Card label="Total Revenue" value={INR(totalRevenue)} note="Auto + Manual" />
                <Card label={`GST (${cfg.gstPct}%)`} value={INR(gstAmount)} note="Tax-ready" />
                <Card label="Net Revenue" value={INR(netRevenue)} note="After GST" />
                <Card label="Expenses" value={INR(manualExpense)} note="Expense transactions" />
                <Card label="HR Cost (Core)" value={INR(coreHrCost)} note="From HR DB" />
                <Card label="Net Profit" value={INR(netProfit)} note="NetRev − Expense − HR" />
              </section>

              <section className="eventura-columns">
                <div className="eventura-panel">
                  <h2 className="eventura-panel-title">Monthly Trend</h2>
                  <canvas ref={chartRef} style={{ width: "100%", borderRadius: 14 }} />
                  <p className="eventura-small-text" style={{ marginTop: 8 }}>
                    Chart uses events + transactions (all months).
                  </p>
                </div>

                <div className="eventura-panel">
                  <h2 className="eventura-panel-title">Ratios + AI Insights</h2>

                  <div className="eventura-table-wrapper">
                    <table className="eventura-table">
                      <thead>
                        <tr><th>Metric</th><th>Value</th><th>Target</th></tr>
                      </thead>
                      <tbody>
                        <tr><td>Net Margin</td><td>{ratios.netMargin.toFixed(1)}%</td><td>25%+</td></tr>
                        <tr><td>HR Ratio</td><td>{ratios.hrRatio.toFixed(1)}%</td><td>&lt; 35%</td></tr>
                        <tr><td>Expense Ratio</td><td>{ratios.expenseRatio.toFixed(1)}%</td><td>&lt; 55%</td></tr>
                        <tr><td>Cash Runway</td><td>{ratios.runwayMonths.toFixed(1)} months</td><td>3+ months</td></tr>
                        <tr><td>Receivable</td><td>{INR(receivable)}</td><td>Collect fast</td></tr>
                      </tbody>
                    </table>
                  </div>

                  <ul className="eventura-bullets" style={{ marginTop: 10 }}>
                    {aiInsights.map((x, i) => <li key={i}>{x}</li>)}
                  </ul>
                </div>
              </section>
            </>
          )}

          {tab === "ledger" && (
            <section className="eventura-columns">
              <div className="eventura-panel">
                <h2 className="eventura-panel-title">Add Transaction</h2>
                <div style={{ display: "grid", gap: 8 }}>
                  <div style={{ display: "flex", gap: 8 }}>
                    <select className="eventura-search" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as TxType })}>
                      <option>Income</option>
                      <option>Expense</option>
                    </select>
                    <input className="eventura-search" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
                  </div>

                  <input className="eventura-search" placeholder="Category" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
                  <input className="eventura-search" placeholder="Amount" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
                  <input className="eventura-search" placeholder="Note (optional)" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />

                  <select className="eventura-search" value={form.eventId} onChange={(e) => setForm({ ...form, eventId: e.target.value })}>
                    <option value="">Link to Event (optional)</option>
                    {events.map((ev) => (
                      <option key={ev.id} value={ev.id}>
                        #{ev.id} — {ev.title}
                      </option>
                    ))}
                  </select>

                  <button className="eventura-button-secondary" onClick={addTx}>Add</button>
                </div>
              </div>

              <div className="eventura-panel">
                <h2 className="eventura-panel-title">Ledger (Edit / Delete)</h2>
                <div className="eventura-table-wrapper">
                  <table className="eventura-table">
                    <thead>
                      <tr><th>Date</th><th>Type</th><th>Category</th><th>Amount</th><th></th></tr>
                    </thead>
                    <tbody>
                      {filteredTx.length === 0 ? (
                        <tr><td colSpan={5} className="eventura-small-text">No transactions for this filter.</td></tr>
                      ) : (
                        filteredTx.map((t) => (
                          <tr key={t.id}>
                            <td>{t.date}</td>
                            <td>{t.type}</td>
                            <td>
                              <div className="eventura-list-title">{t.category}</div>
                              <div className="eventura-list-sub">{t.note || ""}</div>
                            </td>
                            <td>{INR(t.amount)}</td>
                            <td style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                              <button className="eventura-tag eventura-tag-blue" onClick={() => startEditTx(t)}>Edit</button>
                              <button className="eventura-tag eventura-tag-amber" onClick={() => deleteTx(t.id)}>Delete</button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {editingTxId && editingTx && (
                  <div className="eventura-card" style={{ marginTop: 12 }}>
                    <p className="eventura-card-label">Edit Transaction</p>
                    <div style={{ display: "grid", gap: 8 }}>
                      <div style={{ display: "flex", gap: 8 }}>
                        <select className="eventura-search" value={editingTx.type} onChange={(e) => setEditingTx({ ...editingTx, type: e.target.value as TxType })}>
                          <option>Income</option>
                          <option>Expense</option>
                        </select>
                        <input className="eventura-search" type="date" value={editingTx.date} onChange={(e) => setEditingTx({ ...editingTx, date: e.target.value })} />
                      </div>

                      <input className="eventura-search" value={editingTx.category} onChange={(e) => setEditingTx({ ...editingTx, category: e.target.value })} />
                      <input className="eventura-search" type="number" value={editingTx.amount} onChange={(e) => setEditingTx({ ...editingTx, amount: Number(e.target.value) || 0 })} />
                      <input className="eventura-search" value={editingTx.note || ""} onChange={(e) => setEditingTx({ ...editingTx, note: e.target.value })} />

                      <div style={{ display: "flex", gap: 8 }}>
                        <button className="eventura-button-secondary" onClick={saveEditTx}>Save</button>
                        <button className="eventura-tag eventura-tag-amber" onClick={cancelEditTx}>Cancel</button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </section>
          )}

          {tab === "events" && (
            <section className="eventura-columns">
              <div className="eventura-panel">
                <h2 className="eventura-panel-title">Events Revenue (Auto)</h2>
                <p className="eventura-small-text">
                  Only Confirmed/Completed event budgets count as revenue. Edit budgets/status here.
                </p>

                <div className="eventura-table-wrapper">
                  <table className="eventura-table">
                    <thead>
                      <tr><th>Date</th><th>Event</th><th>Status</th><th>Budget</th><th></th></tr>
                    </thead>
                    <tbody>
                      {filteredEventRevenue.length === 0 ? (
                        <tr><td colSpan={5} className="eventura-small-text">No revenue events for this filter.</td></tr>
                      ) : (
                        filteredEventRevenue.map((r) => {
                          const ev = events.find((e) => e.id === r.id);
                          return (
                            <tr key={r.id}>
                              <td>{r.date}</td>
                              <td><div className="eventura-list-title">{r.title}</div></td>
                              <td>{r.status}</td>
                              <td>{INR(r.amount)}</td>
                              <td style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                                {ev ? (
                                  <>
                                    <button className="eventura-tag eventura-tag-blue" onClick={() => startEditEvent(ev)}>Edit</button>
                                    <button className="eventura-tag eventura-tag-amber" onClick={() => deleteEvent(ev.id)}>Delete</button>
                                  </>
                                ) : null}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                {editingEventId && editingEvent && (
                  <div className="eventura-card" style={{ marginTop: 12 }}>
                    <p className="eventura-card-label">Edit Event</p>

                    <div style={{ display: "grid", gap: 8 }}>
                      <input className="eventura-search" value={editingEvent.title} onChange={(e) => setEditingEvent({ ...editingEvent, title: e.target.value })} />
                      <div style={{ display: "flex", gap: 8 }}>
                        <input className="eventura-search" type="date" value={editingEvent.date} onChange={(e) => setEditingEvent({ ...editingEvent, date: e.target.value })} />
                        <select className="eventura-search" value={editingEvent.status} onChange={(e) => setEditingEvent({ ...editingEvent, status: e.target.value as EventStatus })}>
                          <option>Tentative</option>
                          <option>Confirmed</option>
                          <option>Completed</option>
                          <option>Cancelled</option>
                        </select>
                      </div>
                      <input className="eventura-search" type="number" value={editingEvent.budget || 0} onChange={(e) => setEditingEvent({ ...editingEvent, budget: Number(e.target.value) || 0 })} />

                      <div style={{ display: "flex", gap: 8 }}>
                        <button className="eventura-button-secondary" onClick={saveEditEvent}>Save</button>
                        <button className="eventura-tag eventura-tag-amber" onClick={cancelEditEvent}>Cancel</button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="eventura-panel">
                <h2 className="eventura-panel-title">Quick Notes</h2>
                <ul className="eventura-bullets">
                  <li>Event budgets are the main revenue driver. Confirm events to increase revenue.</li>
                  <li>Use receivable amount to follow up payment pending clients.</li>
                </ul>
              </div>
            </section>
          )}

          {tab === "backup" && (
            <section className="eventura-columns">
              <div className="eventura-panel">
                <h2 className="eventura-panel-title">Backup / Restore</h2>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <button className="eventura-button-secondary" onClick={exportJSON}>Export JSON</button>
                  <button className="eventura-tag eventura-tag-amber" onClick={importJSON}>Import JSON</button>
                </div>

                <textarea
                  className="eventura-search"
                  style={{ width: "100%", height: 240, marginTop: 10 }}
                  placeholder="Export appears here. Paste JSON here to import."
                  value={backupText}
                  onChange={(e) => setBackupText(e.target.value)}
                />
              </div>

              <div className="eventura-panel">
                <h2 className="eventura-panel-title">HR Link</h2>
                <p className="eventura-small-text">
                  HR cost is auto-calculated from <code>eventura-hr-team</code>. If HR tab is still using seed arrays,
                  salary won’t update here.
                </p>
              </div>
            </section>
          )}
        </div>
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

/* ================= Shared layout (kept minimal to avoid breaking) ================= */

function SidebarCore({ user, active }: { user: User; active: string }) {
  const isCEO = user.role === "CEO";
  return (
    <>
      <div className="eventura-sidebar-header">
        <div className="eventura-logo-circle">E</div>
        <div className="eventura-logo-text">
          <div className="eventura-logo-name">Eventura OS</div>
          <div className="eventura-logo-tagline">Events that speak your style</div>
        </div>
      </div>

      <nav className="eventura-sidebar-nav">
        <SidebarLink href="/" label="Dashboard" icon="📊" active={active === "dashboard"} />
        <SidebarLink href="/events" label="Events" icon="🎉" active={active === "events"} />
        <SidebarLink href="/calendar" label="Calendar" icon="📅" active={active === "calendar"} />
        <SidebarLink href="/leads" label="Clients & Leads" icon="👥" active={active === "leads"} />
        <SidebarLink href="/vendors" label="Vendors" icon="🤝" active={active === "vendors"} />
        {isCEO && <SidebarLink href="/finance" label="Finance" icon="💰" active={active === "finance"} />}
        <SidebarLink href="/hr" label="HR & Team" icon="🧑‍💼" active={active === "hr"} />
        <SidebarLink href="/inventory" label="Inventory" icon="📦" active={active === "inventory"} />
        {isCEO && <SidebarLink href="/reports" label="Reports" icon="📈" active={active === "reports"} />}
        {isCEO && <SidebarLink href="/settings" label="Settings" icon="⚙️" active={active === "settings"} />}
      </nav>

      <div className="eventura-sidebar-footer">
        <div className="eventura-sidebar-role">Role: {user.role === "CEO" ? "CEO / Super Admin" : "Staff"}</div>
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
        <input className="eventura-search" placeholder="Search finance..." />
      </div>
      <div className="eventura-topbar-right">
        <button className="eventura-topbar-icon" title="Notifications">🔔</button>
        <div className="eventura-user-avatar" title={user.name}>
          {user.name.charAt(0).toUpperCase()}
        </div>
      </div>
    </header>
  );
}

function SidebarLink(props: { href: string; label: string; icon: string; active?: boolean }) {
  const className = "eventura-sidebar-link" + (props.active ? " eventura-sidebar-link-active" : "");
  return (
    <Link href={props.href} className={className}>
      <span className="eventura-sidebar-icon">{props.icon}</span>
      <span>{props.label}</span>
    </Link>
  );
}
