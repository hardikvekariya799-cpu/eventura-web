"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";

/* ========= Shared types & constants ========= */

type Role = "CEO" | "Staff";
type User = { name: string; role: Role; city: string };

const USER_KEY = "eventura-user";
const HR_TEAM_KEY = "eventura-hr-team";
const HR_CANDIDATES_KEY = "eventura-hr-candidates";
const HR_TRAINING_KEY = "eventura-hr-training";

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

type HRInsights = {
  burnoutRisks: string[];
  hiringRecommendations: string[];
  salaryRecommendations: string[];
  trainingSuggestions: string[];
  capacitySummary: string[];
  notes: string[];
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

/* ========= Helpers ========= */

function gaugeColor(value: number): string {
  if (value < 60) return "eventura-tag-amber";
  if (value <= 85) return "eventura-tag-blue";
  return "eventura-tag-green";
}

function workloadLabel(value: number): string {
  if (value < 60) return "Under-utilized";
  if (value <= 85) return "Balanced";
  return "Overloaded";
}

function formatINR(value: number): string {
  return "₹" + value.toLocaleString("en-IN");
}

/** Simple rule-based "AI" engine for HR insights */
function computeHRInsights(
  team: TeamMember[],
  candidates: Candidate[],
  training: TrainingItem[]
): HRInsights {
  const insights: HRInsights = {
    burnoutRisks: [],
    hiringRecommendations: [],
    salaryRecommendations: [],
    trainingSuggestions: [],
    capacitySummary: [],
    notes: [],
  };

  const core = team.filter((m) => m.status === "Core");
  const freelancers = team.filter((m) => m.status === "Freelancer");
  const trainees = team.filter((m) => m.status === "Trainee");

  // Burnout: very high workload or many events
  core.forEach((m) => {
    if (m.workload >= 90 || m.eventsThisMonth >= 8) {
      insights.burnoutRisks.push(
        `${m.name} (${m.role}) is at ${m.workload}% workload with ${m.eventsThisMonth} events – HIGH burnout risk. Consider shifting 1–2 events to freelancers or adding a trainee.`
      );
    } else if (m.workload >= 80) {
      insights.burnoutRisks.push(
        `${m.name} (${m.role}) is at ${m.workload}% workload – monitor closely and avoid last-minute extra events.`
      );
    }
  });

  if (insights.burnoutRisks.length === 0) {
    insights.burnoutRisks.push(
      "No red-flag burnout risks detected. Current workload looks manageable."
    );
  }

  // Role coverage & hiring
  const coreByRole: Record<StaffRole, number> = {
    "Event Manager": 0,
    "Decor Specialist": 0,
    Logistics: 0,
    Marketing: 0,
    Sales: 0,
    Accountant: 0,
    Operations: 0,
  };
  core.forEach((m) => {
    coreByRole[m.role] = (coreByRole[m.role] || 0) + 1;
  });

  const emCount = coreByRole["Event Manager"];
  const decorCount = coreByRole["Decor Specialist"];
  const logCount = coreByRole["Logistics"];

  const weddingsCapacity = Math.min(emCount * 3, decorCount * 3, logCount * 3);
  const corporatesCapacity = Math.min(emCount * 2, decorCount * 2, logCount * 3);

  insights.capacitySummary.push(
    `With current crew you can handle approximately ${weddingsCapacity} weddings and ${corporatesCapacity} corporates in a 30-day window without burning out the team.`
  );

  if (emCount < 2) {
    insights.hiringRecommendations.push(
      `Event Managers: Only ${emCount} core EM(s). Aim for at least 2–3 to comfortably handle parallel weddings.`
    );
  }
  if (decorCount < 1) {
    insights.hiringRecommendations.push(
      "Decor Specialists: No core decor lead – this is critical for design quality. Hire at least 1 strong decor head."
    );
  } else if (decorCount === 1 && weddingsCapacity > 4) {
    insights.hiringRecommendations.push(
      "Decor Specialists: Only 1 core lead but capacity > 4 weddings – consider 1 decor assistant or strong freelancer panel."
    );
  }
  if (logCount < 1) {
    insights.hiringRecommendations.push(
      "Logistics: No dedicated core logistics person – high risk for on-ground chaos. Add 1 core or senior freelancer."
    );
  }

  if (insights.hiringRecommendations.length === 0) {
    insights.hiringRecommendations.push(
      "Current role mix looks broadly healthy. Next step could be adding flexible freelancers for peaks instead of fixed salary."
    );
  }

  // Use candidates
  const strongCandidates = candidates.filter((c) => c.fitScore >= 80);
  strongCandidates.forEach((c) => {
    insights.hiringRecommendations.push(
      `High potential candidate: ${c.name} (${c.role}, ${c.city}) – ${c.fitScore}% fit at expected salary ${formatINR(
        c.expectedSalary
      )}. Consider trial event or fast-track hiring.`
    );
  });

  // Salary suggestions: high rating & workload but relatively low salary
  core.forEach((m) => {
    if (m.monthlySalary <= 0) return;
    if (m.rating >= 4.7 && m.workload >= 80) {
      insights.salaryRecommendations.push(
        `${m.name} (${m.role}) is a star: rating ${m.rating.toFixed(
          1
        )}/5 and workload ${m.workload}%. Consider selective salary revision or performance bonus to retain.`
      );
    } else if (m.rating >= 4.5 && m.workload >= 75) {
      insights.salaryRecommendations.push(
        `${m.name} is consistently good and carrying solid workload – track for promotion or increment in next review cycle.`
      );
    }
  });

  if (insights.salaryRecommendations.length === 0) {
    insights.salaryRecommendations.push(
      "No urgent salary corrections detected. You can run your normal yearly increment cycle."
    );
  }

  // Training suggestions
  training.forEach((t) => {
    if (t.status === "Completed" && t.afterScore != null) {
      const delta = t.afterScore - t.beforeScore;
      if (delta >= 2) {
        insights.trainingSuggestions.push(
          `Training “${t.title}” for ${t.assignee} improved from ${t.beforeScore}/10 to ${t.afterScore}/10 – high ROI. Consider rolling this out to more team members in similar roles.`
        );
      }
    } else if (t.status === "Planned") {
      insights.trainingSuggestions.push(
        `Planned training “${t.title}” for ${t.assignee} – ensure it is completed before peak season.`
      );
    }
  });

  if (insights.trainingSuggestions.length === 0) {
    insights.trainingSuggestions.push(
      "No training impact data yet. Start capturing before/after scores to see real skill uplift."
    );
  }

  // Notes
  insights.notes.push(
    "This HR AI Co-pilot is rule-based and runs fully inside Eventura OS (no external API). Later you can connect it to real AI models and live Finance / Events data."
  );
  if (freelancers.length > 0) {
    insights.notes.push(
      `You already have ${freelancers.length} freelancer crew entries – use them smartly for Navratri, Diwali and peak wedding dates instead of over-hiring full-time.`
    );
  }
  if (trainees.length > 0) {
    insights.notes.push(
      `${trainees.length} trainee(s) in the system – define a clear path from trainee → assistant → core staff within 6–12 months to keep them motivated.`
    );
  }

  return insights;
}

/* ========= Main Page ========= */

type HRView = "overview" | "team" | "hiring" | "training" | "ai";

export default function HRPage() {
  const [user, setUser] = useState<User | null>(null);

  const [team, setTeam] = useState<TeamMember[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [training, setTraining] = useState<TrainingItem[]>([]);

  const [view, setView] = useState<HRView>("overview");

  // Edit state for team
  const [editingMemberId, setEditingMemberId] = useState<number | null>(null);
  const [memberForm, setMemberForm] = useState({
    name: "",
    role: "Event Manager" as StaffRole,
    city: "Surat",
    status: "Core" as StaffStatus,
    workload: "70",
    monthlySalary: "30000",
    eventsThisMonth: "3",
    rating: "4.5",
    skills: "Planning, Coordination",
  });

  // Edit state for candidates
  const [editingCandidateId, setEditingCandidateId] = useState<number | null>(
    null
  );
  const [candidateForm, setCandidateForm] = useState({
    name: "",
    role: "Event Manager" as StaffRole,
    city: "Surat",
    expectedSalary: "30000",
    stage: "Sourced" as HiringStage,
    fitScore: "70",
  });

  // Edit state for training
  const [editingTrainingId, setEditingTrainingId] = useState<number | null>(
    null
  );
  const [trainingForm, setTrainingForm] = useState({
    title: "",
    roleTarget: "All" as TrainingItem["roleTarget"],
    assignee: "",
    status: "Planned" as TrainingItem["status"],
    beforeScore: "5",
    afterScore: "",
  });

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

  // Load HR data
  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      const teamStored = window.localStorage.getItem(HR_TEAM_KEY);
      if (teamStored) {
        const parsed: TeamMember[] = JSON.parse(teamStored);
        if (Array.isArray(parsed)) {
          setTeam(parsed);
        } else {
          setTeam(seedTeam);
        }
      } else {
        setTeam(seedTeam);
        window.localStorage.setItem(HR_TEAM_KEY, JSON.stringify(seedTeam));
      }

      const candStored = window.localStorage.getItem(HR_CANDIDATES_KEY);
      if (candStored) {
        const parsed: Candidate[] = JSON.parse(candStored);
        if (Array.isArray(parsed)) {
          setCandidates(parsed);
        } else {
          setCandidates(seedCandidates);
        }
      } else {
        setCandidates(seedCandidates);
        window.localStorage.setItem(
          HR_CANDIDATES_KEY,
          JSON.stringify(seedCandidates)
        );
      }

      const trainStored = window.localStorage.getItem(HR_TRAINING_KEY);
      if (trainStored) {
        const parsed: TrainingItem[] = JSON.parse(trainStored);
        if (Array.isArray(parsed)) {
          setTraining(parsed);
        } else {
          setTraining(seedTraining);
        }
      } else {
        setTraining(seedTraining);
        window.localStorage.setItem(
          HR_TRAINING_KEY,
          JSON.stringify(seedTraining)
        );
      }
    } catch {
      setTeam(seedTeam);
      setCandidates(seedCandidates);
      setTraining(seedTraining);
    }
  }, []);

  // Persist HR data
  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(HR_TEAM_KEY, JSON.stringify(team));
  }, [team]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(HR_CANDIDATES_KEY, JSON.stringify(candidates));
  }, [candidates]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(HR_TRAINING_KEY, JSON.stringify(training));
  }, [training]);

  const summary = useMemo(() => {
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

  const insights = useMemo(
    () => computeHRInsights(team, candidates, training),
    [team, candidates, training]
  );

  const isCEO = user?.role === "CEO";

  /* ====== Handlers: Team ====== */

  const startNewMember = () => {
    setEditingMemberId(null);
    setMemberForm({
      name: "",
      role: "Event Manager",
      city: "Surat",
      status: "Core",
      workload: "70",
      monthlySalary: "30000",
      eventsThisMonth: "3",
      rating: "4.2",
      skills: "Coordination, Client Handling",
    });
  };

  const startEditMember = (member: TeamMember) => {
    setEditingMemberId(member.id);
    setMemberForm({
      name: member.name,
      role: member.role,
      city: member.city,
      status: member.status,
      workload: member.workload.toString(),
      monthlySalary: member.monthlySalary.toString(),
      eventsThisMonth: member.eventsThisMonth.toString(),
      rating: member.rating.toString(),
      skills: member.skills.join(", "),
    });
  };

  const handleMemberFormChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setMemberForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleMemberSave = (e: React.FormEvent) => {
    e.preventDefault();

    if (!memberForm.name.trim()) {
      alert("Name is required");
      return;
    }

    const workload = Number(memberForm.workload) || 0;
    const monthlySalary = Number(memberForm.monthlySalary) || 0;
    const eventsThisMonth = Number(memberForm.eventsThisMonth) || 0;
    const rating = Number(memberForm.rating) || 0;
    const skills = memberForm.skills
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    if (editingMemberId == null) {
      const maxId = team.reduce((max, m) => Math.max(max, m.id), 0);
      const newMember: TeamMember = {
        id: maxId + 1,
        name: memberForm.name.trim(),
        role: memberForm.role as StaffRole,
        city: memberForm.city.trim(),
        status: memberForm.status as StaffStatus,
        workload,
        monthlySalary,
        eventsThisMonth,
        rating,
        skills,
      };
      setTeam([...team, newMember]);
    } else {
      setTeam(
        team.map((m) =>
          m.id === editingMemberId
            ? {
                ...m,
                name: memberForm.name.trim(),
                role: memberForm.role as StaffRole,
                city: memberForm.city.trim(),
                status: memberForm.status as StaffStatus,
                workload,
                monthlySalary,
                eventsThisMonth,
                rating,
                skills,
              }
            : m
        )
      );
    }

    setEditingMemberId(null);
  };

  const handleMemberDelete = (member: TeamMember) => {
    if (
      !window.confirm(`Remove ${member.name} (${member.role}) from HR records?`)
    )
      return;
    setTeam(team.filter((m) => m.id !== member.id));
    if (editingMemberId === member.id) {
      setEditingMemberId(null);
    }
  };

  /* ====== Handlers: Candidates ====== */

  const startNewCandidate = () => {
    setEditingCandidateId(null);
    setCandidateForm({
      name: "",
      role: "Event Manager",
      city: "Surat",
      expectedSalary: "30000",
      stage: "Sourced",
      fitScore: "70",
    });
  };

  const startEditCandidate = (cand: Candidate) => {
    setEditingCandidateId(cand.id);
    setCandidateForm({
      name: cand.name,
      role: cand.role,
      city: cand.city,
      expectedSalary: cand.expectedSalary.toString(),
      stage: cand.stage,
      fitScore: cand.fitScore.toString(),
    });
  };

  const handleCandidateFormChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setCandidateForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleCandidateSave = (e: React.FormEvent) => {
    e.preventDefault();

    if (!candidateForm.name.trim()) {
      alert("Candidate name is required");
      return;
    }

    const expectedSalary = Number(candidateForm.expectedSalary) || 0;
    const fitScore = Number(candidateForm.fitScore) || 0;

    if (editingCandidateId == null) {
      const maxId = candidates.reduce((max, c) => Math.max(max, c.id), 0);
      const newCand: Candidate = {
        id: maxId + 1,
        name: candidateForm.name.trim(),
        role: candidateForm.role as StaffRole,
        city: candidateForm.city.trim(),
        expectedSalary,
        stage: candidateForm.stage as HiringStage,
        fitScore,
      };
      setCandidates([...candidates, newCand]);
    } else {
      setCandidates(
        candidates.map((c) =>
          c.id === editingCandidateId
            ? {
                ...c,
                name: candidateForm.name.trim(),
                role: candidateForm.role as StaffRole,
                city: candidateForm.city.trim(),
                expectedSalary,
                stage: candidateForm.stage as HiringStage,
                fitScore,
              }
            : c
        )
      );
    }

    setEditingCandidateId(null);
  };

  const handleCandidateDelete = (cand: Candidate) => {
    if (!window.confirm(`Remove candidate ${cand.name}?`)) return;
    setCandidates(candidates.filter((c) => c.id !== cand.id));
    if (editingCandidateId === cand.id) setEditingCandidateId(null);
  };

  /* ====== Handlers: Training ====== */

  const startNewTraining = () => {
    setEditingTrainingId(null);
    setTrainingForm({
      title: "",
      roleTarget: "All",
      assignee: "",
      status: "Planned",
      beforeScore: "5",
      afterScore: "",
    });
  };

  const startEditTraining = (t: TrainingItem) => {
    setEditingTrainingId(t.id);
    setTrainingForm({
      title: t.title,
      roleTarget: t.roleTarget,
      assignee: t.assignee,
      status: t.status,
      beforeScore: t.beforeScore.toString(),
      afterScore: t.afterScore != null ? t.afterScore.toString() : "",
    });
  };

  const handleTrainingFormChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setTrainingForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleTrainingSave = (e: React.FormEvent) => {
    e.preventDefault();

    if (!trainingForm.title.trim()) {
      alert("Program title is required");
      return;
    }

    const beforeScore = Number(trainingForm.beforeScore) || 0;
    const afterScore = trainingForm.afterScore
      ? Number(trainingForm.afterScore)
      : undefined;

    if (editingTrainingId == null) {
      const maxId = training.reduce((max, t) => Math.max(max, t.id), 0);
      const newItem: TrainingItem = {
        id: maxId + 1,
        title: trainingForm.title.trim(),
        roleTarget: trainingForm.roleTarget,
        assignee: trainingForm.assignee.trim(),
        status: trainingForm.status,
        beforeScore,
        afterScore: afterScore && !isNaN(afterScore) ? afterScore : undefined,
      };
      setTraining([...training, newItem]);
    } else {
      setTraining(
        training.map((t) =>
          t.id === editingTrainingId
            ? {
                ...t,
                title: trainingForm.title.trim(),
                roleTarget: trainingForm.roleTarget,
                assignee: trainingForm.assignee.trim(),
                status: trainingForm.status,
                beforeScore,
                afterScore:
                  afterScore && !isNaN(afterScore) ? afterScore : undefined,
              }
            : t
        )
      );
    }

    setEditingTrainingId(null);
  };

  const handleTrainingDelete = (t: TrainingItem) => {
    if (!window.confirm(`Remove training program “${t.title}”?`)) return;
    setTraining(training.filter((x) => x.id !== t.id));
    if (editingTrainingId === t.id) setEditingTrainingId(null);
  };

  if (!user) return null;

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
                Manage core staff, freelancers, hiring pipeline and training –
                with Eventura HR AI Co-pilot watching burnout, hiring needs and
                capacity.
              </p>
            </div>
            <div className="eventura-chips-row">
              <button
                type="button"
                className={
                  "eventura-tag " +
                  (view === "overview"
                    ? "eventura-tag-blue"
                    : "eventura-tag-amber")
                }
                onClick={() => setView("overview")}
              >
                Org overview
              </button>
              <button
                type="button"
                className={
                  "eventura-tag " +
                  (view === "team" ? "eventura-tag-blue" : "eventura-tag-amber")
                }
                onClick={() => setView("team")}
              >
                Team & Crew
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
                Hiring & Candidates
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
              <button
                type="button"
                className={
                  "eventura-tag " +
                  (view === "ai" ? "eventura-tag-blue" : "eventura-tag-amber")
                }
                onClick={() => setView("ai")}
              >
                HR AI Co-pilot
              </button>
            </div>
          </div>

          {/* Different views */}
          {view === "overview" && (
            <HROverviewView
              summary={summary}
              team={team}
              candidates={candidates}
              training={training}
              insights={insights}
              isCEO={isCEO}
            />
          )}

          {view === "team" && (
            <HRTeamView
              team={team}
              memberForm={memberForm}
              editingMemberId={editingMemberId}
              startNewMember={startNewMember}
              startEditMember={startEditMember}
              onFormChange={handleMemberFormChange}
              onSave={handleMemberSave}
              onDelete={handleMemberDelete}
            />
          )}

          {view === "hiring" && (
            <HRHiringView
              team={team}
              candidates={candidates}
              candidateForm={candidateForm}
              editingCandidateId={editingCandidateId}
              startNewCandidate={startNewCandidate}
              startEditCandidate={startEditCandidate}
              onFormChange={handleCandidateFormChange}
              onSave={handleCandidateSave}
              onDelete={handleCandidateDelete}
            />
          )}

          {view === "training" && (
            <HRTrainingView
              training={training}
              team={team}
              trainingForm={trainingForm}
              editingTrainingId={editingTrainingId}
              startNewTraining={startNewTraining}
              startEditTraining={startEditTraining}
              onFormChange={handleTrainingFormChange}
              onSave={handleTrainingSave}
              onDelete={handleTrainingDelete}
            />
          )}

          {view === "ai" && <HRAIView insights={insights} />}
        </div>
      </div>
    </main>
  );
}

