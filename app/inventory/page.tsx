"use client";

import React, { useEffect, useMemo, useState } from "react";
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

/* ================= TYPES ================= */
type EventItem = {
  id: number;
  date: string;
  title: string;
  status: string;
  budget?: number;
};

type FinanceTx = {
  id: number;
  date: string;
  type: "Income" | "Expense";
  amount: number;
};

type TeamMember = {
  id: number;
  name: string;
  workload: number;
  status: "Core" | "Freelancer" | "Trainee";
  monthlySalary: number;
};

type InventoryItem = {
  id: number;
  name: string;
  qtyOnHand: number;
  minQty: number;
  status: string;
  unitCost: number;
};

/* ================= UTILS ================= */
const INR = (v: number) => "₹" + Math.round(v || 0).toLocaleString("en-IN");

function ym(d: string) {
  return d?.slice(0, 7);
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

/* ================= PAGE ================= */
export default function ReportsPage() {
  const [user, setUser] = useState<User | null>(null);

  const [events, setEvents] = useState<EventItem[]>([]);
  const [tx, setTx] = useState<FinanceTx[]>([]);
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);

  const [showTrend, setShowTrend] = useState(true);
  const [showHR, setShowHR] = useState(true);
  const [showInv, setShowInv] = useState(true);
  const [showAI, setShowAI] = useState(true);

  /* ===== AUTH ===== */
  useEffect(() => {
    const raw = localStorage.getItem(USER_KEY);
    if (!raw) return (window.location.href = "/login");
    try {
      const u: User = JSON.parse(raw);
      if (u.role !== "CEO") return (window.location.href = "/");
      setUser(u);
    } catch {
      window.location.href = "/login";
    }
  }, []);

  /* ===== LOAD ===== */
  useEffect(() => {
    setEvents(safeArray<EventItem>(DB_EVENTS));
    setTx(safeArray<FinanceTx>(DB_FIN));
    setTeam(safeArray<TeamMember>(DB_HR));
    setInventory(safeArray<InventoryItem>(DB_INV));
  }, []);

  /* ================= CALCULATIONS ================= */
  const revenue = tx.filter(t => t.type === "Income").reduce((s, t) => s + t.amount, 0)
    + events.filter(e => e.status === "Confirmed" || e.status === "Completed")
      .reduce((s, e) => s + (e.budget || 0), 0);

  const expense = tx.filter(t => t.type === "Expense").reduce((s, t) => s + t.amount, 0);

  const hrCost = team.filter(t => t.status === "Core").reduce((s, t) => s + t.monthlySalary, 0);

  const netProfit = revenue - expense - hrCost;

  const lowStock = inventory.filter(i => i.qtyOnHand <= i.minQty).length;
  const damaged = inventory.filter(i => i.status === "Damaged").length;

  const avgWorkload =
    team.length > 0
      ? Math.round(team.reduce((s, t) => s + t.workload, 0) / team.length)
      : 0;

  /* ================= AI INSIGHTS ================= */
  const ai = useMemo(() => {
    const a: string[] = [];

    if (revenue === 0) a.push("⚠ No revenue detected this period.");
    if (netProfit < 0) a.push("🚨 Business running at loss.");
    if (hrCost / (revenue || 1) > 0.35)
      a.push("⚠ HR cost exceeds 35% of revenue.");
    if (avgWorkload > 85)
      a.push("⚠ Team burnout risk detected.");
    if (lowStock > 0)
      a.push("⚠ Inventory low stock items need reorder.");
    if (a.length === 0)
      a.push("✅ Business health looks stable. Ready to scale.");

    return a;
  }, [revenue, netProfit, hrCost, avgWorkload, lowStock]);

  if (!user) return null;

  /* ================= UI ================= */
  return (
    <main className="eventura-os">
      <aside className="eventura-sidebar">
        <SidebarCore user={user} active="reports" />
      </aside>

      <div className="eventura-main">
        <TopbarCore user={user} />

        <div className="eventura-content">
          <h1 className="eventura-page-title">Reports & Analytics</h1>
          <p className="eventura-subtitle">
            CEO-level intelligence across Finance, HR, Events & Inventory.
          </p>

          {/* KPIs */}
          <section className="eventura-grid">
            <div className="eventura-card eventura-card-glow">
              <p className="eventura-card-label">Revenue</p>
              <p className="eventura-card-value">{INR(revenue)}</p>
            </div>
            <div className="eventura-card eventura-card-glow">
              <p className="eventura-card-label">Net Profit</p>
              <p className="eventura-card-value">{INR(netProfit)}</p>
            </div>
            <div className="eventura-card eventura-card-glow">
              <p className="eventura-card-label">HR Cost</p>
              <p className="eventura-card-value">{INR(hrCost)}</p>
            </div>
            <div className="eventura-card eventura-card-glow">
              <p className="eventura-card-label">Low Stock</p>
              <p className="eventura-card-value">{lowStock}</p>
            </div>
          </section>

          {/* AI INSIGHTS */}
          {showAI && (
            <section className="eventura-panel">
              <div className="eventura-panel-title">
                AI Insights
                <button className="eventura-tag" onClick={() => setShowAI(false)}>Hide</button>
              </div>
              <ul className="eventura-bullets">
                {ai.map((x, i) => (
                  <li key={i}>{x}</li>
                ))}
              </ul>
            </section>
          )}

          {/* HR */}
          {showHR && (
            <section className="eventura-panel">
              <div className="eventura-panel-title">
                HR Analytics
                <button className="eventura-tag" onClick={() => setShowHR(false)}>Hide</button>
              </div>
              <p>Average workload: <strong>{avgWorkload}%</strong></p>
              <p>Core staff: <strong>{team.filter(t => t.status === "Core").length}</strong></p>
            </section>
          )}

          {/* INVENTORY */}
          {showInv && (
            <section className="eventura-panel">
              <div className="eventura-panel-title">
                Inventory Analytics
                <button className="eventura-tag" onClick={() => setShowInv(false)}>Hide</button>
              </div>
              <p>Low stock items: <strong>{lowStock}</strong></p>
              <p>Damaged assets: <strong>{damaged}</strong></p>
            </section>
          )}
        </div>
      </div>
    </main>
  );
}

