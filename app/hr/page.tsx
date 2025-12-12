"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";

/* ========= Shared types ========= */

type Role = "CEO" | "Staff";
type User = { name: string; role: Role; city: string };

const USER_KEY = "eventura-user";
const TEAM_STORAGE_KEY = "eventura-team";
const CANDIDATE_STORAGE_KEY = "eventura-candidates";
const TRAINING_STORAGE_KEY = "eventura-training";

type StaffRole =
  | "Event Manager"
  | "Decor Specialist"
  | "Logistics"
  | "Marketing"
  | "Sales"
  | "Accountant"
  | "Operations";

type StaffStatus = "Core" | "Freelancer" | "Trainee";

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
};

type TrainingItem = {
  id: number;
  title: string;
  roleTarget: StaffRole | "All";
  assignee: string;
  status: "Planned" | "In Progress" | "Completed";
  beforeScore: number;
  afterScore?: number;
};

type HRSummary = {
  coreCount: number;
  freelancersCount: number;
  traineesCount: number;
  totalCost: number;
  avgWorkload: number;
  roleCounts: Record<StaffRole, number>;
  weddingsCapacity: number;
  corporatesCapacity: number;
};

/* ========= Seed data ========= */

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
  {
    id: 4,
    name: "Priya Shah",
    role: "Decor Specialist",
    city: "Surat",
    status: "Core",
    workload: 92,
    monthlySalary: 38000,
    eventsThisMonth: 7,
    rating: 4.8,
    skills: ["Stage Design", "Floral", "3D Layout"],
  },
  {
    id: 5,
    name: "Jay Patel",
    role: "Logistics",
    city: "Surat",
    status: "Core",
    workload: 79,
    monthlySalary: 32000,
    eventsThisMonth: 6,
    rating: 4.3,
    skills: ["Transport", "Crew", "Vendor Coordination"],
  },
  {
    id: 6,
    name: "Riya Mehta",
    role: "Sales",
    city: "Surat",
    status: "Core",
    workload: 68,
    monthlySalary: 30000,
    eventsThisMonth: 4,
    rating: 4.2,
    skills: ["Leads", "Proposals", "CRM"],
  },
  {
    id: 7,
    name: "Kunal Desai",
    role: "Accountant",
    city: "Surat",
    status: "Core",
    workload: 61,
    monthlySalary: 35000,
    eventsThisMonth: 0,
    rating: 4.4,
    skills: ["Tally", "QuickBooks", "Cost Control"],
  },
  {
    id: 8,
    name: "Decor Crew A",
    role: "Decor Specialist",
    city: "Surat",
    status: "Freelancer",
    workload: 54,
    monthlySalary: 0,
    eventsThisMonth: 4,
    rating: 4.1,
    skills: ["Setup", "Dismantle"],
  },
  {
    id: 9,
    name: "Logistics Crew A",
    role: "Logistics",
    city: "Surat",
    status: "Freelancer",
    workload: 47,
    monthlySalary: 0,
    eventsThisMonth: 3,
    rating: 4.0,
    skills: ["Transport", "On-ground"],
  },
  {
    id: 10,
    name: "Trainee Planner",
    role: "Event Manager",
    city: "Surat",
    status: "Trainee",
    workload: 34,
    monthlySalary: 10000,
    eventsThisMonth: 2,
    rating: 3.8,
    skills: ["Coordination", "Support"],
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
  },
  {
    id: 102,
    name: "Rahul Sharma",
    role: "Decor Specialist",
    city: "Surat",
    expectedSalary: 28000,
    stage: "Shortlisted",
    fitScore: 79,
  },
  {
    id: 103,
    name: "Manav Trivedi",
    role: "Logistics",
    city: "Surat",
    expectedSalary: 26000,
    stage: "Trial Event",
    fitScore: 91,
  },
];