/* ========= Views ========= */

function HROverviewView({
  summary,
  team,
  candidates,
  training,
  insights,
  isCEO,
}: {
  summary: {
    coreCount: number;
    freelancersCount: number;
    traineesCount: number;
    totalCost: number;
    avgWorkload: number;
    roleCounts: Record<StaffRole, number>;
    weddingsCapacity: number;
    corporatesCapacity: number;
  };
  team: TeamMember[];
  candidates: Candidate[];
  training: TrainingItem[];
  insights: HRInsights;
  isCEO: boolean;
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
      return { role, count: 0, avgWorkload: 0 };
    }
    const avg =
      members.reduce((sum, m) => sum + m.workload, 0) / members.length;
    return {
      role,
      count: members.length,
      avgWorkload: Math.round(avg),
    };
  });

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
            {formatINR(summary.totalCost)}
          </p>
          <p className="eventura-card-note">
            Combine with Finance → track HR% of revenue.
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
                      className={"eventura-tag " + gaugeColor(r.avgWorkload)}
                    >
                      {r.avgWorkload}% · {workloadLabel(r.avgWorkload)}
                    </span>
                  )}
                </p>
              </div>
            ))}
          </div>

          <h3
            className="eventura-subsection-title"
            style={{ marginTop: "1rem" }}
          >
            Snapshot: Crew strength
          </h3>
          <ul className="eventura-bullets">
            <li>
              Event Managers: {summary.roleCounts["Event Manager"]} (ideal: 2–4
              at Surat level).
            </li>
            <li>
              Decor Specialists: {summary.roleCounts["Decor Specialist"]} (key
              for design + upsell).
            </li>
            <li>
              Logistics: {summary.roleCounts["Logistics"]} (critical for
              on-ground execution).
            </li>
            <li>
              Sales + Marketing:{" "}
              {summary.roleCounts["Sales"] + summary.roleCounts["Marketing"]}{" "}
              driving leads & topline.
            </li>
          </ul>
          {isCEO && (
            <div className="eventura-actions" style={{ marginTop: "0.8rem" }}>
              <Link href="/finance" className="eventura-button-secondary">
                Open Finance to view HR cost vs revenue
              </Link>
            </div>
          )}
        </div>

        <div className="eventura-panel">
          <h2 className="eventura-panel-title">Eventura HR AI Co-pilot (live)</h2>

          <h3 className="eventura-subsection-title">Burnout & workload</h3>
          <ul className="eventura-bullets">
            {insights.burnoutRisks.map((text, idx) => (
              <li key={idx}>{text}</li>
            ))}
          </ul>

          <h3 className="eventura-subsection-title">Hiring & role coverage</h3>
          <ul className="eventura-bullets">
            {insights.hiringRecommendations.map((text, idx) => (
              <li key={idx}>{text}</li>
            ))}
          </ul>

          <h3 className="eventura-subsection-title">Capacity</h3>
          <ul className="eventura-bullets">
            {insights.capacitySummary.map((text, idx) => (
              <li key={idx}>{text}</li>
            ))}
          </ul>

          <p className="eventura-small-text" style={{ marginTop: "0.8rem" }}>
            This panel is rule-based and recalculates instantly when you edit
            team, candidates or training – no page refresh needed.
          </p>
        </div>
      </section>
    </>
  );
}

