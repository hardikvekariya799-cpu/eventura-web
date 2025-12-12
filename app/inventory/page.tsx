"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";

/* ================= AUTH ================= */
type Role = "CEO" | "Staff";
type User = { name: string; role: Role; city: string };
const USER_KEY = "eventura-user";

/* ================= STORAGE ================= */
const DB_EVENTS = "eventura-events";
const DB_FIN = "eventura-finance-transactions";
const DB_HR = "eventura-hr-team";
const DB_INV = "eventura-inventory-items";
const DB_REPORTS_CFG = "eventura-reports-config";

/* ================= TYPES ================= */
type EventStatus = "Tentative" | "Confirmed" | "Completed" | "Cancelled" | string;

type EventItem = {
  id: number;
  title: string;
  status: EventStatus;
  date: string; // YYYY-MM-DD
  budget?: number;
  city?: string;
};

type TxType = "Income" | "Expense";
type FinanceTx = {
  id: number;
  type: TxType;
  date: string; // YYYY-MM-DD
  category?: string;
  amount: number;
  note?: string;
  eventId?: number;
};

type TeamMember = {
  id: number;
  name?: string;
  role?: string;
  status: "Core" | "Freelancer" | "Trainee" | string;
  workload?: number; // 0-100
  monthlySalary?: number;
  eventsThisMonth?: number;
  rating?: number;
  skills?: string[];
};

type InventoryItem = {
  id: number;
  name: string;
  category?: string;
  assetType?: string;
  status?: string;
  location?: string;
  qtyOnHand: number;
  minQty: number;
  unitCost: number;
  sku?: string;
  vendorName?: string;
};

type ReportsConfig = {
  // section visibility (removable)
  sections: {
    executive: boolean;
    trend: boolean;
    ai: boolean;
    hr: boolean;
    inventory: boolean;
    events: boolean;
    exports: boolean;
  };
  // editable thresholds
  thresholds: {
    burnoutWorkloadPct: number; // default 85
    hrCostRatioPct: number; // default 35
    lowStockRule: "LEQ_MIN" | "LEQ_MIN_PLUS5";
    marginWarnPct: number; // default 20
  };
  // filters
  filter: {
    month: string; // "ALL" or YYYY-MM
  };
};

/* ================= UTILS ================= */
const INR = (v: number) => "₹" + Math.round(v || 0).toLocaleString("en-IN");
const ym = (d: string) => (d || "").slice(0, 7);
const today = () => new Date().toISOString().slice(0, 10);

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

function clamp(n: number, min: number, max: number) {
  if (Number.isNaN(n)) return min;
  return Math.max(min, Math.min(max, n));
}

function toCSV(rows: Record<string, any>[]) {
  if (!rows.length) return "";
  const cols = Array.from(new Set(rows.flatMap((r) => Object.keys(r))));
  const esc = (v: any) => {
    const s = String(v ?? "");
    if (s.includes('"') || s.includes(",") || s.includes("\n")) return `"${s.replaceAll('"', '""')}"`;
    return s;
  };
  const head = cols.map(esc).join(",");
  const body = rows.map((r) => cols.map((c) => esc(r[c])).join(",")).join("\n");
  return head + "\n" + body;
}

