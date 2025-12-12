"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";

/* ================= AUTH ================= */
type Role = "CEO" | "Staff";
type User = { name: string; role: Role; city: string };
const USER_KEY = "eventura-user";

/* ================= STORAGE ================= */
const DB_INV = "eventura-inventory-items";
const DB_INV_LOGS = "eventura-inventory-logs";
const DB_INV_CFG = "eventura-inventory-config";

/* ================= TYPES ================= */
type AssetType = "Consumable" | "Reusable Asset" | "Rental" | "Service";

type InvStatus = "Available" | "In Use" | "Damaged" | "Repair" | "Lost" | "Retired";

type Location = "Warehouse" | "Studio" | "On-site" | "Vendor" | "Transport";

type InvCategory =
  | "Stage"
  | "Lighting"
  | "Sound"
  | "Decor"
  | "Fabric"
  | "Flowers"
  | "Furniture"
  | "Electronics"
  | "Props"
  | "Tools"
  | "Stationery"
  | "Other";

type InventoryItem = {
  id: number;
  name: string;
  category: InvCategory;
  assetType: AssetType;

  status: InvStatus;
  location: Location;

  sku: string; // internal code
  vendorName?: string;
  vendorPhone?: string;

  qtyOnHand: number; // for consumables
  minQty: number; // low stock threshold

  unitCost: number; // purchase price per unit (or per asset)
  purchaseDate?: string; // YYYY-MM-DD
  warrantyUntil?: string; // YYYY-MM-DD
  notes?: string;

  // depreciation (simple straight-line)
  depreciationEnabled: boolean;
  lifeMonths: number;

  // linking with events (optional)
  assignedEventId?: number;
  assignedEventName?: string;

  // “label / QR text”
  labelText: string;
};

type InvLogType = "ADD" | "EDIT" | "DELETE" | "ASSIGN" | "RETURN" | "MAINTENANCE";

type InventoryLog = {
  id: number;
  type: InvLogType;
  at: string; // ISO
  itemId: number;
  message: string;
};

type InvConfig = {
  showAdvancedColumns: boolean;
  defaultLocation: Location;
  defaultMinQty: number;
};

/* ================= UTILS ================= */
const INR = (v: number) => "₹" + Math.round(v || 0).toLocaleString("en-IN");