function HRTeamView({
  team,
  memberForm,
  editingMemberId,
  startNewMember,
  startEditMember,
  onFormChange,
  onSave,
  onDelete,
}: {
  team: TeamMember[];
  memberForm: {
    name: string;
    role: string;
    city: string;
    status: string;
    workload: string;
    monthlySalary: string;
    eventsThisMonth: string;
    rating: string;
    skills: string;
  };
  editingMemberId: number | null;
  startNewMember: () => void;
  startEditMember: (m: TeamMember) => void;
  onFormChange: (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => void;
  onSave: (e: React.FormEvent) => void;
  onDelete: (m: TeamMember) => void;
}) {
  const sortedTeam = [...team].sort((a, b) => a.id - b.id);

  return (
    <section className="eventura-columns">
      <div className="eventura-panel">
        <div className="eventura-panel-header-row">
          <h2 className="eventura-panel-title">Team & Crew list</h2>
          <button
            type="button"
            className="eventura-tag eventura-tag-blue"
            onClick={startNewMember}
          >
            + New member
          </button>
        </div>
        <div className="eventura-table-wrapper">
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
                <th></th>
              </tr>
            </thead>
            <tbody>
              {sortedTeam.map((m) => (
                <tr key={m.id}>
                  <td>
                    <div className="eventura-list-title">{m.name}</div>
                    <div className="eventura-list-sub">
                      {m.city} · #{m.id}
                    </div>
                  </td>
                  <td>{m.role}</td>
                  <td>{m.status}</td>
                  <td>
                    <span
                      className={"eventura-tag " + gaugeColor(m.workload)}
                    >
                      {m.workload}% · {workloadLabel(m.workload)}
                    </span>
                  </td>
                  <td>{m.eventsThisMonth}</td>
                  <td>
                    {m.monthlySalary > 0
                      ? formatINR(m.monthlySalary)
                      : m.status === "Freelancer"
                      ? "Per-event"
                      : "Unpaid / founder"}
                  </td>
                  <td>{m.rating.toFixed(1)}/5</td>
                  <td style={{ whiteSpace: "nowrap" }}>
                    <button
                      type="button"
                      className="eventura-tag eventura-tag-blue"
                      onClick={() => startEditMember(m)}
                      style={{ marginRight: 4 }}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      className="eventura-tag eventura-tag-amber"
                      onClick={() => onDelete(m)}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
              {sortedTeam.length === 0 && (
                <tr>
                  <td colSpan={8} className="eventura-small-text">
                    No team members yet. Use “New member” to add your first crew
                    entry.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="eventura-panel" style={{ maxWidth: 380 }}>
        <h2 className="eventura-panel-title">
          {editingMemberId == null ? "Add new member" : "Edit member"}
        </h2>
        <form
          onSubmit={onSave}
          className="eventura-form"
          style={{ display: "flex", flexDirection: "column", gap: 8 }}
        >
          <label className="eventura-form-label">
            <span>Name *</span>
            <input
              className="eventura-search"
              name="name"
              value={memberForm.name}
              onChange={onFormChange}
              placeholder="Eg. Senior Event Manager"
            />
          </label>

          <label className="eventura-form-label">
            <span>City</span>
            <input
              className="eventura-search"
              name="city"
              value={memberForm.city}
              onChange={onFormChange}
              placeholder="Eg. Surat"
            />
          </label>

          <div style={{ display: "flex", gap: 8 }}>
            <label className="eventura-form-label" style={{ flex: 1 }}>
              <span>Role</span>
              <select
                className="eventura-search"
                name="role"
                value={memberForm.role}
                onChange={onFormChange}
              >
                <option value="Event Manager">Event Manager</option>
                <option value="Decor Specialist">Decor Specialist</option>
                <option value="Logistics">Logistics</option>
                <option value="Marketing">Marketing</option>
                <option value="Sales">Sales</option>
                <option value="Accountant">Accountant</option>
                <option value="Operations">Operations</option>
              </select>
            </label>
            <label className="eventura-form-label" style={{ flex: 1 }}>
              <span>Status</span>
              <select
                className="eventura-search"
                name="status"
                value={memberForm.status}
                onChange={onFormChange}
              >
                <option value="Core">Core</option>
                <option value="Freelancer">Freelancer</option>
                <option value="Trainee">Trainee</option>
              </select>
            </label>
          </div>

          <div style={{ display: "flex", gap: 8 }}>
            <label className="eventura-form-label" style={{ flex: 1 }}>
              <span>Workload %</span>
              <input
                className="eventura-search"
                name="workload"
                value={memberForm.workload}
                onChange={onFormChange}
                placeholder="Eg. 75"
              />
            </label>
            <label className="eventura-form-label" style={{ flex: 1 }}>
              <span>Events this month</span>
              <input
                className="eventura-search"
                name="eventsThisMonth"
                value={memberForm.eventsThisMonth}
                onChange={onFormChange}
                placeholder="Eg. 4"
              />
            </label>
          </div>

          <label className="eventura-form-label">
            <span>Monthly salary (₹)</span>
            <input
              className="eventura-search"
              name="monthlySalary"
              value={memberForm.monthlySalary}
              onChange={onFormChange}
              placeholder="Eg. 35000"
            />
          </label>

          <label className="eventura-form-label">
            <span>Rating (1–5)</span>
            <input
              className="eventura-search"
              name="rating"
              value={memberForm.rating}
              onChange={onFormChange}
              placeholder="Eg. 4.5"
            />
          </label>

          <label className="eventura-form-label">
            <span>Key skills (comma separated)</span>
            <input
              className="eventura-search"
              name="skills"
              value={memberForm.skills}
              onChange={onFormChange}
              placeholder="Eg. Budgeting, Client Handling, Vendor Management"
            />
          </label>

          <div
            style={{
              display: "flex",
              gap: 8,
              marginTop: 8,
              justifyContent: "space-between",
            }}
          >
            <button
              type="submit"
              className="eventura-button-secondary"
              style={{ flex: 1 }}
            >
              {editingMemberId == null ? "Add member" : "Save changes"}
            </button>
            {editingMemberId != null && (
              <button
                type="button"
                className="eventura-tag eventura-tag-amber"
                style={{ flex: 0.8 }}
                onClick={startNewMember}
              >
                Cancel edit
              </button>
            )}
          </div>
        </form>
        <p className="eventura-small-text" style={{ marginTop: "0.5rem" }}>
          Updating this form instantly refreshes the HR AI Co-pilot and the
          overview capacity calculations.
        </p>
      </div>
    </section>
  );
}

function HRHiringView({
  team,
  candidates,
  candidateForm,
  editingCandidateId,
  startNewCandidate,
  startEditCandidate,
  onFormChange,
  onSave,
  onDelete,
}: {
  team: TeamMember[];
  candidates: Candidate[];
  candidateForm: {
    name: string;
    role: string;
    city: string;
    expectedSalary: string;
    stage: string;
    fitScore: string;
  };
  editingCandidateId: number | null;
  startNewCandidate: () => void;
  startEditCandidate: (c: Candidate) => void;
  onFormChange: (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => void;
  onSave: (e: React.FormEvent) => void;
  onDelete: (c: Candidate) => void;
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

  return (
    <section className="eventura-columns">
      <div className="eventura-panel">
        <div className="eventura-panel-header-row">
          <h2 className="eventura-panel-title">Recruitment Kanban</h2>
          <button
            type="button"
            className="eventura-tag eventura-tag-blue"
            onClick={startNewCandidate}
          >
            + New candidate
          </button>
        </div>

        <div
          className="eventura-grid"
          style={{ gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}
        >
          {stages.map((stage) => {
            const stageCandidates = candidates.filter(
              (c) => c.stage === stage
            );
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
                    <li
                      style={{ color: "#9ca3af", fontSize: "0.8rem" }}
                    >
                      No candidates at this stage yet.
                    </li>
                  )}
                  {stageCandidates.map((c) => (
                    <li key={c.id}>
                      <strong>{c.name}</strong> – {c.role} ·{" "}
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
                        {c.fitScore}% fit
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>

        <h3
          className="eventura-subsection-title"
          style={{ marginTop: "1rem" }}
        >
          Role coverage & alerts
        </h3>
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
                let comment = "Healthy for now.";
                if (role === "Event Manager" && count < 2)
                  comment = "Plan to hire 1 more Event Manager in next 6–9 months.";
                if (role === "Decor Specialist" && count < 1)
                  comment = "Critical: hire strong Decor lead ASAP.";
                if (role === "Logistics" && count < 1)
                  comment = "Missing dedicated logistics – high execution risk.";
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
      </div>

      <div className="eventura-panel" style={{ maxWidth: 380 }}>
        <h2 className="eventura-panel-title">
          {editingCandidateId == null ? "Add candidate" : "Edit candidate"}
        </h2>

        <form
          onSubmit={onSave}
          className="eventura-form"
          style={{ display: "flex", flexDirection: "column", gap: 8 }}
        >
          <label className="eventura-form-label">
            <span>Name *</span>
            <input
              className="eventura-search"
              name="name"
              value={candidateForm.name}
              onChange={onFormChange}
              placeholder="Candidate name"
            />
          </label>

          <label className="eventura-form-label">
            <span>City</span>
            <input
              className="eventura-search"
              name="city"
              value={candidateForm.city}
              onChange={onFormChange}
              placeholder="Eg. Surat"
            />
          </label>

          <div style={{ display: "flex", gap: 8 }}>
            <label className="eventura-form-label" style={{ flex: 1 }}>
              <span>Role</span>
              <select
                className="eventura-search"
                name="role"
                value={candidateForm.role}
                onChange={onFormChange}
              >
                <option value="Event Manager">Event Manager</option>
                <option value="Decor Specialist">Decor Specialist</option>
                <option value="Logistics">Logistics</option>
                <option value="Marketing">Marketing</option>
                <option value="Sales">Sales</option>
                <option value="Accountant">Accountant</option>
                <option value="Operations">Operations</option>
              </select>
            </label>
            <label className="eventura-form-label" style={{ flex: 1 }}>
              <span>Stage</span>
              <select
                className="eventura-search"
                name="stage"
                value={candidateForm.stage}
                onChange={onFormChange}
              >
                <option value="Sourced">Sourced</option>
                <option value="Shortlisted">Shortlisted</option>
                <option value="Interviewed">Interviewed</option>
                <option value="Trial Event">Trial Event</option>
                <option value="Hired">Hired</option>
                <option value="Rejected">Rejected</option>
              </select>
            </label>
          </div>

          <label className="eventura-form-label">
            <span>Expected salary (₹)</span>
            <input
              className="eventura-search"
              name="expectedSalary"
              value={candidateForm.expectedSalary}
              onChange={onFormChange}
              placeholder="Eg. 30000"
            />
          </label>

          <label className="eventura-form-label">
            <span>Fit score (0–100)</span>
            <input
              className="eventura-search"
              name="fitScore"
              value={candidateForm.fitScore}
              onChange={onFormChange}
              placeholder="Eg. 80"
            />
          </label>

          <div
            style={{
              display: "flex",
              gap: 8,
              marginTop: 8,
              justifyContent: "space-between",
            }}
          >
            <button
              type="submit"
              className="eventura-button-secondary"
              style={{ flex: 1 }}
            >
              {editingCandidateId == null ? "Add candidate" : "Save changes"}
            </button>
            {editingCandidateId != null && (
              <button
                type="button"
                className="eventura-tag eventura-tag-amber"
                style={{ flex: 0.8 }}
                onClick={startNewCandidate}
              >
                Cancel edit
              </button>
            )}
          </div>
        </form>

        <h3
          className="eventura-subsection-title"
          style={{ marginTop: "1rem" }}
        >
          Quick actions
        </h3>
        <ul className="eventura-bullets">
          <li>
            Use “Trial Event” stage before “Hired” – this is where you test crew
            in real events.
          </li>
          <li>
            For high-fit candidates, move them quickly – don’t lose them to
            competitors.
          </li>
        </ul>
      </div>
    </section>
  );
}

function HRTrainingView({
  training,
  team,
  trainingForm,
  editingTrainingId,
  startNewTraining,
  startEditTraining,
  onFormChange,
  onSave,
  onDelete,
}: {
  training: TrainingItem[];
  team: TeamMember[];
  trainingForm: {
    title: string;
    roleTarget: TrainingItem["roleTarget"];
    assignee: string;
    status: TrainingItem["status"];
    beforeScore: string;
    afterScore: string;
  };
  editingTrainingId: number | null;
  startNewTraining: () => void;
  startEditTraining: (t: TrainingItem) => void;
  onFormChange: (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => void;
  onSave: (e: React.FormEvent) => void;
  onDelete: (t: TrainingItem) => void;
}) {
  const sortedTraining = [...training].sort((a, b) => a.id - b.id);

  return (
    <section className="eventura-columns">
      <div className="eventura-panel">
        <div className="eventura-panel-header-row">
          <h2 className="eventura-panel-title">Skill & training matrix</h2>
          <button
            type="button"
            className="eventura-tag eventura-tag-blue"
            onClick={startNewTraining}
          >
            + New program
          </button>
        </div>

        <div className="eventura-table-wrapper">
          <table className="eventura-table">
            <thead>
              <tr>
                <th>Program</th>
                <th>Role target</th>
                <th>Assignee</th>
                <th>Status</th>
                <th>Impact</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {sortedTraining.map((t) => (
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
                  <td style={{ whiteSpace: "nowrap" }}>
                    <button
                      type="button"
                      className="eventura-tag eventura-tag-blue"
                      onClick={() => startEditTraining(t)}
                      style={{ marginRight: 4 }}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      className="eventura-tag eventura-tag-amber"
                      onClick={() => onDelete(t)}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
              {sortedTraining.length === 0 && (
                <tr>
                  <td colSpan={6} className="eventura-small-text">
                    No training programs yet. Start with 1–2 core topics like
                    “Client handling” or “Logistics cost control”.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <h3
          className="eventura-subsection-title"
          style={{ marginTop: "1rem" }}
        >
          Team skills snapshot
        </h3>
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
      </div>

      <div className="eventura-panel" style={{ maxWidth: 380 }}>
        <h2 className="eventura-panel-title">
          {editingTrainingId == null ? "Add training program" : "Edit program"}
        </h2>

        <form
          onSubmit={onSave}
          className="eventura-form"
          style={{ display: "flex", flexDirection: "column", gap: 8 }}
        >
          <label className="eventura-form-label">
            <span>Title *</span>
            <input
              className="eventura-search"
              name="title"
              value={trainingForm.title}
              onChange={onFormChange}
              placeholder="Eg. Premium Client Handling"
            />
          </label>

          <label className="eventura-form-label">
            <span>Assignee</span>
            <input
              className="eventura-search"
              name="assignee"
              value={trainingForm.assignee}
              onChange={onFormChange}
              placeholder="Team member's name"
            />
          </label>

          <div style={{ display: "flex", gap: 8 }}>
            <label className="eventura-form-label" style={{ flex: 1 }}>
              <span>Role target</span>
              <select
                className="eventura-search"
                name="roleTarget"
                value={trainingForm.roleTarget}
                onChange={onFormChange}
              >
                <option value="All">All</option>
                <option value="Event Manager">Event Manager</option>
                <option value="Decor Specialist">Decor Specialist</option>
                <option value="Logistics">Logistics</option>
                <option value="Marketing">Marketing</option>
                <option value="Sales">Sales</option>
                <option value="Accountant">Accountant</option>
                <option value="Operations">Operations</option>
              </select>
            </label>

            <label className="eventura-form-label" style={{ flex: 1 }}>
              <span>Status</span>
              <select
                className="eventura-search"
                name="status"
                value={trainingForm.status}
                onChange={onFormChange}
              >
                <option value="Planned">Planned</option>
                <option value="In Progress">In Progress</option>
                <option value="Completed">Completed</option>
              </select>
            </label>
          </div>

          <div style={{ display: "flex", gap: 8 }}>
            <label className="eventura-form-label" style={{ flex: 1 }}>
              <span>Before score (1–10)</span>
              <input
                className="eventura-search"
                name="beforeScore"
                value={trainingForm.beforeScore}
                onChange={onFormChange}
              />
            </label>
            <label className="eventura-form-label" style={{ flex: 1 }}>
              <span>After score (1–10)</span>
              <input
                className="eventura-search"
                name="afterScore"
                value={trainingForm.afterScore}
                onChange={onFormChange}
                placeholder="Optional"
              />
            </label>
          </div>

          <div
            style={{
              display: "flex",
              gap: 8,
              marginTop: 8,
              justifyContent: "space-between",
            }}
          >
            <button
              type="submit"
              className="eventura-button-secondary"
              style={{ flex: 1 }}
            >
              {editingTrainingId == null ? "Add program" : "Save changes"}
            </button>
            {editingTrainingId != null && (
              <button
                type="button"
                className="eventura-tag eventura-tag-amber"
                style={{ flex: 0.8 }}
                onClick={startNewTraining}
              >
                Cancel edit
              </button>
            )}
          </div>
        </form>

        <p className="eventura-small-text" style={{ marginTop: "0.5rem" }}>
          When you fill before/after scores, the HR AI Co-pilot can highlight
          which trainings actually drive real improvement.
        </p>
      </div>
    </section>
  );
}

function HRAIView({ insights }: { insights: HRInsights }) {
  return (
    <section className="eventura-columns">
      <div className="eventura-panel">
        <h2 className="eventura-panel-title">HR AI Co-pilot – deep insights</h2>

        <h3 className="eventura-subsection-title">Burnout & workload</h3>
        <ul className="eventura-bullets">
          {insights.burnoutRisks.map((text, idx) => (
            <li key={idx}>{text}</li>
          ))}
        </ul>

        <h3 className="eventura-subsection-title">Hiring & crew mix</h3>
        <ul className="eventura-bullets">
          {insights.hiringRecommendations.map((text, idx) => (
            <li key={idx}>{text}</li>
          ))}
        </ul>

        <h3 className="eventura-subsection-title">Capacity & scale</h3>
        <ul className="eventura-bullets">
          {insights.capacitySummary.map((text, idx) => (
            <li key={idx}>{text}</li>
          ))}
        </ul>
      </div>

      <div className="eventura-panel">
        <h2 className="eventura-panel-title">Salary & training suggestions</h2>

        <h3 className="eventura-subsection-title">Salary / promotion</h3>
        <ul className="eventura-bullets">
          {insights.salaryRecommendations.map((text, idx) => (
            <li key={idx}>{text}</li>
          ))}
        </ul>

        <h3 className="eventura-subsection-title">Training ROI</h3>
        <ul className="eventura-bullets">
          {insights.trainingSuggestions.map((text, idx) => (
            <li key={idx}>{text}</li>
          ))}
        </ul>

        <h3 className="eventura-subsection-title">System notes</h3>
        <ul className="eventura-bullets">
          {insights.notes.map((text, idx) => (
            <li key={idx}>{text}</li>
          ))}
        </ul>

        <p className="eventura-small-text" style={{ marginTop: "0.8rem" }}>
          This is a rule-based engine running locally. In the future, you can
          connect it to real AI models and live data from Finance, Events,
          Calendar and even feedback forms.
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