const seedTraining: TrainingItem[] = [
  {
    id: 201,
    title: "Cost control in logistics",
    roleTarget: "Logistics",
    assignee: "Jay Patel",
    status: "Planned",
    beforeScore: 6,
  },
  {
    id: 202,
    title: "3D decor layout tools",
    roleTarget: "Decor Specialist",
    assignee: "Priya Shah",
    status: "In Progress",
    beforeScore: 7,
  },
  {
    id: 203,
    title: "Premium client handling",
    roleTarget: "Event Manager",
    assignee: "Trainee Planner",
    status: "Completed",
    beforeScore: 5,
    afterScore: 8,
  },
];

/* ========= Helper functions ========= */

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

/* ========= Page ========= */

export default function HRPage() {
  const [user, setUser] = useState<User | null>(null);
  const [team, setTeam] = useState<TeamMember[]>(seedTeam);
  const [candidates, setCandidates] = useState<Candidate[]>(seedCandidates);
  const [training, setTraining] = useState<TrainingItem[]>(seedTraining);

  // Simple view switch inside HR tab
  const [view, setView] = useState<"home" | "scheduling" | "hiring" | "training">(
    "home"
  );

  // Auth
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

  // Load saved HR data from localStorage (if any)
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const storedTeam = window.localStorage.getItem(TEAM_STORAGE_KEY);
      if (storedTeam) {
        const parsed: TeamMember[] = JSON.parse(storedTeam);
        if (Array.isArray(parsed)) setTeam(parsed);
      }
    } catch {
      // ignore
    }
    try {
      const storedCandidates = window.localStorage.getItem(
        CANDIDATE_STORAGE_KEY
      );
      if (storedCandidates) {
        const parsed: Candidate[] = JSON.parse(storedCandidates);
        if (Array.isArray(parsed)) setCandidates(parsed);
      }
    } catch {
      // ignore
    }
    try {
      const storedTraining = window.localStorage.getItem(TRAINING_STORAGE_KEY);
      if (storedTraining) {
        const parsed: TrainingItem[] = JSON.parse(storedTraining);
        if (Array.isArray(parsed)) setTraining(parsed);
      }
    } catch {
      // ignore
    }
  }, []);

  // Persist HR data when it changes
  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(TEAM_STORAGE_KEY, JSON.stringify(team));
  }, [team]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(
      CANDIDATE_STORAGE_KEY,
      JSON.stringify(candidates)
    );
  }, [candidates]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(TRAINING_STORAGE_KEY, JSON.stringify(training));
  }, [training]);

  const summary: HRSummary = useMemo(() => {
    const core = team.filter((m) => m.status === "Core");
    const freelancers = team.filter((m) => m.status === "Freelancer");
    const trainees = team.filter((m) => m.status === "Trainee");

    const totalCoreCost = core.reduce((sum, m) => sum + m.monthlySalary, 0);
    const totalTraineeCost = trainees.reduce(
      (sum, m) => sum + m.monthlySalary,
      0
    );
    const totalCost = totalCoreCost + totalTraineeCost;

    const avgWorkload =
      core.reduce((sum, m) => sum + m.workload, 0) / (core.length || 1);

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

    const weddingsCapacity = Math.min(
      eventManagers * 3,
      decor * 3,
      logistics * 3
    );
    const corporatesCapacity = Math.min(
      eventManagers * 2,
      decor * 2,
      logistics * 3
    );

    return {
      coreCount: core.length,
      freelancersCount: freelancers.length,
      traineesCount: trainees.length,
      totalCost,
      avgWorkload: Math.round(avgWorkload || 0),
      roleCounts,
      weddingsCapacity,
      corporatesCapacity,
    };
  }, [team]);

  if (!user) return null;

  const isCEO = user.role === "CEO";

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
                See your crew capacity, salary cost, hiring pipeline and
                training – all connected to Eventura events & finance.
              </p>
            </div>
            <div className="eventura-chips-row">
              <button
                type="button"
                className={
                  "eventura-tag " +
                  (view === "home" ? "eventura-tag-blue" : "eventura-tag-amber")
                }
                onClick={() => setView("home")}
              >
                Org overview
              </button>
              <button
                type="button"
                className={
                  "eventura-tag " +
                  (view === "scheduling"
                    ? "eventura-tag-blue"
                    : "eventura-tag-amber")
                }
                onClick={() => setView("scheduling")}
              >
                Scheduling & Utilization
              </button>
              <button
                type="button"
                className={
                  "eventura-tag " +
                  (view === "hiring"
                    ? "eventura-tag-blue"
                    : "eventura-tag-amber")
                }
                onClick={() => setView("hiring")}
              >
                Hiring & Freelancers
              </button>
              <button
                type="button"
                className={
                  "eventura-tag " +
                  (view === "training"
                    ? "eventura-tag-blue"
                    : "eventura-tag-amber")
                }
                onClick={() => setView("training")}
              >
                Training & Skills
              </button>
            </div>
          </div>

          {view === "home" && (
            <HRHomeView
              summary={summary}
              team={team}
              isCEO={isCEO}
              onTeamChange={setTeam}
            />
          )}
          {view === "scheduling" && (
            <HRSchedulingView team={team} summary={summary} />
          )}
          {view === "hiring" && (
            <HRHiringView
              candidates={candidates}
              team={team}
              onCandidatesChange={setCandidates}
            />
          )}
          {view === "training" && (
            <HRTrainingView training={training} team={team} />
          )}
        </div>
      </div>
    </main>
  );
}