/* ================= SHARED LAYOUT ================= */
function SidebarCore({ user, active }: { user: User; active: string }) {
  return (
    <>
      <div className="eventura-sidebar-header">
        <div className="eventura-logo-circle">E</div>
        <div>
          <div className="eventura-logo-name">Eventura OS</div>
          <div className="eventura-logo-tagline">Events that speak your style</div>
        </div>
      </div>

      <nav className="eventura-sidebar-nav">
        <SidebarLink href="/" label="Dashboard" icon="📊" active={active === "dashboard"} />
        <SidebarLink href="/events" label="Events" icon="🎉" />
        <SidebarLink href="/finance" label="Finance" icon="💰" />
        <SidebarLink href="/hr" label="HR" icon="🧑‍💼" />
        <SidebarLink href="/inventory" label="Inventory" icon="📦" />
        <SidebarLink href="/reports" label="Reports" icon="📈" active />
      </nav>
    </>
  );
}

function TopbarCore({ user }: { user: User }) {
  return (
    <header className="eventura-topbar">
      <div className="eventura-topbar-location">📍 {user.city}</div>
      <div className="eventura-user-avatar">{user.name[0]}</div>
    </header>
  );
}

function SidebarLink(props: { href: string; label: string; icon: string; active?: boolean }) {
  return (
    <Link href={props.href} className={"eventura-sidebar-link" + (props.active ? " eventura-sidebar-link-active" : "")}>
      <span>{props.icon}</span> {props.label}
    </Link>
  );
}