function today() {
  return new Date().toISOString().slice(0, 10);
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

function monthsBetween(fromISO?: string, toISO?: string) {
  if (!fromISO || !toISO) return 0;
  const a = new Date(fromISO);
  const b = new Date(toISO);
  const months = (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth());
  return Math.max(0, months);
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function badgeClass(status: string) {
  if (status === "Available") return "eventura-tag eventura-tag-green";
  if (status === "In Use") return "eventura-tag eventura-tag-blue";
  if (status === "Damaged" || status === "Repair") return "eventura-tag eventura-tag-amber";
  return "eventura-tag eventura-tag-amber";
}

/* ================= PAGE ================= */
export default function InventoryPage() {
  const [user, setUser] = useState<User | null>(null);

  const defaultCfg: InvConfig = {
    showAdvancedColumns: true,
    defaultLocation: "Warehouse",
    defaultMinQty: 5,
  };

  const [cfg, setCfg] = useState<InvConfig>(defaultCfg);

  const [items, setItems] = useState<InventoryItem[]>([]);
  const [logs, setLogs] = useState<InventoryLog[]>([]);

  const [tab, setTab] = useState<"overview" | "items" | "maintenance" | "backup">("overview");

  const [q, setQ] = useState("");
  const [filterCategory, setFilterCategory] = useState<InvCategory | "ALL">("ALL");
  const [filterStatus, setFilterStatus] = useState<InvStatus | "ALL">("ALL");
  const [filterLocation, setFilterLocation] = useState<Location | "ALL">("ALL");
  const [onlyLowStock, setOnlyLowStock] = useState(false);

  // add form
  const [form, setForm] = useState({
    name: "",
    category: "Decor" as InvCategory,
    assetType: "Reusable Asset" as AssetType,
    status: "Available" as InvStatus,
    location: defaultCfg.defaultLocation as Location,
    sku: "",
    vendorName: "",
    vendorPhone: "",
    qtyOnHand: 1,
    minQty: defaultCfg.defaultMinQty,
    unitCost: 0,
    purchaseDate: "",
    warrantyUntil: "",
    notes: "",
    depreciationEnabled: true,
    lifeMonths: 36,
    assignedEventId: "",
    assignedEventName: "",
  });

  // editing
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editing, setEditing] = useState<InventoryItem | null>(null);

  // backup
  const [backupText, setBackupText] = useState("");

  // UI toggles
  const [showTable, setShowTable] = useState(true);

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
    setCfg(safeObj<InvConfig>(DB_INV_CFG, defaultCfg));
    setItems(safeArray<InventoryItem>(DB_INV));
    setLogs(safeArray<InventoryLog>(DB_INV_LOGS));
  }, []);

  /* ===== PERSIST (prevents “delete appears again”) ===== */
  useEffect(() => {
    localStorage.setItem(DB_INV_CFG, JSON.stringify(cfg));
  }, [cfg]);

  useEffect(() => {
    localStorage.setItem(DB_INV, JSON.stringify(items));
  }, [items]);

  useEffect(() => {
    localStorage.setItem(DB_INV_LOGS, JSON.stringify(logs));
  }, [logs]);

  /* ================= DERIVED ================= */
  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    return items
      .filter((it) => (filterCategory === "ALL" ? true : it.category === filterCategory))
      .filter((it) => (filterStatus === "ALL" ? true : it.status === filterStatus))
      .filter((it) => (filterLocation === "ALL" ? true : it.location === filterLocation))
      .filter((it) => (onlyLowStock ? it.qtyOnHand <= it.minQty : true))
      .filter((it) => {
        if (!query) return true;
        const hay = [
          it.name,
          it.category,
          it.assetType,
          it.status,
          it.location,
          it.sku,
          it.vendorName || "",
          it.assignedEventName || "",
          it.notes || "",
        ]
          .join(" ")
          .toLowerCase();
        return hay.includes(query);
      })
      .sort((a, b) => b.id - a.id);
  }, [items, q, filterCategory, filterStatus, filterLocation, onlyLowStock]);

  const totals = useMemo(() => {
    const totalItems = items.length;

    const lowStock = items.filter((i) => i.qtyOnHand <= i.minQty).length;

    const damaged = items.filter((i) => i.status === "Damaged" || i.status === "Repair").length;

    const inUse = items.filter((i) => i.status === "In Use").length;

    const inventoryValue = items.reduce((s, i) => s + i.unitCost * Math.max(0, i.qtyOnHand || 0), 0);

    const depreciatedBookValue = items.reduce((s, i) => {
      if (!i.depreciationEnabled || !i.purchaseDate || i.lifeMonths <= 0) {
        return s + i.unitCost * Math.max(0, i.qtyOnHand || 0);
      }
      const m = monthsBetween(i.purchaseDate, today());
      const rate = clamp(1 - m / i.lifeMonths, 0, 1);
      return s + i.unitCost * rate * Math.max(0, i.qtyOnHand || 0);
    }, 0);

    return { totalItems, lowStock, damaged, inUse, inventoryValue, depreciatedBookValue };
  }, [items]);

  const recentLogs = useMemo(() => [...logs].sort((a, b) => b.at.localeCompare(a.at)).slice(0, 12), [logs]);

  /* ================= LOGGING ================= */
  const pushLog = (type: InvLogType, itemId: number, message: string) => {
    const entry: InventoryLog = { id: nextId(logs), type, at: new Date().toISOString(), itemId, message };
    setLogs([entry, ...logs]);
  };

  /* ================= CRUD ================= */
  const addItem = () => {
    if (!form.name.trim()) return alert("Item name required");
    if (!form.sku.trim()) return alert("SKU required (example: EVT-DEC-001)");

    const item: InventoryItem = {
      id: nextId(items),
      name: form.name.trim(),
      category: form.category,
      assetType: form.assetType,
      status: form.status,
      location: form.location,
      sku: form.sku.trim(),
      vendorName: form.vendorName.trim() || undefined,
      vendorPhone: form.vendorPhone.trim() || undefined,
      qtyOnHand: Math.max(0, Number(form.qtyOnHand) || 0),
      minQty: Math.max(0, Number(form.minQty) || 0),
      unitCost: Math.max(0, Number(form.unitCost) || 0),
      purchaseDate: form.purchaseDate || undefined,
      warrantyUntil: form.warrantyUntil || undefined,
      notes: form.notes.trim() || undefined,
      depreciationEnabled: !!form.depreciationEnabled,
      lifeMonths: Math.max(1, Number(form.lifeMonths) || 36),
      assignedEventId: form.assignedEventId ? Number(form.assignedEventId) : undefined,
      assignedEventName: form.assignedEventName.trim() || undefined,
      labelText: `${form.sku.trim()} | ${form.name.trim()} | ${form.category} | ${form.location}`,
    };

    setItems([item, ...items]);
    pushLog("ADD", item.id, `Added: ${item.name} (${item.sku})`);

    setForm({
      name: "",
      category: "Decor",
      assetType: "Reusable Asset",
      status: "Available",
      location: cfg.defaultLocation,
      sku: "",
      vendorName: "",
      vendorPhone: "",
      qtyOnHand: 1,
      minQty: cfg.defaultMinQty,
      unitCost: 0,
      purchaseDate: "",
      warrantyUntil: "",
      notes: "",
      depreciationEnabled: true,
      lifeMonths: 36,
      assignedEventId: "",
      assignedEventName: "",
    });
  };

  const deleteItem = (id: number) => {
    if (!confirm("Delete this inventory item?")) return;
    const found = items.find((x) => x.id === id);
    setItems(items.filter((x) => x.id !== id));
    pushLog("DELETE", id, `Deleted: ${found?.name || "Item"} (#${id})`);
  };

  const startEdit = (it: InventoryItem) => {
    setEditingId(it.id);
    setEditing({ ...it });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditing(null);
  };

  const saveEdit = () => {
    if (!editingId || !editing) return;
    if (!editing.name.trim()) return alert("Item name required");
    if (!editing.sku.trim()) return alert("SKU required");

    const updated: InventoryItem = {
      ...editing,
      name: editing.name.trim(),
      sku: editing.sku.trim(),
      qtyOnHand: Math.max(0, Number(editing.qtyOnHand) || 0),
      minQty: Math.max(0, Number(editing.minQty) || 0),
      unitCost: Math.max(0, Number(editing.unitCost) || 0),
      lifeMonths: Math.max(1, Number(editing.lifeMonths) || 36),
      labelText: `${editing.sku.trim()} | ${editing.name.trim()} | ${editing.category} | ${editing.location}`,
    };

    setItems(items.map((x) => (x.id === editingId ? updated : x)));
    pushLog("EDIT", editingId, `Edited: ${updated.name} (${updated.sku})`);

    setEditingId(null);
    setEditing(null);
  };

  const assignToEvent = (id: number, eventName: string, eventId?: number) => {
    setItems(
      items.map((x) =>
        x.id === id
          ? {
              ...x,
              status: "In Use",
              location: "On-site",
              assignedEventId: eventId,
              assignedEventName: eventName,
              labelText: `${x.sku} | ${x.name} | ${x.category} | On-site | Event: ${eventName}`,
            }
          : x
      )
    );
    pushLog("ASSIGN", id, `Assigned to event: ${eventName}`);
  };

  const markReturned = (id: number) => {
    setItems(
      items.map((x) =>
        x.id === id
          ? {
              ...x,
              status: "Available",
              location: cfg.defaultLocation,
              assignedEventId: undefined,
              assignedEventName: undefined,
              labelText: `${x.sku} | ${x.name} | ${x.category} | ${cfg.defaultLocation}`,
            }
          : x
      )
    );
    pushLog("RETURN", id, `Returned to ${cfg.defaultLocation}`);
  };

  const logMaintenance = (id: number, note: string) => {
    if (!note.trim()) return alert("Write maintenance note");
    pushLog("MAINTENANCE", id, `Maintenance: ${note.trim()}`);
    setItems(
      items.map((x) =>
        x.id === id
          ? { ...x, status: x.status === "Damaged" ? "Repair" : x.status }
          : x
      )
    );
  };

  /* ================= BACKUP ================= */
  const exportJSON = async () => {
    const payload = {
      version: 1,
      exportedAt: new Date().toISOString(),
      config: cfg,
      items,
      logs,
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
    if (!backupText.trim()) return alert("Paste export JSON first.");
    if (!confirm("Import will replace inventory items + logs. Continue?")) return;

    try {
      const p = JSON.parse(backupText);
      if (p.config) setCfg({ ...defaultCfg, ...p.config });
      if (Array.isArray(p.items)) setItems(p.items);
      if (Array.isArray(p.logs)) setLogs(p.logs);
      alert("Import completed.");
    } catch {
      alert("Import failed: invalid JSON.");
    }
  };

  /* ================= GUARD ================= */
  if (!user) return null;

  /* ================= UI ================= */
  return (
    <main className="eventura-os">
      {/* Scoped page styles (inventory only) */}
      <style jsx>{`
        .inv-wrap {
          display: grid;
          gap: 14px;
        }
        .inv-head {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          gap: 12px;
          flex-wrap: wrap;
        }
        .inv-title {
          font-size: 1.4rem;
          font-weight: 800;
          letter-spacing: 0.4px;
        }
        .inv-sub {
          opacity: 0.78;
          font-size: 0.9rem;
          margin-top: 4px;
        }
        .inv-toolbar {
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
        .inv-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 12px;
        }
        .inv-kpi {
          border-radius: 20px;
          padding: 16px;
          border: 1px solid rgba(212, 175, 55, 0.22);
          background: linear-gradient(135deg, rgba(212, 175, 55, 0.11), rgba(255, 255, 255, 0.03));
          box-shadow: 0 12px 34px rgba(0, 0, 0, 0.24);
        }
        .inv-kpi-label {
          opacity: 0.75;
          font-size: 0.78rem;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }
        .inv-kpi-value {
          font-size: 1.6rem;
          font-weight: 800;
          margin-top: 6px;
        }
        .inv-kpi-note {
          margin-top: 6px;
          font-size: 0.82rem;
          opacity: 0.75;
        }

        .inv-panels {
          display: grid;
          grid-template-columns: 1.2fr 0.8fr;
          gap: 12px;
        }
        @media (max-width: 980px) {
          .inv-panels {
            grid-template-columns: 1fr;
          }
        }
        .inv-panel {
          border-radius: 22px;
          padding: 16px;
          border: 1px solid rgba(255, 255, 255, 0.08);
          background: rgba(11, 16, 32, 0.78);
          backdrop-filter: blur(10px);
        }
        .inv-panel-title {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 10px;
          margin-bottom: 10px;
        }
        .inv-panel-title h2 {
          font-size: 1.05rem;
          font-weight: 700;
          margin: 0;
        }
        .inv-toggle {
          border-radius: 999px;
          border: 1px solid rgba(255, 255, 255, 0.12);
          background: rgba(255, 255, 255, 0.04);
          padding: 7px 12px;
          cursor: pointer;
          font-size: 0.8rem;
          opacity: 0.92;
        }
        .inv-toggle:hover {
          background: rgba(255, 255, 255, 0.08);
        }
        .inv-table th {
          font-size: 0.72rem;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          opacity: 0.7;
        }
        .inv-bad {
          border: 1px solid rgba(248, 113, 113, 0.35);
          background: rgba(248, 113, 113, 0.08);
          border-radius: 16px;
          padding: 12px;
        }
        code {
          background: rgba(255, 255, 255, 0.06);
          padding: 2px 6px;
          border-radius: 8px;
        }
      `}</style>

      <aside className="eventura-sidebar">
        <SidebarCore user={user} active="inventory" />
      </aside>

      <div className="eventura-main">
        <TopbarCore user={user} />

        <div className="eventura-content inv-wrap">
          <div className="inv-head">
            <div>
              <div className="inv-title">Inventory & Assets</div>
              <div className="inv-sub">Advanced stock, assets, maintenance, assignments, depreciation, export/import.</div>
            </div>

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <button className={"eventura-tag " + (tab === "overview" ? "eventura-tag-blue" : "eventura-tag-amber")} onClick={() => setTab("overview")} type="button">
                Overview
              </button>
              <button className={"eventura-tag " + (tab === "items" ? "eventura-tag-blue" : "eventura-tag-amber")} onClick={() => setTab("items")} type="button">
                Items
              </button>
              <button className={"eventura-tag " + (tab === "maintenance" ? "eventura-tag-blue" : "eventura-tag-amber")} onClick={() => setTab("maintenance")} type="button">
                Maintenance
              </button>
              <button className={"eventura-tag " + (tab === "backup" ? "eventura-tag-blue" : "eventura-tag-amber")} onClick={() => setTab("backup")} type="button">
                Backup
              </button>
            </div>
          </div>

          {/* Toolbar */}
          <div className="inv-toolbar">
            <input className="eventura-search" placeholder="Search items, SKU, vendor, notes..." value={q} onChange={(e) => setQ(e.target.value)} />

            <select className="eventura-search" value={filterCategory} onChange={(e) => setFilterCategory(e.target.value as any)}>
              <option value="ALL">All categories</option>
              {["Stage","Lighting","Sound","Decor","Fabric","Flowers","Furniture","Electronics","Props","Tools","Stationery","Other"].map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>

            <select className="eventura-search" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value as any)}>
              <option value="ALL">All status</option>
              {["Available","In Use","Damaged","Repair","Lost","Retired"].map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>

            <select className="eventura-search" value={filterLocation} onChange={(e) => setFilterLocation(e.target.value as any)}>
              <option value="ALL">All locations</option>
              {["Warehouse","Studio","On-site","Vendor","Transport"].map((l) => (
                <option key={l} value={l}>{l}</option>
              ))}
            </select>

            <label className="eventura-small-text" style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <input type="checkbox" checked={onlyLowStock} onChange={(e) => setOnlyLowStock(e.target.checked)} />
              Low stock only
            </label>

            <div style={{ flex: 1 }} />

            <Link href="/vendors" className="eventura-button-secondary">
              Open Vendors
            </Link>
          </div>

          {/* OVERVIEW */}
          {tab === "overview" && (
            <>
              <section className="inv-grid">
                <div className="inv-kpi">
                  <div className="inv-kpi-label">Total Items</div>
                  <div className="inv-kpi-value">{totals.totalItems}</div>
                  <div className="inv-kpi-note">All assets + consumables</div>
                </div>
                <div className="inv-kpi">
                  <div className="inv-kpi-label">Low Stock Alerts</div>
                  <div className="inv-kpi-value">{totals.lowStock}</div>
                  <div className="inv-kpi-note">Qty ≤ Min Qty</div>
                </div>
                <div className="inv-kpi">
                  <div className="inv-kpi-label">In Use</div>
                  <div className="inv-kpi-value">{totals.inUse}</div>
                  <div className="inv-kpi-note">Assigned / on-site</div>
                </div>
                <div className="inv-kpi">
                  <div className="inv-kpi-label">Inventory Value</div>
                  <div className="inv-kpi-value">{INR(totals.inventoryValue)}</div>
                  <div className="inv-kpi-note">Qty × unit cost</div>
                </div>
                <div className="inv-kpi">
                  <div className="inv-kpi-label">Book Value (Depreciated)</div>
                  <div className="inv-kpi-value">{INR(totals.depreciatedBookValue)}</div>
                  <div className="inv-kpi-note">Straight-line estimate</div>
                </div>
                <div className="inv-kpi">
                  <div className="inv-kpi-label">Damaged / Repair</div>
                  <div className="inv-kpi-value">{totals.damaged}</div>
                  <div className="inv-kpi-note">Needs attention</div>
                </div>
              </section>

              <section className="inv-panels">
                <div className="inv-panel">
                  <div className="inv-panel-title">
                    <h2>Quick Alerts</h2>
                    <button className="inv-toggle" type="button" onClick={() => setShowTable((s) => !s)}>
                      {showTable ? "Hide Table" : "Show Table"}
                    </button>
                  </div>

                  {totals.lowStock > 0 && (
                    <div className="inv-bad" style={{ marginBottom: 10 }}>
                      ⚠ Low stock detected. Use the “Items” tab → filter “Low stock only” → reorder.
                    </div>
                  )}

                  <ul className="eventura-bullets">
                    <li>Tip: Use SKU format like <code>EVT-DEC-001</code> for fast search.</li>
                    <li>Assign assets to an event → status becomes “In Use” automatically.</li>
                    <li>Maintenance log helps track repairs + warranty.</li>
                  </ul>

                  {showTable && (
                    <div className="eventura-table-wrapper" style={{ marginTop: 10 }}>
                      <table className="eventura-table inv-table">
                        <thead>
                          <tr>
                            <th>SKU</th>
                            <th>Item</th>
                            <th>Status</th>
                            <th>Qty</th>
                            <th>Location</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filtered.slice(0, 10).map((it) => (
                            <tr key={it.id}>
                              <td>{it.sku}</td>
                              <td>
                                <div className="eventura-list-title">{it.name}</div>
                                <div className="eventura-list-sub">{it.category} · {it.assetType}</div>
                              </td>
                              <td><span className={badgeClass(it.status)}>{it.status}</span></td>
                              <td>
                                {it.qtyOnHand}
                                {it.qtyOnHand <= it.minQty ? (
                                  <span className="eventura-tag eventura-tag-amber" style={{ marginLeft: 8 }}>
                                    Low
                                  </span>
                                ) : null}
                              </td>
                              <td>{it.location}</td>
                            </tr>
                          ))}
                          {filtered.length === 0 && (
                            <tr><td colSpan={5} className="eventura-small-text">No items yet. Add in “Items” tab.</td></tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                <div className="inv-panel">
                  <div className="inv-panel-title">
                    <h2>Recent Activity</h2>
                  </div>

                  <ul className="eventura-bullets">
                    {recentLogs.map((l) => (
                      <li key={l.id}>
                        <span className="eventura-tag eventura-tag-blue">{l.type}</span>{" "}
                        <span className="eventura-small-text" style={{ opacity: 0.85 }}>
                          {new Date(l.at).toLocaleString()}
                        </span>
                        <div style={{ marginTop: 4 }}>{l.message}</div>
                      </li>
                    ))}
                    {recentLogs.length === 0 && (
                      <li className="eventura-small-text">No logs yet.</li>
                    )}
                  </ul>
                </div>
              </section>
            </>
          )}

          {/* ITEMS */}
          {tab === "items" && (
            <section className="eventura-columns">
              {/* ADD */}
              <div className="inv-panel">
                <div className="inv-panel-title">
                  <h2>Add Item</h2>
                  <button className="inv-toggle" type="button" onClick={() => setCfg({ ...cfg, showAdvancedColumns: !cfg.showAdvancedColumns })}>
                    {cfg.showAdvancedColumns ? "Simple Mode" : "Advanced Mode"}
                  </button>
                </div>

                <div style={{ display: "grid", gap: 10 }}>
                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                    <input className="eventura-search" placeholder="Item name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                    <input className="eventura-search" placeholder="SKU (EVT-DEC-001)" value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} />
                  </div>

                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                    <select className="eventura-search" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value as InvCategory })}>
                      {["Stage","Lighting","Sound","Decor","Fabric","Flowers","Furniture","Electronics","Props","Tools","Stationery","Other"].map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>

                    <select className="eventura-search" value={form.assetType} onChange={(e) => setForm({ ...form, assetType: e.target.value as AssetType })}>
                      {["Consumable","Reusable Asset","Rental","Service"].map((a) => (
                        <option key={a} value={a}>{a}</option>
                      ))}
                    </select>

                    <select className="eventura-search" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as InvStatus })}>
                      {["Available","In Use","Damaged","Repair","Lost","Retired"].map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>

                    <select className="eventura-search" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value as Location })}>
                      {["Warehouse","Studio","On-site","Vendor","Transport"].map((l) => (
                        <option key={l} value={l}>{l}</option>
                      ))}
                    </select>
                  </div>

                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                    <input className="eventura-search" type="number" placeholder="Qty on hand" value={form.qtyOnHand} onChange={(e) => setForm({ ...form, qtyOnHand: Number(e.target.value) || 0 })} />
                    <input className="eventura-search" type="number" placeholder="Min qty" value={form.minQty} onChange={(e) => setForm({ ...form, minQty: Number(e.target.value) || 0 })} />
                    <input className="eventura-search" type="number" placeholder="Unit cost" value={form.unitCost} onChange={(e) => setForm({ ...form, unitCost: Number(e.target.value) || 0 })} />
                  </div>

                  {cfg.showAdvancedColumns && (
                    <>
                      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                        <input className="eventura-search" placeholder="Vendor name (optional)" value={form.vendorName} onChange={(e) => setForm({ ...form, vendorName: e.target.value })} />
                        <input className="eventura-search" placeholder="Vendor phone (optional)" value={form.vendorPhone} onChange={(e) => setForm({ ...form, vendorPhone: e.target.value })} />
                      </div>

                      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                        <input className="eventura-search" type="date" value={form.purchaseDate} onChange={(e) => setForm({ ...form, purchaseDate: e.target.value })} />
                        <input className="eventura-search" type="date" value={form.warrantyUntil} onChange={(e) => setForm({ ...form, warrantyUntil: e.target.value })} />
                      </div>

                      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                        <label className="eventura-small-text" style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <input
                            type="checkbox"
                            checked={form.depreciationEnabled}
                            onChange={(e) => setForm({ ...form, depreciationEnabled: e.target.checked })}
                          />
                          Depreciation
                        </label>
                        <input className="eventura-search" type="number" placeholder="Life months (36)" value={form.lifeMonths} onChange={(e) => setForm({ ...form, lifeMonths: Number(e.target.value) || 36 })} />
                      </div>

                      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                        <input className="eventura-search" placeholder="Assigned event name (optional)" value={form.assignedEventName} onChange={(e) => setForm({ ...form, assignedEventName: e.target.value })} />
                        <input className="eventura-search" placeholder="Assigned event ID (optional)" value={form.assignedEventId} onChange={(e) => setForm({ ...form, assignedEventId: e.target.value })} />
                      </div>

                      <textarea className="eventura-search" placeholder="Notes (optional)" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
                    </>
                  )}

                  <button className="eventura-button-secondary" type="button" onClick={addItem}>
                    Add Item
                  </button>
                </div>
              </div>

              {/* LIST */}
              <div className="inv-panel">
                <div className="inv-panel-title">
                  <h2>Inventory List</h2>
                  <button className="inv-toggle" type="button" onClick={() => setShowTable((s) => !s)}>
                    {showTable ? "Hide Table" : "Show Table"}
                  </button>
                </div>

                {showTable && (
                  <div className="eventura-table-wrapper">
                    <table className="eventura-table inv-table">
                      <thead>
                        <tr>
                          <th>SKU</th>
                          <th>Item</th>
                          <th>Status</th>
                          <th>Qty</th>
                          <th>Cost</th>
                          <th>Assign</th>
                          <th />
                        </tr>
                      </thead>
                      <tbody>
                        {filtered.map((it) => (
                          <tr key={it.id}>
                            <td>{it.sku}</td>
                            <td>
                              <div className="eventura-list-title">{it.name}</div>
                              <div className="eventura-list-sub">
                                {it.category} · {it.assetType} · {it.location}
                                {it.assignedEventName ? ` · Event: ${it.assignedEventName}` : ""}
                              </div>
                            </td>
                            <td><span className={badgeClass(it.status)}>{it.status}</span></td>
                            <td>
                              {it.qtyOnHand}
                              {it.qtyOnHand <= it.minQty ? (
                                <span className="eventura-tag eventura-tag-amber" style={{ marginLeft: 8 }}>
                                  Low
                                </span>
                              ) : null}
                            </td>
                            <td>{INR(it.unitCost)}</td>

                            <td style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                              <button
                                className="eventura-tag eventura-tag-blue"
                                type="button"
                                onClick={() => assignToEvent(it.id, "Client Event", 0)}
                                title="Quick assign (you can edit event name inside item)"
                              >
                                Assign
                              </button>
                              <button
                                className="eventura-tag eventura-tag-green"
                                type="button"
                                onClick={() => markReturned(it.id)}
                              >
                                Return
                              </button>
                            </td>

                            <td style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                              <button className="eventura-tag eventura-tag-blue" type="button" onClick={() => startEdit(it)}>
                                Edit
                              </button>
                              <button className="eventura-tag eventura-tag-amber" type="button" onClick={() => deleteItem(it.id)}>
                                Delete
                              </button>
                            </td>
                          </tr>
                        ))}
                        {filtered.length === 0 && (
                          <tr><td colSpan={7} className="eventura-small-text">No items found.</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* EDIT */}
                {editingId && editing && (
                  <div className="eventura-card" style={{ marginTop: 14 }}>
                    <p className="eventura-card-label">Edit Item</p>

                    <div style={{ display: "grid", gap: 10 }}>
                      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                        <input className="eventura-search" value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
                        <input className="eventura-search" value={editing.sku} onChange={(e) => setEditing({ ...editing, sku: e.target.value })} />
                      </div>

                      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                        <select className="eventura-search" value={editing.category} onChange={(e) => setEditing({ ...editing, category: e.target.value as InvCategory })}>
                          {["Stage","Lighting","Sound","Decor","Fabric","Flowers","Furniture","Electronics","Props","Tools","Stationery","Other"].map((c) => (
                            <option key={c} value={c}>{c}</option>
                          ))}
                        </select>

                        <select className="eventura-search" value={editing.assetType} onChange={(e) => setEditing({ ...editing, assetType: e.target.value as AssetType })}>
                          {["Consumable","Reusable Asset","Rental","Service"].map((a) => (
                            <option key={a} value={a}>{a}</option>
                          ))}
                        </select>

                        <select className="eventura-search" value={editing.status} onChange={(e) => setEditing({ ...editing, status: e.target.value as InvStatus })}>
                          {["Available","In Use","Damaged","Repair","Lost","Retired"].map((s) => (
                            <option key={s} value={s}>{s}</option>
                          ))}
                        </select>

                        <select className="eventura-search" value={editing.location} onChange={(e) => setEditing({ ...editing, location: e.target.value as Location })}>
                          {["Warehouse","Studio","On-site","Vendor","Transport"].map((l) => (
                            <option key={l} value={l}>{l}</option>
                          ))}
                        </select>
                      </div>

                      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                        <input className="eventura-search" type="number" value={editing.qtyOnHand} onChange={(e) => setEditing({ ...editing, qtyOnHand: Number(e.target.value) || 0 })} />
                        <input className="eventura-search" type="number" value={editing.minQty} onChange={(e) => setEditing({ ...editing, minQty: Number(e.target.value) || 0 })} />
                        <input className="eventura-search" type="number" value={editing.unitCost} onChange={(e) => setEditing({ ...editing, unitCost: Number(e.target.value) || 0 })} />
                      </div>

                      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                        <input className="eventura-search" placeholder="Vendor name" value={editing.vendorName || ""} onChange={(e) => setEditing({ ...editing, vendorName: e.target.value })} />
                        <input className="eventura-search" placeholder="Vendor phone" value={editing.vendorPhone || ""} onChange={(e) => setEditing({ ...editing, vendorPhone: e.target.value })} />
                      </div>

                      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                        <input className="eventura-search" type="date" value={editing.purchaseDate || ""} onChange={(e) => setEditing({ ...editing, purchaseDate: e.target.value })} />
                        <input className="eventura-search" type="date" value={editing.warrantyUntil || ""} onChange={(e) => setEditing({ ...editing, warrantyUntil: e.target.value })} />
                      </div>

                      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                        <label className="eventura-small-text" style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <input
                            type="checkbox"
                            checked={editing.depreciationEnabled}
                            onChange={(e) => setEditing({ ...editing, depreciationEnabled: e.target.checked })}
                          />
                          Depreciation
                        </label>
                        <input className="eventura-search" type="number" value={editing.lifeMonths} onChange={(e) => setEditing({ ...editing, lifeMonths: Number(e.target.value) || 36 })} />
                      </div>

                      <textarea className="eventura-search" placeholder="Notes" value={editing.notes || ""} onChange={(e) => setEditing({ ...editing, notes: e.target.value })} />

                      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                        <button className="eventura-button-secondary" type="button" onClick={saveEdit}>
                          Save
                        </button>
                        <button className="eventura-tag eventura-tag-amber" type="button" onClick={cancelEdit}>
                          Cancel
                        </button>
                      </div>

                      <div className="eventura-small-text" style={{ opacity: 0.8 }}>
                        Label / QR text: <code>{editing.labelText}</code>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </section>
          )}

          {/* MAINTENANCE */}
          {tab === "maintenance" && (
            <section className="eventura-columns">
              <div className="inv-panel">
                <div className="inv-panel-title">
                  <h2>Maintenance Log</h2>
                </div>

                <div className="eventura-table-wrapper">
                  <table className="eventura-table inv-table">
                    <thead>
                      <tr>
                        <th>Time</th>
                        <th>Type</th>
                        <th>Item</th>
                        <th>Message</th>
                      </tr>
                    </thead>
                    <tbody>
                      {logs.slice(0, 40).map((l) => {
                        const it = items.find((x) => x.id === l.itemId);
                        return (
                          <tr key={l.id}>
                            <td>{new Date(l.at).toLocaleString()}</td>
                            <td><span className="eventura-tag eventura-tag-blue">{l.type}</span></td>
                            <td>{it ? `${it.name} (${it.sku})` : `#${l.itemId}`}</td>
                            <td>{l.message}</td>
                          </tr>
                        );
                      })}
                      {logs.length === 0 && (
                        <tr><td colSpan={4} className="eventura-small-text">No maintenance yet.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="eventura-small-text" style={{ marginTop: 10, opacity: 0.8 }}>
                  Tip: To add maintenance entry quickly, open an item → Edit → use “Notes” + change status to “Repair”.
                </div>
              </div>

              <div className="inv-panel">
                <div className="inv-panel-title">
                  <h2>Quick Maintenance</h2>
                </div>

                <div className="eventura-small-text" style={{ opacity: 0.8 }}>
                  Use this to log maintenance for any item by ID.
                </div>

                <QuickMaintenance items={items} onLog={(id, note) => logMaintenance(id, note)} />
              </div>
            </section>
          )}

          {/* BACKUP */}
          {tab === "backup" && (
            <section className="eventura-columns">
              <div className="inv-panel">
                <div className="inv-panel-title">
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
                  style={{ width: "100%", height: 280 }}
                  placeholder="Export appears here. Paste JSON here to import."
                  value={backupText}
                  onChange={(e) => setBackupText(e.target.value)}
                />
              </div>

              <div className="inv-panel">
                <div className="inv-panel-title">
                  <h2>Config</h2>
                </div>

                <div style={{ display: "grid", gap: 10 }}>
                  <label className="eventura-small-text" style={{ display: "flex", gap: 10, alignItems: "center" }}>
                    <input
                      type="checkbox"
                      checked={cfg.showAdvancedColumns}
                      onChange={(e) => setCfg({ ...cfg, showAdvancedColumns: e.target.checked })}
                    />
                    Show advanced fields by default
                  </label>

                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                    <div className="eventura-small-text">Default location</div>
                    <select className="eventura-search" value={cfg.defaultLocation} onChange={(e) => setCfg({ ...cfg, defaultLocation: e.target.value as Location })}>
                      {["Warehouse","Studio","On-site","Vendor","Transport"].map((l) => (
                        <option key={l} value={l}>{l}</option>
                      ))}
                    </select>
                  </div>

                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                    <div className="eventura-small-text">Default Min Qty</div>
                    <input
                      className="eventura-search"
                      type="number"
                      value={cfg.defaultMinQty}
                      onChange={(e) => setCfg({ ...cfg, defaultMinQty: Math.max(0, Number(e.target.value) || 0) })}
                    />
                  </div>

                  <div className="eventura-small-text" style={{ opacity: 0.8 }}>
                    Storage keys: <code>{DB_INV}</code>, <code>{DB_INV_LOGS}</code>, <code>{DB_INV_CFG}</code>
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

/* ================= Quick Maintenance Widget ================= */
function QuickMaintenance({
  items,
  onLog,
}: {
  items: InventoryItem[];
  onLog: (id: number, note: string) => void;
}) {
  const [id, setId] = useState<string>("");
  const [note, setNote] = useState("");

  return (
    <div style={{ display: "grid", gap: 10, marginTop: 10 }}>
      <select className="eventura-search" value={id} onChange={(e) => setId(e.target.value)}>
        <option value="">Select item</option>
        {items.map((it) => (
          <option key={it.id} value={it.id}>
            #{it.id} — {it.name} ({it.sku})
          </option>
        ))}
      </select>

      <input className="eventura-search" placeholder="Maintenance note" value={note} onChange={(e) => setNote(e.target.value)} />

      <button
        className="eventura-button-secondary"
        type="button"
        onClick={() => {
          if (!id) return alert("Select item");
          onLog(Number(id), note);
          setNote("");
        }}
      >
        Log Maintenance
      </button>
    </div>
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
        <input className="eventura-search" placeholder="Search inventory..." />
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