/* ========= HR views ========= */

function HRHomeView({
  summary,
  team,
  isCEO,
  onTeamChange,
}: {
  summary: HRSummary;
  team: TeamMember[];
  isCEO: boolean;
  onTeamChange: (next: TeamMember[]) => void;
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

  const roleHeat = roles.map((role) => {
    const members = team.filter((m) => m.role === role && m.status === "Core");
    if (members.length === 0) {
      return {
        role,
        count: 0,
        avgWorkload: 0,
      };
    }
    const avg =
      members.reduce((sum, m) => sum + m.workload, 0) / members.length;
    return {
      role,
      count: members.length,
      avgWorkload: Math.round(avg),
    };
  });

  const handleRemoveMember = (id: number) => {
    if (!window.confirm("Remove this team member from HR?")) return;
    onTeamChange(team.filter((m) => m.id !== id));
  };

  const handleAddMember = () => {
    const name = window.prompt("New member name:");
    if (!name) return;
    const city = window.prompt("City:", "Surat") || "Surat";
    const role = (window.prompt(
      'Role (Event Manager / Decor Specialist / Logistics / Marketing / Sales / Accountant / Operations):',
      "Event Manager"
    ) || "Event Manager") as StaffRole;
    const status = (window.prompt(
      "Status (Core / Freelancer / Trainee):",
      "Core"
    ) || "Core") as StaffStatus;
    const monthlySalary = Number(
      window.prompt("Monthly salary (₹):", status === "Freelancer" ? "0" : "30000")
    );
    const workload = Number(window.prompt("Workload %:", "50"));
    const eventsThisMonth = Number(
      window.prompt("Events this month:", "0")
    );
    const rating = Number(window.prompt("Rating (1–5):", "4"));
    const skillsRaw =
      window.prompt("Skills (comma separated):", "Coordination") || "";
    const skills = skillsRaw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    const maxId = team.reduce((max, m) => Math.max(max, m.id), 0);
    const newMember: TeamMember = {
      id: maxId + 1,
      name,
      role,
      city,
      status,
      monthlySalary: isNaN(monthlySalary) ? 0 : monthlySalary,
      workload: isNaN(workload) ? 0 : workload,
      eventsThisMonth: isNaN(eventsThisMonth) ? 0 : eventsThisMonth,
      rating: isNaN(rating) ? 4 : rating,
      skills: skills.length ? skills : ["General"],
    };

    onTeamChange([...team, newMember]);
  };

  return (
    <>
      {/* Top summary */}
      <section className="eventura-grid">
        <div className="eventura-card eventura-card-glow">
          <p className="eventura-card-label">Core staff</p>
          <p className="eventura-card-value">{summary.coreCount}</p>
          <p className="eventura-card-note">
            Freelancers: {summary.freelancersCount} · Trainees:{" "}
            {summary.traineesCount}
          </p>
        </div>
        <div className="eventura-card eventura-card-glow">
          <p className="eventura-card-label">Avg core workload</p>
          <p className="eventura-card-value">{summary.avgWorkload}%</p>
          <p className="eventura-card-note">
            {workloadLabel(summary.avgWorkload)}
          </p>
        </div>
        <div className="eventura-card eventura-card-glow">
          <p className="eventura-card-label">Monthly salary run</p>
          <p className="eventura-card-value">
            ₹{summary.totalCost.toLocaleString("en-IN")}
          </p>
          <p className="eventura-card-note">
            Linked to break-even: keep HR cost lean vs revenue.
          </p>
        </div>
        <div className="eventura-card eventura-card-glow">
          <p className="eventura-card-label">30-day event readiness</p>
          <p className="eventura-card-value">
            {summary.weddingsCapacity} weddings ·{" "}
            {summary.corporatesCapacity} corporates
          </p>
          <p className="eventura-card-note">
            Based on current Event Managers, Decor & Logistics.
          </p>
        </div>
      </section>

      {/* Org heatmap & role mix */}
      <section className="eventura-columns">
        <div className="eventura-panel">
          <h2 className="eventura-panel-title">Org heatmap by role</h2>
          <div
            className="eventura-grid"
            style={{ gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))" }}
          >
            {roleHeat.map((r) => (
              <div key={r.role} className="eventura-card">
                <p className="eventura-card-label">{r.role}</p>
                <p className="eventura-card-value">
                  {r.count}{" "}
                  <span style={{ fontSize: "0.75rem", color: "#9ca3af" }}>
                    core
                  </span>
                </p>
                <p className="eventura-card-note">
                  {r.count === 0 ? (
                    <span className="eventura-tag eventura-tag-amber">
                      No core staff yet
                    </span>
                  ) : (
                    <span
                      className={
                        "eventura-tag " + gaugeColor(r.avgWorkload)
                      }
                    >
                      {r.avgWorkload}% · {workloadLabel(r.avgWorkload)}
                    </span>
                  )}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="eventura-panel">
          <h2 className="eventura-panel-title">Role mix & cost view</h2>
          <ul className="eventura-bullets">
            <li>
              Event Managers: {summary.roleCounts["Event Manager"]} (ideal:
              2–4 at Surat level).
            </li>
            <li>
              Decor Specialists: {summary.roleCounts["Decor Specialist"]} (must
              keep design quality high).
            </li>
            <li>
              Logistics: {summary.roleCounts["Logistics"]} (critical for
              on-ground execution).
            </li>
            <li>
              Sales + Marketing:{" "}
              {summary.roleCounts["Sales"] + summary.roleCounts["Marketing"]}{" "}
              (driving leads & topline).
            </li>
            <li>Accountant & Operations supporting finance discipline.</li>
          </ul>
          {isCEO && (
            <div className="eventura-actions" style={{ marginTop: "0.8rem" }}>
              <Link href="/finance" className="eventura-button-secondary">
                Open Finance to view HR cost vs revenue
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* Team directory – manage */}
      <section className="eventura-panel" style={{ marginTop: "1.5rem" }}>
        <div className="eventura-panel-header-row">
          <h2 className="eventura-panel-title">Team directory (manage)</h2>
          <button
            type="button"
            className="eventura-button-secondary"
            onClick={handleAddMember}
          >
            + Add member
          </button>
        </div>
        <div className="eventura-table-wrapper">
          <table className="eventura-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Role</th>
                <th>Status</th>
                <th>City</th>
                <th>Salary (₹)</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {team.map((m) => (
                <tr key={m.id}>
                  <td>
                    <div className="eventura-list-title">{m.name}</div>
                    <div className="eventura-list-sub">
                      {m.workload}% · {workloadLabel(m.workload)}
                    </div>
                  </td>
                  <td>{m.role}</td>
                  <td>{m.status}</td>
                  <td>{m.city}</td>
                  <td>{m.monthlySalary.toLocaleString("en-IN")}</td>
                  <td style={{ textAlign: "right" }}>
                    <button
                      type="button"
                      className="eventura-tag eventura-tag-amber"
                      onClick={() => handleRemoveMember(m.id)}
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
              {team.length === 0 && (
                <tr>
                  <td colSpan={6} className="eventura-small-text">
                    No team members yet. Click “Add member” to create your HR
                    list.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}

function HRSchedulingView({
  team,
  summary,
}: {
  team: TeamMember[];
  summary: HRSummary;
}) {
  // Dummy schedule of next 7–10 days
  const schedule = [
    {
      date: "2025-12-14",
      label: "Patel Wedding Sangeet",
      city: "Surat",
      crew: ["Shubh", "Priya Shah", "Jay Patel", "Decor Crew A"],
      risk: "Medium" as const,
    },
    {
      date: "2025-12-16",
      label: "Corporate Gala – XYZ Textiles",
      city: "Surat",
      crew: ["Shubh", "Riya Mehta", "Logistics Crew A"],
      risk: "Low" as const,
    },
    {
      date: "2025-12-18",
      label: "Mehta Engagement",
      city: "Surat",
      crew: ["Trainee Planner", "Priya Shah"],
      risk: "Medium" as const,
    },
  ];

  return (
    <>
      <section className="eventura-grid">
        <div className="eventura-card eventura-card-glow">
          <p className="eventura-card-label">Next 30 days capacity</p>
          <p className="eventura-card-value">
            {summary.weddingsCapacity} weddings ·{" "}
            {summary.corporatesCapacity} corporates
          </p>
          <p className="eventura-card-note">
            Ensure bookings stay under this to avoid burnout.
          </p>
        </div>
        <div className="eventura-card eventura-card-glow">
          <p className="eventura-card-label">Crew pool</p>
          <p className="eventura-card-value">
            {summary.coreCount} core · {summary.freelancersCount} freelancers ·{" "}
            {summary.traineesCount} trainees
          </p>
          <p className="eventura-card-note">
            Use freelancers for peak days (Navratri, Diwali, peak weddings).
          </p>
        </div>
      </section>

      <section className="eventura-columns">
        <div className="eventura-panel">
          <h2 className="eventura-panel-title">
            Crew scheduling – upcoming events
          </h2>
          <div className="eventura-table-wrapper">
            <table className="eventura-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Event</th>
                  <th>City</th>
                  <th>Crew</th>
                  <th>Risk</th>
                </tr>
              </thead>
              <tbody>
                {schedule.map((row) => (
                  <tr key={row.date + row.label}>
                    <td>{row.date}</td>
                    <td>
                      <div className="eventura-list-title">{row.label}</div>
                    </td>
                    <td>{row.city}</td>
                    <td>
                      <div className="eventura-small-text">
                        {row.crew.join(", ")}
                      </div>
                    </td>
                    <td>
                      <span
                        className={
                          "eventura-tag " +
                          (row.risk === "Medium"
                            ? "eventura-tag-blue"
                            : row.risk === "Low"
                            ? "eventura-tag-green"
                            : "eventura-tag-amber")
                        }
                      >
                        {row.risk} risk
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="eventura-small-text" style={{ marginTop: "0.5rem" }}>
            In future we can connect this with actual Events & Calendar data
            for live double-booking checks.
          </p>
        </div>

        <div className="eventura-panel">
          <h2 className="eventura-panel-title">Utilization by crew</h2>
          <div className="eventura-table-wrapper">
            <table className="eventura-table">
              <thead>
                <tr>
                  <th>Member</th>
                  <th>Role</th>
                  <th>Workload</th>
                  <th>Events this month</th>
                </tr>
              </thead>
              <tbody>
                {team
                  .filter((m) => m.status !== "Trainee")
                  .map((m) => (
                    <tr key={m.id}>
                      <td>
                        <div className="eventura-list-title">{m.name}</div>
                        <div className="eventura-list-sub">{m.city}</div>
                      </td>
                      <td>{m.role}</td>
                      <td>
                        <span
                          className={
                            "eventura-tag " + gaugeColor(m.workload)
                          }
                        >
                          {m.workload}% · {workloadLabel(m.workload)}
                        </span>
                      </td>
                      <td>{m.eventsThisMonth}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
          <p className="eventura-small-text" style={{ marginTop: "0.5rem" }}>
            When workload &gt; 90% consistently, HR alert: consider adding
            freelancers or hiring.
          </p>
        </div>
      </section>
    </>
  );
}

function HRHiringView({
  candidates,
  team,
  onCandidatesChange,
}: {
  candidates: Candidate[];
  team: TeamMember[];
  onCandidatesChange: (next: Candidate[]) => void;
}) {
  const stages: HiringStage[] = [
    "Sourced",
    "Shortlisted",
    "Interviewed",
    "Trial Event",
    "Hired",
    "Rejected",
  ];

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
    team
      .filter((m) => m.status === "Core")
      .forEach((m) => {
        map[m.role] = (map[m.role] || 0) + 1;
      });
    return map;
  }, [team]);

  const handleRemoveCandidate = (id: number) => {
    if (!window.confirm("Remove this candidate from pipeline?")) return;
    onCandidatesChange(candidates.filter((c) => c.id !== id));
  };

  const handleAddCandidate = () => {
    const name = window.prompt("Candidate name:");
    if (!name) return;
    const role = (window.prompt(
      'Role (Event Manager / Decor Specialist / Logistics / Marketing / Sales / Accountant / Operations):',
      "Event Manager"
    ) || "Event Manager") as StaffRole;
    const city = window.prompt("City:", "Surat") || "Surat";
    const expectedSalary = Number(
      window.prompt("Expected salary (₹):", "30000")
    );
    const stage = (window.prompt(
      "Stage (Sourced / Shortlisted / Interviewed / Trial Event / Hired / Rejected):",
      "Sourced"
    ) || "Sourced") as HiringStage;
    const fitScore = Number(window.prompt("Fit score (0–100):", "75"));

    const maxId = candidates.reduce((max, c) => Math.max(max, c.id), 100);
    const newCandidate: Candidate = {
      id: maxId + 1,
      name,
      role,
      city,
      expectedSalary: isNaN(expectedSalary) ? 0 : expectedSalary,
      stage,
      fitScore: isNaN(fitScore) ? 70 : fitScore,
    };

    onCandidatesChange([...candidates, newCandidate]);
  };

  return (
    <section className="eventura-columns">
      <div className="eventura-panel">
        <div className="eventura-panel-header-row">
          <h2 className="eventura-panel-title">Recruitment Kanban</h2>
          <button
            type="button"
            className="eventura-button-secondary"
            onClick={handleAddCandidate}
          >
            + Add candidate
          </button>
        </div>
        <div
          className="eventura-grid"
          style={{ gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}
        >
          {stages.map((stage) => {
            const stageCandidates = candidates.filter((c) => c.stage === stage);
            return (
              <div key={stage} className="eventura-card">
                <p className="eventura-card-label">{stage}</p>
                <p className="eventura-card-value">
                  {stageCandidates.length}{" "}
                  <span style={{ fontSize: "0.75rem", color: "#9ca3af" }}>
                    candidate(s)
                  </span>
                </p>
                <ul className="eventura-bullets" style={{ marginTop: "0.4rem" }}>
                  {stageCandidates.length === 0 && (
                    <li style={{ color: "#9ca3af", fontSize: "0.8rem" }}>
                      No candidates at this stage yet.
                    </li>
                  )}
                  {stageCandidates.map((c) => (
                    <li key={c.id}>
                      {c.name} – {c.role} ·{" "}
                      <span
                        className={
                          "eventura-tag " +
                          (c.fitScore >= 85
                            ? "eventura-tag-green"
                            : c.fitScore >= 70
                            ? "eventura-tag-blue"
                            : "eventura-tag-amber")
                        }
                      >
                        {c.fitScore} fit
                      </span>
                      <button
                        type="button"
                        style={{
                          marginLeft: "0.5rem",
                          fontSize: "0.7rem",
                          border: "none",
                          background: "transparent",
                          cursor: "pointer",
                        }}
                        onClick={() => handleRemoveCandidate(c.id)}
                      >
                        ❌
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
        <p className="eventura-small-text" style={{ marginTop: "0.5rem" }}>
          In the future, we can convert hired candidates automatically into HR
          profiles with salary & role from your HR plan.
        </p>
      </div>

      <div className="eventura-panel">
        <h2 className="eventura-panel-title">Role coverage & alerts</h2>
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
                if (role === "Event Manager" && count < 2)
                  comment = "Hire 1 more in next 6–9 months.";
                if (role === "Decor Specialist" && count < 1)
                  comment = "Critical to hire at least 1 ASAP.";
                if (role === "Logistics" && count < 1)
                  comment = "Need strong logistics for scale.";
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

        <h3
          className="eventura-subsection-title"
          style={{ marginTop: "0.8rem" }}
        >
          Freelancer pool (summary)
        </h3>
        <ul className="eventura-bullets">
          <li>
            Decor freelancers:{" "}
            {team.filter(
              (m) => m.status === "Freelancer" && m.role === "Decor Specialist"
            ).length}
          </li>
          <li>
            Logistics freelancers:{" "}
            {team.filter(
              (m) => m.status === "Freelancer" && m.role === "Logistics"
            ).length}
          </li>
        </ul>
        <p className="eventura-small-text">
          Use freelancers strongly for peak months instead of adding full-time
          fixed cost immediately.
        </p>
      </div>
    </section>
  );
}

function HRTrainingView({
  training,
  team,
}: {
  training: TrainingItem[];
  team: TeamMember[];
}) {
  return (
    <section className="eventura-columns">
      <div className="eventura-panel">
        <h2 className="eventura-panel-title">Skill & training matrix</h2>
        <div className="eventura-table-wrapper">
          <table className="eventura-table">
            <thead>
              <tr>
                <th>Member</th>
                <th>Role</th>
                <th>Key skills</th>
                <th>Rating</th>
              </tr>
            </thead>
            <tbody>
              {team.map((m) => (
                <tr key={m.id}>
                  <td>
                    <div className="eventura-list-title">{m.name}</div>
                    <div className="eventura-list-sub">{m.status}</div>
                  </td>
                  <td>{m.role}</td>
                  <td>
                    <div className="eventura-small-text">
                      {m.skills.join(", ")}
                    </div>
                  </td>
                  <td>{m.rating.toFixed(1)}/5</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="eventura-small-text" style={{ marginTop: "0.5rem" }}>
          Later we can connect this with performance reviews, event feedback and
          training ROI to decide promotions.
        </p>
      </div>

      <div className="eventura-panel">
        <h2 className="eventura-panel-title">Training & development</h2>
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
                  <td>
                    <span className="eventura-tag eventura-tag-blue">
                      {t.status}
                    </span>
                  </td>
                  <td>
                    {t.afterScore != null ? (
                      <span className="eventura-small-text">
                        {t.beforeScore}/10 → {t.afterScore}/10
                      </span>
                    ) : (
                      <span className="eventura-small-text">
                        Before: {t.beforeScore}/10
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <h3
          className="eventura-subsection-title"
          style={{ marginTop: "0.8rem" }}
        >
          HR AI Co-pilot (future)
        </h3>
        <p className="eventura-small-text">
          In the next phase, this tab can answer questions like “Which crew is
          at burnout risk?” or “Who is ready for promotion?” based on events,
          workload, costs and feedback.
        </p>
      </div>
    </section>
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
          placeholder="Search team, roles, skills..."
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
