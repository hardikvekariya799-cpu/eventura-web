"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";

/* ================= DEFAULT USER (NO LOGIN) ================= */

type Role = "CEO" | "Staff";
type User = { name: string; role: Role; city: string };

const DEFAULT_USER: User = {
  name: "Hardik Vekariya",
  role: "CEO",
  city: "Surat",
};

/* ================= Local DB keys ================= */

const DB_EVENTS = "eventura-events";
const DB_LEADS = "eventura-leads";
const DB_FIN = "eventura-finance-transactions";
const DB_HR = "eventura-hr-team-v2";

type EventItem = {
  id: number;
  date: string;
  title: string;
  status?: string;
  city?: string;
};

type LeadItem = {
  id: number;
  name: string;
  status?: string;
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
  role: string;
  status: string;
  workload: number;
};

/* ================= Helpers ================= */

function safeParse<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function fmtINR(n: number) {
  return "₹" + (n || 0).toLocaleString("en-IN");
}

/* ================= PAGE ================= */

export default function DashboardPage() {
  const [user] = useState<User>(DEFAULT_USER);

  const [events, setEvents] = useState<EventItem[]>([]);
  const [leads, setLeads] = useState<LeadItem[]>([]);
  const [finance, setFinance] = useState<FinanceTx[]>([]);
  const [team, setTeam] = useState<TeamMember[]>([]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    setEvents(safeParse<EventItem[]>(localStorage.getItem(DB_EVENTS)) || []);
    setLeads(safeParse<LeadItem[]>(localStorage.getItem(DB_LEADS)) || []);
    setFinance(safeParse<FinanceTx[]>(localStorage.getItem(DB_FIN)) || []);
    setTeam(safeParse<TeamMember[]>(localStorage.getItem(DB_HR)) || []);
  }, []);

  const summary = useMemo(() => {
    const income = finance
      .filter((t) => t.type === "Income")
      .reduce((s, t) => s + (t.amount || 0), 0);

    const expense = finance
      .filter((t) => t.type === "Expense")
      .reduce((s, t) => s + (t.amount || 0), 0);

    const overloaded = team.filter(
      (m) => m.status === "Core" && m.workload >= 90
    );

    return {
      income,
      expense,
      net: income - expense,
      overloaded,
    };
  }, [finance, team]);

  return (
    <main className="min-h-screen bg-[#050816] text-white">
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex justify-between items-start flex-wrap gap-4">
          <div>
            <p className="text-white/60 text-sm">📍 {user.city}, Gujarat</p>
            <h1 className="text-3xl font-semibold mt-1">
              Eventura OS – Dashboard
            </h1>
            <p className="text-white/60 mt-1">
              Direct access mode · No login · Internal use
            </p>
          </div>

          <div className="rounded-2xl bg-white/5 border border-white/10 px-4 py-2">
            CEO · {user.name}
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
          <KPI label="Events" value={events.length} />
          <KPI label="Active Leads" value={leads.length} />
          <KPI label="Team Members" value={team.length} />
          <KPI
            label="Burnout Alerts"
            value={summary.overloaded.length}
            danger
          />
        </div>

        {/* Finance */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
          <KPI label="Income" value={fmtINR(summary.income)} />
          <KPI label="Expense" value={fmtINR(summary.expense)} />
          <KPI label="Net" value={fmtINR(summary.net)} />
        </div>

        {/* Quick Actions */}
        <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-3">
          <QuickLink href="/events" label="🎉 Events" />
          <QuickLink href="/calendar" label="📅 Calendar" />
          <QuickLink href="/leads" label="👥 Clients & Leads" />
          <QuickLink href="/vendors" label="🤝 Vendors" />
          <QuickLink href="/hr" label="🧑‍💼 HR & Team" />
          <QuickLink href="/inventory" label="📦 Inventory" />
          <QuickLink href="/finance" label="💰 Finance" />
          <QuickLink href="/reports" label="📈 Reports" />
        </div>

        {/* Alerts */}
        <div className="mt-6 rounded-3xl bg-white/5 border border-white/10 p-4">
          <h2 className="text-lg font-semibold">Smart Alerts</h2>

          {summary.overloaded.length === 0 ? (
            <p className="text-white/60 mt-2">
              ✅ No burnout risk detected.
            </p>
          ) : (
            <ul className="mt-3 space-y-2">
              {summary.overloaded.map((m) => (
                <li
                  key={m.id}
                  className="text-yellow-200 text-sm bg-yellow-400/10 border border-yellow-400/20 rounded-xl px-3 py-2"
                >
                  ⚠ {m.name} ({m.role}) at {m.workload}% workload
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </main>
  );
}

/* ================= Components ================= */

function KPI(props: {
  label: string;
  value: string | number;
  danger?: boolean;
}) {
  return (
    <div className="rounded-3xl bg-white/5 border border-white/10 p-4">
      <p className="text-white/60 text-sm">{props.label}</p>
      <p
        className={`text-3xl font-semibold mt-1 ${
          props.danger ? "text-yellow-300" : ""
        }`}
      >
        {props.value}
      </p>
    </div>
  );
}

function QuickLink(props: { href: string; label: string }) {
  return (
    <Link
      href={props.href}
      className="rounded-2xl bg-white/5 border border-white/10 px-4 py-3 text-center hover:bg-white/10"
    >
      {props.label}
    </Link>
  );
}
