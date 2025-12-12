"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";

/* ================= AUTH ================= */
type Role = "CEO" | "Staff";
type User = { name: string; role: Role; city: string };
const USER_KEY = "eventura-user";

/* ================= DB KEYS (CONNECTED) ================= */
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
  budget?: number; // expected revenue
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

  // advanced:
  eventId?: number; // link to event if it is event-related
};

type TeamMember = {
  id: number;
  status: "Core" | "Freelancer" | "Trainee";
  monthlySalary: number;
};

type FinanceConfig = {
  gstPct: number; // 0..100
  defaultWeddingRevenue: number;
  arAssumeReceivedOnCompleteOnly: boolean; // AR logic
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
function pct(a: number, b: number) {
  if (!b) return 0;
  return (a / b) * 100;
}
function monthLabel(ym: string) {
  // "2025-12" -> "Dec 2025"
  const [y, m] = ym.split("-");
  const mm = Number(m);
  const names = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return `${names[(mm || 1) - 1]} ${y}`;
}

/* ================= SIMPLE CHART CANVAS =================
   No external libraries: just canvas drawing.
*/
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

function drawLineChart(
  canvas: HTMLCanvasElement,
  labels: string[],
  series: { name: string; values: number[] }[]
) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const W = canvas.width;
  const H = canvas.height;

  // Clear
  ctx.clearRect(0, 0, W, H);

  // Background
  ctx.fillStyle = "rgba(255,255,255,0.03)";
  ctx.fillRect(0, 0, W, H);

  const padL = 44, padR = 16, padT = 16, padB = 34;
  const chartW = W - padL - padR;
  const chartH = H - padT - padB;

  const maxV = Math.max(
    1,
    ...series.flatMap(s => s.values.map(v => v || 0))
  );

  // Grid
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
    ctx.fillText((tick/1000).toFixed(0) + "k", 6, y + 4);
  }

  // X labels
  const n = labels.length || 1;
  ctx.fillStyle = "rgba(255,255,255,0.65)";
  ctx.font = "12px system-ui";
  for (let i = 0; i < labels.length; i++) {
    const x = padL + (chartW * i) / Math.max(1, labels.length - 1);
    if (i === 0 || i === labels.length - 1 || i % 2 === 1) {
      ctx.fillText(labels[i].slice(5), x - 10, padT + chartH + 22);
    }
  }

  // Draw each series with different alpha (no fixed colors requested by you earlier,
  // but canvas needs stroke style; we keep neutral whites w/ alpha differences)
  const alphas = [1, 0.7, 0.45];
  series.forEach((s, si) => {
    ctx.strokeStyle = `rgba(255,255,255,${alphas[si % alphas.length]})`;
    ctx.lineWidth = 2;

    ctx.beginPath();
    s.values.forEach((v, i) => {
      const x = padL + (chartW * i) / Math.max(1, labels.length - 1);
      const y = padT + chartH - (chartH * (v || 0)) / maxV;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();
  });

  // Legend
  ctx.font = "12px system-ui";
  ctx.fillStyle = "rgba(255,255,255,0.8)";
  let lx = padL;
  const ly = 14;
  series.forEach((s, i) => {
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

  const defaultCfg: FinanceConfig = {
    gstPct: 18,
    defaultWeddingRevenue: 600000,
    arAssumeReceivedOnCompleteOnly: true,
  };
  const [cfg, setCfg] = useState<FinanceConfig>(defaultCfg);

  // UI
  const [tab, setTab] = useState<"overview" | "ledger" | "events" | "ai" | "settings">("overview");
  const [filterMonth, setFilterMonth] = useState<string>("ALL");

  // Add TX form
  const [form, setForm] = useState({
    type: "Income" as TxType,
    date: today(),
    category: "",
    amount: "",
    note: "",
    eventId: "" as any,
  });

  // Edit states
  const [editingTxId, setEditingTxId] = useState<number | null>(null);
  const [editingTx, setEditingTx] = useState<FinanceTx | null>(null);

  const [editingEventId, setEditingEventId] = useState<number | null>(null);
  const [editingEvent, setEditingEvent] = useState<EventItem | null>(null);

  // Export/Import
  const [importText, setImportText] = useState("");

  // Charts canvas
  const { ref: chartRef, w: chartW } = useCanvasResize();

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

  /* ===== Load ===== */
  useEffect(() => {
    setEvents(safeArray<EventItem>(DB_EVENTS));
    setTx(safeArray<FinanceTx>(DB_FIN));
    setTeam(safeArray<TeamMember>(DB_HR));
    setCfg(safeObj<FinanceConfig>(DB_FIN_CFG, defaultCfg));
  }, []);

  /* ===== Persist ===== */
  useEffect(() => {
    localStorage.setItem(DB_EVENTS, JSON.stringify(events));
  }, [events]);
  useEffect(() => {
    localStorage.setItem(DB_FIN, JSON.stringify(tx));
  }, [tx]);
  useEffect(() => {
    localStorage.setItem(DB_FIN_CFG, JSON.stringify(cfg));
  }, [cfg]);

  /* ================= DATA (AUTO SYNC) ================= */

  // Event Revenue = Confirmed/Completed budgets.
  const eventRevenueRows = useMemo(() => {
    return events
      .filter((e) => e.status === "Confirmed" || e.status === "Completed")
      .map((e) => ({
        id: e.id,
        date: e.date,
        title: e.title,
        amount: e.budget || 0,
        status: e.status,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [events]);

  // Month options
  const monthOptions = useMemo(() => {
    const months = new Set<string>();
    tx.forEach((t) => months.add(yyyymm(t.date)));
    events.forEach((e) => months.add(yyyymm(e.date)));
    const arr = Array.from(months).filter(Boolean).sort();
    return ["ALL", ...arr];
  }, [tx, events]);

  // Apply month filter
  const filteredTx = useMemo(() => {
    if (filterMonth === "ALL") return tx;
    return tx.filter((t) => yyyymm(t.date) === filterMonth);
  }, [tx, filterMonth]);

  const filteredEventRevenue = useMemo(() => {
    if (filterMonth === "ALL") return eventRevenueRows;
    return eventRevenueRows.filter((r) => yyyymm(r.date) === filterMonth);
  }, [eventRevenueRows, filterMonth]);

  /* ================= CORE CALC ================= */

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

  // Accounts receivable (money to collect)
  const receivable = useMemo(() => {
    // If assume "received only when Completed", then Confirmed budgets are AR.
    if (!cfg.arAssumeReceivedOnCompleteOnly) return 0;
    const confirmedOnly = events.filter((e) => e.status === "Confirmed");
    return confirmedOnly.reduce((s, e) => s + (e.budget || 0), 0);
  }, [events, cfg.arAssumeReceivedOnCompleteOnly]);

  // Expense by category
  const expenseByCat = useMemo(() => {
    const map = new Map<string, number>();
    filteredTx
      .filter((t) => t.type === "Expense")
      .forEach((t) => map.set(t.category, (map.get(t.category) || 0) + t.amount));
    const arr = Array.from(map.entries()).map(([category, amount]) => ({ category, amount }));
    arr.sort((a, b) => b.amount - a.amount);
    return arr;
  }, [filteredTx]);

  // Ratios
  const ratios = useMemo(() => {
    const rev = totalRevenue || 1;
    return {
      netMargin: pct(netProfit, rev),
      hrRatio: pct(coreHrCost, rev),
      expenseRatio: pct(manualExpense, rev),
      gstRatio: pct(gstAmount, rev),
      revenuePerEvent: totalRevenue / Math.max(1, events.filter((e) => e.status !== "Cancelled").length),
      runwayMonths: manualExpense > 0 ? netRevenue / manualExpense : 0,
    };
  }, [totalRevenue, netProfit, coreHrCost, manualExpense, gstAmount, events, netRevenue]);

  /* ================= MONTHLY CHART DATA ================= */

  const monthlySeries = useMemo(() => {
    // Build per-month totals from ALL data (ignores filter, charts show trend)
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
    const income = months.map((m) => (map.get(m)!.income || 0) + (map.get(m)!.eventIncome || 0));
    const expense = months.map((m) => map.get(m)!.expense || 0);
    const profit = months.map((_, i) => income[i] - expense[i]);

    return { months, income, expense, profit };
  }, [tx, events]);

  // Draw chart when data changes
  useEffect(() => {
    if (!chartRef.current) return;
    const canvas = chartRef.current;
    canvas.width = chartW;
    canvas.height = 220;
    drawLineChart(
      canvas,
      monthlySeries.months,
      [
        { name: "Revenue", values: monthlySeries.income },
        { name: "Expense", values: monthlySeries.expense },
        { name: "Profit", values: monthlySeries.profit },
      ]
    );
  }, [chartRef, chartW, monthlySeries]);

  /* ================= AI COPILOT V2 ================= */

  const aiInsights = useMemo(() => {
    const list: string[] = [];

    if (totalRevenue === 0) list.push("⚠ No revenue detected. Confirm event budgets or add income transactions.");

    if (ratios.netMargin < 20) list.push("🚨 Net margin below 20% — increase pricing or cut vendor costs.");
    if (ratios.hrRatio > 35) list.push("⚠ HR ratio high — use freelancers during peak season.");
    if (ratios.expenseRatio > 55) list.push("⚠ Expense ratio high — audit top categories (see breakdown).");
    if (receivable > 0) list.push(`💰 Accounts receivable: ${INR(receivable)} — collect pending payments from confirmed events.`);

    const topExpense = expenseByCat[0];
    if (topExpense && topExpense.amount > 0) {
      list.push(`📌 Biggest expense category: "${topExpense.category}" = ${INR(topExpense.amount)}.`);
    }

    // trend detection
    const n = monthlySeries.months.length;
    if (n >= 2) {
      const lastIncome = monthlySeries.income[n - 1];
      const prevIncome = monthlySeries.income[n - 2];
      const lastExp = monthlySeries.expense[n - 1];
      const prevExp = monthlySeries.expense[n - 2];

      if (lastIncome < prevIncome) list.push("📉 Revenue decreased vs last month — push sales & referrals.");
      if (lastExp > prevExp) list.push("📈 Expenses increased vs last month — control purchasing & vendor rates.");
    }

    if (list.length === 0) list.push("✅ Finance is stable. Maintain pricing discipline and collect receivables fast.");
    return list;
  }, [totalRevenue, ratios, receivable, expenseByCat, monthlySeries]);

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
      eventId: form.eventId ? Number(form.eventId) : undefined,
    };

    setTx([item, ...tx]);
    setForm({ ...form, category: "", amount: "", note: "", eventId: "" });
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
    setEditingEvent({ ...e, budget: e.budget || 0 });
  };

  const saveEditEvent = () => {
    if (!editingEventId || !editingEvent) return;
    if (!editingEvent.title.trim()) return alert("Title required");
    if (!editingEvent.date) return alert("Date required");

    setEvents(
      events.map((e) =>
        e.id === editingEventId
          ? {
              ...editingEvent,
              title: editingEvent.title.trim(),
              budget: Math.max(0, Number(editingEvent.budget) || 0),
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

  /* ================= EXPORT / IMPORT ================= */

  const exportJSON = () => {
    const payload = {
      version: 1,
      exportedAt: new Date().toISOString(),
      config: cfg,
      financeTransactions: tx,
      events: events,
    };
    const text = JSON.stringify(payload, null, 2);
    setImportText(text);
    try {
      navigator.clipboard?.writeText(text);
      alert("Export copied to clipboard (and shown in box).");
    } catch {
      alert("Export generated (shown in box). Copy manually.");
    }
  };

  const importJSON = () => {
    if (!importText.trim()) return alert("Paste export JSON first.");
    if (!confirm("Import will replace Finance + Events data. Continue?")) return;

    try {
      const p = JSON.parse(importText);
      if (!p) return alert("Invalid JSON");

      if (p.config) setCfg({ ...defaultCfg, ...p.config });
      if (Array.isArray(p.financeTransactions)) setTx(p.financeTransactions);
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
      <div className="eventura-content">
        <div className="eventura-header-row">
          <div>
            <h1 className="eventura-page-title">Finance Intelligence</h1>
            <p className="eventura-subtitle">
              Advanced CEO finance — events auto-revenue, ratios, charts, AR, AI insights, editable ledger.
            </p>
          </div>
          <div className="eventura-chips-row">
            <button className={"eventura-tag " + (tab === "overview" ? "eventura-tag-blue" : "eventura-tag-amber")} onClick={() => setTab("overview")}>Overview</button>
            <button className={"eventura-tag " + (tab === "ledger" ? "eventura-tag-blue" : "eventura-tag-amber")} onClick={() => setTab("ledger")}>Ledger</button>
            <button className={"eventura-tag " + (tab === "events" ? "eventura-tag-blue" : "eventura-tag-amber")} onClick={() => setTab("events")}>Events Revenue</button>
            <button className={"eventura-tag " + (tab === "ai" ? "eventura-tag-blue" : "eventura-tag-amber")} onClick={() => setTab("ai")}>AI Co-Pilot</button>
            <button className={"eventura-tag " + (tab === "settings" ? "eventura-tag-blue" : "eventura-tag-amber")} onClick={() => setTab("settings")}>Settings</button>
          </div>
        </div>

        {/* FILTER */}
        <div className="eventura-panel" style={{ marginBottom: 14 }}>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            <div className="eventura-small-text">Month filter:</div>
            <select className="eventura-search" style={{ maxWidth: 220 }} value={filterMonth} onChange={(e) => setFilterMonth(e.target.value)}>
              {monthOptions.map((m) => (
                <option key={m} value={m}>{m === "ALL" ? "ALL (Totals)" : monthLabel(m)}</option>
              ))}
            </select>
            <div className="eventura-small-text">GST %</div>
            <input
              className="eventura-search"
              style={{ width: 120 }}
              type="number"
              value={cfg.gstPct}
              onChange={(e) => setCfg({ ...cfg, gstPct: clampPct(Number(e.target.value)) })}
            />
          </div>
        </div>

        {tab === "overview" && (
          <>
            {/* KPI */}
            <section className="eventura-grid">
              <Card label="Event Revenue (Auto)" value={INR(autoEventIncome)} note="Confirmed + Completed budgets" />
              <Card label="Manual Income" value={INR(manualIncome)} note="Income transactions" />
              <Card label="Total Revenue" value={INR(totalRevenue)} note="Auto + Manual" />
              <Card label={`GST (${clampPct(cfg.gstPct)}%)`} value={INR(gstAmount)} note="Tax-ready" />
              <Card label="Net Revenue" value={INR(netRevenue)} note="After GST" />
              <Card label="Expenses" value={INR(manualExpense)} note="Expense transactions" />
              <Card label="HR Cost (Core)" value={INR(coreHrCost)} note="From HR DB" />
              <Card label="Net Profit" value={INR(netProfit)} note="Net Rev − Expense − HR" />
            </section>

            <section className="eventura-columns">
              <div className="eventura-panel">
                <h2 className="eventura-panel-title">Monthly Trend (Revenue / Expense / Profit)</h2>
                <canvas ref={chartRef} style={{ width: "100%", borderRadius: 14 }} />
                <p className="eventura-small-text" style={{ marginTop: 8 }}>
                  Trend chart is built from events + transactions (all months).
                </p>
              </div>

              <div className="eventura-panel">
                <h2 className="eventura-panel-title">Ratios + Health</h2>
                <div className="eventura-table-wrapper">
                  <table className="eventura-table">
                    <thead>
                      <tr><th>Metric</th><th>Value</th><th>Target</th></tr>
                    </thead>
                    <tbody>
                      <tr><td>Net Margin</td><td>{ratios.netMargin.toFixed(1)}%</td><td>25%+</td></tr>
                      <tr><td>HR Ratio</td><td>{ratios.hrRatio.toFixed(1)}%</td><td>&lt; 35%</td></tr>
                      <tr><td>Expense Ratio</td><td>{ratios.expenseRatio.toFixed(1)}%</td><td>&lt; 55%</td></tr>
                      <tr><td>GST Ratio</td><td>{ratios.gstRatio.toFixed(1)}%</td><td>As per plan</td></tr>
                      <tr><td>Revenue / Event</td><td>{INR(ratios.revenuePerEvent)}</td><td>₹4L+</td></tr>
                      <tr><td>Cash Runway (months)</td><td>{ratios.runwayMonths.toFixed(1)}</td><td>3+ months</td></tr>
                      <tr><td>Accounts Receivable</td><td>{INR(receivable)}</td><td>Collect fast</td></tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </section>

            <section className="eventura-columns">
              <div className="eventura-panel">
                <h2 className="eventura-panel-title">Expense Breakdown (Top Categories)</h2>
                <div className="eventura-table-wrapper">
                  <table className="eventura-table">
                    <thead>
                      <tr><th>Category</th><th>Amount</th><th>% of Expense</th></tr>
                    </thead>
                    <tbody>
                      {expenseByCat.length === 0 && (
                        <tr><td colSpan={3} className="eventura-small-text">No expenses yet.</td></tr>
                      )}
                      {expenseByCat.slice(0, 8).map((r) => (
                        <tr key={r.category}>
                          <td>{r.category}</td>
                          <td>{INR(r.amount)}</td>
                          <td>{pct(r.amount, manualExpense || 1).toFixed(1)}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="eventura-panel">
                <h2 className="eventura-panel-title">Budget vs Actual (Events)</h2>
                <p className="eventura-small-text">
                  Budget = Event budgets. Actual = Income received (manual income + event completed budgets depending on your AR setting).
                </p>
                <div className="eventura-card">
                  <p className="eventura-card-label">Planned Budget (Confirmed + Completed)</p>
                  <p className="eventura-card-value">{INR(eventRevenueRows.reduce((s, r) => s + r.amount, 0))}</p>
                </div>
                <div className="eventura-card" style={{ marginTop: 10 }}>
                  <p className="eventura-card-label">Receivable Pending</p>
                  <p className="eventura-card-value">{INR(receivable)}</p>
                </div>
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

                <input className="eventura-search" placeholder="Category (Vendor, Rent, Ads...)" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />

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

                <button className="eventura-button-secondary" type="button" onClick={addTx}>
                  Add
                </button>
              </div>
            </div>

            <div className="eventura-panel">
              <h2 className="eventura-panel-title">Ledger (Editable / Removable)</h2>

              <div className="eventura-table-wrapper">
                <table className="eventura-table">
                  <thead>
                    <tr><th>Date</th><th>Type</th><th>Category</th><th>Amount</th><th></th></tr>
                  </thead>
                  <tbody>
                    {filteredTx.length === 0 && (
                      <tr><td colSpan={5} className="eventura-small-text">No transactions for this filter.</td></tr>
                    )}
                    {filteredTx.map((t) => (
                      <tr key={t.id}>
                        <td>{t.date}</td>
                        <td>{t.type}</td>
                        <td>
                          <div className="eventura-list-title">{t.category}</div>
                          <div className="eventura-list-sub">{t.note || ""}</div>
                        </td>
                        <td>{INR(t.amount)}</td>
                        <td style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                          <button className="eventura-tag eventura-tag-blue" type="button" onClick={() => startEditTx(t)}>Edit</button>
                          <button className="eventura-tag eventura-tag-amber" type="button" onClick={() => deleteTx(t.id)}>Delete</button>
                        </td>
                      </tr>
                    ))}
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
                    <input className="eventura-search" value={editingTx.category} onChange={(e) => setEditingTx({ ...editingTx, category: e.target.value })} placeholder="Category" />
                    <input className="eventura-search" type="number" value={editingTx.amount} onChange={(e) => setEditingTx({ ...editingTx, amount: Number(e.target.value) || 0 })} placeholder="Amount" />
                    <input className="eventura-search" value={editingTx.note || ""} onChange={(e) => setEditingTx({ ...editingTx, note: e.target.value })} placeholder="Note" />
                    <div style={{ display: "flex", gap: 8 }}>
                      <button className="eventura-button-secondary" type="button" onClick={saveEditTx}>Save</button>
                      <button className="eventura-tag eventura-tag-amber" type="button" onClick={cancelEditTx}>Cancel</button>
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
              <h2 className="eventura-panel-title">Events Revenue (Auto-Synced)</h2>
              <p className="eventura-small-text">
                Confirmed/Completed event budgets count as revenue. Edit budgets/status here.
              </p>

              <div className="eventura-table-wrapper">
                <table className="eventura-table">
                  <thead>
                    <tr><th>Date</th><th>Event</th><th>Status</th><th>Budget</th><th></th></tr>
                  </thead>
                  <tbody>
                    {filteredEventRevenue.length === 0 && (
                      <tr><td colSpan={5} className="eventura-small-text">No revenue events for this filter.</td></tr>
                    )}
                    {filteredEventRevenue.map((r) => {
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
                                <button className="eventura-tag eventura-tag-blue" type="button" onClick={() => startEditEvent(ev)}>Edit</button>
                                <button className="eventura-tag eventura-tag-amber" type="button" onClick={() => deleteEvent(ev.id)}>Delete</button>
                              </>
                            ) : null}
                          </td>
                        </tr>
                      );
                    })}
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
                        <option>Tentative</option><option>Confirmed</option><option>Completed</option><option>Cancelled</option>
                      </select>
                    </div>
                    <input className="eventura-search" type="number" value={editingEvent.budget || 0} onChange={(e) => setEditingEvent({ ...editingEvent, budget: Number(e.target.value) || 0 })} />
                    <div style={{ display: "flex", gap: 8 }}>
                      <button className="eventura-button-secondary" type="button" onClick={saveEditEvent}>Save</button>
                      <button className="eventura-tag eventura-tag-amber" type="button" onClick={cancelEditEvent}>Cancel</button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="eventura-panel">
              <h2 className="eventura-panel-title">Accounts Receivable Rules</h2>
              <p className="eventura-small-text">
                If enabled, confirmed events are treated as “money to collect” until completed.
              </p>

              <label className="eventura-small-text" style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <input
                  type="checkbox"
                  checked={cfg.arAssumeReceivedOnCompleteOnly}
                  onChange={(e) => setCfg({ ...cfg, arAssumeReceivedOnCompleteOnly: e.target.checked })}
                />
                Treat Confirmed budgets as Receivable (until Completed)
              </label>

              <div className="eventura-card" style={{ marginTop: 12 }}>
                <p className="eventura-card-label">Receivable Now</p>
                <p className="eventura-card-value">{INR(receivable)}</p>
              </div>
            </div>
          </section>
        )}

        {tab === "ai" && (
          <section className="eventura-columns">
            <div className="eventura-panel">
              <h2 className="eventura-panel-title">AI Co-Pilot (v2)</h2>
              <ul className="eventura-bullets">
                {aiInsights.map((x, i) => <li key={i}>{x}</li>)}
              </ul>

              <div className="eventura-card" style={{ marginTop: 12 }}>
                <p className="eventura-card-label">AI Focus Actions</p>
                <ul className="eventura-bullets">
                  <li>Collect receivables fast (follow-up system)</li>
                  <li>Negotiate top expense categories</li>
                  <li>Keep HR ratio under 35% by using freelancers</li>
                  <li>Increase per-event revenue with premium décor add-ons</li>
                </ul>
              </div>
            </div>

            <div className="eventura-panel">
              <h2 className="eventura-panel-title">What-If Settings</h2>
              <p className="eventura-small-text">We use your default wedding revenue in predictions.</p>
              <div style={{ display: "grid", gap: 8 }}>
                <label className="eventura-small-text">
                  Default wedding revenue (₹)
                  <input
                    className="eventura-search"
                    type="number"
                    value={cfg.defaultWeddingRevenue}
                    onChange={(e) => setCfg({ ...cfg, defaultWeddingRevenue: Math.max(0, Number(e.target.value) || 0) })}
                  />
                </label>
              </div>
            </div>
          </section>
        )}

        {tab === "settings" && (
          <section className="eventura-columns">
            <div className="eventura-panel">
              <h2 className="eventura-panel-title">Backup / Restore</h2>
              <p className="eventura-small-text">
                Export creates a JSON backup of Finance + Events + config. Import replaces them.
              </p>

              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <button className="eventura-button-secondary" type="button" onClick={exportJSON}>
                  Export JSON
                </button>
                <button className="eventura-tag eventura-tag-amber" type="button" onClick={importJSON}>
                  Import JSON
                </button>
              </div>

              <textarea
                className="eventura-search"
                style={{ width: "100%", height: 220, marginTop: 10 }}
                placeholder="Export will appear here. Paste import JSON here."
                value={importText}
                onChange={(e) => setImportText(e.target.value)}
              />
            </div>

            <div className="eventura-panel">
              <h2 className="eventura-panel-title">System Safety</h2>
              <p className="eventura-small-text">
                This finance system is localStorage based (no server). Deletions do not return after refresh.
              </p>
            </div>
          </section>
        )}
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
