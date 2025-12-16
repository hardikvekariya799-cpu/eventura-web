"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";

/* ========= Shared types ========= */

type Role = "CEO" | "Staff";
type User = { name: string; role: Role; city: string };

const USER_KEY = "eventura-user";

/* HR DB keys */
const DB_HR_TEAM = "eventura-hr-team-v2";
const DB_HR_CANDIDATES = "eventura-hr-candidates-v2";
const DB_HR_TRAINING = "eventura-hr-training-v2";
const DB_HR_AUDIT = "eventura-hr-audit-v2";

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
  workload: number; // % utilization
  monthlySalary: number; // 0 for freelancers, trainees can have stipend
  eventsThisMonth: number;
  rating: number; // 1–5
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
    | "BULK_IMPORT"
    | "EXPORT"
    | "RESET";
  detail: string;
};

type HRSummary = {
  coreCount: number;
  freelancersCount: number;
  traineesCount: number;
  inactiveCount: number;
  totalCost: number;
  avgWorkload: number;
  roleCounts: Record<StaffRole, number>;
  weddingsCapacity: number;
  corporatesCapacity: number;
};

/* ========= Demo data (ONLY loaded if CEO clicks "Load Demo Data") ========= */

const seedTeam: TeamMember[] = [
  {
    id: 1,
    name: "Hardik Vekariya",
    role: "Operations",
    city: "Surat",
    status: "Core",
    workload: 82,
    monthlySalary: 0,
    eventsThisMonth: 6,
    rating: 5,
    skills: ["Strategy", "Finance", "Vendor Negotiation"],
  },
  {
    id: 2,
    name: "Shubh Parekh",
    role: "Event Manager",
    city: "Surat",
    status: "Core",
    workload: 88,
    monthlySalary: 55000,
    eventsThisMonth: 5,
    rating: 4.7,
    skills: ["Client Handling", "Planning", "Budgeting"],
  },
  {
    id: 3,
    name: "Dixit Bhuva",
    role: "Marketing",
    city: "Surat",
    status: "Core",
    workload: 76,
    monthlySalary: 45000,
    eventsThisMonth: 3,
    rating: 4.5,
    skills: ["Digital Marketing", "Social Media", "Leads"],
  },
];

const seedCandidates: Candidate[] = [
  {
    id: 101,
    name: "Neha Joshi",
    role: "Event Manager",
    city: "Surat",
    expectedSalary: 42000,
    stage: "Interviewed",
    fitScore: 88,
    notes: "Strong client handling + calendar planning",
  },
];

const seedTraining: TrainingItem[] = [
  {
    id: 201,
    title: "Premium client handling",
    roleTarget: "Event Manager",
    assignee: "Trainee Planner",
    status: "Completed",
    beforeScore: 5,
    afterScore: 8,
  },
];

/* ========= Helpers ========= */

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

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

/* ========= Page ========= */

