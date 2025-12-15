"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";

/* ================== AUTH / USER ================== */
type Role = "CEO" | "Staff";
type User = { name: string; role: Role; city: string };

const USER_KEY = "eventura-user";

/* ================== STORAGE KEYS ================== */
const INV_ITEMS_KEY = "eventura-inventory-items";
const INV_TX_KEY = "eventura-inventory-tx";
const INV_INVOICES_KEY = "eventura-inventory-invoices";

/* ================== BUSINESS SETTINGS (EDIT) ================== */
const BUSINESS = {
  legalName: "Eventura",
  addressLine1: "Surat, Gujarat, India",
  gstin: "24ABCDE1234F1Z5", // <-- CHANGE TO YOUR REAL GSTIN
  state: "Gujarat",
  stateCode: "24",
  phone: "",
};

/* ================== TYPES ================== */
type StockTxType = "IN" | "OUT" | "ADJUST";

type InventoryItem = {
  id: number;
  name: string;
  category: string; // e.g. "Decor", "Lighting", "Sound", "Furniture"
  sku: string;
  unit: string; // e.g. "pcs", "set"
  location: string; // e.g. "Warehouse A"
  minStock: number;
  stock: number;
  purchaseCost: number; // per unit
  notes: string;
  createdAt: string;
  createdBy: string;
};

type InventoryTx = {
  id: number;
  itemId: number;
  type: StockTxType;
  qty: number;
  note: string;
  linkedEventName?: string;
  createdAt: string;
  createdBy: string;
};

type GSTType = "CGST_SGST" | "IGST";

/** Invoice items are services/items you bill to client (not same as inventory item necessarily) */
type InvoiceLine = {
  id: number;
  name: string;
  hsnOrSac: string;
  qty: number;
  rate: number; // taxable value per unit
  gstPercent: number; // 0 / 5 / 12 / 18 / 28
};

type Invoice = {
  id: number;
  invoiceNo: string;
  invoiceDate: string; // YYYY-MM-DD
  placeOfSupply: string; // state name
  gstType: GSTType;
  billToName: string;
  billToAddress: string;
  clientGSTIN?: string;
  eventName?: string;

  lines: InvoiceLine[];

  notes: string;
  createdAt: string;
  createdBy: string;
};

/* ================== HELPERS ================== */
function safeNowISO() {
  return new Date().toISOString();
}
function yyyyMmDd(d: Date) {
  return d.toISOString().slice(0, 10);
}
function n2(n: number) {
  return Number.isFinite(n) ? n : 0;
}
function money(n: number) {
  return Math.round(n2(n)).toLocaleString("en-IN");
}
function getUserName(u: User | null) {
  return u?.name ?? "System";
}
function detectGSTType(placeOfSupply: string): GSTType {
  const pos = (placeOfSupply || "").trim().toLowerCase();
  const home = BUSINESS.state.trim().toLowerCase();
  return pos && pos !== home ? "IGST" : "CGST_SGST";
}

