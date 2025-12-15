"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";

/* =========================================================
   EVENTURA OS — FINANCE (Advanced + Smart + Indian GST Invoice)
   File: app/finance/page.tsx
   ✅ Vercel-safe (client only)
   ✅ Works with localStorage
   ✅ Indian GST Invoice: CGST/SGST vs IGST auto
   ✅ Mark Invoice Paid → auto posts revenue + GST payable transactions
========================================================= */

/* ================= AUTH ================= */
type Role = "CEO" | "Staff";
type User = { name: string; role: Role; city: string };

const USER_KEY = "eventura-user";
const FIN_TX_KEY = "eventura-finance-transactions-v2";
const FIN_INV_KEY = "eventura-finance-invoices-gst-v2";

/* ================= GST PROFILE ================= */
type GSTProfile = {
  legalName: string;
  gstin: string;
  state: string;
  stateCode: string;
  address: string;
  bankName: string;
  accountNo: string;
  ifsc: string;
  pan: string;
};

const COMPANY_GST: GSTProfile = {
  legalName: "Eventura Events & Weddings LLP",
  gstin: "24ABCDE1234F1Z5",
  state: "Gujarat",
  stateCode: "24",
  address: "Surat, Gujarat, India",
  bankName: "HDFC Bank",
  accountNo: "XXXXXXXX1234",
  ifsc: "HDFC0001234",
  pan: "ABCDE1234F",
};

/* ================= FINANCE TYPES ================= */
type TxType = "Income" | "Expense";
type TxStatus = "Cleared" | "Pending";

type FinanceTx = {
  id: number;
  date: string; // YYYY-MM-DD
  type: TxType;
  status: TxStatus;
  category: string;
  description: string;
  amount: number; // numeric
  fromAccount: string; // e.g., Bank/Cash/Receivable
  toAccount: string; // e.g., Revenue/Payable/Vendor
  createdBy: string;
  relatedInvoiceId?: number;
};

type InvoiceStatus = "Draft" | "Sent" | "Paid" | "Cancelled";
type GSTType = "CGST_SGST" | "IGST";

type InvoiceItem = {
  id: number;
  name: string;
  qty: number;
  rate: number;
};

type Invoice = {
  id: number;
  invoiceNo: string;
  date: string; // YYYY-MM-DD
  dueDate: string; // YYYY-MM-DD
  clientName: string;
  clientGSTIN?: string;
  eventName?: string;
  city?: string;
  status: InvoiceStatus;
  items: InvoiceItem[];
  notes: string;
  createdBy: string;
  paidDate?: string;

  // GST
  placeOfSupply: string; // e.g. Gujarat / Maharashtra
  hsn: string; // SAC/HSN
  gstRate: number; // 18
  gstType: GSTType;
};