export default function HRPage() {
  const [user, setUser] = useState<User | null>(null);

  const [team, setTeam] = useState<TeamMember[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [training, setTraining] = useState<TrainingItem[]>([]);
  const [audit, setAudit] = useState<AuditItem[]>([]);

  const [view, setView] = useState<
    "overview" | "directory" | "hiring" | "training" | "audit"
  >("overview");

  // Directory filters
  const [q, setQ] = useState("");
  const [filterRole, setFilterRole] = useState<StaffRole | "All">("All");
  const [filterStatus, setFilterStatus] = useState<StaffStatus | "All">("All");
  const [filterCity, setFilterCity] = useState<string>("All");

  // Modals
  const [memberModalOpen, setMemberModalOpen] = useState(false);
  const [memberEditing, setMemberEditing] = useState<TeamMember | null>(null);

  const importRef = useRef<HTMLInputElement | null>(null);

  // Auth + load DB (EMPTY by default; NO auto seed)
  useEffect(() => {
    if (typeof window === "undefined") return;

    const raw = window.localStorage.getItem(USER_KEY);
    if (!raw) {
      window.location.href = "/login";
      return;
    }
    const u = safeParse<User>(raw);
    if (!u) {
      window.localStorage.removeItem(USER_KEY);
      window.location.href = "/login";
      return;
    }
    setUser(u);

    const savedTeam = safeParse<TeamMember[]>(
      window.localStorage.getItem(DB_HR_TEAM)
    );
    const savedCandidates = safeParse<Candidate[]>(
      window.localStorage.getItem(DB_HR_CANDIDATES)
    );
    const savedTraining = safeParse<TrainingItem[]>(
      window.localStorage.getItem(DB_HR_TRAINING)
    );
    const savedAudit = safeParse<AuditItem[]>(
      window.localStorage.getItem(DB_HR_AUDIT)
    );

    // IMPORTANT: default to EMPTY arrays (no demo unless user clicks)
    setTeam(
      (savedTeam && Array.isArray(savedTeam) ? savedTeam : []).map((m) => ({
        ...m,
        createdAt: m.createdAt ?? nowISO(),
        updatedAt: m.updatedAt ?? nowISO(),
      }))
    );

    setCandidates(
      (savedCandidates && Array.isArray(savedCandidates) ? savedCandidates : []).map(
        (c) => ({
          ...c,
          createdAt: c.createdAt ?? nowISO(),
          updatedAt: c.updatedAt ?? nowISO(),
        })
      )
    );

    setTraining(
      (savedTraining && Array.isArray(savedTraining) ? savedTraining : []).map(
        (t) => ({
          ...t,
          createdAt: t.createdAt ?? nowISO(),
          updatedAt: t.updatedAt ?? nowISO(),
        })
      )
    );

    setAudit(savedAudit && Array.isArray(savedAudit) ? savedAudit : []);
  }, []);

  // Persist DB
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!user) return;
    window.localStorage.setItem(DB_HR_TEAM, JSON.stringify(team));
  }, [team, user]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!user) return;
    window.localStorage.setItem(DB_HR_CANDIDATES, JSON.stringify(candidates));
  }, [candidates, user]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!user) return;
    window.localStorage.setItem(DB_HR_TRAINING, JSON.stringify(training));
  }, [training, user]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!user) return;
    window.localStorage.setItem(DB_HR_AUDIT, JSON.stringify(audit));
  }, [audit, user]);

  const isCEO = user?.role === "CEO";

  const pushAudit = (action: AuditItem["action"], detail: string) => {
    if (!user) return;
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

    const totalCoreCost = core.reduce((sum, m) => sum + (m.monthlySalary || 0), 0);
    const totalTraineeCost = trainees.reduce(
      (sum, m) => sum + (m.monthlySalary || 0),
      0
    );
    const totalCost = totalCoreCost + totalTraineeCost;

    const avgWorkload =
      core.reduce((sum, m) => sum + (m.workload || 0), 0) / (core.length || 1);

    const roleCounts: Record<StaffRole, number> = {
      "Event Manager": 0,
      "Decor Specialist": 0,
      Logistics: 0,
      Marketing: 0,
      Sales: 0,
      Accountant: 0,
      Operations: 0,
    };
    core.forEach((m) => {
      roleCounts[m.role] = (roleCounts[m.role] || 0) + 1;
    });

    const eventManagers = core.filter((m) => m.role === "Event Manager").length;
    const decor = core.filter((m) => m.role === "Decor Specialist").length;
    const logistics = core.filter((m) => m.role === "Logistics").length;

    const weddingsCapacity = Math.min(eventManagers * 3, decor * 3, logistics * 3);
    const corporatesCapacity = Math.min(eventManagers * 2, decor * 2, logistics * 3);

    return {
      coreCount: core.length,
      freelancersCount: freelancers.length,
      traineesCount: trainees.length,
      inactiveCount: inactive.length,
      totalCost,
      avgWorkload: Math.round(avgWorkload || 0),
      roleCounts,
      weddingsCapacity,
      corporatesCapacity,
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
      .sort((a, b) => {
        const aInactive = a.status === "Inactive" ? 1 : 0;
        const bInactive = b.status === "Inactive" ? 1 : 0;
        if (aInactive !== bInactive) return aInactive - bInactive;
        return (b.workload || 0) - (a.workload || 0);
      });
  }, [team, q, filterRole, filterStatus, filterCity]);

  if (!user) return null;

  /* ===== CRUD: Team Members ===== */

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
      if (exists) {
        return prev.map((x) =>
          x.id === payload.id ? { ...payload, updatedAt: ts } : x
        );
      }
      return [{ ...payload, createdAt: ts, updatedAt: ts }, ...prev].sort(
        (a, b) => b.id - a.id
      );
    });

    pushAudit(
      memberEditing ? "EDIT_MEMBER" : "ADD_MEMBER",
      `${memberEditing ? "Edited" : "Added"}: ${payload.name} (${payload.role}, ${payload.status})`
    );

    setMemberModalOpen(false);
    setMemberEditing(null);
  };

  const deleteMember = (id: number) => {
    if (!isCEO) return;
    const m = team.find((x) => x.id === id);
    if (!m) return;
    const ok = window.confirm(`Delete ${m.name}? This cannot be undone.`);
    if (!ok) return;

    setTeam((prev) => prev.filter((x) => x.id !== id));
    pushAudit("DELETE_MEMBER", `Deleted: ${m.name} (${m.role}, ${m.status})`);
  };

  const softDeactivate = (id: number) => {
    if (!isCEO) return;
    const m = team.find((x) => x.id === id);
    if (!m) return;
    setTeam((prev) =>
      prev.map((x) =>
        x.id === id ? { ...x, status: "Inactive", updatedAt: nowISO() } : x
      )
    );
    pushAudit("EDIT_MEMBER", `Deactivated: ${m.name}`);
  };

  const exportJSON = () => {
    const blob = {
      exportedAt: nowISO(),
      team,
      candidates,
      training,
    };
    const text = JSON.stringify(blob, null, 2);
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([text], { type: "application/json" }));
    a.download = `eventura-hr-export-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    pushAudit("EXPORT", "Exported HR data JSON");
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
      if (parsed.candidates && Array.isArray(parsed.candidates))
        setCandidates(parsed.candidates);
      if (parsed.training && Array.isArray(parsed.training))
        setTraining(parsed.training);

      pushAudit("BULK_IMPORT", `Imported HR JSON: ${file.name}`);
      alert("Import successful ✅");
    } catch {
      alert("Import failed. Please upload a valid JSON export.");
    } finally {
      if (importRef.current) importRef.current.value = "";
    }
  };

  // NEW: clear HR data (empty)
  const clearHRData = () => {
    if (!isCEO) return;
    const ok = window.confirm("Clear ALL HR data? This removes team/candidates/training.");
    if (!ok) return;
    setTeam([]);
    setCandidates([]);
    setTraining([]);
    pushAudit("RESET", "Cleared HR database to empty");
  };

  // NEW: load demo data ONLY on click
  const loadDemoData = () => {
    if (!isCEO) return;
    const ok = window.confirm("Load demo HR data? This will overwrite current HR data.");
    if (!ok) return;

    setTeam(seedTeam.map((m) => ({ ...m, createdAt: nowISO(), updatedAt: nowISO() })));
    setCandidates(seedCandidates.map((c) => ({ ...c, createdAt: nowISO(), updatedAt: nowISO() })));
    setTraining(seedTraining.map((t) => ({ ...t, createdAt: nowISO(), updatedAt: nowISO() })));
    pushAudit("RESET", "Loaded demo HR seed data");
  };

  return (
    <main className="eventura-os">
      <aside className="eventura-sidebar">
        <SidebarCore user={user} active="hr" />
      </aside>

      <div className="eventura-main">
        <TopbarCore user={user} />

        <div className="eventura-content">
          {/* Header */}
          <div className="eventura-header-row">
            <div>
              <h1 className="eventura-page-title">HR & Crew Control</h1>
              <p className="eventura-subtitle">
                HR dashboard: editable directory, capacity, hiring, training, audit.
              </p>
            </div>

            <div className="eventura-chips-row">
              <button
                type="button"
                className={
                  "eventura-tag " +
                  (view === "overview" ? "eventura-tag-blue" : "eventura-tag-amber")
                }
                onClick={() => setView("overview")}
              >
                Overview
              </button>
              <button
                type="button"
                className={
                  "eventura-tag " +
                  (view === "directory" ? "eventura-tag-blue" : "eventura-tag-amber")
                }
                onClick={() => setView("directory")}
              >
                Directory (Editable)
              </button>
              <button
                type="button"
                className={
                  "eventura-tag " +
                  (view === "hiring" ? "eventura-tag-blue" : "eventura-tag-amber")
                }
                onClick={() => setView("hiring")}
              >
                Hiring
              </button>
              <button
                type="button"
                className={
                  "eventura-tag " +
                  (view === "training" ? "eventura-tag-blue" : "eventura-tag-amber")
                }
                onClick={() => setView("training")}
              >
                Training
              </button>
              <button
                type="button"
                className={
                  "eventura-tag " +
                  (view === "audit" ? "eventura-tag-blue" : "eventura-tag-amber")
                }
                onClick={() => setView("audit")}
              >
                Audit
              </button>
            </div>
          </div>

          {/* Actions */}
          <section className="eventura-panel" style={{ marginBottom: "0.9rem" }}>
            <div className="eventura-actions" style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap" }}>
              <button
                className="eventura-button"
                disabled={!isCEO}
                title={!isCEO ? "CEO only" : "Add new team member"}
                onClick={openAddMember}
              >
                ➕ Add Member
              </button>

              <button className="eventura-button-secondary" onClick={exportJSON}>
                ⬇ Export JSON
              </button>

              <button
                className="eventura-button-secondary"
                disabled={!isCEO}
                title={!isCEO ? "CEO only" : "Import HR data JSON"}
                onClick={triggerImport}
              >
                ⬆ Import JSON
              </button>

              <button
                className="eventura-button-secondary"
                disabled={!isCEO}
                title={!isCEO ? "CEO only" : "Clear all HR data"}
                onClick={clearHRData}
              >
                🧹 Clear HR Data
              </button>

              <button
                className="eventura-button-secondary"
                disabled={!isCEO}
                title={!isCEO ? "CEO only" : "Load demo data (optional)"}
                onClick={loadDemoData}
              >
                🧪 Load Demo Data
              </button>

              <input
                ref={importRef}
                type="file"
                accept="application/json"
                style={{ display: "none" }}
                onChange={(e) => onImportFile(e.target.files?.[0] ?? null)}
              />

              {!isCEO && (
                <span className="eventura-small-text">
                  🔒 Staff has read-only access. Login as CEO to edit.
                </span>
              )}
            </div>
          </section>

          {team.length === 0 && view !== "directory" && (
            <section className="eventura-panel" style={{ marginBottom: "0.9rem" }}>
              <h2 className="eventura-panel-title">No HR data yet</h2>
              <p className="eventura-small-text">
                Your HR database is empty. Add members or import data to start.
              </p>
              <div className="eventura-actions" style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap" }}>
                <button className="eventura-button" disabled={!isCEO} onClick={openAddMember}>
                  ➕ Add first member
                </button>
                <button className="eventura-button-secondary" disabled={!isCEO} onClick={triggerImport}>
                  ⬆ Import JSON
                </button>
                <button className="eventura-button-secondary" disabled={!isCEO} onClick={loadDemoData}>
                  🧪 Load Demo Data
                </button>
              </div>
            </section>
          )}

          {view === "overview" && (
            <HROverviewView summary={summary} team={team} />
          )}

          {view === "directory" && (
            <HRDirectoryView
              isCEO={!!isCEO}
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
              onDelete={deleteMember}
              onDeactivate={softDeactivate}
            />
          )}

          {view === "hiring" && <HRHiringView candidates={candidates} team={team} />}

          {view === "training" && (
            <HRTrainingView training={training} team={team} />
          )}

          {view === "audit" && <HRAuditView audit={audit} />}

          {/* Member modal */}
          {memberModalOpen && (
            <MemberModal
              isCEO={!!isCEO}
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

/* ========= Views ========= */

function HROverviewView({ summary, team }: { summary: HRSummary; team: TeamMember[] }) {
  const roles: StaffRole[] = [
    "Event Manager",
    "Decor Specialist",
    "Logistics",
    "Marketing",
    "Sales",
    "Accountant",
    "Operations",
  ];

  const roleHeat = roles.map((role) => {
    const members = team.filter((m) => m.role === role && m.status === "Core");
    if (members.length === 0) return { role, count: 0, avgWorkload: 0 };
    const avg =
      members.reduce((sum, m) => sum + (m.workload || 0), 0) / members.length;
    return { role, count: members.length, avgWorkload: Math.round(avg) };
  });

  return (
    <>
      <section className="eventura-grid">
        <div className="eventura-card eventura-card-glow">
          <p className="eventura-card-label">Headcount</p>
          <p className="eventura-card-value">{summary.coreCount} core</p>
          <p className="eventura-card-note">
            Freelancers: {summary.freelancersCount} · Trainees: {summary.traineesCount} · Inactive: {summary.inactiveCount}
          </p>
        </div>

        <div className="eventura-card eventura-card-glow">
          <p className="eventura-card-label">Avg core workload</p>
          <p className="eventura-card-value">{summary.avgWorkload}%</p>
          <p className="eventura-card-note">{workloadLabel(summary.avgWorkload)}</p>
        </div>

        <div className="eventura-card eventura-card-glow">
          <p className="eventura-card-label">Monthly salary run</p>
          <p className="eventura-card-value">₹{summary.totalCost.toLocaleString("en-IN")}</p>
          <p className="eventura-card-note">Core salary + trainee stipends only.</p>
        </div>

        <div className="eventura-card eventura-card-glow">
          <p className="eventura-card-label">30-day readiness</p>
          <p className="eventura-card-value">
            {summary.weddingsCapacity} weddings · {summary.corporatesCapacity} corporates
          </p>
          <p className="eventura-card-note">Based on Event Managers / Decor / Logistics coverage.</p>
        </div>
      </section>

      <section className="eventura-columns">
        <div className="eventura-panel">
          <h2 className="eventura-panel-title">Org heatmap by role</h2>
          <div className="eventura-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))" }}>
            {roleHeat.map((r) => (
              <div key={r.role} className="eventura-card">
                <p className="eventura-card-label">{r.role}</p>
                <p className="eventura-card-value">
                  {r.count} <span style={{ fontSize: "0.75rem", color: "#9ca3af" }}>core</span>
                </p>
                <p className="eventura-card-note">
                  {r.count === 0 ? (
                    <span className="eventura-tag eventura-tag-amber">No core staff</span>
                  ) : (
                    <span className={"eventura-tag " + gaugeColor(r.avgWorkload)}>
                      {r.avgWorkload}% · {workloadLabel(r.avgWorkload)}
                    </span>
                  )}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="eventura-panel">
          <h2 className="eventura-panel-title">Alerts</h2>
          <ul className="eventura-bullets">
            {team.filter((m) => m.status === "Core" && m.workload >= 90).length > 0 ? (
              <li>
                <span className="eventura-tag eventura-tag-amber">Burnout risk</span>{" "}
                {team
                  .filter((m) => m.status === "Core" && m.workload >= 90)
                  .map((m) => m.name)
                  .join(", ")}
              </li>
            ) : (
              <li><span className="eventura-tag eventura-tag-green">Healthy</span> No core staff over 90% workload.</li>
            )}
          </ul>

          <div className="eventura-actions" style={{ marginTop: "0.8rem" }}>
            <Link href="/finance" className="eventura-button-secondary">
              Open Finance (HR cost vs revenue)
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}

function HRDirectoryView(props: {
  isCEO: boolean;
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
  onDelete: (id: number) => void;
  onDeactivate: (id: number) => void;
}) {
  const roles: (StaffRole | "All")[] = [
    "All",
    "Event Manager",
    "Decor Specialist",
    "Logistics",
    "Marketing",
    "Sales",
    "Accountant",
    "Operations",
  ];
  const statuses: (StaffStatus | "All")[] = ["All", "Core", "Freelancer", "Trainee", "Inactive"];

  const totalShown = props.team.length;
  const totalAll = props.allTeam.length;

  return (
    <section className="eventura-panel">
      <div className="eventura-header-row" style={{ alignItems: "flex-end" }}>
        <div>
          <h2 className="eventura-panel-title">Team Directory</h2>
          <p className="eventura-small-text">
            Showing {totalShown} of {totalAll}. Search + filters. CEO can edit/delete.
          </p>
        </div>

        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
          <input
            className="eventura-search"
            value={props.q}
            onChange={(e) => props.setQ(e.target.value)}
            placeholder="Search name, role, city, skills..."
            style={{ minWidth: 260 }}
          />
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
              <th style={{ width: 210 }}>Actions</th>
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
                  <span className={"eventura-tag " + gaugeColor(m.workload)}>
                    {m.workload}% · {workloadLabel(m.workload)}
                  </span>
                </td>
                <td>{m.eventsThisMonth}</td>
                <td>{m.monthlySalary ? `₹${m.monthlySalary.toLocaleString("en-IN")}` : "—"}</td>
                <td>{m.rating.toFixed(1)}/5</td>
                <td><div className="eventura-small-text">{(m.skills || []).join(", ")}</div></td>
                <td>
                  <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
                    <button
                      className="eventura-button-secondary"
                      disabled={!props.isCEO}
                      title={!props.isCEO ? "CEO only" : "Edit"}
                      onClick={() => props.onEdit(m)}
                    >
                      ✏ Edit
                    </button>
                    <button
                      className="eventura-button-secondary"
                      disabled={!props.isCEO || m.status === "Inactive"}
                      title={!props.isCEO ? "CEO only" : "Deactivate"}
                      onClick={() => props.onDeactivate(m.id)}
                    >
                      📴 Deactivate
                    </button>
                    <button
                      className="eventura-button-secondary"
                      disabled={!props.isCEO}
                      title={!props.isCEO ? "CEO only" : "Delete"}
                      onClick={() => props.onDelete(m.id)}
                    >
                      🗑 Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {props.team.length === 0 && (
              <tr>
                <td colSpan={9} style={{ color: "#9ca3af" }}>
                  No team members yet. Add a member (CEO) or import JSON.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function HRHiringView({ candidates, team }: { candidates: Candidate[]; team: TeamMember[] }) {
  const stages: HiringStage[] = ["Sourced", "Shortlisted", "Interviewed", "Trial Event", "Hired", "Rejected"];

  const coreByRole = useMemo(() => {
    const map: Record<StaffRole, number> = {
      "Event Manager": 0,
      "Decor Specialist": 0,
      Logistics: 0,
      Marketing: 0,
      Sales: 0,
      Accountant: 0,
      Operations: 0,
    };
    team.filter((m) => m.status === "Core").forEach((m) => {
      map[m.role] = (map[m.role] || 0) + 1;
    });
    return map;
  }, [team]);

  return (
    <section className="eventura-columns">
      <div className="eventura-panel">
        <h2 className="eventura-panel-title">Recruitment Kanban</h2>
        <div className="eventura-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))" }}>
          {stages.map((stage) => {
            const stageCandidates = candidates.filter((c) => c.stage === stage);
            return (
              <div key={stage} className="eventura-card">
                <p className="eventura-card-label">{stage}</p>
                <p className="eventura-card-value">
                  {stageCandidates.length}{" "}
                  <span style={{ fontSize: "0.75rem", color: "#9ca3af" }}>candidate(s)</span>
                </p>
                <ul className="eventura-bullets" style={{ marginTop: "0.4rem" }}>
                  {stageCandidates.length === 0 && (
                    <li style={{ color: "#9ca3af", fontSize: "0.8rem" }}>No candidates yet.</li>
                  )}
                  {stageCandidates.map((c) => (
                    <li key={c.id}>
                      {c.name} – {c.role} ·{" "}
                      <span className={"eventura-tag " + (c.fitScore >= 85 ? "eventura-tag-green" : c.fitScore >= 70 ? "eventura-tag-blue" : "eventura-tag-amber")}>
                        {c.fitScore} fit
                      </span>
                      {c.notes ? <div className="eventura-small-text" style={{ marginTop: 2 }}>{c.notes}</div> : null}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </div>

      <div className="eventura-panel">
        <h2 className="eventura-panel-title">Role coverage</h2>
        <div className="eventura-table-wrapper">
          <table className="eventura-table">
            <thead>
              <tr>
                <th>Role</th>
                <th>Core count</th>
                <th>Comment</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(coreByRole).map(([role, count]) => {
                let comment = "Healthy";
                if (role === "Event Manager" && count < 2) comment = "Hire 1 more in next 6–9 months.";
                if (role === "Decor Specialist" && count < 1) comment = "Critical to hire at least 1 ASAP.";
                if (role === "Logistics" && count < 1) comment = "Need strong logistics core for scale.";
                return (
                  <tr key={role}>
                    <td>{role}</td>
                    <td>{count}</td>
                    <td>{comment}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="eventura-small-text" style={{ marginTop: "0.6rem" }}>
          Add candidates via import (or we can add CRUD for candidates next).
        </p>
      </div>
    </section>
  );
}

function HRTrainingView({ training, team }: { training: TrainingItem[]; team: TeamMember[] }) {
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
                <th>Key skills</th>
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
                  <td>{m.rating.toFixed(1)}/5</td>
                </tr>
              ))}
              {team.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ color: "#9ca3af" }}>
                    Add members first to see skill matrix.
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
                <th>Role target</th>
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
                    No training programs yet. Import or we can add CRUD next.
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

function HRAuditView({ audit }: { audit: AuditItem[] }) {
  return (
    <section className="eventura-panel">
      <h2 className="eventura-panel-title">Audit log</h2>
      <p className="eventura-small-text">Tracks HR changes. Latest first.</p>

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
                  No actions yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

/* ========= Modal ========= */

function MemberModal(props: {
  isCEO: boolean;
  onClose: () => void;
  onSave: (m: TeamMember) => void;
  initial: TeamMember | null;
}) {
  const roles: StaffRole[] = [
    "Event Manager",
    "Decor Specialist",
    "Logistics",
    "Marketing",
    "Sales",
    "Accountant",
    "Operations",
  ];
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

  const canEdit = props.isCEO;

  const save = () => {
    if (!canEdit) return;
    const cleanName = name.trim();
    if (!cleanName) {
      alert("Name is required");
      return;
    }

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
      skills: skills
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
        .slice(0, 12),
      createdAt: props.initial?.createdAt,
      updatedAt: props.initial?.updatedAt,
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
              {canEdit ? "Saves into local HR database." : "Read-only"}
            </p>
          </div>
          <button className="eventura-button-secondary" onClick={props.onClose}>
            ✕ Close
          </button>
        </div>

        <div className="eventura-grid" style={{ marginTop: "0.6rem" }}>
          <div className="eventura-card">
            <p className="eventura-card-label">Name</p>
            <input className="eventura-search" value={name} onChange={(e) => setName(e.target.value)} disabled={!canEdit} />
          </div>

          <div className="eventura-card">
            <p className="eventura-card-label">Role</p>
            <select className="eventura-search" value={role} onChange={(e) => setRole(e.target.value as StaffRole)} disabled={!canEdit}>
              {roles.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>

          <div className="eventura-card">
            <p className="eventura-card-label">Status</p>
            <select className="eventura-search" value={status} onChange={(e) => setStatus(e.target.value as StaffStatus)} disabled={!canEdit}>
              {statuses.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          <div className="eventura-card">
            <p className="eventura-card-label">City</p>
            <input className="eventura-search" value={city} onChange={(e) => setCity(e.target.value)} disabled={!canEdit} />
          </div>

          <div className="eventura-card">
            <p className="eventura-card-label">Workload %</p>
            <input className="eventura-search" type="number" value={workload} onChange={(e) => setWorkload(Number(e.target.value))} disabled={!canEdit} />
          </div>

          <div className="eventura-card">
            <p className="eventura-card-label">Events this month</p>
            <input className="eventura-search" type="number" value={eventsThisMonth} onChange={(e) => setEventsThisMonth(Number(e.target.value))} disabled={!canEdit} />
          </div>

          <div className="eventura-card">
            <p className="eventura-card-label">Monthly salary (₹)</p>
            <input className="eventura-search" type="number" value={monthlySalary} onChange={(e) => setMonthlySalary(Number(e.target.value))} disabled={!canEdit} />
          </div>

          <div className="eventura-card">
            <p className="eventura-card-label">Rating (0–5)</p>
            <input className="eventura-search" type="number" value={rating} onChange={(e) => setRating(Number(e.target.value))} disabled={!canEdit} />
          </div>

          <div className="eventura-card" style={{ gridColumn: "1 / -1" }}>
            <p className="eventura-card-label">Skills (comma separated)</p>
            <input className="eventura-search" value={skills} onChange={(e) => setSkills(e.target.value)} disabled={!canEdit} />
          </div>
        </div>

        <div className="eventura-actions" style={{ marginTop: "0.8rem", display: "flex", gap: "0.6rem" }}>
          <button className="eventura-button" disabled={!canEdit} onClick={save}>
            💾 Save
          </button>
          <button className="eventura-button-secondary" onClick={props.onClose}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

/* ========= Shared layout: sidebar + topbar ========= */

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