async function downloadText(filename: string, content: string, mime = "text/plain") {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/* ================= SIMPLE CHART (CANVAS) ================= */
function useCanvasSize() {
  const ref = useRef<HTMLCanvasElement | null>(null);
  const [w, setW] = useState(680);

  useEffect(() => {
    const resize = () => {
      if (!ref.current) return;
      const p = ref.current.parentElement;
      if (!p) return;
      setW(Math.max(320, Math.floor(p.getBoundingClientRect().width)));
    };
    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);

  return { ref, w };
}

function drawLines(
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

  const padL = 54,
    padR = 16,
    padT = 14,
    padB = 30;
  const cw = W - padL - padR;
  const ch = H - padT - padB;

  const maxV = Math.max(1, ...series.flatMap((s) => s.values.map((v) => v || 0)));

  // grid
  ctx.strokeStyle = "rgba(255,255,255,0.10)";
  ctx.lineWidth = 1;
  ctx.font = "12px system-ui";

  for (let i = 0; i <= 4; i++) {
    const y = padT + (ch * i) / 4;
    ctx.beginPath();
    ctx.moveTo(padL, y);
    ctx.lineTo(padL + cw, y);
    ctx.stroke();

    const tick = Math.round(maxV * (1 - i / 4));
    ctx.fillStyle = "rgba(255,255,255,0.65)";
    ctx.fillText((tick / 1000).toFixed(0) + "k", 10, y + 4);
  }

  // x labels
  ctx.fillStyle = "rgba(255,255,255,0.65)";
  for (let i = 0; i < labels.length; i++) {
    if (labels.length <= 1) break;
    const x = padL + (cw * i) / (labels.length - 1);
    if (i === 0 || i === labels.length - 1 || i % 2 === 1) {
      ctx.fillText(labels[i].slice(5), x - 12, padT + ch + 18);
    }
  }

  // series line (neutral white alphas)
  const alphas = [1, 0.7, 0.45];
  series.forEach((s, idx) => {
    ctx.strokeStyle = `rgba(255,255,255,${alphas[idx % alphas.length]})`;
    ctx.lineWidth = 2;

    ctx.beginPath();
    s.values.forEach((v, i) => {
      const x = labels.length <= 1 ? padL : padL + (cw * i) / (labels.length - 1);
      const y = padT + ch - (ch * (v || 0)) / maxV;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();
  });

  // legend
  ctx.fillStyle = "rgba(255,255,255,0.82)";
  let lx = padL;
  const ly = 13;
  series.forEach((s) => {
    ctx.fillText(s.name, lx, ly);
    lx += ctx.measureText(s.name).width + 16;
  });
}

/* ================= PAGE ================= */
export default function ReportsPage() {
  const [user, setUser] = useState<User | null>(null);

  const [events, setEvents] = useState<EventItem[]>([]);
  const [tx, setTx] = useState<FinanceTx[]>([]);
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [inv, setInv] = useState<InventoryItem[]>([]);

  const defaultCfg: ReportsConfig = {
    sections: {
      executive: true,
      trend: true,
      ai: true,
      hr: true,
      inventory: true,
      events: true,
      exports: true,
    },
    thresholds: {
      burnoutWorkloadPct: 85,
      hrCostRatioPct: 35,
      lowStockRule: "LEQ_MIN",
      marginWarnPct: 20,
    },
    filter: { month: "ALL" },
  };

  const [cfg, setCfg] = useState<ReportsConfig>(defaultCfg);

  const [backupText, setBackupText] = useState("");

  const { ref: chartRef, w: chartW } = useCanvasSize();

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
    setInv(safeArray<InventoryItem>(DB_INV));
    setCfg(safeObj<ReportsConfig>(DB_REPORTS_CFG, defaultCfg));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ===== PERSIST (this fixes “I hide/delete but it comes back”) ===== */
  useEffect(() => {
    localStorage.setItem(DB_REPORTS_CFG, JSON.stringify(cfg));
  }, [cfg]);

  /* ===== CEO ONLY (optional) ===== */
  if (user && user.role !== "CEO") {
    return (
      <div style={{ padding: 18 }}>
        Reports & Analytics is CEO-only.
      </div>
    );
  }
  if (!user) return null;

  /* ================= FILTERS ================= */
  const monthOptions = useMemo(() => {
    const months = new Set<string>();
    tx.forEach((t) => months.add(ym(t.date)));
    events.forEach((e) => months.add(ym(e.date)));
    return ["ALL", ...Array.from(months).filter(Boolean).sort()];
  }, [tx, events]);

  const filteredTx = useMemo(() => {
    if (cfg.filter.month === "ALL") return tx;
    return tx.filter((t) => ym(t.date) === cfg.filter.month);
  }, [tx, cfg.filter.month]);

  const filteredEvents = useMemo(() => {
    if (cfg.filter.month === "ALL") return events;
    return events.filter((e) => ym(e.date) === cfg.filter.month);
  }, [events, cfg.filter.month]);

  /* ================= CALC ================= */
  const autoEventRevenue = useMemo(() => {
    return filteredEvents
      .filter((e) => e.status === "Confirmed" || e.status === "Completed")
      .reduce((s, e) => s + (e.budget || 0), 0);
  }, [filteredEvents]);

  const income = useMemo(() => {
    return filteredTx.filter((t) => t.type === "Income").reduce((s, t) => s + (t.amount || 0), 0);
  }, [filteredTx]);

  const expense = useMemo(() => {
    return filteredTx.filter((t) => t.type === "Expense").reduce((s, t) => s + (t.amount || 0), 0);
  }, [filteredTx]);

  const revenue = income + autoEventRevenue;

  const hrCost = useMemo(() => {
    // Use core staff only for monthly run
    const core = team.filter((m) => m.status === "Core");
    return core.reduce((s, m) => s + (m.monthlySalary || 0), 0);
  }, [team]);

  const netProfit = revenue - expense - hrCost;

  const hrRatioPct = revenue > 0 ? (hrCost / revenue) * 100 : 0;
  const marginPct = revenue > 0 ? (netProfit / revenue) * 100 : 0;

  const lowStockCount = useMemo(() => {
    const rule = cfg.thresholds.lowStockRule;
    return inv.filter((i) => {
      const min = i.minQty || 0;
      const threshold = rule === "LEQ_MIN_PLUS5" ? min + 5 : min;
      return (i.qtyOnHand || 0) <= threshold;
    }).length;
  }, [inv, cfg.thresholds.lowStockRule]);

  const invValue = useMemo(() => {
    return inv.reduce((s, i) => s + (i.unitCost || 0) * Math.max(0, i.qtyOnHand || 0), 0);
  }, [inv]);

  const avgWorkload = useMemo(() => {
    const core = team.filter((m) => m.status === "Core");
    if (!core.length) return 0;
    const sum = core.reduce((s, m) => s + (m.workload || 0), 0);
    return Math.round(sum / core.length);
  }, [team]);

  const burnoutList = useMemo(() => {
    const th = cfg.thresholds.burnoutWorkloadPct;
    return team
      .filter((m) => m.status === "Core")
      .filter((m) => (m.workload || 0) >= th)
      .sort((a, b) => (b.workload || 0) - (a.workload || 0));
  }, [team, cfg.thresholds.burnoutWorkloadPct]);

  const eventTable = useMemo(() => {
    return filteredEvents
      .slice()
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((e) => ({
        id: e.id,
        date: e.date,
        title: e.title,
        status: e.status,
        budget: e.budget || 0,
      }));
  }, [filteredEvents]);

  /* ================= MONTHLY SERIES (CHART) ================= */
  const monthlySeries = useMemo(() => {
    const map = new Map<string, { rev: number; exp: number; ev: number }>();

    tx.forEach((t) => {
      const m = ym(t.date);
      if (!m) return;
      if (!map.has(m)) map.set(m, { rev: 0, exp: 0, ev: 0 });
      const row = map.get(m)!;
      if (t.type === "Income") row.rev += t.amount || 0;
      else row.exp += t.amount || 0;
    });

    events.forEach((e) => {
      if (e.status !== "Confirmed" && e.status !== "Completed") return;
      const m = ym(e.date);
      if (!m) return;
      if (!map.has(m)) map.set(m, { rev: 0, exp: 0, ev: 0 });
      map.get(m)!.ev += e.budget || 0;
    });

    const months = Array.from(map.keys()).sort();
    const revenueByMonth = months.map((m) => (map.get(m)!.rev || 0) + (map.get(m)!.ev || 0));
    const expenseByMonth = months.map((m) => map.get(m)!.exp || 0);
    const profitByMonth = months.map((_, i) => revenueByMonth[i] - expenseByMonth[i] - hrCost /* approx */);

    return { months, revenueByMonth, expenseByMonth, profitByMonth };
  }, [tx, events, hrCost]);

  useEffect(() => {
    if (!chartRef.current) return;
    chartRef.current.width = chartW;
    chartRef.current.height = 220;
    drawLines(chartRef.current, monthlySeries.months, [
      { name: "Revenue", values: monthlySeries.revenueByMonth },
      { name: "Expense", values: monthlySeries.expenseByMonth },
      { name: "Profit (approx)", values: monthlySeries.profitByMonth },
    ]);
  }, [chartRef, chartW, monthlySeries]);

  /* ================= AI INSIGHTS (REAL RULES) ================= */
  const aiInsights = useMemo(() => {
    const insights: { tone: "good" | "warn" | "bad"; text: string }[] = [];

    if (revenue === 0) insights.push({ tone: "warn", text: "No revenue detected. Add event budgets (Confirmed/Completed) or add Income transactions." });

    if (marginPct < 0) insights.push({ tone: "bad", text: `You are running at a LOSS. Margin ${marginPct.toFixed(1)}%. Reduce expenses or raise pricing.` });
    else if (marginPct < cfg.thresholds.marginWarnPct) insights.push({ tone: "warn", text: `Margin is low (${marginPct.toFixed(1)}%). Target ≥ ${cfg.thresholds.marginWarnPct}%.` });
    else insights.push({ tone: "good", text: `Margin healthy at ${marginPct.toFixed(1)}%. Keep premium pricing discipline.` });

    if (hrRatioPct > cfg.thresholds.hrCostRatioPct) {
      insights.push({ tone: "warn", text: `HR cost ratio ${hrRatioPct.toFixed(1)}% exceeds ${cfg.thresholds.hrCostRatioPct}%. Use freelancers during peaks or grow revenue.` });
    }

    if (burnoutList.length) {
      insights.push({ tone: "warn", text: `Burnout risk: ${burnoutList.length} core staff above ${cfg.thresholds.burnoutWorkloadPct}% workload.` });
    } else {
      insights.push({ tone: "good", text: "No burnout alerts based on current workload threshold." });
    }

    if (lowStockCount > 0) {
      insights.push({ tone: "warn", text: `Inventory alert: ${lowStockCount} item(s) low stock (rule: ${cfg.thresholds.lowStockRule}). Reorder before peak events.` });
    }

    if (!insights.length) insights.push({ tone: "good", text: "All systems stable." });

    return insights;
  }, [revenue, marginPct, cfg.thresholds.marginWarnPct, hrRatioPct, cfg.thresholds.hrCostRatioPct, burnoutList.length, cfg.thresholds.burnoutWorkloadPct, lowStockCount, cfg.thresholds.lowStockRule]);

  const toneClass = (tone: "good" | "warn" | "bad") => {
    if (tone === "good") return "rep-pill rep-good";
    if (tone === "warn") return "rep-pill rep-warn";
    return "rep-pill rep-bad";
  };

  /* ================= EXPORTS ================= */
  const exportCSV = async () => {
    const rows = [
      { metric: "Revenue", value: revenue },
      { metric: "Net Profit", value: netProfit },
      { metric: "HR Cost", value: hrCost },
      { metric: "Expense", value: expense },
      { metric: "Inventory Value", value: invValue },
      { metric: "Low Stock Count", value: lowStockCount },
      { metric: "Avg Workload", value: avgWorkload },
      { metric: "Month Filter", value: cfg.filter.month },
    ];
    await downloadText(`eventura_reports_${cfg.filter.month}_${today()}.csv`, toCSV(rows), "text/csv");
  };

  const exportJSON = async () => {
    const payload = {
      version: 1,
      exportedAt: new Date().toISOString(),
      config: cfg,
      snapshot: {
        revenue,
        expense,
        hrCost,
        netProfit,
        invValue,
        lowStockCount,
        avgWorkload,
        eventCount: filteredEvents.length,
      },
      tables: {
        events: eventTable,
        burnout: burnoutList.map((m) => ({ name: m.name || "Staff", workload: m.workload || 0, role: m.role || "" })),
      },
    };
    const text = JSON.stringify(payload, null, 2);
    setBackupText(text);
    try {
      await navigator.clipboard.writeText(text);
      alert("Export JSON copied to clipboard (also shown in the box).");
    } catch {
      alert("Export generated (shown in the box). Copy manually.");
    }
  };

  const importJSON = () => {
    if (!backupText.trim()) return alert("Paste JSON first.");
    if (!confirm("Import will replace Reports config (sections + thresholds + filter). Continue?")) return;

    try {
      const parsed = JSON.parse(backupText);
      if (parsed?.config) setCfg({ ...defaultCfg, ...parsed.config });
      alert("Imported config successfully.");
    } catch {
      alert("Invalid JSON.");
    }
  };

  /* ================= UI ================= */
  return (
    <main className="eventura-os">
      <style jsx>{`
        .rep-wrap { display: grid; gap: 14px; }

        .rep-head {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          flex-wrap: wrap;
          gap: 12px;
        }

        .rep-title { font-size: 1.5rem; font-weight: 800; letter-spacing: 0.4px; }
        .rep-sub { opacity: 0.78; font-size: 0.9rem; margin-top: 4px; }

        .rep-toolbar {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
          align-items: center;
          padding: 12px;
          border-radius: 18px;
          border: 1px solid rgba(255,255,255,0.08);
          background: rgba(11, 16, 32, 0.78);
          backdrop-filter: blur(10px);
        }

        .rep-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px,1fr)); gap: 12px; }

        .rep-kpi {
          border-radius: 20px;
          padding: 16px;
          border: 1px solid rgba(212,175,55,0.22);
          background: linear-gradient(135deg, rgba(212,175,55,0.11), rgba(255,255,255,0.03));
          box-shadow: 0 12px 34px rgba(0,0,0,0.24);
        }
        .rep-kpi-label { opacity: 0.75; font-size: 0.78rem; letter-spacing: 0.08em; text-transform: uppercase; }
        .rep-kpi-value { font-size: 1.7rem; font-weight: 900; margin-top: 6px; }
        .rep-kpi-note { margin-top: 6px; font-size: 0.82rem; opacity: 0.75; }

        .rep-panels { display: grid; grid-template-columns: 1.2fr 0.8fr; gap: 12px; }
        @media (max-width: 980px) { .rep-panels { grid-template-columns: 1fr; } }

        .rep-panel {
          border-radius: 22px;
          padding: 16px;
          border: 1px solid rgba(255,255,255,0.08);
          background: rgba(11, 16, 32, 0.78);
          backdrop-filter: blur(10px);
        }

        .rep-panel-title {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 10px;
          margin-bottom: 10px;
        }
        .rep-panel-title h2 { font-size: 1.05rem; font-weight: 800; margin: 0; }

        .rep-toggle {
          border-radius: 999px;
          border: 1px solid rgba(255,255,255,0.12);
          background: rgba(255,255,255,0.04);
          padding: 7px 12px;
          cursor: pointer;
          font-size: 0.8rem;
          opacity: 0.92;
        }
        .rep-toggle:hover { background: rgba(255,255,255,0.08); }

        .rep-ai {
          border: 1px solid rgba(139,92,246,0.35);
          background: linear-gradient(135deg, rgba(139,92,246,0.16), rgba(212,175,55,0.07));
        }

        .rep-pill {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 10px 12px;
          border-radius: 14px;
          border: 1px solid rgba(255,255,255,0.10);
          background: rgba(255,255,255,0.04);
          margin: 6px 0;
          font-size: 0.9rem;
        }
        .rep-good { border-color: rgba(34,197,94,0.35); }
        .rep-warn { border-color: rgba(59,130,246,0.35); }
        .rep-bad  { border-color: rgba(248,113,113,0.35); }

        .rep-canvas {
          width: 100%;
          border-radius: 16px;
          border: 1px solid rgba(255,255,255,0.08);
          background: rgba(255,255,255,0.03);
        }

        .rep-table th {
          font-size: 0.72rem;
          text-transform: uppercase;
          letter-spacing: 0.10em;
          opacity: 0.7;
        }
        .rep-table td { font-size: 0.9rem; }

        .rep-formrow { display: flex; gap: 10px; flex-wrap: wrap; align-items: center; }
        .rep-small { opacity: 0.78; font-size: 0.86rem; }
        code { background: rgba(255,255,255,0.06); padding: 2px 6px; border-radius: 8px; }
      `}</style>

      <aside className="eventura-sidebar">
        <SidebarCore user={user} active="reports" />
      </aside>

      <div className="eventura-main">
        <TopbarCore user={user} />

        <div className="eventura-content rep-wrap">
          <div className="rep-head">
            <div>
              <div className="rep-title">Reports & Analytics</div>
              <div className="rep-sub">Advanced • Editable • Removable • AI Insights • Export</div>
            </div>

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <Link href="/finance" className="eventura-button-secondary">Open Finance</Link>
              <Link href="/events" className="eventura-button-secondary">Open Events</Link>
              <Link href="/hr" className="eventura-button-secondary">Open HR</Link>
              <Link href="/inventory" className="eventura-button-secondary">Open Inventory</Link>
            </div>
          </div>

          {/* Toolbar */}
          <div className="rep-toolbar">
            <div className="eventura-small-text">Month:</div>
            <select
              className="eventura-search"
              style={{ maxWidth: 220 }}
              value={cfg.filter.month}
              onChange={(e) => setCfg({ ...cfg, filter: { ...cfg.filter, month: e.target.value } })}
            >
              {monthOptions.map((m) => (
                <option key={m} value={m}>{m === "ALL" ? "ALL (Totals)" : m}</option>
              ))}
            </select>

            <div style={{ flex: 1 }} />

            <button
              className="eventura-tag eventura-tag-amber"
              type="button"
              onClick={() => {
                if (!confirm("Reset Reports layout + thresholds to default?")) return;
                setCfg(defaultCfg);
              }}
            >
              Reset Reports
            </button>
          </div>

          {/* EXECUTIVE KPIs (removable) */}
          {cfg.sections.executive && (
            <section className="rep-grid">
              <div className="rep-kpi">
                <div className="rep-kpi-label">Revenue</div>
                <div className="rep-kpi-value">{INR(revenue)}</div>
                <div className="rep-kpi-note">Income + Confirmed/Completed event budgets</div>
              </div>
              <div className="rep-kpi">
                <div className="rep-kpi-label">Net Profit</div>
                <div className="rep-kpi-value">{INR(netProfit)}</div>
                <div className="rep-kpi-note">Revenue − Expense − HR cost</div>
              </div>
              <div className="rep-kpi">
                <div className="rep-kpi-label">HR Cost</div>
                <div className="rep-kpi-value">{INR(hrCost)}</div>
                <div className="rep-kpi-note">Core staff salary run (from HR)</div>
              </div>
              <div className="rep-kpi">
                <div className="rep-kpi-label">Inventory Value</div>
                <div className="rep-kpi-value">{INR(invValue)}</div>
                <div className="rep-kpi-note">Qty × unit cost (from Inventory)</div>
              </div>
              <div className="rep-kpi">
                <div className="rep-kpi-label">Avg Workload</div>
                <div className="rep-kpi-value">{avgWorkload}%</div>
                <div className="rep-kpi-note">Core staff avg utilization</div>
              </div>
              <div className="rep-kpi">
                <div className="rep-kpi-label">Low Stock Alerts</div>
                <div className="rep-kpi-value">{lowStockCount}</div>
                <div className="rep-kpi-note">Editable rule in Settings below</div>
              </div>
            </section>
          )}

          {/* Two-column panels */}
          <section className="rep-panels">
            {/* Trend */}
            {cfg.sections.trend && (
              <div className="rep-panel">
                <div className="rep-panel-title">
                  <h2>Trend (Monthly)</h2>
                  <button
                    className="rep-toggle"
                    type="button"
                    onClick={() => setCfg({ ...cfg, sections: { ...cfg.sections, trend: false } })}
                    title="Remove this section"
                  >
                    Remove
                  </button>
                </div>

                <canvas ref={chartRef} className="rep-canvas" />
                <div className="rep-small" style={{ marginTop: 10 }}>
                  Profit is approximate (includes HR as monthly run).
                </div>
              </div>
            )}

            {/* AI + Settings */}
            <div className={"rep-panel " + (cfg.sections.ai ? "rep-ai" : "")}>
              <div className="rep-panel-title">
                <h2>AI Insights + Settings</h2>
                <div style={{ display: "flex", gap: 10 }}>
                  {cfg.sections.ai ? (
                    <button
                      className="rep-toggle"
                      type="button"
                      onClick={() => setCfg({ ...cfg, sections: { ...cfg.sections, ai: false } })}
                      title="Remove AI section"
                    >
                      Remove AI
                    </button>
                  ) : (
                    <button
                      className="rep-toggle"
                      type="button"
                      onClick={() => setCfg({ ...cfg, sections: { ...cfg.sections, ai: true } })}
                    >
                      Add AI
                    </button>
                  )}
                </div>
              </div>

              {cfg.sections.ai && (
                <div>
                  {aiInsights.map((x, i) => (
                    <div key={i} className={toneClass(x.tone)}>
                      <span>✨</span>
                      <span>{x.text}</span>
                    </div>
                  ))}
                </div>
              )}

              <div style={{ marginTop: 14 }}>
                <div className="rep-small" style={{ marginBottom: 8 }}>
                  Editable thresholds (changes update Insights live)
                </div>

                <div className="rep-formrow">
                  <div className="eventura-small-text">Burnout ≥</div>
                  <input
                    className="eventura-search"
                    style={{ width: 110 }}
                    type="number"
                    value={cfg.thresholds.burnoutWorkloadPct}
                    onChange={(e) =>
                      setCfg({
                        ...cfg,
                        thresholds: { ...cfg.thresholds, burnoutWorkloadPct: clamp(Number(e.target.value), 0, 100) },
                      })
                    }
                  />
                  <div className="eventura-small-text">%</div>
                </div>

                <div className="rep-formrow" style={{ marginTop: 8 }}>
                  <div className="eventura-small-text">HR Ratio warn ≥</div>
                  <input
                    className="eventura-search"
                    style={{ width: 110 }}
                    type="number"
                    value={cfg.thresholds.hrCostRatioPct}
                    onChange={(e) =>
                      setCfg({
                        ...cfg,
                        thresholds: { ...cfg.thresholds, hrCostRatioPct: clamp(Number(e.target.value), 0, 100) },
                      })
                    }
                  />
                  <div className="eventura-small-text">%</div>
                </div>

                <div className="rep-formrow" style={{ marginTop: 8 }}>
                  <div className="eventura-small-text">Margin warn &lt;</div>
                  <input
                    className="eventura-search"
                    style={{ width: 110 }}
                    type="number"
                    value={cfg.thresholds.marginWarnPct}
                    onChange={(e) =>
                      setCfg({
                        ...cfg,
                        thresholds: { ...cfg.thresholds, marginWarnPct: clamp(Number(e.target.value), 0, 100) },
                      })
                    }
                  />
                  <div className="eventura-small-text">%</div>
                </div>

                <div className="rep-formrow" style={{ marginTop: 8 }}>
                  <div className="eventura-small-text">Low stock rule</div>
                  <select
                    className="eventura-search"
                    value={cfg.thresholds.lowStockRule}
                    onChange={(e) =>
                      setCfg({
                        ...cfg,
                        thresholds: { ...cfg.thresholds, lowStockRule: e.target.value as any },
                      })
                    }
                  >
                    <option value="LEQ_MIN">Qty ≤ MinQty</option>
                    <option value="LEQ_MIN_PLUS5">Qty ≤ MinQty + 5</option>
                  </select>
                </div>
              </div>

              <div style={{ marginTop: 12 }} className="rep-small">
                Ratios: HR {hrRatioPct.toFixed(1)}% • Margin {marginPct.toFixed(1)}%
              </div>
            </div>
          </section>

          {/* HR SECTION (removable) */}
          {cfg.sections.hr && (
            <section className="rep-panel">
              <div className="rep-panel-title">
                <h2>HR Analytics</h2>
                <button
                  className="rep-toggle"
                  type="button"
                  onClick={() => setCfg({ ...cfg, sections: { ...cfg.sections, hr: false } })}
                >
                  Remove
                </button>
              </div>

              <div className="rep-small" style={{ marginBottom: 10 }}>
                Burnout threshold: <code>{cfg.thresholds.burnoutWorkloadPct}%</code>
              </div>

              <div className="eventura-table-wrapper">
                <table className="eventura-table rep-table">
                  <thead>
                    <tr>
                      <th>Member</th>
                      <th>Status</th>
                      <th>Workload</th>
                      <th>Salary</th>
                    </tr>
                  </thead>
                  <tbody>
                    {team
                      .filter((m) => m.status === "Core")
                      .sort((a, b) => (b.workload || 0) - (a.workload || 0))
                      .slice(0, 12)
                      .map((m, idx) => (
                        <tr key={m.id ?? idx}>
                          <td>
                            <div className="eventura-list-title">{m.name || `Core Staff #${idx + 1}`}</div>
                            <div className="eventura-list-sub">{m.role || ""}</div>
                          </td>
                          <td>{m.status}</td>
                          <td>
                            <span className="eventura-tag eventura-tag-blue">
                              {(m.workload || 0)}%
                            </span>
                          </td>
                          <td>{INR(m.monthlySalary || 0)}</td>
                        </tr>
                      ))}
                    {team.filter((m) => m.status === "Core").length === 0 && (
                      <tr>
                        <td colSpan={4} className="eventura-small-text">
                          No HR data found in <code>{DB_HR}</code>. Add team members in HR tab.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {burnoutList.length > 0 && (
                <div style={{ marginTop: 10 }} className="rep-pill rep-warn">
                  ⚠ Burnout list: {burnoutList.map((m) => m.name || "Staff").join(", ")}
                </div>
              )}
            </section>
          )}

          {/* INVENTORY SECTION (removable) */}
          {cfg.sections.inventory && (
            <section className="rep-panel">
              <div className="rep-panel-title">
                <h2>Inventory Analytics</h2>
                <button
                  className="rep-toggle"
                  type="button"
                  onClick={() => setCfg({ ...cfg, sections: { ...cfg.sections, inventory: false } })}
                >
                  Remove
                </button>
              </div>

              <div className="rep-small" style={{ marginBottom: 10 }}>
                Low stock rule: <code>{cfg.thresholds.lowStockRule}</code>
              </div>

              <div className="eventura-table-wrapper">
                <table className="eventura-table rep-table">
                  <thead>
                    <tr>
                      <th>Item</th>
                      <th>Qty</th>
                      <th>Min</th>
                      <th>Value</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {inv
                      .slice()
                      .sort((a, b) => (a.qtyOnHand || 0) - (b.qtyOnHand || 0))
                      .slice(0, 12)
                      .map((i) => (
                        <tr key={i.id}>
                          <td>
                            <div className="eventura-list-title">{i.name}</div>
                            <div className="eventura-list-sub">{i.category || ""} {i.sku ? `· ${i.sku}` : ""}</div>
                          </td>
                          <td>{i.qtyOnHand}</td>
                          <td>{i.minQty}</td>
                          <td>{INR((i.unitCost || 0) * Math.max(0, i.qtyOnHand || 0))}</td>
                          <td>{i.status || ""}</td>
                        </tr>
                      ))}
                    {inv.length === 0 && (
                      <tr>
                        <td colSpan={5} className="eventura-small-text">
                          No Inventory data found in <code>{DB_INV}</code>. Add items in Inventory tab.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* EVENTS TABLE (removable) */}
          {cfg.sections.events && (
            <section className="rep-panel">
              <div className="rep-panel-title">
                <h2>Events Snapshot</h2>
                <button
                  className="rep-toggle"
                  type="button"
                  onClick={() => setCfg({ ...cfg, sections: { ...cfg.sections, events: false } })}
                >
                  Remove
                </button>
              </div>

              <div className="eventura-table-wrapper">
                <table className="eventura-table rep-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Event</th>
                      <th>Status</th>
                      <th>Budget</th>
                    </tr>
                  </thead>
                  <tbody>
                    {eventTable.slice(0, 14).map((e) => (
                      <tr key={e.id}>
                        <td>{e.date}</td>
                        <td>
                          <div className="eventura-list-title">{e.title}</div>
                        </td>
                        <td>{e.status}</td>
                        <td>{INR(e.budget)}</td>
                      </tr>
                    ))}
                    {eventTable.length === 0 && (
                      <tr>
                        <td colSpan={4} className="eventura-small-text">
                          No events found in <code>{DB_EVENTS}</code>. Add events in Events tab.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* EXPORTS (removable) */}
          {cfg.sections.exports && (
            <section className="rep-panel">
              <div className="rep-panel-title">
                <h2>Export & Backup</h2>
                <button
                  className="rep-toggle"
                  type="button"
                  onClick={() => setCfg({ ...cfg, sections: { ...cfg.sections, exports: false } })}
                >
                  Remove
                </button>
              </div>

              <div className="rep-formrow" style={{ marginBottom: 10 }}>
                <button className="eventura-button-secondary" type="button" onClick={exportCSV}>
                  Export CSV
                </button>
                <button className="eventura-button-secondary" type="button" onClick={exportJSON}>
                  Export JSON
                </button>
              </div>

              <textarea
                className="eventura-search"
                style={{ width: "100%", height: 240 }}
                placeholder="Export JSON appears here. Paste JSON here to import (config only)."
                value={backupText}
                onChange={(e) => setBackupText(e.target.value)}
              />

              <div className="rep-formrow" style={{ marginTop: 10 }}>
                <button className="eventura-tag eventura-tag-amber" type="button" onClick={importJSON}>
                  Import Config JSON
                </button>
                <div className="rep-small">
                  Stores config in <code>{DB_REPORTS_CFG}</code>
                </div>
              </div>
            </section>
          )}

          {/* “Add back removed sections” bar */}
          <section className="rep-toolbar">
            <div className="rep-small">Add back sections:</div>

            {Object.entries(cfg.sections).map(([k, v]) => (
              <button
                key={k}
                className={"eventura-tag " + (v ? "eventura-tag-green" : "eventura-tag-amber")}
                type="button"
                onClick={() => setCfg({ ...cfg, sections: { ...cfg.sections, [k]: !v } as any })}
              >
                {v ? `Hide ${k}` : `Show ${k}`}
              </button>
            ))}
          </section>
        </div>
      </div>
    </main>
  );
}

/* ================= Shared layout ================= */
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
        {isCEO && <SidebarLink href="/reports" label="Reports & Analytics" icon="📈" active={active === "reports"} />}
        {isCEO && <SidebarLink href="/settings" label="Settings & Access" icon="⚙️" active={active === "settings"} />}
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
        <input className="eventura-search" placeholder="Search reports..." />
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