/* ================= HELPERS ================= */
function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function addDaysISO(baseISO: string, days: number) {
  const d = new Date(baseISO);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function fmtINR(n: number) {
  return n.toLocaleString("en-IN", { maximumFractionDigits: 0 });
}

function safeNum(v: any, fallback = 0): number {
  const n = typeof v === "number" ? v : parseFloat(String(v ?? ""));
  return Number.isFinite(n) ? n : fallback;
}

function invSubTotal(inv: Invoice): number {
  return (inv.items ?? []).reduce((sum, it) => sum + (it.qty || 0) * (it.rate || 0), 0);
}

function calcGST(taxable: number, rate: number, type: GSTType) {
  const gst = (taxable * rate) / 100;
  if (type === "IGST") {
    return { taxable, igst: gst, cgst: 0, sgst: 0, total: taxable + gst };
  }
  return { taxable, igst: 0, cgst: gst / 2, sgst: gst / 2, total: taxable + gst };
}

function detectGSTType(placeOfSupply: string) {
  const pos = (placeOfSupply || "").trim().toLowerCase();
  const sameState = pos === "gujarat" || pos.includes("gujarat");
  return sameState ? ("CGST_SGST" as const) : ("IGST" as const);
}

function nextInvoiceNo(existing: Invoice[]) {
  // EV-YYYY-0001
  const year = new Date().getFullYear();
  const prefix = `EV-${year}-`;
  const nums = existing
    .map((i) => i.invoiceNo)
    .filter((no) => no.startsWith(prefix))
    .map((no) => parseInt(no.replace(prefix, ""), 10))
    .filter((n) => Number.isFinite(n));
  const next = (nums.length ? Math.max(...nums) : 0) + 1;
  return `${prefix}${String(next).padStart(4, "0")}`;
}

function amountInWordsSimpleINR(total: number) {
  // Keep it simple & safe (no huge word lib)
  return `Rupees ${fmtINR(Math.round(total))} only`;
}

/* ================= PAGE ================= */
export default function FinancePage() {
  const [user, setUser] = useState<User | null>(null);
  const [tx, setTx] = useState<FinanceTx[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [view, setView] = useState<"dashboard" | "transactions" | "invoices">("dashboard");

  // filters
  const [monthFilter, setMonthFilter] = useState<string>(() => todayISO().slice(0, 7)); // YYYY-MM
  const [search, setSearch] = useState("");

  // transaction form
  const [txDraft, setTxDraft] = useState<Omit<FinanceTx, "id" | "createdBy">>({
    date: todayISO(),
    type: "Expense",
    status: "Cleared",
    category: "General",
    description: "",
    amount: 0,
    fromAccount: "Bank",
    toAccount: "Vendor",
  });

  // invoice form
  const [invDraft, setInvDraft] = useState<Omit<Invoice, "id" | "invoiceNo" | "createdBy">>({
    date: todayISO(),
    dueDate: addDaysISO(todayISO(), 7),
    clientName: "",
    clientGSTIN: "",
    eventName: "",
    city: "",
    status: "Draft",
    items: [{ id: 1, name: "Event Planning & Management", qty: 1, rate: 100000 }],
    notes: "",

    placeOfSupply: "Gujarat",
    hsn: "9983",
    gstRate: 18,
    gstType: "CGST_SGST",
  });

  // auth
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

  // load
  useEffect(() => {
    if (typeof window === "undefined") return;

    // tx
    const rawTx = window.localStorage.getItem(FIN_TX_KEY);
    if (rawTx) {
      try {
        const parsed = JSON.parse(rawTx) as FinanceTx[];
        setTx(Array.isArray(parsed) ? parsed : []);
      } catch {
        setTx([]);
      }
    } else {
      // seed
      const seed: FinanceTx[] = [
        {
          id: Date.now(),
          date: todayISO(),
          type: "Income",
          status: "Cleared",
          category: "Revenue",
          description: "Advance received - Patel Wedding",
          amount: 250000,
          fromAccount: "Bank",
          toAccount: "Revenue",
          createdBy: "System",
        },
        {
          id: Date.now() + 1,
          date: todayISO(),
          type: "Expense",
          status: "Cleared",
          category: "Marketing",
          description: "Instagram Ads",
          amount: 12000,
          fromAccount: "Bank",
          toAccount: "Marketing",
          createdBy: "System",
        },
      ];
      setTx(seed);
      window.localStorage.setItem(FIN_TX_KEY, JSON.stringify(seed));
    }

    // invoices
    const rawInv = window.localStorage.getItem(FIN_INV_KEY);
    if (rawInv) {
      try {
        const parsed = JSON.parse(rawInv) as Invoice[];
        setInvoices(Array.isArray(parsed) ? parsed : []);
      } catch {
        setInvoices([]);
      }
    } else {
      setInvoices([]);
      window.localStorage.setItem(FIN_INV_KEY, JSON.stringify([]));
    }
  }, []);

  // persist
  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(FIN_TX_KEY, JSON.stringify(tx));
  }, [tx]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(FIN_INV_KEY, JSON.stringify(invoices));
  }, [invoices]);

  const monthTx = useMemo(() => {
    const m = monthFilter;
    return tx.filter((t) => (t.date || "").startsWith(m));
  }, [tx, monthFilter]);

  const kpis = useMemo(() => {
    const income = monthTx.filter((t) => t.type === "Income").reduce((s, t) => s + t.amount, 0);
    const expense = monthTx.filter((t) => t.type === "Expense").reduce((s, t) => s + t.amount, 0);

    const profit = income - expense;

    // GST Payable estimate from posted tax transactions (category Tax)
    const gstPayable = monthTx
      .filter((t) => t.category === "Tax" && t.type === "Expense")
      .reduce((s, t) => s + t.amount, 0);

    // receivables: Sent invoices not paid
    const receivable = invoices
      .filter((i) => i.status === "Sent" || i.status === "Draft")
      .reduce((s, i) => s + calcGST(invSubTotal(i), i.gstRate, i.gstType).total, 0);

    // cash snapshot (super simple): cleared income - cleared expense
    const clearedIncome = monthTx.filter((t) => t.type === "Income" && t.status === "Cleared").reduce((s, t) => s + t.amount, 0);
    const clearedExpense = monthTx.filter((t) => t.type === "Expense" && t.status === "Cleared").reduce((s, t) => s + t.amount, 0);
    const cashNet = clearedIncome - clearedExpense;

    return { income, expense, profit, gstPayable, receivable, cashNet };
  }, [monthTx, invoices]);

  if (!user) return null;
  const isCEO = user.role === "CEO";

  // --- actions: transactions ---
  function addTx(e: React.FormEvent) {
    e.preventDefault();
    if (!txDraft.date || !txDraft.description || !txDraft.category) {
      alert("Date, category and description are required.");
      return;
    }
    const amount = safeNum(txDraft.amount, 0);
    if (amount <= 0) {
      alert("Amount must be greater than 0.");
      return;
    }
    const newTx: FinanceTx = {
      id: Date.now(),
      ...txDraft,
      amount,
     createdBy: user?.name ?? "System",
    };
    setTx((p) => [newTx, ...p]);
    setTxDraft({
      date: todayISO(),
      type: "Expense",
      status: "Cleared",
      category: "General",
      description: "",
      amount: 0,
      fromAccount: "Bank",
      toAccount: "Vendor",
    });
  }

  function deleteTx(id: number) {
    if (!confirm("Delete this transaction?")) return;
    setTx((p) => p.filter((t) => t.id !== id));
  }

  // --- actions: invoices ---
  function createInvoice(e: React.FormEvent) {
    e.preventDefault();
    if (!invDraft.clientName.trim()) {
      alert("Client name is required.");
      return;
    }
    if (!invDraft.date) {
      alert("Invoice date is required.");
      return;
    }
    if (!invDraft.items?.length) {
      alert("Add at least 1 item.");
      return;
    }
    const cleanedItems = invDraft.items
      .filter((it) => it.name.trim())
      .map((it, idx) => ({
        id: it.id || idx + 1,
        name: it.name,
        qty: Math.max(1, safeNum(it.qty, 1)),
        rate: Math.max(0, safeNum(it.rate, 0)),
      }));

    const inv: Invoice = {
      id: Date.now(),
      invoiceNo: nextInvoiceNo(invoices),
      ...invDraft,
      clientGSTIN: (invDraft.clientGSTIN || "").trim() || undefined,
      items: cleanedItems,
      createdBy: user.name,
      gstType: detectGSTType(invDraft.placeOfSupply),
    };

    setInvoices((p) => [inv, ...p]);

    // reset
    setInvDraft({
      date: todayISO(),
      dueDate: addDaysISO(todayISO(), 7),
      clientName: "",
      clientGSTIN: "",
      eventName: "",
      city: "",
      status: "Draft",
      items: [{ id: 1, name: "Event Planning & Management", qty: 1, rate: 100000 }],
      notes: "",
      placeOfSupply: "Gujarat",
      hsn: "9983",
      gstRate: 18,
      gstType: "CGST_SGST",
    });

    setView("invoices");
  }

  function setInvoiceStatus(id: number, status: InvoiceStatus) {
    setInvoices((p) => p.map((i) => (i.id === id ? { ...i, status } : i)));
  }

  function deleteInvoice(id: number) {
    if (!confirm("Delete this invoice?")) return;
    setInvoices((p) => p.filter((i) => i.id !== id));
  }

  function markInvoicePaid(id: number) {
    const inv = invoices.find((i) => i.id === id);
    if (!inv) return;

    const paidDate = todayISO();
    const sub = invSubTotal(inv);
    const gst = calcGST(sub, inv.gstRate, inv.gstType);

    // Revenue tx = TOTAL (taxable + GST)
    const revenueTx: FinanceTx = {
      id: Date.now(),
      date: paidDate,
      type: "Income",
      status: "Cleared",
      category: "Revenue",
      description: `Invoice paid: ${inv.invoiceNo} - ${inv.clientName}`,
      amount: gst.total,
      fromAccount: "Bank",
      toAccount: "Revenue",
      createdBy: user.name,
      relatedInvoiceId: inv.id,
    };

    // GST Payable postings (kept as Expense/Tax → Payable bucket, so you track liability)
    const taxTx: FinanceTx[] = [];
    if (inv.gstType === "IGST") {
      taxTx.push({
        id: Date.now() + 11,
        date: paidDate,
        type: "Expense",
        status: "Cleared",
        category: "Tax",
        description: `IGST payable (${inv.gstRate}%) – ${inv.invoiceNo}`,
        amount: gst.igst,
        fromAccount: "Bank",
        toAccount: "GST Payable",
        createdBy: user.name,
        relatedInvoiceId: inv.id,
      });
    } else {
      taxTx.push(
        {
          id: Date.now() + 12,
          date: paidDate,
          type: "Expense",
          status: "Cleared",
          category: "Tax",
          description: `CGST payable (${inv.gstRate / 2}%) – ${inv.invoiceNo}`,
          amount: gst.cgst,
          fromAccount: "Bank",
          toAccount: "GST Payable",
          createdBy: user.name,
          relatedInvoiceId: inv.id,
        },
        {
          id: Date.now() + 13,
          date: paidDate,
          type: "Expense",
          status: "Cleared",
          category: "Tax",
          description: `SGST payable (${inv.gstRate / 2}%) – ${inv.invoiceNo}`,
          amount: gst.sgst,
          fromAccount: "Bank",
          toAccount: "GST Payable",
          createdBy: user.name,
          relatedInvoiceId: inv.id,
        }
      );
    }

    setTx((p) => [revenueTx, ...taxTx, ...p]);
    setInvoices((p) =>
      p.map((i) => (i.id === id ? { ...i, status: "Paid", paidDate } : i))
    );
  }

  // filtered tables
  const txFiltered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = monthTx.slice().sort((a, b) => (b.date || "").localeCompare(a.date || ""));
    if (!q) return list;
    return list.filter((t) => {
      return (
        (t.description || "").toLowerCase().includes(q) ||
        (t.category || "").toLowerCase().includes(q) ||
        (t.type || "").toLowerCase().includes(q) ||
        (t.fromAccount || "").toLowerCase().includes(q) ||
        (t.toAccount || "").toLowerCase().includes(q)
      );
    });
  }, [monthTx, search]);

  const invFiltered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = invoices.slice().sort((a, b) => (b.date || "").localeCompare(a.date || ""));
    if (!q) return list;
    return list.filter((i) => {
      const total = calcGST(invSubTotal(i), i.gstRate, i.gstType).total;
      return (
        (i.invoiceNo || "").toLowerCase().includes(q) ||
        (i.clientName || "").toLowerCase().includes(q) ||
        (i.eventName || "").toLowerCase().includes(q) ||
        (i.city || "").toLowerCase().includes(q) ||
        String(total).includes(q)
      );
    });
  }, [invoices, search]);

  const invPreviewTotals = useMemo(() => {
    const sub = invDraft.items.reduce((s, it) => s + safeNum(it.qty, 1) * safeNum(it.rate, 0), 0);
    const gstType = detectGSTType(invDraft.placeOfSupply);
    return calcGST(sub, safeNum(invDraft.gstRate, 18), gstType);
  }, [invDraft.items, invDraft.gstRate, invDraft.placeOfSupply]);

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
              <h1 className="eventura-page-title">Finance</h1>
              <p className="eventura-subtitle">
                Smart, auto & GST-ready finance for Eventura OS.
              </p>
            </div>
            <div className="eventura-chips-row">
              <button
                type="button"
                className={"eventura-tag " + (view === "dashboard" ? "eventura-tag-blue" : "eventura-tag-amber")}
                onClick={() => setView("dashboard")}
              >
                Dashboard
              </button>
              <button
                type="button"
                className={"eventura-tag " + (view === "transactions" ? "eventura-tag-blue" : "eventura-tag-amber")}
                onClick={() => setView("transactions")}
              >
                Transactions
              </button>
              <button
                type="button"
                className={"eventura-tag " + (view === "invoices" ? "eventura-tag-blue" : "eventura-tag-amber")}
                onClick={() => setView("invoices")}
              >
                GST Invoices
              </button>
            </div>
          </div>

          {/* Global controls */}
          <section className="eventura-columns" style={{ marginTop: "0.8rem" }}>
            <div className="eventura-panel">
              <h2 className="eventura-panel-title">Filters</h2>
              <div className="eventura-form-grid">
                <div className="eventura-field">
                  <label className="eventura-label">Month (YYYY-MM)</label>
                  <input
                    className="eventura-input"
                    value={monthFilter}
                    onChange={(e) => setMonthFilter(e.target.value)}
                    placeholder="2025-12"
                  />
                </div>
                <div className="eventura-field">
                  <label className="eventura-label">Search</label>
                  <input
                    className="eventura-input"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search invoices / transactions..."
                  />
                </div>
              </div>
              <p className="eventura-small-text" style={{ marginTop: "0.5rem" }}>
                Tip: Use month like <b>2025-12</b> to view that month’s P&L & GST.
              </p>
            </div>

            <div className="eventura-panel">
              <h2 className="eventura-panel-title">Quick KPIs ({monthFilter})</h2>
              <div className="eventura-kpi-row">
                <div className="eventura-card">
                  <div className="eventura-card-label">Income</div>
                  <div className="eventura-card-value">₹{fmtINR(kpis.income)}</div>
                  <div className="eventura-card-note">Cleared + pending included</div>
                </div>
                <div className="eventura-card">
                  <div className="eventura-card-label">Expenses</div>
                  <div className="eventura-card-value">₹{fmtINR(kpis.expense)}</div>
                  <div className="eventura-card-note">Including vendor + ops</div>
                </div>
                <div className="eventura-card">
                  <div className="eventura-card-label">Profit</div>
                  <div className="eventura-card-value">₹{fmtINR(kpis.profit)}</div>
                  <div className="eventura-card-note">Income − Expense</div>
                </div>
                <div className="eventura-card">
                  <div className="eventura-card-label">GST Payable (est.)</div>
                  <div className="eventura-card-value">₹{fmtINR(kpis.gstPayable)}</div>
                  <div className="eventura-card-note">From posted tax lines</div>
                </div>
              </div>

              <div className="eventura-kpi-row" style={{ marginTop: "0.6rem" }}>
                <div className="eventura-card">
                  <div className="eventura-card-label">Receivable (Open invoices)</div>
                  <div className="eventura-card-value">₹{fmtINR(kpis.receivable)}</div>
                  <div className="eventura-card-note">Draft/Sent totals</div>
                </div>
                <div className="eventura-card">
                  <div className="eventura-card-label">Cash Net (Cleared)</div>
                  <div className="eventura-card-value">₹{fmtINR(kpis.cashNet)}</div>
                  <div className="eventura-card-note">Cleared income − cleared expense</div>
                </div>
              </div>
            </div>
          </section>

          {/* DASHBOARD */}
          {view === "dashboard" && (
            <section className="eventura-columns" style={{ marginTop: "0.8rem" }}>
              <div className="eventura-panel">
                <h2 className="eventura-panel-title">Smart actions</h2>
                <ul className="eventura-bullets">
                  <li>Create GST invoices and mark them paid → auto posts revenue + tax payable.</li>
                  <li>Use Transactions for vendor payments, marketing, salaries, rent, etc.</li>
                  <li>Keep Place of Supply correct to auto-select IGST vs CGST/SGST.</li>
                </ul>
                <div className="eventura-actions" style={{ marginTop: "0.8rem" }}>
                  <button className="eventura-button" onClick={() => setView("invoices")} type="button">
                    + Create GST Invoice
                  </button>
                  <button className="eventura-button-secondary" onClick={() => setView("transactions")} type="button">
                    + Add Transaction
                  </button>
                  {isCEO && (
                    <Link className="eventura-button-secondary" href="/reports">
                      Open Reports
                    </Link>
                  )}
                </div>
              </div>

              <div className="eventura-panel">
                <h2 className="eventura-panel-title">GST Snapshot ({monthFilter})</h2>
                <div className="eventura-table-wrapper">
                  <table className="eventura-table">
                    <thead>
                      <tr>
                        <th>Type</th>
                        <th>Amount (₹)</th>
                        <th>Note</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td>GST Payable (posted)</td>
                        <td>₹{fmtINR(kpis.gstPayable)}</td>
                        <td className="eventura-small-text">From Tax category lines</td>
                      </tr>
                      <tr>
                        <td>Open Receivables</td>
                        <td>₹{fmtINR(kpis.receivable)}</td>
                        <td className="eventura-small-text">Draft/Sent invoices total (incl GST)</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <p className="eventura-small-text" style={{ marginTop: "0.5rem" }}>
                  Next upgrade (if you want): <b>GSTR-1 summary</b> + <b>HSN-wise</b> export.
                </p>
              </div>
            </section>
          )}

          {/* TRANSACTIONS */}
          {view === "transactions" && (
            <section className="eventura-columns" style={{ marginTop: "0.8rem" }}>
              <div className="eventura-panel">
                <h2 className="eventura-panel-title">Add transaction</h2>
                <form className="eventura-form" onSubmit={addTx}>
                  <div className="eventura-form-grid">
                    <div className="eventura-field">
                      <label className="eventura-label">Date</label>
                      <input
                        className="eventura-input"
                        type="date"
                        value={txDraft.date}
                        onChange={(e) => setTxDraft((p) => ({ ...p, date: e.target.value }))}
                      />
                    </div>
                    <div className="eventura-field">
                      <label className="eventura-label">Type</label>
                      <select
                        className="eventura-input"
                        value={txDraft.type}
                        onChange={(e) => setTxDraft((p) => ({ ...p, type: e.target.value as TxType }))}
                      >
                        <option>Income</option>
                        <option>Expense</option>
                      </select>
                    </div>
                  </div>

                  <div className="eventura-form-grid">
                    <div className="eventura-field">
                      <label className="eventura-label">Category</label>
                      <input
                        className="eventura-input"
                        value={txDraft.category}
                        onChange={(e) => setTxDraft((p) => ({ ...p, category: e.target.value }))}
                        placeholder="Revenue / Vendor / Salaries / Rent / Marketing / Tax"
                      />
                    </div>
                    <div className="eventura-field">
                      <label className="eventura-label">Status</label>
                      <select
                        className="eventura-input"
                        value={txDraft.status}
                        onChange={(e) => setTxDraft((p) => ({ ...p, status: e.target.value as TxStatus }))}
                      >
                        <option>Cleared</option>
                        <option>Pending</option>
                      </select>
                    </div>
                  </div>

                  <div className="eventura-form-grid">
                    <div className="eventura-field">
                      <label className="eventura-label">Amount (₹)</label>
                      <input
                        className="eventura-input"
                        type="number"
                        value={txDraft.amount}
                        onChange={(e) => setTxDraft((p) => ({ ...p, amount: safeNum(e.target.value, 0) }))}
                      />
                    </div>
                    <div className="eventura-field">
                      <label className="eventura-label">From</label>
                      <input
                        className="eventura-input"
                        value={txDraft.fromAccount}
                        onChange={(e) => setTxDraft((p) => ({ ...p, fromAccount: e.target.value }))}
                        placeholder="Bank / Cash / Receivable"
                      />
                    </div>
                  </div>

                  <div className="eventura-form-grid">
                    <div className="eventura-field">
                      <label className="eventura-label">To</label>
                      <input
                        className="eventura-input"
                        value={txDraft.toAccount}
                        onChange={(e) => setTxDraft((p) => ({ ...p, toAccount: e.target.value }))}
                        placeholder="Revenue / Vendor / GST Payable"
                      />
                    </div>
                    <div className="eventura-field">
                      <label className="eventura-label">Description</label>
                      <input
                        className="eventura-input"
                        value={txDraft.description}
                        onChange={(e) => setTxDraft((p) => ({ ...p, description: e.target.value }))}
                        placeholder="e.g. Decor advance paid, Office rent, Lead payment..."
                      />
                    </div>
                  </div>

                  <div className="eventura-actions" style={{ marginTop: "0.6rem" }}>
                    <button className="eventura-button" type="submit">
                      Save transaction
                    </button>
                  </div>
                </form>
              </div>

              <div className="eventura-panel">
                <h2 className="eventura-panel-title">Transactions ({monthFilter})</h2>
                <div className="eventura-table-wrapper">
                  <table className="eventura-table">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Type</th>
                        <th>Category</th>
                        <th>Description</th>
                        <th>Amount (₹)</th>
                        <th>Status</th>
                        <th />
                      </tr>
                    </thead>
                    <tbody>
                      {txFiltered.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="eventura-small-text" style={{ color: "#9ca3af" }}>
                            No transactions for this filter.
                          </td>
                        </tr>
                      ) : (
                        txFiltered.map((t) => (
                          <tr key={t.id}>
                            <td>{t.date}</td>
                            <td>
                              <span className={"eventura-tag " + (t.type === "Income" ? "eventura-tag-green" : "eventura-tag-amber")}>
                                {t.type}
                              </span>
                            </td>
                            <td>{t.category}</td>
                            <td>
                              <div className="eventura-list-title">{t.description}</div>
                              <div className="eventura-list-sub">
                                {t.fromAccount} → {t.toAccount}
                                {t.relatedInvoiceId ? ` · Invoice# ${t.relatedInvoiceId}` : ""}
                              </div>
                            </td>
                            <td>₹{fmtINR(t.amount)}</td>
                            <td>{t.status}</td>
                            <td>
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
            </section>
          )}

          {/* INVOICES (GST) */}
          {view === "invoices" && (
            <section className="eventura-columns" style={{ marginTop: "0.8rem" }}>
              {/* Create GST invoice */}
              <div className="eventura-panel">
                <h2 className="eventura-panel-title">Create GST Invoice</h2>
                <p className="eventura-small-text">
                  Place of Supply decides tax type automatically: <b>Gujarat</b> → CGST/SGST, other state → IGST.
                </p>

                <form className="eventura-form" onSubmit={createInvoice}>
                  <div className="eventura-form-grid">
                    <div className="eventura-field">
                      <label className="eventura-label">Invoice date</label>
                      <input
                        className="eventura-input"
                        type="date"
                        value={invDraft.date}
                        onChange={(e) => setInvDraft((p) => ({ ...p, date: e.target.value }))}
                      />
                    </div>
                    <div className="eventura-field">
                      <label className="eventura-label">Due date</label>
                      <input
                        className="eventura-input"
                        type="date"
                        value={invDraft.dueDate}
                        onChange={(e) => setInvDraft((p) => ({ ...p, dueDate: e.target.value }))}
                      />
                    </div>
                  </div>

                  <div className="eventura-form-grid">
                    <div className="eventura-field">
                      <label className="eventura-label">Client name</label>
                      <input
                        className="eventura-input"
                        value={invDraft.clientName}
                        onChange={(e) => setInvDraft((p) => ({ ...p, clientName: e.target.value }))}
                        placeholder="Client / Company"
                      />
                    </div>
                    <div className="eventura-field">
                      <label className="eventura-label">Client GSTIN (optional)</label>
                      <input
                        className="eventura-input"
                        value={invDraft.clientGSTIN || ""}
                        onChange={(e) => setInvDraft((p) => ({ ...p, clientGSTIN: e.target.value }))}
                        placeholder="For B2B invoices"
                      />
                    </div>
                  </div>

                  <div className="eventura-form-grid">
                    <div className="eventura-field">
                      <label className="eventura-label">Event name (optional)</label>
                      <input
                        className="eventura-input"
                        value={invDraft.eventName || ""}
                        onChange={(e) => setInvDraft((p) => ({ ...p, eventName: e.target.value }))}
                        placeholder="Patel Wedding / Corporate Gala"
                      />
                    </div>
                    <div className="eventura-field">
                      <label className="eventura-label">City (optional)</label>
                      <input
                        className="eventura-input"
                        value={invDraft.city || ""}
                        onChange={(e) => setInvDraft((p) => ({ ...p, city: e.target.value }))}
                        placeholder="Surat / Ahmedabad / Mumbai"
                      />
                    </div>
                  </div>

                  <h3 className="eventura-subsection-title" style={{ marginTop: "1rem" }}>
                    GST Details
                  </h3>

                  <div className="eventura-form-grid">
                    <div className="eventura-field">
                      <label className="eventura-label">Place of Supply</label>
                      <input
                        className="eventura-input"
                        value={invDraft.placeOfSupply}
                        onChange={(e) =>
                          setInvDraft((p) => ({
                            ...p,
                            placeOfSupply: e.target.value,
                            gstType: detectGSTType(e.target.value),
                          }))
                        }
                        placeholder="Gujarat / Maharashtra / Rajasthan ..."
                      />
                      <div className="eventura-small-text" style={{ marginTop: "0.25rem" }}>
                        Auto: <b>{detectGSTType(invDraft.placeOfSupply) === "IGST" ? "IGST" : "CGST + SGST"}</b>
                      </div>
                    </div>

                    <div className="eventura-field">
                      <label className="eventura-label">HSN / SAC</label>
                      <input
                        className="eventura-input"
                        value={invDraft.hsn}
                        onChange={(e) => setInvDraft((p) => ({ ...p, hsn: e.target.value }))}
                        placeholder="9983"
                      />
                    </div>
                  </div>

                  <div className="eventura-form-grid">
                    <div className="eventura-field">
                      <label className="eventura-label">GST %</label>
                      <input
                        className="eventura-input"
                        type="number"
                        value={invDraft.gstRate}
                        onChange={(e) => setInvDraft((p) => ({ ...p, gstRate: safeNum(e.target.value, 18) }))}
                      />
                    </div>
                    <div className="eventura-field">
                      <label className="eventura-label">Status</label>
                      <select
                        className="eventura-input"
                        value={invDraft.status}
                        onChange={(e) => setInvDraft((p) => ({ ...p, status: e.target.value as InvoiceStatus }))}
                      >
                        <option>Draft</option>
                        <option>Sent</option>
                        <option>Paid</option>
                        <option>Cancelled</option>
                      </select>
                    </div>
                  </div>

                  <h3 className="eventura-subsection-title" style={{ marginTop: "1rem" }}>
                    Items
                  </h3>

                  <div className="eventura-table-wrapper">
                    <table className="eventura-table">
                      <thead>
                        <tr>
                          <th>Item</th>
                          <th>Qty</th>
                          <th>Rate</th>
                          <th>Line Total</th>
                          <th />
                        </tr>
                      </thead>
                      <tbody>
                        {invDraft.items.map((it) => {
                          const line = safeNum(it.qty, 1) * safeNum(it.rate, 0);
                          return (
                            <tr key={it.id}>
                              <td>
                                <input
                                  className="eventura-input"
                                  value={it.name}
                                  onChange={(e) =>
                                    setInvDraft((p) => ({
                                      ...p,
                                      items: p.items.map((x) => (x.id === it.id ? { ...x, name: e.target.value } : x)),
                                    }))
                                  }
                                  placeholder="Event planning / Decor / Management fee..."
                                />
                              </td>
                              <td style={{ width: 90 }}>
                                <input
                                  className="eventura-input"
                                  type="number"
                                  value={it.qty}
                                  onChange={(e) =>
                                    setInvDraft((p) => ({
                                      ...p,
                                      items: p.items.map((x) => (x.id === it.id ? { ...x, qty: safeNum(e.target.value, 1) } : x)),
                                    }))
                                  }
                                />
                              </td>
                              <td style={{ width: 140 }}>
                                <input
                                  className="eventura-input"
                                  type="number"
                                  value={it.rate}
                                  onChange={(e) =>
                                    setInvDraft((p) => ({
                                      ...p,
                                      items: p.items.map((x) => (x.id === it.id ? { ...x, rate: safeNum(e.target.value, 0) } : x)),
                                    }))
                                  }
                                />
                              </td>
                              <td>₹{fmtINR(line)}</td>
                              <td>
                                <button
                                  type="button"
                                  className="eventura-tag eventura-tag-amber"
                                  onClick={() =>
                                    setInvDraft((p) => ({
                                      ...p,
                                      items: p.items.length === 1 ? p.items : p.items.filter((x) => x.id !== it.id),
                                    }))
                                  }
                                >
                                  Remove
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  <div className="eventura-actions" style={{ marginTop: "0.6rem" }}>
                    <button
                      type="button"
                      className="eventura-button-secondary"
                      onClick={() =>
                        setInvDraft((p) => ({
                          ...p,
                          items: [
                            ...p.items,
                            { id: Date.now(), name: "Service", qty: 1, rate: 0 },
                          ],
                        }))
                      }
                    >
                      + Add item
                    </button>
                  </div>

                  <div className="eventura-field" style={{ marginTop: "0.8rem" }}>
                    <label className="eventura-label">Notes</label>
                    <textarea
                      className="eventura-textarea"
                      value={invDraft.notes}
                      onChange={(e) => setInvDraft((p) => ({ ...p, notes: e.target.value }))}
                      placeholder="Payment terms, scope, etc..."
                    />
                  </div>

                  {/* Preview totals */}
                  <div className="eventura-kpi-row" style={{ marginTop: "0.8rem" }}>
                    <div className="eventura-card">
                      <div className="eventura-card-label">Taxable</div>
                      <div className="eventura-card-value">₹{fmtINR(invPreviewTotals.taxable)}</div>
                    </div>
                    <div className="eventura-card">
                      <div className="eventura-card-label">
                        {invPreviewTotals.igst > 0 ? "IGST" : "CGST"}
                      </div>
                      <div className="eventura-card-value">₹{fmtINR(invPreviewTotals.igst > 0 ? invPreviewTotals.igst : invPreviewTotals.cgst)}</div>
                      <div className="eventura-card-note">
                        Rate: {invDraft.gstRate}%
                      </div>
                    </div>
                    {invPreviewTotals.igst === 0 && (
                      <div className="eventura-card">
                        <div className="eventura-card-label">SGST</div>
                        <div className="eventura-card-value">₹{fmtINR(invPreviewTotals.sgst)}</div>
                        <div className="eventura-card-note">Half GST</div>
                      </div>
                    )}
                    <div className="eventura-card">
                      <div className="eventura-card-label">Invoice Total</div>
                      <div className="eventura-card-value">₹{fmtINR(invPreviewTotals.total)}</div>
                      <div className="eventura-card-note">{amountInWordsSimpleINR(invPreviewTotals.total)}</div>
                    </div>
                  </div>

                  <div className="eventura-actions" style={{ marginTop: "0.8rem" }}>
                    <button type="submit" className="eventura-button">
                      Save GST Invoice
                    </button>
                  </div>
                </form>
              </div>

              {/* Invoices list */}
              <div className="eventura-panel">
                <h2 className="eventura-panel-title">Invoices</h2>

                <div className="eventura-table-wrapper">
                  <table className="eventura-table">
                    <thead>
                      <tr>
                        <th>Invoice</th>
                        <th>Client</th>
                        <th>POS</th>
                        <th>GST</th>
                        <th>Total (₹)</th>
                        <th>Status</th>
                        <th />
                      </tr>
                    </thead>
                    <tbody>
                      {invFiltered.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="eventura-small-text" style={{ color: "#9ca3af" }}>
                            No invoices yet. Create one on the left.
                          </td>
                        </tr>
                      ) : (
                        invFiltered.map((i) => {
                          const sub = invSubTotal(i);
                          const gst = calcGST(sub, i.gstRate, i.gstType);
                          return (
                            <tr key={i.id}>
                              <td>
                                <div className="eventura-list-title">{i.invoiceNo}</div>
                                <div className="eventura-list-sub">
                                  {i.date} → Due {i.dueDate}
                                  {i.paidDate ? ` · Paid ${i.paidDate}` : ""}
                                </div>
                              </td>
                              <td>
                                <div className="eventura-list-title">{i.clientName}</div>
                                <div className="eventura-list-sub">
                                  {i.clientGSTIN ? `GSTIN: ${i.clientGSTIN}` : "B2C"}
                                  {i.eventName ? ` · ${i.eventName}` : ""}
                                </div>
                              </td>
                              <td>{i.placeOfSupply}</td>
                              <td>
                                <div className="eventura-small-text">
                                  {i.gstType === "IGST" ? (
                                    <>IGST {i.gstRate}%</>
                                  ) : (
                                    <>CGST {i.gstRate / 2}% + SGST {i.gstRate / 2}%</>
                                  )}
                                  <br />
                                  SAC/HSN: {i.hsn}
                                </div>
                              </td>
                              <td>
                                <div className="eventura-list-title">₹{fmtINR(gst.total)}</div>
                                <div className="eventura-list-sub">
                                  Taxable ₹{fmtINR(gst.taxable)}
                                </div>
                              </td>
                              <td>
                                <span
                                  className={
                                    "eventura-tag " +
                                    (i.status === "Paid"
                                      ? "eventura-tag-green"
                                      : i.status === "Cancelled"
                                      ? "eventura-tag-amber"
                                      : "eventura-tag-blue")
                                  }
                                >
                                  {i.status}
                                </span>
                              </td>
                              <td style={{ whiteSpace: "nowrap" }}>
                                <select
                                  className="eventura-input"
                                  value={i.status}
                                  onChange={(e) => setInvoiceStatus(i.id, e.target.value as InvoiceStatus)}
                                  style={{ width: 120, display: "inline-block", marginRight: 8 }}
                                >
                                  <option>Draft</option>
                                  <option>Sent</option>
                                  <option>Paid</option>
                                  <option>Cancelled</option>
                                </select>

                                {i.status !== "Paid" && (
                                  <button
                                    type="button"
                                    className="eventura-tag eventura-tag-green"
                                    onClick={() => markInvoicePaid(i.id)}
                                    style={{ marginRight: 8 }}
                                  >
                                    Mark Paid
                                  </button>
                                )}

                                <button
                                  type="button"
                                  className="eventura-tag eventura-tag-amber"
                                  onClick={() => deleteInvoice(i.id)}
                                >
                                  Delete
                                </button>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="eventura-panel" style={{ marginTop: "1rem" }}>
                  <h2 className="eventura-panel-title">Company GST Profile</h2>
                  <div className="eventura-small-text">
                    <b>{COMPANY_GST.legalName}</b><br />
                    GSTIN: {COMPANY_GST.gstin}<br />
                    State: {COMPANY_GST.state} ({COMPANY_GST.stateCode})<br />
                    Address: {COMPANY_GST.address}<br />
                    Bank: {COMPANY_GST.bankName} · A/C: {COMPANY_GST.accountNo} · IFSC: {COMPANY_GST.ifsc}<br />
                    PAN: {COMPANY_GST.pan}
                  </div>
                </div>
              </div>
            </section>
          )}
        </div>
      </div>
    </main>
  );
}

/* ================= SHARED LAYOUT ================= */

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
        <input className="eventura-search" placeholder="Search finance..." disabled />
      </div>
      <div className="eventura-topbar-right">
        <button className="eventura-topbar-icon" title="Notifications" type="button">
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
