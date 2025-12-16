"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";

/* ================== TYPES ================== */

type Role = "CEO" | "Staff";
type User = { name: string; role: Role; city: string };

type StaffRole =
  | "Event Manager"
  | "Decor Specialist"
  | "Logistics"
  | "Marketing"
  | "Sales"
  | "Accountant"
  | "Operations";

type StaffStatus = "Core" | "Freelancer" | "Trainee" | "Inactive";

type TeamMember = {
  id: number;
  name: string;
  role: StaffRole;
  city: string;
  status: StaffStatus;
  workload: number; // 0–100
  monthlySalary: number; // 0 if freelancer
  eventsThisMonth: number;
  rating: number; // 0–5
  skills: string[];
  createdAt?: string;
  updatedAt?: string;
};

type HiringStage =
  | "Sourced"
  | "Shortlisted"
  | "Interviewed"
  | "Trial Event"
  | "Hired"
  | "Rejected";

type Candidate = {
  id: number;
  name: string;
  role: StaffRole;
  city: string;
  expectedSalary: number;
  stage: HiringStage;
  fitScore: number; // 0–100
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
};

type TrainingItem = {
  id: number;
  title: string;
  roleTarget: StaffRole | "All";
  assignee: string;
  status: "Planned" | "In Progress" | "Completed";
  beforeScore: number;
  afterScore?: number;
  createdAt?: string;
  updatedAt?: string;
};

type AuditItem = {
  id: number;
  ts: string;
  actor: string;
  action:
    | "ADD_MEMBER"
    | "EDIT_MEMBER"
    | "DELETE_MEMBER"
    | "DEACTIVATE_MEMBER"
    | "BULK_IMPORT"
    | "EXPORT"
    | "CLEAR_ALL";
  detail: string;
};

type HRSummary = {
  coreCount: number;
  freelancersCount: number;
  traineesCount: number;
  inactiveCount: number;
  totalCost: number;
  avgWorkload: number;
  weddingsCapacity: number;
  corporatesCapacity: number;
  overloaded: TeamMember[];
  underutilized: TeamMember[];
};

/* ================== STORAGE KEYS (v4 = starts clean) ================== */
const DB_HR_TEAM = "eventura-hr-team-v4";
const DB_HR_CANDIDATES = "eventura-hr-candidates-v4";
const DB_HR_TRAINING = "eventura-hr-training-v4";
const DB_HR_AUDIT = "eventura-hr-audit-v4";

/* ================== HELPERS ================== */
function nowISO() {
  return new Date().toISOString();
}
function safeParse<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}
function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}
function gaugeColor(value: number): string {
  if (value < 60) return "eventura-tag-green";
  if (value <= 85) return "eventura-tag-blue";
  return "eventura-tag-amber";
}
function workloadLabel(value: number): string {
  if (value < 60) return "Under-utilized";
  if (value <= 85) return "Balanced";
  return "Overloaded";
}
function currencyINR(n: number) {
  return "₹" + (n || 0).toLocaleString("en-IN");
}