function downloadText(filename: string, text: string) {
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/* ================== PAGE ================== */
export default function InventoryPage() {
  const [user, setUser] = useState<User | null>(null);

  const [items, setItems] = useState<InventoryItem[]>([]);
  const [tx, setTx] = useState<InventoryTx[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);

  const [tab, setTab] = useState<"items" | "stock" | "gst">("items");

  /* ---------- AUTH ---------- */
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

  /* ---------- LOAD STORAGE ---------- */
  useEffect(() => {
    if (typeof window === "undefined") return;

    // Items
    const rawItems = window.localStorage.getItem(INV_ITEMS_KEY);
    if (rawItems) {
      try {
        setItems(JSON.parse(rawItems));
      } catch {
        setItems([]);
      }
    } else {
      // seed small
      const seed: InventoryItem[] = [
        {
          id: Date.now(),
          name: "LED PAR Light",
          category: "Lighting",
          sku: "LGT-LED-PAR-001",
          unit: "pcs",
          location: "Warehouse A",
          minStock: 10,
          stock: 24,
          purchaseCost: 1200,
          notes: "Basic LED par for stage wash.",
          createdAt: safeNowISO(),
          createdBy: "System",
        },
      ];
      setItems(seed);
      window.localStorage.setItem(INV_ITEMS_KEY, JSON.stringify(seed));
    }

    // Transactions
    const rawTx = window.localStorage.getItem(INV_TX_KEY);
    if (rawTx) {
      try {
        setTx(JSON.parse(rawTx));
      } catch {
        setTx([]);
      }
    }

    // Invoices
    const rawInv = window.localStorage.getItem(INV_INVOICES_KEY);
    if (rawInv) {
      try {
        setInvoices(JSON.parse(rawInv));
      } catch {
        setInvoices([]);
      }
    }
  }, []);

  /* ---------- SAVE STORAGE ---------- */
  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(INV_ITEMS_KEY, JSON.stringify(items));
  }, [items]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(INV_TX_KEY, JSON.stringify(tx));
  }, [tx]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(INV_INVOICES_KEY, JSON.stringify(invoices));
  }, [invoices]);

  if (!user) return null;
  const isCEO = user.role === "CEO";

  /* ================== ITEMS FORM ================== */
  const [editingItemId, setEditingItemId] = useState<number | null>(null);
  const [itemDraft, setItemDraft] = useState({
    name: "",
    category: "Decor",
    sku: "",
    unit: "pcs",
    location: "Warehouse A",
    minStock: 0,
    stock: 0,
    purchaseCost: 0,
    notes: "",
  });

  function resetItemDraft() {
    setEditingItemId(null);
    setItemDraft({
      name: "",
      category: "Decor",
      sku: "",
      unit: "pcs",
      location: "Warehouse A",
      minStock: 0,
      stock: 0,
      purchaseCost: 0,
      notes: "",
    });
  }

  function saveItem(e: React.FormEvent) {
    e.preventDefault();
    if (!itemDraft.name.trim()) {
      alert("Item name is required.");
      return;
    }

    if (editingItemId == null) {
      const newItem: InventoryItem = {
        id: Date.now(),
        name: itemDraft.name.trim(),
        category: itemDraft.category.trim(),
        sku: itemDraft.sku.trim(),
        unit: itemDraft.unit.trim(),
        location: itemDraft.location.trim(),
        minStock: n2(itemDraft.minStock),
        stock: n2(itemDraft.stock),
        purchaseCost: n2(itemDraft.purchaseCost),
        notes: itemDraft.notes.trim(),
        createdAt: safeNowISO(),
        createdBy: getUserName(user),
      };
      setItems((p) => [newItem, ...p]);
    } else {
      setItems((p) =>
        p.map((it) =>
          it.id === editingItemId
            ? {
                ...it,
                name: itemDraft.name.trim(),
                category: itemDraft.category.trim(),
                sku: itemDraft.sku.trim(),
                unit: itemDraft.unit.trim(),
                location: itemDraft.location.trim(),
                minStock: n2(itemDraft.minStock),
                stock: n2(itemDraft.stock),
                purchaseCost: n2(itemDraft.purchaseCost),
                notes: itemDraft.notes.trim(),
              }
            : it
        )
      );
    }
    resetItemDraft();
  }

  function editItem(id: number) {
    const it = items.find((x) => x.id === id);
    if (!it) return;
    setEditingItemId(it.id);
    setItemDraft({
      name: it.name,
      category: it.category,
      sku: it.sku,
      unit: it.unit,
      location: it.location,
      minStock: it.minStock,
      stock: it.stock,
      purchaseCost: it.purchaseCost,
      notes: it.notes,
    });
    setTab("items");
  }

  function deleteItem(id: number) {
    if (!confirm("Delete this inventory item?")) return;
    setItems((p) => p.filter((x) => x.id !== id));
    setTx((p) => p.filter((t) => t.itemId !== id));
    if (editingItemId === id) resetItemDraft();
  }

  /* ================== STOCK MOVEMENT ================== */
  const [stockDraft, setStockDraft] = useState({
    itemId: 0,
    type: "IN" as StockTxType,
    qty: 1,
    note: "",
    linkedEventName: "",
  });

  useEffect(() => {
    if (items.length && stockDraft.itemId === 0) {
      setStockDraft((p) => ({ ...p, itemId: items[0].id }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items.length]);

  function applyStockTx(e: React.FormEvent) {
    e.preventDefault();
    const item = items.find((x) => x.id === stockDraft.itemId);
    if (!item) {
      alert("Select a valid item.");
      return;
    }
    const qty = Math.abs(n2(stockDraft.qty));
    if (!qty || qty <= 0) {
      alert("Quantity must be greater than 0.");
      return;
    }

    let newStock = item.stock;
    if (stockDraft.type === "IN") newStock = item.stock + qty;
    if (stockDraft.type === "OUT") newStock = item.stock - qty;
    if (stockDraft.type === "ADJUST") newStock = qty; // set to exact qty

    if (newStock < 0) {
      alert("Stock cannot go below 0.");
      return;
    }

    const newTx: InventoryTx = {
      id: Date.now(),
      itemId: item.id,
      type: stockDraft.type,
      qty,
      note: stockDraft.note.trim(),
      linkedEventName: stockDraft.linkedEventName.trim() || undefined,
      createdAt: safeNowISO(),
      createdBy: getUserName(user),
    };

    setItems((p) => p.map((x) => (x.id === item.id ? { ...x, stock: newStock } : x)));
    setTx((p) => [newTx, ...p]);

    setStockDraft((p) => ({
      ...p,
      qty: 1,
      note: "",
      linkedEventName: "",
    }));
  }

  const lowStock = useMemo(() => {
    return items
      .filter((i) => i.stock <= i.minStock)
      .sort((a, b) => a.stock - b.stock);
  }, [items]);

  /* ================== GST INVOICE ================== */
  const [invoiceDraft, setInvoiceDraft] = useState<Invoice>(() => ({
    id: 0,
    invoiceNo: `EV-${new Date().getFullYear()}-${Math.floor(Math.random() * 9000 + 1000)}`,
    invoiceDate: yyyyMmDd(new Date()),
    placeOfSupply: BUSINESS.state,
    gstType: "CGST_SGST",
    billToName: "",
    billToAddress: "",
    clientGSTIN: "",
    eventName: "",
    lines: [
      { id: 1, name: "Event Planning Service", hsnOrSac: "9983", qty: 1, rate: 50000, gstPercent: 18 },
    ],
    notes: "",
    createdAt: "",
    createdBy: "",
  }));

  useEffect(() => {
    setInvoiceDraft((p) => ({
      ...p,
      gstType: detectGSTType(p.placeOfSupply),
    }));
  }, [invoiceDraft.placeOfSupply]);

  function addInvoiceLine() {
    setInvoiceDraft((p) => ({
      ...p,
      lines: [
        ...p.lines,
        {
          id: Date.now(),
          name: "",
          hsnOrSac: "",
          qty: 1,
          rate: 0,
          gstPercent: 18,
        },
      ],
    }));
  }

  function removeInvoiceLine(id: number) {
    setInvoiceDraft((p) => ({
      ...p,
      lines: p.lines.filter((l) => l.id !== id),
    }));
  }

  function updateInvoiceLine(id: number, patch: Partial<InvoiceLine>) {
    setInvoiceDraft((p) => ({
      ...p,
      lines: p.lines.map((l) => (l.id === id ? { ...l, ...patch } : l)),
    }));
  }

  const invoiceTotals = useMemo(() => {
    const taxable = invoiceDraft.lines.reduce((sum, l) => sum + n2(l.qty) * n2(l.rate), 0);
    const gstTotal = invoiceDraft.lines.reduce((sum, l) => {
      const lineTaxable = n2(l.qty) * n2(l.rate);
      return sum + (lineTaxable * n2(l.gstPercent)) / 100;
    }, 0);

    const cgst = invoiceDraft.gstType === "CGST_SGST" ? gstTotal / 2 : 0;
    const sgst = invoiceDraft.gstType === "CGST_SGST" ? gstTotal / 2 : 0;
    const igst = invoiceDraft.gstType === "IGST" ? gstTotal : 0;

    const grand = taxable + gstTotal;

    return {
      taxable,
      gstTotal,
      cgst,
      sgst,
      igst,
      grand,
    };
  }, [invoiceDraft.lines, invoiceDraft.gstType]);

  function saveInvoice(e: React.FormEvent) {
    e.preventDefault();
    if (!invoiceDraft.billToName.trim()) {
      alert("Bill To name is required.");
      return;
    }
    if (!invoiceDraft.billToAddress.trim()) {
      alert("Bill To address is required.");
      return;
    }
    if (invoiceDraft.lines.length === 0) {
      alert("Add at least one invoice line.");
      return;
    }

    const cleanedLines = invoiceDraft.lines.map((l) => ({
      ...l,
      name: l.name.trim() || "Service",
      hsnOrSac: l.hsnOrSac.trim() || "",
      qty: n2(l.qty) || 1,
      rate: n2(l.rate) || 0,
      gstPercent: n2(l.gstPercent) || 0,
    }));

    const newInvoice: Invoice = {
      ...invoiceDraft,
      id: Date.now(),
      placeOfSupply: invoiceDraft.placeOfSupply.trim() || BUSINESS.state,
      gstType: detectGSTType(invoiceDraft.placeOfSupply),
      clientGSTIN: (invoiceDraft.clientGSTIN || "").trim() || undefined,
      eventName: (invoiceDraft.eventName || "").trim() || undefined,
      lines: cleanedLines,
      createdAt: safeNowISO(),
      createdBy: getUserName(user),
    };

    setInvoices((p) => [newInvoice, ...p]);

    // reset
    setInvoiceDraft((p) => ({
      ...p,
      id: 0,
      invoiceNo: `EV-${new Date().getFullYear()}-${Math.floor(Math.random() * 9000 + 1000)}`,
      invoiceDate: yyyyMmDd(new Date()),
      placeOfSupply: BUSINESS.state,
      gstType: "CGST_SGST",
      billToName: "",
      billToAddress: "",
      clientGSTIN: "",
      eventName: "",
      lines: [{ id: Date.now(), name: "Event Planning Service", hsnOrSac: "9983", qty: 1, rate: 50000, gstPercent: 18 }],
      notes: "",
      createdAt: "",
      createdBy: "",
    }));

    alert("Invoice saved ✅ (stored locally)");
  }

  function deleteInvoice(id: number) {
    if (!confirm("Delete this invoice?")) return;
    setInvoices((p) => p.filter((x) => x.id !== id));
  }

  /* ================== UI ================== */
  return (
    <main className="eventura-os">
      {/* Sidebar */}
      <aside className="eventura-sidebar">
        <SidebarCore user={user} active="inventory" />
      </aside>

      {/* Main */}
      <div className="eventura-main">
        <TopbarCore user={user} />

        <div className="eventura-content">
          <div className="eventura-header-row">
            <div>
              <h1 className="eventura-page-title">Inventory & GST</h1>
              <p className="eventura-subtitle">
                Track assets + stock movement + create GST invoices (India format).
              </p>
            </div>

            <div className="eventura-chips-row">
              <button
                type="button"
                className={"eventura-tag " + (tab === "items" ? "eventura-tag-blue" : "eventura-tag-amber")}
                onClick={() => setTab("items")}
              >
                Items
              </button>
              <button
                type="button"
                className={"eventura-tag " + (tab === "stock" ? "eventura-tag-blue" : "eventura-tag-amber")}
                onClick={() => setTab("stock")}
              >
                Stock & Log
              </button>
              <button
                type="button"
                className={"eventura-tag " + (tab === "gst" ? "eventura-tag-blue" : "eventura-tag-amber")}
                onClick={() => setTab("gst")}
              >
                GST Invoice
              </button>

              <button
                type="button"
                className="eventura-button-secondary"
                onClick={() => {
                  downloadText("eventura-inventory-items.json", JSON.stringify(items, null, 2));
                }}
              >
                Export Items JSON
              </button>

              <button
                type="button"
                className="eventura-button-secondary"
                onClick={() => {
                  downloadText("eventura-gst-invoices.json", JSON.stringify(invoices, null, 2));
                }}
              >
                Export Invoices JSON
              </button>
            </div>
          </div>

          {/* LOW STOCK ALERT */}
          {lowStock.length > 0 && (
            <div className="eventura-panel" style={{ marginBottom: "1rem" }}>
              <h2 className="eventura-panel-title">⚠ Low stock alerts</h2>
              <div className="eventura-table-wrapper">
                <table className="eventura-table">
                  <thead>
                    <tr>
                      <th>Item</th>
                      <th>Stock</th>
                      <th>Min</th>
                      <th>Location</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lowStock.map((i) => (
                      <tr key={i.id}>
                        <td>
                          <div className="eventura-list-title">{i.name}</div>
                          <div className="eventura-list-sub">{i.category} · {i.sku}</div>
                        </td>
                        <td>
                          <span className="eventura-tag eventura-tag-amber">{i.stock}</span>
                        </td>
                        <td>{i.minStock}</td>
                        <td>{i.location}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {tab === "items" && (
            <div className="eventura-columns">
              <div className="eventura-panel">
                <h2 className="eventura-panel-title">{editingItemId ? "Edit item" : "Add item"}</h2>

                <form className="eventura-form" onSubmit={saveItem}>
                  <div className="eventura-form-grid">
                    <div className="eventura-field">
                      <label className="eventura-label">Name</label>
                      <input
                        className="eventura-input"
                        value={itemDraft.name}
                        onChange={(e) => setItemDraft((p) => ({ ...p, name: e.target.value }))}
                        placeholder="e.g. LED PAR Light"
                      />
                    </div>

                    <div className="eventura-field">
                      <label className="eventura-label">Category</label>
                      <input
                        className="eventura-input"
                        value={itemDraft.category}
                        onChange={(e) => setItemDraft((p) => ({ ...p, category: e.target.value }))}
                        placeholder="Decor / Lighting / Sound..."
                      />
                    </div>
                  </div>

                  <div className="eventura-form-grid">
                    <div className="eventura-field">
                      <label className="eventura-label">SKU</label>
                      <input
                        className="eventura-input"
                        value={itemDraft.sku}
                        onChange={(e) => setItemDraft((p) => ({ ...p, sku: e.target.value }))}
                        placeholder="Optional"
                      />
                    </div>
                    <div className="eventura-field">
                      <label className="eventura-label">Unit</label>
                      <input
                        className="eventura-input"
                        value={itemDraft.unit}
                        onChange={(e) => setItemDraft((p) => ({ ...p, unit: e.target.value }))}
                        placeholder="pcs / set"
                      />
                    </div>
                  </div>

                  <div className="eventura-form-grid">
                    <div className="eventura-field">
                      <label className="eventura-label">Location</label>
                      <input
                        className="eventura-input"
                        value={itemDraft.location}
                        onChange={(e) => setItemDraft((p) => ({ ...p, location: e.target.value }))}
                        placeholder="Warehouse A"
                      />
                    </div>

                    <div className="eventura-field">
                      <label className="eventura-label">Min stock</label>
                      <input
                        className="eventura-input"
                        type="number"
                        value={itemDraft.minStock}
                        onChange={(e) => setItemDraft((p) => ({ ...p, minStock: Number(e.target.value) }))}
                      />
                    </div>
                  </div>

                  <div className="eventura-form-grid">
                    <div className="eventura-field">
                      <label className="eventura-label">Current stock</label>
                      <input
                        className="eventura-input"
                        type="number"
                        value={itemDraft.stock}
                        onChange={(e) => setItemDraft((p) => ({ ...p, stock: Number(e.target.value) }))}
                      />
                    </div>
                    <div className="eventura-field">
                      <label className="eventura-label">Purchase cost (₹/unit)</label>
                      <input
                        className="eventura-input"
                        type="number"
                        value={itemDraft.purchaseCost}
                        onChange={(e) => setItemDraft((p) => ({ ...p, purchaseCost: Number(e.target.value) }))}
                      />
                    </div>
                  </div>

                  <div className="eventura-field" style={{ marginTop: "0.6rem" }}>
                    <label className="eventura-label">Notes</label>
                    <textarea
                      className="eventura-textarea"
                      value={itemDraft.notes}
                      onChange={(e) => setItemDraft((p) => ({ ...p, notes: e.target.value }))}
                      placeholder="Any notes..."
                    />
                  </div>

                  <div className="eventura-actions">
                    <button className="eventura-button" type="submit">
                      {editingItemId ? "Update item" : "Save item"}
                    </button>
                    {editingItemId && (
                      <button type="button" className="eventura-button-secondary" onClick={resetItemDraft}>
                        Cancel
                      </button>
                    )}
                  </div>
                </form>
              </div>

              <div className="eventura-panel">
                <h2 className="eventura-panel-title">Inventory list</h2>

                <div className="eventura-table-wrapper">
                  <table className="eventura-table">
                    <thead>
                      <tr>
                        <th>Item</th>
                        <th>Stock</th>
                        <th>Min</th>
                        <th>Cost</th>
                        <th>Location</th>
                        <th />
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((it) => (
                        <tr key={it.id}>
                          <td>
                            <div className="eventura-list-title">{it.name}</div>
                            <div className="eventura-list-sub">{it.category} · {it.sku || "—"} · {it.unit}</div>
                          </td>
                          <td>
                            <span className={"eventura-tag " + (it.stock <= it.minStock ? "eventura-tag-amber" : "eventura-tag-green")}>
                              {it.stock}
                            </span>
                          </td>
                          <td>{it.minStock}</td>
                          <td>₹{money(it.purchaseCost)}</td>
                          <td>{it.location}</td>
                          <td style={{ whiteSpace: "nowrap" }}>
                            <button className="eventura-tag eventura-tag-blue" type="button" onClick={() => editItem(it.id)}>
                              Edit
                            </button>{" "}
                            <button className="eventura-tag eventura-tag-amber" type="button" onClick={() => deleteItem(it.id)}>
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))}
                      {items.length === 0 && (
                        <tr>
                          <td colSpan={6} style={{ color: "#9ca3af", fontSize: "0.85rem" }}>
                            No inventory items yet.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                <p className="eventura-small-text" style={{ marginTop: "0.6rem" }}>
                  Created by: {getUserName(user)} · Role: {user.role}
                </p>
              </div>
            </div>
          )}

          {tab === "stock" && (
            <div className="eventura-columns">
              <div className="eventura-panel">
                <h2 className="eventura-panel-title">Stock movement</h2>

                <form className="eventura-form" onSubmit={applyStockTx}>
                  <div className="eventura-form-grid">
                    <div className="eventura-field">
                      <label className="eventura-label">Item</label>
                      <select
                        className="eventura-input"
                        value={stockDraft.itemId}
                        onChange={(e) => setStockDraft((p) => ({ ...p, itemId: Number(e.target.value) }))}
                      >
                        {items.map((it) => (
                          <option key={it.id} value={it.id}>
                            {it.name} (stock {it.stock})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="eventura-field">
                      <label className="eventura-label">Type</label>
                      <select
                        className="eventura-input"
                        value={stockDraft.type}
                        onChange={(e) => setStockDraft((p) => ({ ...p, type: e.target.value as StockTxType }))}
                      >
                        <option value="IN">IN (Purchase / Return)</option>
                        <option value="OUT">OUT (Event usage)</option>
                        <option value="ADJUST">ADJUST (Set exact stock)</option>
                      </select>
                    </div>
                  </div>

                  <div className="eventura-form-grid">
                    <div className="eventura-field">
                      <label className="eventura-label">Quantity</label>
                      <input
                        className="eventura-input"
                        type="number"
                        value={stockDraft.qty}
                        onChange={(e) => setStockDraft((p) => ({ ...p, qty: Number(e.target.value) }))}
                      />
                    </div>

                    <div className="eventura-field">
                      <label className="eventura-label">Linked Event (optional)</label>
                      <input
                        className="eventura-input"
                        value={stockDraft.linkedEventName}
                        onChange={(e) => setStockDraft((p) => ({ ...p, linkedEventName: e.target.value }))}
                        placeholder="e.g. Patel Wedding Sangeet"
                      />
                    </div>
                  </div>

                  <div className="eventura-field" style={{ marginTop: "0.5rem" }}>
                    <label className="eventura-label">Note</label>
                    <input
                      className="eventura-input"
                      value={stockDraft.note}
                      onChange={(e) => setStockDraft((p) => ({ ...p, note: e.target.value }))}
                      placeholder="Reason / vendor / damage / etc."
                    />
                  </div>

                  <div className="eventura-actions" style={{ marginTop: "0.6rem" }}>
                    <button className="eventura-button" type="submit">
                      Apply stock update
                    </button>
                  </div>
                </form>
              </div>

              <div className="eventura-panel">
                <h2 className="eventura-panel-title">Stock transaction log</h2>
                <div className="eventura-table-wrapper">
                  <table className="eventura-table">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Item</th>
                        <th>Type</th>
                        <th>Qty</th>
                        <th>Event</th>
                        <th>By</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tx.map((t) => {
                        const it = items.find((x) => x.id === t.itemId);
                        return (
                          <tr key={t.id}>
                            <td>{new Date(t.createdAt).toLocaleString("en-IN")}</td>
                            <td>{it?.name ?? "Deleted item"}</td>
                            <td>
                              <span className={"eventura-tag " + (t.type === "OUT" ? "eventura-tag-amber" : t.type === "IN" ? "eventura-tag-green" : "eventura-tag-blue")}>
                                {t.type}
                              </span>
                            </td>
                            <td>{t.qty}</td>
                            <td>{t.linkedEventName ?? "—"}</td>
                            <td>{t.createdBy}</td>
                          </tr>
                        );
                      })}
                      {tx.length === 0 && (
                        <tr>
                          <td colSpan={6} style={{ color: "#9ca3af", fontSize: "0.85rem" }}>
                            No stock transactions yet.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {tab === "gst" && (
            <div className="eventura-columns">
              <div className="eventura-panel">
                <h2 className="eventura-panel-title">Create GST Invoice</h2>

                <form className="eventura-form" onSubmit={saveInvoice}>
                  <div className="eventura-form-grid">
                    <div className="eventura-field">
                      <label className="eventura-label">Invoice No</label>
                      <input
                        className="eventura-input"
                        value={invoiceDraft.invoiceNo}
                        onChange={(e) => setInvoiceDraft((p) => ({ ...p, invoiceNo: e.target.value }))}
                      />
                    </div>
                    <div className="eventura-field">
                      <label className="eventura-label">Invoice Date</label>
                      <input
                        className="eventura-input"
                        type="date"
                        value={invoiceDraft.invoiceDate}
                        onChange={(e) => setInvoiceDraft((p) => ({ ...p, invoiceDate: e.target.value }))}
                      />
                    </div>
                  </div>

                  <div className="eventura-form-grid">
                    <div className="eventura-field">
                      <label className="eventura-label">Place of Supply (State)</label>
                      <input
                        className="eventura-input"
                        value={invoiceDraft.placeOfSupply}
                        onChange={(e) => setInvoiceDraft((p) => ({ ...p, placeOfSupply: e.target.value }))}
                        placeholder="Gujarat / Maharashtra / etc."
                      />
                    </div>
                    <div className="eventura-field">
                      <label className="eventura-label">GST Type</label>
                      <input className="eventura-input" value={invoiceDraft.gstType} readOnly />
                    </div>
                  </div>

                  <div className="eventura-form-grid">
                    <div className="eventura-field">
                      <label className="eventura-label">Bill To (Client Name)</label>
                      <input
                        className="eventura-input"
                        value={invoiceDraft.billToName}
                        onChange={(e) => setInvoiceDraft((p) => ({ ...p, billToName: e.target.value }))}
                      />
                    </div>
                    <div className="eventura-field">
                      <label className="eventura-label">Client GSTIN (optional)</label>
                      <input
                        className="eventura-input"
                        value={invoiceDraft.clientGSTIN || ""}
                        onChange={(e) => setInvoiceDraft((p) => ({ ...p, clientGSTIN: e.target.value }))}
                      />
                    </div>
                  </div>

                  <div className="eventura-field" style={{ marginTop: "0.5rem" }}>
                    <label className="eventura-label">Bill To Address</label>
                    <textarea
                      className="eventura-textarea"
                      value={invoiceDraft.billToAddress}
                      onChange={(e) => setInvoiceDraft((p) => ({ ...p, billToAddress: e.target.value }))}
                      placeholder="Client address"
                    />
                  </div>

                  <div className="eventura-field" style={{ marginTop: "0.5rem" }}>
                    <label className="eventura-label">Event Name (optional)</label>
                    <input
                      className="eventura-input"
                      value={invoiceDraft.eventName || ""}
                      onChange={(e) => setInvoiceDraft((p) => ({ ...p, eventName: e.target.value }))}
                      placeholder="e.g. Patel Wedding Sangeet"
                    />
                  </div>

                  <div style={{ marginTop: "0.8rem" }}>
                    <div className="eventura-header-row">
                      <h3 className="eventura-panel-title">Invoice lines</h3>
                      <button type="button" className="eventura-button-secondary" onClick={addInvoiceLine}>
                        + Add line
                      </button>
                    </div>

                    <div className="eventura-table-wrapper">
                      <table className="eventura-table">
                        <thead>
                          <tr>
                            <th>Description</th>
                            <th>HSN/SAC</th>
                            <th>Qty</th>
                            <th>Rate</th>
                            <th>GST%</th>
                            <th />
                          </tr>
                        </thead>
                        <tbody>
                          {invoiceDraft.lines.map((l) => (
                            <tr key={l.id}>
                              <td>
                                <input
                                  className="eventura-input"
                                  value={l.name}
                                  onChange={(e) => updateInvoiceLine(l.id, { name: e.target.value })}
                                />
                              </td>
                              <td>
                                <input
                                  className="eventura-input"
                                  value={l.hsnOrSac}
                                  onChange={(e) => updateInvoiceLine(l.id, { hsnOrSac: e.target.value })}
                                />
                              </td>
                              <td>
                                <input
                                  className="eventura-input"
                                  type="number"
                                  value={l.qty}
                                  onChange={(e) => updateInvoiceLine(l.id, { qty: Number(e.target.value) })}
                                />
                              </td>
                              <td>
                                <input
                                  className="eventura-input"
                                  type="number"
                                  value={l.rate}
                                  onChange={(e) => updateInvoiceLine(l.id, { rate: Number(e.target.value) })}
                                />
                              </td>
                              <td>
                                <input
                                  className="eventura-input"
                                  type="number"
                                  value={l.gstPercent}
                                  onChange={(e) => updateInvoiceLine(l.id, { gstPercent: Number(e.target.value) })}
                                />
                              </td>
                              <td>
                                <button
                                  type="button"
                                  className="eventura-tag eventura-tag-amber"
                                  onClick={() => removeInvoiceLine(l.id)}
                                >
                                  Remove
                                </button>
                              </td>
                            </tr>
                          ))}
                          {invoiceDraft.lines.length === 0 && (
                            <tr>
                              <td colSpan={6} style={{ color: "#9ca3af", fontSize: "0.85rem" }}>
                                Add invoice lines.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="eventura-kpi-row" style={{ marginTop: "0.8rem" }}>
                    <div className="eventura-card">
                      <div className="eventura-card-label">Taxable</div>
                      <div className="eventura-card-value">₹{money(invoiceTotals.taxable)}</div>
                    </div>

                    <div className="eventura-card">
                      <div className="eventura-card-label">GST</div>
                      <div className="eventura-card-value">₹{money(invoiceTotals.gstTotal)}</div>
                      <div className="eventura-card-note">
                        {invoiceDraft.gstType === "IGST"
                          ? `IGST: ₹${money(invoiceTotals.igst)}`
                          : `CGST: ₹${money(invoiceTotals.cgst)} · SGST: ₹${money(invoiceTotals.sgst)}`}
                      </div>
                    </div>

                    <div className="eventura-card">
                      <div className="eventura-card-label">Grand Total</div>
                      <div className="eventura-card-value">₹{money(invoiceTotals.grand)}</div>
                    </div>
                  </div>

                  <div className="eventura-field" style={{ marginTop: "0.7rem" }}>
                    <label className="eventura-label">Notes</label>
                    <textarea
                      className="eventura-textarea"
                      value={invoiceDraft.notes}
                      onChange={(e) => setInvoiceDraft((p) => ({ ...p, notes: e.target.value }))}
                      placeholder="Payment terms, bank details, etc."
                    />
                  </div>

                  <div className="eventura-actions" style={{ marginTop: "0.7rem" }}>
                    <button type="submit" className="eventura-button">
                      Save GST Invoice
                    </button>
                  </div>
                </form>
              </div>

              <div className="eventura-panel">
                <h2 className="eventura-panel-title">Saved invoices</h2>

                <div className="eventura-table-wrapper">
                  <table className="eventura-table">
                    <thead>
                      <tr>
                        <th>No</th>
                        <th>Date</th>
                        <th>Client</th>
                        <th>POS</th>
                        <th>Total</th>
                        <th />
                      </tr>
                    </thead>
                    <tbody>
                      {invoices.map((inv) => {
                        const taxable = inv.lines.reduce((s, l) => s + n2(l.qty) * n2(l.rate), 0);
                        const gst = inv.lines.reduce((s, l) => s + (n2(l.qty) * n2(l.rate) * n2(l.gstPercent)) / 100, 0);
                        const total = taxable + gst;

                        return (
                          <tr key={inv.id}>
                            <td>
                              <div className="eventura-list-title">{inv.invoiceNo}</div>
                              <div className="eventura-list-sub">{inv.gstType}</div>
                            </td>
                            <td>{inv.invoiceDate}</td>
                            <td>{inv.billToName}</td>
                            <td>{inv.placeOfSupply}</td>
                            <td>₹{money(total)}</td>
                            <td>
                              <button
                                type="button"
                                className="eventura-tag eventura-tag-amber"
                                onClick={() => deleteInvoice(inv.id)}
                              >
                                Delete
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                      {invoices.length === 0 && (
                        <tr>
                          <td colSpan={6} style={{ color: "#9ca3af", fontSize: "0.85rem" }}>
                            No invoices saved yet.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                <p className="eventura-small-text" style={{ marginTop: "0.6rem" }}>
                  Tip: Place of Supply ≠ Gujarat → IGST. Same state → CGST+SGST.
                </p>
              </div>
            </div>
          )}

          {!isCEO && (
            <div className="eventura-panel" style={{ marginTop: "1rem" }}>
              <p className="eventura-small-text">
                Staff access note: You can manage items & stock. GST invoices are visible here too (you can later restrict via Settings).
              </p>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

/* ================== SHARED LAYOUT ================== */
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
        <SidebarLink href="/inventory" label="Inventory & GST" icon="📦" active={active === "inventory"} />
        {isCEO && <SidebarLink href="/reports" label="Reports & Analytics" icon="📈" active={active === "reports"} />}
        {isCEO && <SidebarLink href="/settings" label="Settings & Access" icon="⚙️" active={active === "settings"} />}
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
        <input className="eventura-search" placeholder="Search inventory, invoices..." />
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
