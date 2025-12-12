"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";

/* ================= AUTH ================= */
type Role = "CEO" | "Staff";
type User = { name: string; role: Role; city: string };
const USER_KEY = "eventura-user";

/* ================= STORAGE KEYS ================= */
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
  date: string;
  category: string;
  amount: number;
  note?: string;
  eventId?: number;
};

type TeamMember = {
  id: number;
  status: "Core" | "Freelancer" | "Trainee";
  monthlySalary: number;
};

type FinanceConfig = {
  gstPct: number;
  arConfirmedIsReceivable: boolean;
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

/* ================= MINI CANVAS CHART ================= */
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

function drawChart(
  canvas: HTMLCanvasElement,
  labels: string[],
  series: { name: string; values: number[] }[]
) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const W = canvas.width;
  const H = canvas.height;

  ctx.clearRect(0, 0, W, H);

  // background
  ctx.fillStyle = "rgba(255,255,255,0.03)";
  ctx.fillRect(0, 0, W, H);

  const padL = 46,
    padR = 16,
    padT = 16,
    padB = 32;
  const chartW = W - padL - padR;
  const chartH = H - padT - padB;

  const maxV = Math.max(1, ...series.flatMap((s) => s.values.map((v) => v || 0)));

  // grid + y labels
  ctx.strokeStyle = "rgba(255,255,255,0.10)";
  ctx.lineWidth = 1;
  ctx.font = "12px system-ui";
  for (let i = 0; i <= 4; i++) {
    const y = padT + (chartH * i) / 4;
    ctx.beginPath();
    ctx.moveTo(padL, y);
    ctx.lineTo(padL + chartW, y);
    ctx.stroke();

    const tick = Math.round(maxV * (1 - i / 4));
    ctx.fillStyle = "rgba(255,255,255,0.65)";
    ctx.fillText((tick / 1000).toFixed(0) + "k", 6, y + 4);
  }

  // x labels (sparse)
  ctx.fillStyle = "rgba(255,255,255,0.65)";
  for (let i = 0; i < labels.length; i++) {
    if (labels.length <= 1) break;
    const x = padL + (chartW * i) / (labels.length - 1);
    if (i === 0 || i === labels.length - 1 || i % 2 === 1) {
      ctx.fillText(labels[i].slice(5), x - 10, padT + chartH + 20);
    }
  }

  // series (neutral whites, alpha differences)
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
  ctx.fillStyle = "rgba(255,255,255,0.82)";
  let lx = padL;
  const ly = 14;
  series.forEach((s) => {
    ctx.fillText(s.name, lx, ly);
    lx += ctx.measureText(s.name).width + 16;
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

  // section toggles (UI upgrade)
  const [showTrend, setShowTrend] = useState(true);
  const [showRatios, setShowRatios] = useState(true);
  const [showAi, setShowAi] = useState(true);
  const [showTables, setShowTables] = useState(true);

  // add tx
  const [form, setForm] = useState({
    type: "Income" as TxType,
    date: today(),
    category: "",
    amount: "",
    note: "",
    eventId: "",
  });

  // edit tx
  const [editingTxId, setEditingTxId] = useState<number | null>(null);
  const [editingTx, setEditingTx] = useState<FinanceTx | null>(null);

  // edit event
  const [editingEventId, setEditingEventId] = useState<number | null>(null);
  const [editingEvent, setEditingEvent] = useState<EventItem | null>(null);

  // backup
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

  /* ===== LOAD ===== */
  useEffect(() => {
    setEvents(safeArray<EventItem>(DB_EVENTS));
    setTx(safeArray<FinanceTx>(DB_FIN));
    setTeam(safeArray<TeamMember>(DB_HR));
    setCfg(safeObj<FinanceConfig>(DB_FIN_CFG, defaultCfg));
  }, []);

  /* ===== PERSIST (prevents “delete appears again”) ===== */
  useEffect(() => {
    localStorage.setItem(DB_FIN, JSON.stringify(tx));
  }, [tx]);

  useEffect(() => {
    localStorage.setItem(DB_EVENTS, JSON.stringify(events));
  }, [events]);

  useEffect(() => {
    localStorage.setItem(DB_FIN_CFG, JSON.stringify(cfg));
  }, [cfg]);

  /* ================= DATA ================= */
  const eventRevenueRows = useMemo(() => {
    return events
      .filter((e) => e.status === "Confirmed" || e.status === "Completed")
      .map((e) => ({
        id: e.id,
        date: e.date,
        title: e.title,
        status: e.status,
        amount: e.budget || 0,
      }))
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
  const coreHrCost = useMemo(() => {
    return team.filter((m) => m.status === "Core").reduce((s, m) => s + (m.monthlySalary || 0), 0);
  }, [team]);

  const manualIncome = useMemo(() => {
    return filteredTx.filter((t) => t.type === "Income").reduce((s, t) => s + t.amount, 0);
  }, [filteredTx]);

  const manualExpense = useMemo(() => {
    return filteredTx.filter((t) => t.type === "Expense").reduce((s, t) => s + t.amount, 0);
  }, [filteredTx]);

  const autoEventIncome = useMemo(() => {
    return filteredEventRevenue.reduce((s, r) => s + r.amount, 0);
  }, [filteredEventRevenue]);

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
      netMargin: pct(netProfit, rev),
      hrRatio: pct(coreHrCost, rev),
      expenseRatio: pct(manualExpense, rev),
      gstRatio: pct(gstAmount, rev),
      runwayMonths: manualExpense > 0 ? netRevenue / manualExpense : 0,
    };
  }, [totalRevenue, netProfit, coreHrCost, manualExpense, gstAmount, netRevenue]);

  const aiInsights = useMemo(() => {
    const list: { tone: "good" | "warn" | "bad"; text: string }[] = [];

    if (totalRevenue === 0)
      list.push({ tone: "warn", text: "No revenue detected. Add event budgets (Confirmed/Completed) or add Income transactions." });

    if (ratios.netMargin < 20) list.push({ tone: "bad", text: "Net margin below 20% — increase pricing or reduce vendor cost." });
    else list.push({ tone: "good", text: `Net margin looks ${ratios.netMargin.toFixed(1)}%. Keep premium pricing discipline.` });

    if (ratios.hrRatio > 35) list.push({ tone: "warn", text: "HR ratio above 35% — use freelancers during peak load." });

    if (ratios.expenseRatio > 55) list.push({ tone: "warn", text: "Expense ratio above 55% — audit categories and renegotiate vendors." });

    if (receivable > 0) list.push({ tone: "warn", text: `Pending collections: ${INR(receivable)} — follow up with confirmed clients.` });

    if (list.length === 0) list.push({ tone: "good", text: "Finance is stable. Maintain margin, collect payments faster, and scale confidently." });

    return list;
  }, [totalRevenue, ratios, receivable]);

  /* ================= CHART SERIES ================= */
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
    const revenue = months.map((m) => (map.get(m)!.income || 0) + (map.get(m)!.eventIncome || 0));
    const expense = months.map((m) => map.get(m)!.expense || 0);
    const profit = months.map((_, i) => revenue[i] - expense[i]);

    return { months, revenue, expense, profit };
  }, [tx, events]);

  useEffect(() => {
    if (!chartRef.current) return;
    const canvas = chartRef.current;
    canvas.width = chartW;
    canvas.height = 220;

    drawChart(canvas, monthlySeries.months, [
      { name: "Revenue", values: monthlySeries.revenue },
      { name: "Expense", values: monthlySeries.expense },
      { name: "Profit", values: monthlySeries.profit },
    ]);
  }, [chartRef, chartW, monthlySeries]);

  /* ================= CRUD: TX ================= */
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

  /* ================= CRUD: EVENTS FROM FINANCE ================= */
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
      version: 2,
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

  /* ================= UI HELPERS ================= */
  const toneClass = (tone: "good" | "warn" | "bad") => {
    if (tone === "good") return "fin-pill fin-good";
    if (tone === "warn") return "fin-pill fin-warn";
    return "fin-pill fin-bad";
  };

  return (
    <main className="eventura-os">
      {/* Scoped premium finance styles — only affects Finance page */}
      <style jsx>{`
        .fin-wrap {
          display: grid;
          gap: 14px;
        }
        .fin-head {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          gap: 12px;
          flex-wrap: wrap;
        }
        .fin-title {
          font-size: 1.4rem;
          font-weight: 700;
          letter-spacing: 0.4px;
        }
        .fin-sub {
          opacity: 0.78;
          font-size: 0.9rem;
          margin-top: 4px;
        }

        .fin-tabs {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
          align-items: center;
        }

        .fin-toolbar {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
          align-items: center;
          padding: 12px;
          border-radius: 18px;
          border: 1px solid rgba(255, 255, 255, 0.08);
          background: rgba(11, 16, 32, 0.78);
          backdrop-filter: blur(10px);
        }

        .fin-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 12px;
        }

        .fin-kpi {
          border-radius: 20px;
          padding: 16px;
          border: 1px solid rgba(212, 175, 55, 0.22);
          background: linear-gradient(
            135deg,
            rgba(212, 175, 55, 0.11),
            rgba(255, 255, 255, 0.03)
          );
          box-shadow: 0 12px 34px rgba(0, 0, 0, 0.24);
        }
        .fin-kpi-label {
          opacity: 0.75;
          font-size: 0.78rem;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }
        .fin-kpi-value {
          font-size: 1.75rem;
          font-weight: 800;
          margin-top: 6px;
        }
        .fin-kpi-note {
          margin-top: 6px;
          font-size: 0.82rem;
          opacity: 0.75;
        }

        .fin-panels {
          display: grid;
          grid-template-columns: 1.2fr 0.8fr;
          gap: 12px;
        }
        @media (max-width: 980px) {
          .fin-panels {
            grid-template-columns: 1fr;
          }
        }

        .fin-panel {
          border-radius: 22px;
          padding: 16px;
          border: 1px solid rgba(255, 255, 255, 0.08);
          background: rgba(11, 16, 32, 0.78);
          backdrop-filter: blur(10px);
        }

        .fin-panel-title {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 10px;
          margin-bottom: 10px;
        }
        .fin-panel-title h2 {
          font-size: 1.05rem;
          font-weight: 700;
          margin: 0;
        }

        .fin-toggle {
          border-radius: 999px;
          border: 1px solid rgba(255, 255, 255, 0.12);
          background: rgba(255, 255, 255, 0.04);
          padding: 7px 12px;
          cursor: pointer;
          font-size: 0.8rem;
          opacity: 0.92;
        }
        .fin-toggle:hover {
          background: rgba(255, 255, 255, 0.08);
        }

        .fin-ai {
          border: 1px solid rgba(139, 92, 246, 0.35);
          background: linear-gradient(
            135deg,
            rgba(139, 92, 246, 0.16),
            rgba(212, 175, 55, 0.07)
          );
        }

        .fin-pill {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 10px 12px;
          border-radius: 14px;
          border: 1px solid rgba(255, 255, 255, 0.10);
          background: rgba(255, 255, 255, 0.04);
          margin: 6px 0;
          font-size: 0.9rem;
        }
        .fin-good {
          border-color: rgba(34, 197, 94, 0.35);
        }
        .fin-warn {
          border-color: rgba(59, 130, 246, 0.35);
        }
        .fin-bad {
          border-color: rgba(248, 113, 113, 0.35);
        }

        .fin-metrics {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
          margin-top: 10px;
        }
        @media (max-width: 520px) {
          .fin-metrics {
            grid-template-columns: 1fr;
          }
        }
        .fin-metric {
          border-radius: 16px;
          border: 1px solid rgba(255, 255, 255, 0.08);
          background: rgba(255, 255, 255, 0.03);
          padding: 12px;
        }
        .fin-metric small {
          opacity: 0.7;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          font-size: 0.72rem;
        }
        .fin-metric div {
          margin-top: 6px;
          font-size: 1.05rem;
          font-weight: 700;
        }

        .fin-canvas {
          width: 100%;
          border-radius: 16px;
          border: 1px solid rgba(255, 255, 255, 0.08);
          background: rgba(255, 255, 255, 0.03);
        }

        /* Make tables lighter (still using your eventura-table styles) */
        .fin-table th {
          font-size: 0.72rem;
          text-transform: uppercase;
          letter-spacing: 0.10em;
          opacity: 0.7;
        }
        .fin-table td {
          font-size: 0.9rem;
        }
      `}</style>

      <aside className="eventura-sidebar">
        <SidebarCore user={user} active="finance" />
      </aside>

      <div className="eventura-main">
        <TopbarCore user={user} />

        <div className="eventura-content fin-wrap">
          <div className="fin-head">
            <div>
              <div className="fin-title">Finance Intelligence</div>
              <div className="fin-sub">CEO dashboard · Clean UI · Editable ledger · Auto event revenue</div>
            </div>

            <div className="fin-tabs">
              <button
                className={"eventura-tag " + (tab === "overview" ? "eventura-tag-blue" : "eventura-tag-amber")}
                onClick={() => setTab("overview")}
                type="button"
              >
                Overview
              </button>
              <button
                className={"eventura-tag " + (tab === "ledger" ? "eventura-tag-blue" : "eventura-tag-amber")}
                onClick={() => setTab("ledger")}
                type="button"
              >
                Ledger
              </button>
              <button
                className={"eventura-tag " + (tab === "events" ? "eventura-tag-blue" : "eventura-tag-amber")}
                onClick={() => setTab("events")}
                type="button"
              >
                Events Revenue
              </button>
              <button
                className={"eventura-tag " + (tab === "backup" ? "eventura-tag-blue" : "eventura-tag-amber")}
                onClick={() => setTab("backup")}
                type="button"
              >
                Backup
              </button>
            </div>
          </div>

          {/* Toolbar */}
          <div className="fin-toolbar">
            <div className="eventura-small-text">Month:</div>
            <select className="eventura-search" style={{ maxWidth: 220 }} value={filterMonth} onChange={(e) => setFilterMonth(e.target.value)}>
              {monthOptions.map((m) => (
                <option key={m} value={m}>
                  {m === "ALL" ? "ALL (Totals)" : m}
                </option>
              ))}
            </select>

            <div className="eventura-small-text">GST %</div>
            <input
              className="eventura-search"
              style={{ width: 110 }}
              type="number"
              value={cfg.gstPct}
              onChange={(e) => setCfg({ ...cfg, gstPct: clampPct(Number(e.target.value)) })}
            />

            <label className="eventura-small-text" style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <input
                type="checkbox"
                checked={cfg.arConfirmedIsReceivable}
                onChange={(e) => setCfg({ ...cfg, arConfirmedIsReceivable: e.target.checked })}
              />
              Confirmed = Receivable
            </label>

            <div style={{ flex: 1 }} />

            <Link href="/events" className="eventura-button-secondary">
              Open Events
            </Link>
          </div>

          {/* OVERVIEW */}
          {tab === "overview" && (
            <>
              {/* KPIs */}
              <section className="fin-grid">
                <div className="fin-kpi">
                  <div className="fin-kpi-label">Total Revenue</div>
                  <div className="fin-kpi-value">{INR(totalRevenue)}</div>
                  <div className="fin-kpi-note">Auto Events + Manual Income</div>
                </div>
                <div className="fin-kpi">
                  <div className="fin-kpi-label">Net Profit</div>
                  <div className="fin-kpi-value">{INR(netProfit)}</div>
                  <div className="fin-kpi-note">After GST + HR + Expenses</div>
                </div>
                <div className="fin-kpi">
                  <div className="fin-kpi-label">HR Cost</div>
                  <div className="fin-kpi-value">{INR(coreHrCost)}</div>
                  <div className="fin-kpi-note">From HR (Core staff)</div>
                </div>
                <div className="fin-kpi">
                  <div className="fin-kpi-label">Receivable</div>
                  <div className="fin-kpi-value">{INR(receivable)}</div>
                  <div className="fin-kpi-note">Pending collections</div>
                </div>
              </section>

              <section className="fin-panels">
                {/* Trend */}
                <div className="fin-panel">
                  <div className="fin-panel-title">
                    <h2>Monthly Trend</h2>
                    <button className="fin-toggle" type="button" onClick={() => setShowTrend((s) => !s)}>
                      {showTrend ? "Hide" : "Show"}
                    </button>
                  </div>

                  {showTrend ? (
                    <>
                      <canvas ref={chartRef} className="fin-canvas" />
                      <div className="eventura-small-text" style={{ marginTop: 10, opacity: 0.8 }}>
                        Revenue includes Events budgets (Confirmed/Completed) + Income transactions.
                      </div>
                    </>
                  ) : (
                    <div className="eventura-small-text" style={{ opacity: 0.75 }}>
                      Trend hidden.
                    </div>
                  )}
                </div>

                {/* Ratios + AI */}
                <div className="fin-panel fin-ai">
                  <div className="fin-panel-title">
                    <h2>CEO Insights</h2>
                    <button className="fin-toggle" type="button" onClick={() => setShowAi((s) => !s)}>
                      {showAi ? "Hide" : "Show"}
                    </button>
                  </div>

                  {showAi && (
                    <div>
                      {aiInsights.map((x, i) => (
                        <div key={i} className={toneClass(x.tone)}>
                          <span>✨</span>
                          <span>{x.text}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="fin-panel-title" style={{ marginTop: 14 }}>
                    <h2>Ratios</h2>
                    <button className="fin-toggle" type="button" onClick={() => setShowRatios((s) => !s)}>
                      {showRatios ? "Hide" : "Show"}
                    </button>
                  </div>

                  {showRatios && (
                    <div className="fin-metrics">
                      <div className="fin-metric">
                        <small>Net Margin</small>
                        <div>{ratios.netMargin.toFixed(1)}%</div>
                      </div>
                      <div className="fin-metric">
                        <small>Expense Ratio</small>
                        <div>{ratios.expenseRatio.toFixed(1)}%</div>
                      </div>
                      <div className="fin-metric">
                        <small>HR Ratio</small>
                        <div>{ratios.hrRatio.toFixed(1)}%</div>
                      </div>
                      <div className="fin-metric">
                        <small>GST Ratio</small>
                        <div>{ratios.gstRatio.toFixed(1)}%</div>
                      </div>
                      <div className="fin-metric">
                        <small>Cash Runway</small>
                        <div>{ratios.runwayMonths.toFixed(1)} mo</div>
                      </div>
                      <div className="fin-metric">
                        <small>Net Revenue</small>
                        <div>{INR(netRevenue)}</div>
                      </div>
                    </div>
                  )}
                </div>
              </section>
            </>
          )}

          {/* LEDGER */}
          {tab === "ledger" && (
            <section className="eventura-columns">
              <div className="fin-panel">
                <div className="fin-panel-title">
                  <h2>Add Transaction</h2>
                  <button className="fin-toggle" type="button" onClick={() => setShowTables((s) => !s)}>
                    {showTables ? "Hide Tables" : "Show Tables"}
                  </button>
                </div>

                <div style={{ display: "grid", gap: 10 }}>
                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                    <select className="eventura-search" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as TxType })}>
                      <option>Income</option>
                      <option>Expense</option>
                    </select>
                    <input className="eventura-search" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
                    <input className="eventura-search" placeholder="Category" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
                    <input className="eventura-search" placeholder="Amount" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
                  </div>

                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
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

                {editingTxId && editingTx && (
                  <div className="eventura-card" style={{ marginTop: 14 }}>
                    <p className="eventura-card-label">Edit Transaction</p>
                    <div style={{ display: "grid", gap: 10 }}>
                      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                        <select className="eventura-search" value={editingTx.type} onChange={(e) => setEditingTx({ ...editingTx, type: e.target.value as TxType })}>
                          <option>Income</option>
                          <option>Expense</option>
                        </select>
                        <input className="eventura-search" type="date" value={editingTx.date} onChange={(e) => setEditingTx({ ...editingTx, date: e.target.value })} />
                        <input className="eventura-search" value={editingTx.category} onChange={(e) => setEditingTx({ ...editingTx, category: e.target.value })} />
                        <input className="eventura-search" type="number" value={editingTx.amount} onChange={(e) => setEditingTx({ ...editingTx, amount: Number(e.target.value) || 0 })} />
                      </div>
                      <input className="eventura-search" value={editingTx.note || ""} onChange={(e) => setEditingTx({ ...editingTx, note: e.target.value })} />
                      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
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

              {showTables && (
                <div className="fin-panel">
                  <div className="fin-panel-title">
                    <h2>Ledger</h2>
                    <div className="eventura-small-text" style={{ opacity: 0.75 }}>
                      Edit / Delete supported
                    </div>
                  </div>

                  <div className="eventura-table-wrapper">
                    <table className="eventura-table fin-table">
                      <thead>
                        <tr>
                          <th>Date</th>
                          <th>Type</th>
                          <th>Category</th>
                          <th>Amount</th>
                          <th />
                        </tr>
                      </thead>
                      <tbody>
                        {filteredTx.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="eventura-small-text">
                              No transactions for this filter.
                            </td>
                          </tr>
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
                                <button className="eventura-tag eventura-tag-blue" type="button" onClick={() => startEditTx(t)}>
                                  Edit
                                </button>
                                <button className="eventura-tag eventura-tag-amber" type="button" onClick={() => deleteTx(t.id)}>
                                  Delete
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </section>
          )}

          {/* EVENTS REVENUE */}
          {tab === "events" && (
            <section className="eventura-columns">
              <div className="fin-panel">
                <div className="fin-panel-title">
                  <h2>Events Revenue (Auto)</h2>
                  <div className="eventura-small-text" style={{ opacity: 0.75 }}>
                    Confirmed/Completed budgets count as revenue
                  </div>
                </div>

                <div className="eventura-table-wrapper">
                  <table className="eventura-table fin-table">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Event</th>
                        <th>Status</th>
                        <th>Budget</th>
                        <th />
                      </tr>
                    </thead>
                    <tbody>
                      {filteredEventRevenue.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="eventura-small-text">
                            No revenue events for this filter.
                          </td>
                        </tr>
                      ) : (
                        filteredEventRevenue.map((r) => {
                          const ev = events.find((e) => e.id === r.id);
                          return (
                            <tr key={r.id}>
                              <td>{r.date}</td>
                              <td>
                                <div className="eventura-list-title">{r.title}</div>
                              </td>
                              <td>{r.status}</td>
                              <td>{INR(r.amount)}</td>
                              <td style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                                {ev ? (
                                  <>
                                    <button className="eventura-tag eventura-tag-blue" type="button" onClick={() => startEditEvent(ev)}>
                                      Edit
                                    </button>
                                    <button className="eventura-tag eventura-tag-amber" type="button" onClick={() => deleteEvent(ev.id)}>
                                      Delete
                                    </button>
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
                  <div className="eventura-card" style={{ marginTop: 14 }}>
                    <p className="eventura-card-label">Edit Event</p>
                    <div style={{ display: "grid", gap: 10 }}>
                      <input className="eventura-search" value={editingEvent.title} onChange={(e) => setEditingEvent({ ...editingEvent, title: e.target.value })} />
                      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                        <input className="eventura-search" type="date" value={editingEvent.date} onChange={(e) => setEditingEvent({ ...editingEvent, date: e.target.value })} />
                        <select
                          className="eventura-search"
                          value={editingEvent.status}
                          onChange={(e) => setEditingEvent({ ...editingEvent, status: e.target.value as EventStatus })}
                        >
                          <option>Tentative</option>
                          <option>Confirmed</option>
                          <option>Completed</option>
                          <option>Cancelled</option>
                        </select>
                        <input
                          className="eventura-search"
                          type="number"
                          value={editingEvent.budget || 0}
                          onChange={(e) => setEditingEvent({ ...editingEvent, budget: Number(e.target.value) || 0 })}
                        />
                      </div>
                      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
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

              <div className="fin-panel fin-ai">
                <div className="fin-panel-title">
                  <h2>Collections</h2>
                  <div className="eventura-small-text" style={{ opacity: 0.75 }}>
                    AR depends on your toggle
                  </div>
                </div>

                <div className="fin-kpi" style={{ borderRadius: 18 }}>
                  <div className="fin-kpi-label">Receivable</div>
                  <div className="fin-kpi-value">{INR(receivable)}</div>
                  <div className="fin-kpi-note">Follow up confirmed clients</div>
                </div>
              </div>
            </section>
          )}

          {/* BACKUP */}
          {tab === "backup" && (
            <section className="eventura-columns">
              <div className="fin-panel">
                <div className="fin-panel-title">
                  <h2>Backup / Restore</h2>
                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                    <button className="eventura-button-secondary" type="button" onClick={exportJSON}>
                      Export JSON
                    </button>
                    <button className="eventura-tag eventura-tag-amber" type="button" onClick={importJSON}>
                      Import JSON
                    </button>
                  </div>
                </div>

                <textarea
                  className="eventura-search"
                  style={{ width: "100%", height: 260 }}
                  placeholder="Export appears here. Paste JSON here to import."
                  value={backupText}
                  onChange={(e) => setBackupText(e.target.value)}
                />
              </div>

              <div className="fin-panel">
                <div className="fin-panel-title">
                  <h2>Notes</h2>
                </div>
                <ul className="eventura-bullets">
                  <li>Finance is localStorage based. Your deletes stay deleted.</li>
                  <li>Events revenue is driven by Confirmed/Completed budgets.</li>
                  <li>HR cost reads from <code>eventura-hr-team</code>.</li>
                </ul>
              </div>
            </section>
          )}
        </div>
      </div>
    </main>
  );
}

/* ================= Sidebar + Topbar (same style) ================= */

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

function SidebarLink(props: { href: string; label: string; icon: string; active?: boolean }) {
  const className = "eventura-sidebar-link" + (props.active ? " eventura-sidebar-link-active" : "");
  return (
    <Link href={props.href} className={className}>
      <span className="eventura-sidebar-icon">{props.icon}</span>
      <span>{props.label}</span>
    </Link>
  );
}