/* ================== PAGE ================== */
export default function HRPage() {
  // ✅ Direct access (no password/login right now)
  const [user] = useState<User>({
    name: "Hardik Vekariya",
    role: "CEO",
    city: "Surat",
  });

  const [team, setTeam] = useState<TeamMember[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [training, setTraining] = useState<TrainingItem[]>([]);
  const [audit, setAudit] = useState<AuditItem[]>([]);

  const [view, setView] = useState<
    "overview" | "directory" | "hiring" | "training" | "audit"
  >("overview");

  // Filters
  const [q, setQ] = useState("");
  const [filterRole, setFilterRole] = useState<StaffRole | "All">("All");
  const [filterStatus, setFilterStatus] = useState<StaffStatus | "All">("All");
  const [filterCity, setFilterCity] = useState<string>("All");

  // Modals
  const [memberModalOpen, setMemberModalOpen] = useState(false);
  const [memberEditing, setMemberEditing] = useState<TeamMember | null>(null);

  const importRef = useRef<HTMLInputElement | null>(null);

  const isCEO = user.role === "CEO";

  // Load from localStorage (v4 keys => no old data)
  useEffect(() => {
    if (typeof window === "undefined") return;

    setTeam(
      Array.isArray(safeParse<TeamMember[]>(localStorage.getItem(DB_HR_TEAM)))
        ? (safeParse<TeamMember[]>(localStorage.getItem(DB_HR_TEAM)) as TeamMember[])
        : []
    );
    setCandidates(
      Array.isArray(safeParse<Candidate[]>(localStorage.getItem(DB_HR_CANDIDATES)))
        ? (safeParse<Candidate[]>(localStorage.getItem(DB_HR_CANDIDATES)) as Candidate[])
        : []
    );
    setTraining(
      Array.isArray(safeParse<TrainingItem[]>(localStorage.getItem(DB_HR_TRAINING)))
        ? (safeParse<TrainingItem[]>(localStorage.getItem(DB_HR_TRAINING)) as TrainingItem[])
        : []
    );
    setAudit(
      Array.isArray(safeParse<AuditItem[]>(localStorage.getItem(DB_HR_AUDIT)))
        ? (safeParse<AuditItem[]>(localStorage.getItem(DB_HR_AUDIT)) as AuditItem[])
        : []
    );
  }, []);

  // Persist
  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem(DB_HR_TEAM, JSON.stringify(team));
  }, [team]);
  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem(DB_HR_CANDIDATES, JSON.stringify(candidates));
  }, [candidates]);
  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem(DB_HR_TRAINING, JSON.stringify(training));
  }, [training]);
  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem(DB_HR_AUDIT, JSON.stringify(audit));
  }, [audit]);

  const pushAudit = (action: AuditItem["action"], detail: string) => {
    const item: AuditItem = {
      id: Date.now(),
      ts: nowISO(),
      actor: user.name,
      action,
      detail,
    };
    setAudit((prev) => [item, ...prev].slice(0, 200));
  };

  const summary: HRSummary = useMemo(() => {
    const core = team.filter((m) => m.status === "Core");
    const freelancers = team.filter((m) => m.status === "Freelancer");
    const trainees = team.filter((m) => m.status === "Trainee");
    const inactive = team.filter((m) => m.status === "Inactive");

    const totalCoreCost = core.reduce((s, m) => s + (m.monthlySalary || 0), 0);
    const totalTraineeCost = trainees.reduce((s, m) => s + (m.monthlySalary || 0), 0);
    const totalCost = totalCoreCost + totalTraineeCost;

    const avgWorkload =
      core.reduce((s, m) => s + (m.workload || 0), 0) / (core.length || 1);

    const eventManagers = core.filter((m) => m.role === "Event Manager").length;
    const decor = core.filter((m) => m.role === "Decor Specialist").length;
    const logistics = core.filter((m) => m.role === "Logistics").length;

    const weddingsCapacity = Math.min(eventManagers * 3, decor * 3, logistics * 3);
    const corporatesCapacity = Math.min(eventManagers * 2, decor * 2, logistics * 3);

    const overloaded = core.filter((m) => m.workload >= 90).sort((a, b) => b.workload - a.workload);
    const underutilized = core.filter((m) => m.workload < 60).sort((a, b) => a.workload - b.workload);

    return {
      coreCount: core.length,
      freelancersCount: freelancers.length,
      traineesCount: trainees.length,
      inactiveCount: inactive.length,
      totalCost,
      avgWorkload: Math.round(avgWorkload || 0),
      weddingsCapacity,
      corporatesCapacity,
      overloaded,
      underutilized,
    };
  }, [team]);

  const cities = useMemo(() => {
    const set = new Set(team.map((m) => m.city).filter(Boolean));
    return ["All", ...Array.from(set).sort()];
  }, [team]);

  const filteredTeam = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return team
      .filter((m) => {
        const matchesQ =
          !needle ||
          m.name.toLowerCase().includes(needle) ||
          m.role.toLowerCase().includes(needle) ||
          m.city.toLowerCase().includes(needle) ||
          (m.skills || []).join(", ").toLowerCase().includes(needle);
        const matchesRole = filterRole === "All" || m.role === filterRole;
        const matchesStatus = filterStatus === "All" || m.status === filterStatus;
        const matchesCity = filterCity === "All" || m.city === filterCity;
        return matchesQ && matchesRole && matchesStatus && matchesCity;
      })
      .sort((a, b) => (b.workload || 0) - (a.workload || 0));
  }, [team, q, filterRole, filterStatus, filterCity]);

  /* ================== ACTIONS ================== */
  const openAddMember = () => {
    setMemberEditing(null);
    setMemberModalOpen(true);
  };
  const openEditMember = (m: TeamMember) => {
    setMemberEditing(m);
    setMemberModalOpen(true);
  };

  const upsertMember = (payload: TeamMember) => {
    if (!isCEO) return;
    const ts = nowISO();

    setTeam((prev) => {
      const exists = prev.some((x) => x.id === payload.id);
      if (exists) return prev.map((x) => (x.id === payload.id ? { ...payload, updatedAt: ts } : x));
      return [{ ...payload, createdAt: ts, updatedAt: ts }, ...prev].sort((a, b) => b.id - a.id);
    });

    pushAudit(
      memberEditing ? "EDIT_MEMBER" : "ADD_MEMBER",
      `${memberEditing ? "Edited" : "Added"}: ${payload.name} (${payload.role}, ${payload.status})`
    );

    setMemberModalOpen(false);
    setMemberEditing(null);
  };

  const deactivateMember = (id: number) => {
    if (!isCEO) return;
    const m = team.find((x) => x.id === id);
    if (!m) return;
    setTeam((prev) => prev.map((x) => (x.id === id ? { ...x, status: "Inactive", updatedAt: nowISO() } : x)));
    pushAudit("DEACTIVATE_MEMBER", `Deactivated: ${m.name}`);
  };

  const deleteMember = (id: number) => {
    if (!isCEO) return;
    const m = team.find((x) => x.id === id);
    if (!m) return;
    const ok = window.confirm(`Delete ${m.name}? This cannot be undone.`);
    if (!ok) return;
    setTeam((prev) => prev.filter((x) => x.id !== id));
    pushAudit("DELETE_MEMBER", `Deleted: ${m.name}`);
  };

  const exportJSON = () => {
    const blob = { exportedAt: nowISO(), team, candidates, training };
    const text = JSON.stringify(blob, null, 2);
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([text], { type: "application/json" }));
    a.download = `eventura-hr-export-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    pushAudit("EXPORT", "Exported HR JSON");
  };

  const triggerImport = () => {
    if (!isCEO) return;
    importRef.current?.click();
  };

  const onImportFile = async (file: File | null) => {
    if (!file || !isCEO) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text) as {
        team?: TeamMember[];
        candidates?: Candidate[];
        training?: TrainingItem[];
      };

      if (parsed.team && Array.isArray(parsed.team)) setTeam(parsed.team);
      if (parsed.candidates && Array.isArray(parsed.candidates)) setCandidates(parsed.candidates);
      if (parsed.training && Array.isArray(parsed.training)) setTraining(parsed.training);

      pushAudit("BULK_IMPORT", `Imported: ${file.name}`);
      alert("Import successful ✅");
    } catch {
      alert("Import failed. Upload a valid Eventura HR export JSON.");
    } finally {
      if (importRef.current) importRef.current.value = "";
    }
  };

  const clearAll = () => {
    if (!isCEO) return;
    const ok = window.confirm("Clear ALL HR data? (team/candidates/training/audit)");
    if (!ok) return;
    setTeam([]);
    setCandidates([]);
    setTraining([]);
    setAudit([]);
    pushAudit("CLEAR_ALL", "Cleared all HR data");
  };

  /* ================== SMART SUGGESTIONS ================== */
  const smartSuggestions = useMemo(() => {
    const core = team.filter((m) => m.status === "Core");
    const hasEM = core.some((m) => m.role === "Event Manager");
    const hasDecor = core.some((m) => m.role === "Decor Specialist");
    const hasLogistics = core.some((m) => m.role === "Logistics");

    const suggestions: { tag: string; text: string }[] = [];

    if (!hasEM) suggestions.push({ tag: "Critical", text: "Add at least 1 core Event Manager to run events smoothly." });
    if (!hasDecor) suggestions.push({ tag: "Critical", text: "Add 1 core Decor Specialist to maintain premium design quality." });
    if (!hasLogistics) suggestions.push({ tag: "Critical", text: "Add 1 logistics core member for execution + vendor coordination." });

    if (summary.overloaded.length) {
      suggestions.push({
        tag: "Burnout",
        text: `Workload > 90%: ${summary.overloaded.map((m) => m.name).join(", ")}. Add freelancer support or redistribute.`,
      });
    }
    if (summary.underutilized.length) {
      suggestions.push({
        tag: "Optimize",
        text: `Under-utilized staff: ${summary.underutilized.map((m) => m.name).join(", ")}. Assign more events or training.`,
      });
    }

    if (!team.length) suggestions.push({ tag: "Start", text: "No HR data yet. Click “Add Member” to build your core team." });

    return suggestions.slice(0, 6);
  }, [team, summary]);

  /* ================== RENDER ================== */
  return (
    <main className="eventura-os">
      <aside className="eventura-sidebar">
        <SidebarCore user={user} active="hr" />
      </aside>

      <div className="eventura-main">
        <TopbarCore user={user} />

        <div className="eventura-content">
          <div className="eventura-header-row">
            <div>
              <h1 className="eventura-page-title">HR & Crew Control</h1>
              <p className="eventura-subtitle">Capacity, directory, training, audit log — clean, editable, enterprise style.</p>
            </div>

            <div className="eventura-chips-row">
              <button className={"eventura-tag " + (view === "overview" ? "eventura-tag-blue" : "eventura-tag-amber")} onClick={() => setView("overview")}>
                Overview
              </button>
              <button className={"eventura-tag " + (view === "directory" ? "eventura-tag-blue" : "eventura-tag-amber")} onClick={() => setView("directory")}>
                Directory
              </button>
              <button className={"eventura-tag " + (view === "hiring" ? "eventura-tag-blue" : "eventura-tag-amber")} onClick={() => setView("hiring")}>
                Hiring
              </button>
              <button className={"eventura-tag " + (view === "training" ? "eventura-tag-blue" : "eventura-tag-amber")} onClick={() => setView("training")}>
                Training
              </button>
              <button className={"eventura-tag " + (view === "audit" ? "eventura-tag-blue" : "eventura-tag-amber")} onClick={() => setView("audit")}>
                Audit
              </button>
            </div>
          </div>

          <section className="eventura-panel">
            <div className="eventura-actions" style={{ alignItems: "center" }}>
              <button className="eventura-button" onClick={openAddMember}>➕ Add Member</button>
              <button className="eventura-button-secondary" onClick={exportJSON}>⬇ Export JSON</button>
              <button className="eventura-button-secondary" onClick={triggerImport}>⬆ Import JSON</button>
              <button className="eventura-button-secondary" onClick={clearAll}>🧹 Clear All</button>

              <input
                ref={importRef}
                type="file"
                accept="application/json"
                style={{ display: "none" }}
                onChange={(e) => onImportFile(e.target.files?.[0] ?? null)}
              />

              <span className="eventura-small-text" style={{ marginLeft: "auto" }}>
                Access: <span className="eventura-tag eventura-tag-green">Direct (Login Disabled)</span>
              </span>
            </div>
          </section>

          <section className="eventura-columns">
            <div className="eventura-panel">
              <h2 className="eventura-panel-title">Auto insights</h2>
              <div className="eventura-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
                <div className="eventura-card eventura-card-glow">
                  <p className="eventura-card-label">Salary run-rate</p>
                  <p className="eventura-card-value">{currencyINR(summary.totalCost)}</p>
                  <p className="eventura-card-note">Core salary + trainee stipends.</p>
                </div>
                <div className="eventura-card eventura-card-glow">
                  <p className="eventura-card-label">Avg workload</p>
                  <p className="eventura-card-value">{summary.avgWorkload}%</p>
                  <p className="eventura-card-note">{workloadLabel(summary.avgWorkload)}</p>
                </div>
                <div className="eventura-card eventura-card-glow">
                  <p className="eventura-card-label">Capacity (30 days)</p>
                  <p className="eventura-card-value">{summary.weddingsCapacity} weddings · {summary.corporatesCapacity} corporates</p>
                  <p className="eventura-card-note">Based on Event Manager + Decor + Logistics core.</p>
                </div>
                <div className="eventura-card eventura-card-glow">
                  <p className="eventura-card-label">Headcount</p>
                  <p className="eventura-card-value">{summary.coreCount} core</p>
                  <p className="eventura-card-note">Freelancers: {summary.freelancersCount} · Trainees: {summary.traineesCount} · Inactive: {summary.inactiveCount}</p>
                </div>
              </div>
            </div>

            <div className="eventura-panel">
              <h2 className="eventura-panel-title">Smart suggestions</h2>
              {smartSuggestions.length ? (
                <ul className="eventura-bullets">
                  {smartSuggestions.map((s, idx) => (
                    <li key={idx}>
                      <span className={"eventura-tag " + (s.tag === "Critical" || s.tag === "Burnout" ? "eventura-tag-amber" : "eventura-tag-blue")}>
                        {s.tag}
                      </span>{" "}
                      {s.text}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="eventura-small-text">No suggestions right now.</p>
              )}

              <div className="eventura-actions" style={{ marginTop: "0.8rem" }}>
                <Link href="/finance" className="eventura-button-secondary">Open Finance</Link>
              </div>
            </div>
          </section>

          {view === "overview" && <OverviewView team={team} summary={summary} />}
          {view === "directory" && (
            <DirectoryView
              team={filteredTeam}
              allTeam={team}
              q={q}
              setQ={setQ}
              filterRole={filterRole}
              setFilterRole={setFilterRole}
              filterStatus={filterStatus}
              setFilterStatus={setFilterStatus}
              filterCity={filterCity}
              setFilterCity={setFilterCity}
              cities={cities}
              onEdit={openEditMember}
              onDeactivate={deactivateMember}
              onDelete={deleteMember}
            />
          )}
          {view === "hiring" && <HiringView candidates={candidates} />}
          {view === "training" && <TrainingView team={team} training={training} />}
          {view === "audit" && <AuditView audit={audit} />}

          {memberModalOpen && (
            <MemberModal
              onClose={() => {
                setMemberModalOpen(false);
                setMemberEditing(null);
              }}
              initial={memberEditing}
              onSave={upsertMember}
            />
          )}
        </div>
      </div>
    </main>
  );
}

/* ================== SUB VIEWS ================== */

function OverviewView({ team, summary }: { team: TeamMember[]; summary: HRSummary }) {
  const topPerformers = useMemo(() => {
    return [...team]
      .filter((m) => m.status === "Core")
      .sort((a, b) => (b.rating || 0) - (a.rating || 0))
      .slice(0, 5);
  }, [team]);

  return (
    <section className="eventura-columns">
      <div className="eventura-panel">
        <h2 className="eventura-panel-title">Operations view</h2>
        <ul className="eventura-bullets">
          <li><span className="eventura-tag eventura-tag-blue">Workload</span> Keep core workload between 60–85%.</li>
          <li><span className="eventura-tag eventura-tag-blue">Capacity</span> Calculated from Event Manager + Decor + Logistics.</li>
          <li><span className="eventura-tag eventura-tag-blue">Cost</span> Review salary run-rate weekly vs revenue.</li>
        </ul>
      </div>

      <div className="eventura-panel">
        <h2 className="eventura-panel-title">Top performers</h2>
        {topPerformers.length ? (
          <div className="eventura-table-wrapper">
            <table className="eventura-table">
              <thead>
                <tr>
                  <th>Member</th>
                  <th>Role</th>
                  <th>Rating</th>
                  <th>Workload</th>
                </tr>
              </thead>
              <tbody>
                {topPerformers.map((m) => (
                  <tr key={m.id}>
                    <td>
                      <div className="eventura-list-title">{m.name}</div>
                      <div className="eventura-list-sub">{m.city}</div>
                    </td>
                    <td>{m.role}</td>
                    <td>{(m.rating || 0).toFixed(1)}/5</td>
                    <td>
                      <span className={"eventura-tag " + gaugeColor(m.workload || 0)}>
                        {m.workload}% · {workloadLabel(m.workload || 0)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="eventura-small-text">No core team yet. Add members to see ranking.</p>
        )}

        <div className="eventura-actions" style={{ marginTop: "0.8rem" }}>
          <Link href="/events" className="eventura-button-secondary">Open Events</Link>
        </div>
      </div>
    </section>
  );
}

function DirectoryView(props: {
  team: TeamMember[];
  allTeam: TeamMember[];
  q: string;
  setQ: (v: string) => void;
  filterRole: StaffRole | "All";
  setFilterRole: (v: StaffRole | "All") => void;
  filterStatus: StaffStatus | "All";
  setFilterStatus: (v: StaffStatus | "All") => void;
  filterCity: string;
  setFilterCity: (v: string) => void;
  cities: string[];
  onEdit: (m: TeamMember) => void;
  onDeactivate: (id: number) => void;
  onDelete: (id: number) => void;
}) {
  const roles: (StaffRole | "All")[] = ["All", "Event Manager", "Decor Specialist", "Logistics", "Marketing", "Sales", "Accountant", "Operations"];
  const statuses: (StaffStatus | "All")[] = ["All", "Core", "Freelancer", "Trainee", "Inactive"];

  return (
    <section className="eventura-panel">
      <div className="eventura-header-row" style={{ alignItems: "flex-end" }}>
        <div>
          <h2 className="eventura-panel-title">Team Directory</h2>
          <p className="eventura-small-text">Showing {props.team.length} of {props.allTeam.length}. Search + filters.</p>
        </div>

        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
          <input className="eventura-search" value={props.q} onChange={(e) => props.setQ(e.target.value)} placeholder="Search name, role, city, skills..." style={{ minWidth: 260 }} />
          <select className="eventura-search" value={props.filterRole} onChange={(e) => props.setFilterRole(e.target.value as any)}>
            {roles.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
          <select className="eventura-search" value={props.filterStatus} onChange={(e) => props.setFilterStatus(e.target.value as any)}>
            {statuses.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <select className="eventura-search" value={props.filterCity} onChange={(e) => props.setFilterCity(e.target.value)}>
            {props.cities.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>

      <div className="eventura-table-wrapper" style={{ marginTop: "0.6rem" }}>
        <table className="eventura-table">
          <thead>
            <tr>
              <th>Member</th>
              <th>Role</th>
              <th>Status</th>
              <th>Workload</th>
              <th>Events</th>
              <th>Salary</th>
              <th>Rating</th>
              <th>Skills</th>
              <th style={{ width: 240 }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {props.team.map((m) => (
              <tr key={m.id}>
                <td>
                  <div className="eventura-list-title">{m.name}</div>
                  <div className="eventura-list-sub">{m.city}</div>
                  <div className="eventura-small-text">ID: {m.id}</div>
                </td>
                <td>{m.role}</td>
                <td>
                  <span className={"eventura-tag " + (m.status === "Core" ? "eventura-tag-green" : m.status === "Inactive" ? "eventura-tag-amber" : "eventura-tag-blue")}>
                    {m.status}
                  </span>
                </td>
                <td>
                  <span className={"eventura-tag " + gaugeColor(m.workload || 0)}>
                    {m.workload}% · {workloadLabel(m.workload || 0)}
                  </span>
                </td>
                <td>{m.eventsThisMonth}</td>
                <td>{m.monthlySalary ? currencyINR(m.monthlySalary) : "—"}</td>
                <td>{(m.rating || 0).toFixed(1)}/5</td>
                <td><div className="eventura-small-text">{(m.skills || []).join(", ")}</div></td>
                <td>
                  <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
                    <button className="eventura-button-secondary" onClick={() => props.onEdit(m)}>✏ Edit</button>
                    <button className="eventura-button-secondary" disabled={m.status === "Inactive"} onClick={() => props.onDeactivate(m.id)}>📴 Deactivate</button>
                    <button className="eventura-button-secondary" onClick={() => props.onDelete(m.id)}>🗑 Delete</button>
                  </div>
                </td>
              </tr>
            ))}
            {props.team.length === 0 && (
              <tr>
                <td colSpan={9} style={{ color: "#9ca3af" }}>
                  No team members yet. Click “Add Member”.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function HiringView({ candidates }: { candidates: Candidate[] }) {
  const stages: HiringStage[] = ["Sourced", "Shortlisted", "Interviewed", "Trial Event", "Hired", "Rejected"];
  const counts = useMemo(() => {
    const m = new Map<HiringStage, number>();
    stages.forEach((s) => m.set(s, 0));
    candidates.forEach((c) => m.set(c.stage, (m.get(c.stage) || 0) + 1));
    return m;
  }, [candidates]);

  return (
    <section className="eventura-panel">
      <h2 className="eventura-panel-title">Hiring (Kanban summary)</h2>
      <div className="eventura-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
        {stages.map((s) => (
          <div key={s} className="eventura-card">
            <p className="eventura-card-label">{s}</p>
            <p className="eventura-card-value">{counts.get(s) || 0}</p>
            <p className="eventura-card-note">Candidates</p>
          </div>
        ))}
      </div>
      <p className="eventura-small-text" style={{ marginTop: "0.6rem" }}>
        (Next: add candidates CRUD + “convert to staff” one click.)
      </p>
    </section>
  );
}

function TrainingView({ team, training }: { team: TeamMember[]; training: TrainingItem[] }) {
  return (
    <section className="eventura-columns">
      <div className="eventura-panel">
        <h2 className="eventura-panel-title">Skill matrix</h2>
        <div className="eventura-table-wrapper">
          <table className="eventura-table">
            <thead>
              <tr>
                <th>Member</th>
                <th>Role</th>
                <th>Status</th>
                <th>Skills</th>
                <th>Rating</th>
              </tr>
            </thead>
            <tbody>
              {team.map((m) => (
                <tr key={m.id}>
                  <td>
                    <div className="eventura-list-title">{m.name}</div>
                    <div className="eventura-list-sub">{m.city}</div>
                  </td>
                  <td>{m.role}</td>
                  <td>{m.status}</td>
                  <td><div className="eventura-small-text">{(m.skills || []).join(", ")}</div></td>
                  <td>{(m.rating || 0).toFixed(1)}/5</td>
                </tr>
              ))}
              {team.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ color: "#9ca3af" }}>
                    Add members to see the skill matrix.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="eventura-panel">
        <h2 className="eventura-panel-title">Training programs</h2>
        <div className="eventura-table-wrapper">
          <table className="eventura-table">
            <thead>
              <tr>
                <th>Program</th>
                <th>Role Target</th>
                <th>Assignee</th>
                <th>Status</th>
                <th>Impact</th>
              </tr>
            </thead>
            <tbody>
              {training.map((t) => (
                <tr key={t.id}>
                  <td>{t.title}</td>
                  <td>{t.roleTarget}</td>
                  <td>{t.assignee}</td>
                  <td><span className="eventura-tag eventura-tag-blue">{t.status}</span></td>
                  <td>
                    {t.afterScore != null ? (
                      <span className="eventura-small-text">{t.beforeScore}/10 → {t.afterScore}/10</span>
                    ) : (
                      <span className="eventura-small-text">Before: {t.beforeScore}/10</span>
                    )}
                  </td>
                </tr>
              ))}
              {training.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ color: "#9ca3af" }}>
                    No training items yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

function AuditView({ audit }: { audit: AuditItem[] }) {
  return (
    <section className="eventura-panel">
      <h2 className="eventura-panel-title">Audit log</h2>
      <p className="eventura-small-text">Latest actions first.</p>

      <div className="eventura-table-wrapper" style={{ marginTop: "0.6rem" }}>
        <table className="eventura-table">
          <thead>
            <tr>
              <th>Time</th>
              <th>Actor</th>
              <th>Action</th>
              <th>Detail</th>
            </tr>
          </thead>
          <tbody>
            {audit.map((a) => (
              <tr key={a.id}>
                <td>{new Date(a.ts).toLocaleString()}</td>
                <td>{a.actor}</td>
                <td><span className="eventura-tag eventura-tag-blue">{a.action}</span></td>
                <td>{a.detail}</td>
              </tr>
            ))}
            {audit.length === 0 && (
              <tr>
                <td colSpan={4} style={{ color: "#9ca3af" }}>
                  No audit entries yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

/* ================== MODAL ================== */
function MemberModal(props: {
  onClose: () => void;
  onSave: (m: TeamMember) => void;
  initial: TeamMember | null;
}) {
  const roles: StaffRole[] = ["Event Manager", "Decor Specialist", "Logistics", "Marketing", "Sales", "Accountant", "Operations"];
  const statuses: StaffStatus[] = ["Core", "Freelancer", "Trainee", "Inactive"];

  const [name, setName] = useState(props.initial?.name ?? "");
  const [role, setRole] = useState<StaffRole>(props.initial?.role ?? "Event Manager");
  const [city, setCity] = useState(props.initial?.city ?? "Surat");
  const [status, setStatus] = useState<StaffStatus>(props.initial?.status ?? "Core");
  const [workload, setWorkload] = useState<number>(props.initial?.workload ?? 60);
  const [monthlySalary, setMonthlySalary] = useState<number>(props.initial?.monthlySalary ?? 0);
  const [eventsThisMonth, setEventsThisMonth] = useState<number>(props.initial?.eventsThisMonth ?? 0);
  const [rating, setRating] = useState<number>(props.initial?.rating ?? 4.0);
  const [skills, setSkills] = useState<string>((props.initial?.skills ?? []).join(", "));

  const save = () => {
    const cleanName = name.trim();
    if (!cleanName) return alert("Name is required.");

    const id = props.initial?.id ?? Date.now();

    props.onSave({
      id,
      name: cleanName,
      role,
      city: city.trim() || "Surat",
      status,
      workload: clamp(Number(workload) || 0, 0, 100),
      monthlySalary: Math.max(0, Number(monthlySalary) || 0),
      eventsThisMonth: Math.max(0, Number(eventsThisMonth) || 0),
      rating: clamp(Number(rating) || 0, 0, 5),
      skills: skills.split(",").map((s) => s.trim()).filter(Boolean).slice(0, 12),
      createdAt: props.initial?.createdAt ?? nowISO(),
      updatedAt: nowISO(),
    });
  };

  return (
    <div className="eventura-modal-overlay" role="dialog" aria-modal="true">
      <div className="eventura-modal">
        <div className="eventura-header-row">
          <div>
            <h2 className="eventura-panel-title" style={{ margin: 0 }}>
              {props.initial ? "Edit member" : "Add member"}
            </h2>
            <p className="eventura-small-text" style={{ marginTop: 6 }}>
              Saved locally in browser.
            </p>
          </div>
          <button className="eventura-button-secondary" onClick={props.onClose}>✕ Close</button>
        </div>

        <div className="eventura-grid" style={{ marginTop: "0.6rem" }}>
          <div className="eventura-card">
            <p className="eventura-card-label">Name</p>
            <input className="eventura-search" value={name} onChange={(e) => setName(e.target.value)} />
          </div>

          <div className="eventura-card">
            <p className="eventura-card-label">Role</p>
            <select className="eventura-search" value={role} onChange={(e) => setRole(e.target.value as StaffRole)}>
              {roles.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>

          <div className="eventura-card">
            <p className="eventura-card-label">Status</p>
            <select className="eventura-search" value={status} onChange={(e) => setStatus(e.target.value as StaffStatus)}>
              {statuses.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          <div className="eventura-card">
            <p className="eventura-card-label">City</p>
            <input className="eventura-search" value={city} onChange={(e) => setCity(e.target.value)} />
          </div>

          <div className="eventura-card">
            <p className="eventura-card-label">Workload %</p>
            <input className="eventura-search" type="number" value={workload} onChange={(e) => setWorkload(Number(e.target.value))} />
          </div>

          <div className="eventura-card">
            <p className="eventura-card-label">Events this month</p>
            <input className="eventura-search" type="number" value={eventsThisMonth} onChange={(e) => setEventsThisMonth(Number(e.target.value))} />
          </div>

          <div className="eventura-card">
            <p className="eventura-card-label">Monthly salary (₹)</p>
            <input className="eventura-search" type="number" value={monthlySalary} onChange={(e) => setMonthlySalary(Number(e.target.value))} />
          </div>

          <div className="eventura-card">
            <p className="eventura-card-label">Rating (0–5)</p>
            <input className="eventura-search" type="number" value={rating} onChange={(e) => setRating(Number(e.target.value))} />
          </div>

          <div className="eventura-card" style={{ gridColumn: "1 / -1" }}>
            <p className="eventura-card-label">Skills (comma separated)</p>
            <input className="eventura-search" value={skills} onChange={(e) => setSkills(e.target.value)} />
          </div>
        </div>

        <div className="eventura-actions" style={{ marginTop: "0.8rem" }}>
          <button className="eventura-button" onClick={save}>💾 Save</button>
          <button className="eventura-button-secondary" onClick={props.onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

/* ================== SIDEBAR + TOPBAR ================== */
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
        <SidebarLink href="/inventory" label="Inventory & Assets" icon="📦" active={active === "inventory"} />
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
        <input className="eventura-search" placeholder="Search team, roles, skills..." />
      </div>
      <div className="eventura-topbar-right">
        <button className="eventura-topbar-icon" title="Notifications">🔔</button>
        <div className="eventura-user-avatar" title={user.name}>{user.name.charAt(0).toUpperCase()}</div>
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
