"use client";

import { useMemo, useState } from "react";
import {
  AlertCircle,
  AlertTriangle,
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  Barcode,
  Boxes,
  Calendar,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Clock,
  DollarSign,
  Download,
  Edit3,
  ExternalLink,
  Eye,
  FileSpreadsheet,
  FileText,
  Filter,
  History,
  Info,
  Layers,
  LayoutGrid,
  List,
  LucideIcon,
  Minus,
  Package,
  PackageCheck,
  PackageMinus,
  PackagePlus,
  PackageX,
  Pencil,
  Percent,
  Phone,
  Pill,
  Plus,
  Printer,
  QrCode,
  RefreshCw,
  Search,
  ShieldAlert,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Stethoscope,
  Tag,
  Thermometer,
  Trash2,
  TrendingDown,
  TrendingUp,
  Truck,
  User,
  Users,
  Wallet,
  X,
  Zap,
} from "lucide-react";

import { useWonFlowSession } from "@/app/_providers";
import {
  useCreateBatch,
  useCreateMedication,
  useCreatePurchaseReceipt,
  useCreateSupplier,
  useInventory,
  useInventoryItem,
  useMovements,
  useStockAlerts,
  useSuppliers,
  useUpdateInventoryItem,
} from "@/lib/api/pharmacy";

import type {
  CreateMedicationInput,
  CreateSupplierInput,
  ExpiryState,
  InventoryItem,
  StockMovementRecord,
  SupplierRecord,
} from "@/lib/api/pharmacy";

type Tab = "inventory" | "receive" | "suppliers" | "movements" | "alerts";
type ViewMode = "table" | "grid";
type StockFilter = "all" | "in_stock" | "low_stock" | "out_of_stock" | "expiring";

// -------------------------------------------------------------
// DOSAGE FORM ICONS & COLOR HELPERS
// -------------------------------------------------------------
function getDosageBadge(form: string | null) {
  const f = (form || "tablet").toLowerCase();
  if (f.includes("syrup") || f.includes("liquid") || f.includes("suspension")) {
    return { label: form || "Syrup", bg: "bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300" };
  }
  if (f.includes("inject") || f.includes("vial") || f.includes("ampoule") || f.includes("iv")) {
    return { label: form || "Injectable", bg: "bg-purple-50 text-purple-800 border-purple-200 dark:bg-purple-950/50 dark:text-purple-300" };
  }
  if (f.includes("capsule")) {
    return { label: form || "Capsule", bg: "bg-blue-50 text-blue-800 border-blue-200 dark:bg-blue-950/50 dark:text-blue-300" };
  }
  if (f.includes("drop") || f.includes("eye") || f.includes("ear")) {
    return { label: form || "Drops", bg: "bg-cyan-50 text-cyan-800 border-cyan-200 dark:bg-cyan-950/50 dark:text-cyan-300" };
  }
  if (f.includes("cream") || f.includes("ointment") || f.includes("gel")) {
    return { label: form || "Topical", bg: "bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950/50 dark:text-rose-300" };
  }
  return { label: form || "Tablet", bg: "bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300" };
}

// -------------------------------------------------------------
// MAIN WORKSPACE: ENTERPRISE PHARMACY INVENTORY SYSTEM
// -------------------------------------------------------------
export function PharmacyInventoryManagement() {
  const [tab, setTab] = useState<Tab>("inventory");
  const [searchQuery, setSearchQuery] = useState("");
  const [stockFilter, setStockFilter] = useState<StockFilter>("all");
  const [dosageFilter, setDosageFilter] = useState<string>("all");
  const [viewMode, setViewMode] = useState<ViewMode>("table");
  const [selectedMedicationId, setSelectedMedicationId] = useState<string | null>(null);
  const [showAddMedModal, setShowAddMedModal] = useState(false);
  const [showQuickBatchModal, setShowQuickBatchModal] = useState<InventoryItem | null>(null);

  // Load Inventory data
  const inventory = useInventory();
  const suppliers = useSuppliers();
  const alerts = useStockAlerts();
  const movements = useMovements();

  const items = inventory.data?.items ?? [];

  // Compute Live Metrics
  const metrics = useMemo(() => {
    const totalSKUs = items.length;
    const totalUnits = items.reduce((sum, item) => sum + item.availableQuantity, 0);
    const lowStockCount = items.filter((i) => i.isLowStock || i.availableQuantity <= Number(i.reorderLevel)).length;
    const outOfStockCount = items.filter((i) => i.availableQuantity === 0).length;
    const expiringCount = alerts.data?.expiring?.length ?? 0;
    const activeSuppliers = suppliers.data?.suppliers?.filter((s) => s.status === "ACTIVE").length ?? 0;

    return {
      totalSKUs,
      totalUnits,
      lowStockCount,
      outOfStockCount,
      expiringCount,
      activeSuppliers,
    };
  }, [items, alerts.data, suppliers.data]);

  // Filter and Sort Items
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const q = searchQuery.trim().toLowerCase();
      const matchesSearch =
        !q ||
        item.genericName.toLowerCase().includes(q) ||
        (item.brandName && item.brandName.toLowerCase().includes(q)) ||
        item.code.toLowerCase().includes(q) ||
        (item.strength && item.strength.toLowerCase().includes(q));

      if (!matchesSearch) return false;

      // Dosage Filter
      if (dosageFilter !== "all") {
        const d = (item.dosageForm || "tablet").toLowerCase();
        if (!d.includes(dosageFilter.toLowerCase())) return false;
      }

      // Stock Status Filter
      if (stockFilter === "low_stock") return item.isLowStock || (item.availableQuantity > 0 && item.availableQuantity <= Number(item.reorderLevel));
      if (stockFilter === "out_of_stock") return item.availableQuantity === 0;
      if (stockFilter === "in_stock") return item.availableQuantity > 0;
      if (stockFilter === "expiring") return item.nearestExpiryState && item.nearestExpiryState !== "safe";

      return true;
    });
  }, [items, searchQuery, dosageFilter, stockFilter]);

  const tabs: { key: Tab; label: string; icon: LucideIcon; badge?: number }[] = [
    { key: "inventory", label: "Medication Catalog", icon: Boxes, badge: items.length },
    { key: "receive", label: "Receive Stock (GRN)", icon: PackagePlus },
    { key: "suppliers", label: "Suppliers & Vendors", icon: Truck, badge: suppliers.data?.suppliers?.length },
    { key: "movements", label: "Stock Ledger & Audit", icon: History },
    { key: "alerts", label: "Expiry & Stock Alerts", icon: ShieldAlert, badge: metrics.lowStockCount + metrics.expiringCount },
  ];

  return (
    <div className="min-h-screen space-y-6 pb-20">
      {/* Top Banner & Header */}
      <header className="sticky top-2 z-30 overflow-hidden rounded-3xl border border-white/60 bg-white/85 p-5 shadow-xl shadow-emerald-950/5 backdrop-blur-2xl transition-all duration-300 dark:border-slate-800/80 dark:bg-slate-900/80">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3.5">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-600 via-emerald-600 to-teal-700 font-black text-white shadow-md shadow-emerald-600/25">
              <Boxes className="h-6 w-6" />
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-base font-black text-slate-950 dark:text-white sm:text-lg">
                  Pharmacy Inventory & Stock Controller
                </h1>
                <span className="rounded-lg bg-emerald-50 px-2 py-0.5 text-[11px] font-black uppercase tracking-wider text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300">
                  📦 Live Real-Time Multi-Batch System
                </span>
              </div>
              <p className="mt-0.5 text-xs font-semibold text-slate-500 dark:text-slate-400">
                Track SKUs, batch expiry dates, reorder thresholds, supplier invoices, and real-time doctor visibility.
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={() => inventory.reload?.()}
              className="inline-flex items-center gap-1.5 rounded-2xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span>Refresh Stock</span>
            </button>

            <button
              type="button"
              onClick={() => setShowAddMedModal(true)}
              className="inline-flex items-center gap-1.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 px-4 py-2 text-xs font-black text-white shadow-md shadow-emerald-500/20 transition hover:from-emerald-700 hover:to-teal-700"
            >
              <Plus className="h-4 w-4" />
              <span>Add New Medication</span>
            </button>
          </div>
        </div>
      </header>

      {/* KPI & Summary Dashboard Cards */}
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <div className="rounded-3xl border border-white/60 bg-white/90 p-4 shadow-lg backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/90">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[10px] font-black uppercase tracking-wider">Total Active SKUs</span>
            <Pill className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-950 dark:text-white">{metrics.totalSKUs}</span>
            <span className="text-[11px] font-bold text-slate-400">Products</span>
          </div>
          <p className="mt-1 text-[11px] text-emerald-600 font-semibold">100% Synced to Doctor Portal</p>
        </div>

        <div className="rounded-3xl border border-white/60 bg-white/90 p-4 shadow-lg backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/90">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[10px] font-black uppercase tracking-wider">Total Units in Hand</span>
            <Layers className="h-4 w-4 text-teal-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-teal-700 dark:text-teal-400">{metrics.totalUnits.toLocaleString()}</span>
            <span className="text-[11px] font-bold text-slate-400">Units</span>
          </div>
          <p className="mt-1 text-[11px] text-slate-500 font-semibold">Across active warehouse batches</p>
        </div>

        <div
          role="button"
          onClick={() => {
            setTab("inventory");
            setStockFilter("low_stock");
          }}
          className={`cursor-pointer rounded-3xl border p-4 shadow-lg backdrop-blur-xl transition hover:scale-[1.02] ${
            metrics.lowStockCount > 0
              ? "border-rose-200 bg-rose-50/70 dark:border-rose-900/60 dark:bg-rose-950/40"
              : "border-white/60 bg-white/90 dark:border-slate-800 dark:bg-slate-900/90"
          }`}
        >
          <div className="flex items-center justify-between text-rose-700 dark:text-rose-400">
            <span className="text-[10px] font-black uppercase tracking-wider">Low Stock Warnings</span>
            <AlertTriangle className="h-4 w-4" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className={`text-2xl font-black ${metrics.lowStockCount > 0 ? "text-rose-700 dark:text-rose-400" : "text-slate-900 dark:text-white"}`}>
              {metrics.lowStockCount}
            </span>
            <span className="text-[11px] font-bold text-slate-400">Under reorder level</span>
          </div>
          <p className="mt-1 text-[11px] text-rose-600 font-semibold">Click to filter low stock items</p>
        </div>

        <div
          role="button"
          onClick={() => {
            setTab("alerts");
          }}
          className={`cursor-pointer rounded-3xl border p-4 shadow-lg backdrop-blur-xl transition hover:scale-[1.02] ${
            metrics.expiringCount > 0
              ? "border-amber-200 bg-amber-50/70 dark:border-amber-900/60 dark:bg-amber-950/40"
              : "border-white/60 bg-white/90 dark:border-slate-800 dark:bg-slate-900/90"
          }`}
        >
          <div className="flex items-center justify-between text-amber-700 dark:text-amber-400">
            <span className="text-[10px] font-black uppercase tracking-wider">Near Expiry Batches</span>
            <Clock className="h-4 w-4" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className={`text-2xl font-black ${metrics.expiringCount > 0 ? "text-amber-700 dark:text-amber-400" : "text-slate-900 dark:text-white"}`}>
              {metrics.expiringCount}
            </span>
            <span className="text-[11px] font-bold text-slate-400">Batches flagged</span>
          </div>
          <p className="mt-1 text-[11px] text-amber-600 font-semibold">Click to inspect expiry radar</p>
        </div>

        <div className="rounded-3xl border border-white/60 bg-white/90 p-4 shadow-lg backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/90">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[10px] font-black uppercase tracking-wider">Registered Vendors</span>
            <Truck className="h-4 w-4 text-indigo-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-indigo-700 dark:text-indigo-400">{metrics.activeSuppliers}</span>
            <span className="text-[11px] font-bold text-slate-400">Active Suppliers</span>
          </div>
          <p className="mt-1 text-[11px] text-indigo-600 font-semibold">Direct purchase invoice linkage</p>
        </div>
      </section>

      {/* Navigation Tabs */}
      <nav className="flex items-center gap-1.5 overflow-x-auto rounded-2xl border border-white/40 bg-slate-100/60 p-1.5 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/60">
        {tabs.map((entry) => {
          const Icon = entry.icon;
          const isActive = tab === entry.key;
          return (
            <button
              key={entry.key}
              type="button"
              onClick={() => setTab(entry.key)}
              className={`inline-flex shrink-0 items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-black transition-all ${
                isActive
                  ? "bg-white text-emerald-700 shadow-md shadow-slate-200/50 dark:bg-slate-800 dark:text-emerald-400"
                  : "text-slate-600 hover:bg-white/60 hover:text-slate-900 dark:text-slate-400"
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{entry.label}</span>
              {entry.badge !== undefined && entry.badge > 0 && (
                <span
                  className={`rounded-full px-2 py-0.2 text-[10px] font-black ${
                    isActive
                      ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                      : "bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300"
                  }`}
                >
                  {entry.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* TAB 1: ADVANCED MEDICATION INVENTORY CATALOG */}
      {tab === "inventory" && (
        <section className="space-y-4">
          {/* Controls Bar: Search, Filters & View Switcher */}
          <div className="flex flex-col gap-3 rounded-3xl border border-white/60 bg-white/95 p-4 shadow-xl backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/90 lg:flex-row lg:items-center lg:justify-between">
            {/* Search Input */}
            <div className="relative flex-1 max-w-md">
              <Search className="pointer-events-none absolute inset-y-0 left-0 my-auto ml-3 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search generic, brand, SKU code, or strength…"
                className="h-10 w-full rounded-2xl border border-slate-200 bg-slate-50/70 pl-9 pr-8 text-xs font-bold text-slate-900 outline-none focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-100 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute inset-y-0 right-0 flex items-center pr-2.5 text-slate-400 hover:text-slate-600"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* Filter Chips & Controls */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Dosage Form Selector */}
              <select
                value={dosageFilter}
                onChange={(e) => setDosageFilter(e.target.value)}
                className="h-10 rounded-2xl border border-slate-200 bg-slate-50/70 px-3 text-xs font-bold text-slate-700 outline-none focus:border-emerald-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
              >
                <option value="all">All Dosage Forms</option>
                <option value="tablet">Tablets</option>
                <option value="capsule">Capsules</option>
                <option value="syrup">Syrups / Liquids</option>
                <option value="inject">Injections / Vials</option>
                <option value="drop">Eye / Ear Drops</option>
                <option value="cream">Topical / Creams</option>
              </select>

              {/* Status Filter Chips */}
              <div className="flex rounded-2xl bg-slate-100 p-1 dark:bg-slate-800">
                <button
                  type="button"
                  onClick={() => setStockFilter("all")}
                  className={`rounded-xl px-2.5 py-1 text-[11px] font-bold transition ${
                    stockFilter === "all" ? "bg-white text-emerald-700 shadow-sm dark:bg-slate-700 dark:text-emerald-400" : "text-slate-600"
                  }`}
                >
                  All ({items.length})
                </button>
                <button
                  type="button"
                  onClick={() => setStockFilter("in_stock")}
                  className={`rounded-xl px-2.5 py-1 text-[11px] font-bold transition ${
                    stockFilter === "in_stock" ? "bg-white text-emerald-700 shadow-sm dark:bg-slate-700 dark:text-emerald-400" : "text-slate-600"
                  }`}
                >
                  In Stock
                </button>
                <button
                  type="button"
                  onClick={() => setStockFilter("low_stock")}
                  className={`rounded-xl px-2.5 py-1 text-[11px] font-bold transition ${
                    stockFilter === "low_stock" ? "bg-white text-rose-700 shadow-sm dark:bg-slate-700 dark:text-rose-400" : "text-slate-600"
                  }`}
                >
                  Low Stock ({metrics.lowStockCount})
                </button>
                <button
                  type="button"
                  onClick={() => setStockFilter("out_of_stock")}
                  className={`rounded-xl px-2.5 py-1 text-[11px] font-bold transition ${
                    stockFilter === "out_of_stock" ? "bg-white text-rose-700 shadow-sm dark:bg-slate-700 dark:text-rose-400" : "text-slate-600"
                  }`}
                >
                  Out of Stock ({metrics.outOfStockCount})
                </button>
              </div>

              {/* View Switcher */}
              <div className="flex rounded-2xl bg-slate-100 p-1 dark:bg-slate-800">
                <button
                  type="button"
                  onClick={() => setViewMode("table")}
                  className={`rounded-xl p-1.5 transition ${viewMode === "table" ? "bg-white text-emerald-700 shadow-sm dark:bg-slate-700 dark:text-emerald-400" : "text-slate-400"}`}
                  title="ERP Table View"
                >
                  <List className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("grid")}
                  className={`rounded-xl p-1.5 transition ${viewMode === "grid" ? "bg-white text-emerald-700 shadow-sm dark:bg-slate-700 dark:text-emerald-400" : "text-slate-400"}`}
                  title="Grid View"
                >
                  <LayoutGrid className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Catalog Data: ERP Table View */}
          {viewMode === "table" ? (
            <div className="overflow-hidden rounded-3xl border border-white/60 bg-white/95 shadow-xl backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/90">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 text-[10px] font-black uppercase text-slate-500 bg-slate-50/80 dark:border-slate-700 dark:bg-slate-800/80">
                      <th className="py-3 px-4">Medication & Strength</th>
                      <th className="py-3 px-3">SKU / Code</th>
                      <th className="py-3 px-3">Dosage & Unit</th>
                      <th className="py-3 px-3">Available Stock</th>
                      <th className="py-3 px-3">Reorder Threshold</th>
                      <th className="py-3 px-3">Doctor Status</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {filteredItems.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-12 text-center text-slate-500">
                          <Package className="mx-auto h-8 w-8 text-slate-300 mb-2" />
                          <p className="font-bold">No medications match your filter criteria.</p>
                          <p className="text-[11px] text-slate-400">Try clearing the search or add a new medication.</p>
                        </td>
                      </tr>
                    ) : (
                      filteredItems.map((item) => {
                        const badge = getDosageBadge(item.dosageForm);
                        const isExpanded = selectedMedicationId === item.id;
                        const stockRatio = Math.min(100, Math.round((item.availableQuantity / (Math.max(1, Number(item.reorderLevel) * 3))) * 100));

                        return (
                          <MedicationTableRow
                            key={item.id}
                            item={item}
                            badge={badge}
                            isExpanded={isExpanded}
                            stockRatio={stockRatio}
                            onToggleExpand={() => setSelectedMedicationId(isExpanded ? null : item.id)}
                            onQuickBatch={() => setShowQuickBatchModal(item)}
                          />
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            /* Visual Card Grid View */
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filteredItems.map((item) => {
                const badge = getDosageBadge(item.dosageForm);
                const isExpanded = selectedMedicationId === item.id;

                return (
                  <div
                    key={item.id}
                    className="flex flex-col justify-between rounded-3xl border border-white/60 bg-white/95 p-5 shadow-xl backdrop-blur-xl transition hover:shadow-2xl dark:border-slate-800 dark:bg-slate-900/90"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <span className={`inline-flex items-center rounded-xl border px-2.5 py-0.5 text-[10px] font-black ${badge.bg}`}>
                          {badge.label}
                        </span>
                        <span className="font-mono text-[10px] font-bold text-slate-400">{item.code}</span>
                      </div>

                      <h3 className="mt-2 text-sm font-black text-slate-950 dark:text-white">
                        {item.genericName}
                      </h3>
                      {item.brandName && (
                        <p className="text-xs font-semibold text-slate-500">
                          Brand: <strong>{item.brandName}</strong> {item.strength ? `(${item.strength})` : ""}
                        </p>
                      )}

                      {/* Stock Level Display */}
                      <div className="mt-4 rounded-2xl bg-slate-50 p-3 dark:bg-slate-800/60">
                        <div className="flex justify-between items-center text-xs">
                          <span className="font-bold text-slate-600 dark:text-slate-400">Available:</span>
                          <span className={`font-black ${item.availableQuantity === 0 ? "text-rose-600" : item.isLowStock ? "text-amber-600" : "text-emerald-600"}`}>
                            {item.availableQuantity} {item.unit}s
                          </span>
                        </div>
                        <div className="mt-1.5 flex justify-between items-center text-[10px] text-slate-400">
                          <span>Reorder Alert: {item.reorderLevel}</span>
                          <span>{item.isLowStock ? "⚠️ Under Limit" : "🟢 Healthy"}</span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 dark:border-slate-800">
                      <button
                        type="button"
                        onClick={() => setSelectedMedicationId(isExpanded ? null : item.id)}
                        className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 hover:underline"
                      >
                        <span>{isExpanded ? "Hide Batches" : "Inspect Batches"}</span>
                        {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                      </button>

                      <button
                        type="button"
                        onClick={() => setShowQuickBatchModal(item)}
                        className="inline-flex items-center gap-1 rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-black text-white shadow-sm hover:bg-emerald-700"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        <span>+ Add Batch</span>
                      </button>
                    </div>

                    {/* Batch Inspector Drawer inside card */}
                    {isExpanded && (
                      <div className="mt-3 border-t border-slate-100 pt-3 dark:border-slate-800">
                        <MedicationBatchesView medicationId={item.id} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* TAB 2: RECEIVE STOCK (PURCHASE INWARD GRN) */}
      {tab === "receive" && <AdvancedReceiveStockTab items={items} suppliers={suppliers.data?.suppliers ?? []} />}

      {/* TAB 3: SUPPLIERS & VENDORS DIRECTORY */}
      {tab === "suppliers" && <SuppliersVendorTab suppliers={suppliers.data?.suppliers ?? []} reloadSuppliers={() => suppliers.reload?.()} />}

      {/* TAB 4: STOCK MOVEMENTS & AUDIT LEDGER */}
      {tab === "movements" && <StockMovementsAuditTab movements={movements.data?.movements ?? []} />}

      {/* TAB 5: STOCK ALERTS & EXPIRY RADAR */}
      {tab === "alerts" && <StockAlertsRadarTab alerts={alerts.data} onReceiveClick={() => setTab("receive")} />}

      {/* MODAL: ADD NEW MEDICATION */}
      {showAddMedModal && (
        <CreateMedicationModal
          onClose={() => setShowAddMedModal(false)}
          onSuccess={() => {
            setShowAddMedModal(false);
            inventory.reload?.();
          }}
        />
      )}

      {/* MODAL: QUICK BATCH INTAKE */}
      {showQuickBatchModal && (
        <QuickBatchIntakeModal
          medication={showQuickBatchModal}
          onClose={() => setShowQuickBatchModal(null)}
          onSuccess={() => {
            setShowQuickBatchModal(null);
            inventory.reload?.();
          }}
        />
      )}
    </div>
  );
}

// -------------------------------------------------------------
// TABLE ROW WITH EXPANDABLE BATCH DETAILS & FAST ACTIONS
// -------------------------------------------------------------
function MedicationTableRow({
  item,
  badge,
  isExpanded,
  stockRatio,
  onToggleExpand,
  onQuickBatch,
}: {
  item: InventoryItem;
  badge: { label: string; bg: string };
  isExpanded: boolean;
  stockRatio: number;
  onToggleExpand: () => void;
  onQuickBatch: () => void;
}) {
  const updateItem = useUpdateInventoryItem(item.id);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  async function toggleActiveStatus() {
    setIsUpdatingStatus(true);
    try {
      await updateItem.mutate({ isActive: !item.isActive, reason: "Manual toggle from inventory controller" });
    } catch {} finally {
      setIsUpdatingStatus(false);
    }
  }

  return (
    <>
      <tr className="hover:bg-slate-50/80 transition dark:hover:bg-slate-800/50">
        <td className="py-3 px-4">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onToggleExpand}
              className="flex h-6 w-6 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-100"
            >
              {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            </button>
            <div>
              <div className="font-black text-slate-900 dark:text-white">
                {item.genericName}
              </div>
              {item.brandName && (
                <div className="text-[11px] font-semibold text-slate-500">
                  Brand: {item.brandName} {item.strength ? `• Strength: ${item.strength}` : ""}
                </div>
              )}
            </div>
          </div>
        </td>

        <td className="py-3 px-3 font-mono text-[11px] font-bold text-slate-600 dark:text-slate-400">
          {item.code}
        </td>

        <td className="py-3 px-3">
          <span className={`inline-flex items-center rounded-xl border px-2 py-0.5 text-[10px] font-black ${badge.bg}`}>
            {badge.label} • {item.unit}
          </span>
        </td>

        <td className="py-3 px-3">
          <div>
            <div className="flex items-center gap-2">
              <span
                className={`text-xs font-black ${
                  item.availableQuantity === 0
                    ? "text-rose-600"
                    : item.isLowStock
                    ? "text-amber-600"
                    : "text-emerald-600 dark:text-emerald-400"
                }`}
              >
                {item.availableQuantity} {item.unit}s
              </span>
              {item.isLowStock && (
                <span className="rounded bg-rose-100 px-1.5 py-0.2 text-[9px] font-black text-rose-800">
                  LOW
                </span>
              )}
            </div>

            {/* Visual Stock Meter */}
            <div className="mt-1 h-1.5 w-24 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
              <div
                className={`h-full rounded-full ${
                  item.availableQuantity === 0 ? "bg-rose-500" : item.isLowStock ? "bg-amber-500" : "bg-emerald-500"
                }`}
                style={{ width: `${Math.max(5, stockRatio)}%` }}
              />
            </div>
          </div>
        </td>

        <td className="py-3 px-3 font-bold text-slate-700 dark:text-slate-300">
          {item.reorderLevel} {item.unit}s
        </td>

        <td className="py-3 px-3">
          <button
            type="button"
            disabled={isUpdatingStatus}
            onClick={toggleActiveStatus}
            className={`inline-flex items-center gap-1 rounded-xl px-2.5 py-1 text-[11px] font-black transition ${
              item.isActive
                ? "bg-emerald-50 text-emerald-800 hover:bg-rose-50 hover:text-rose-700 dark:bg-emerald-950/60 dark:text-emerald-300"
                : "bg-slate-100 text-slate-500 hover:bg-emerald-50 hover:text-emerald-700"
            }`}
          >
            <span className={`h-2 w-2 rounded-full ${item.isActive ? "bg-emerald-500" : "bg-slate-400"}`} />
            <span>{item.isActive ? "🟢 Synced to Doctor" : "⚪ Hidden from Doctor"}</span>
          </button>
        </td>

        <td className="py-3 px-4 text-right">
          <div className="flex items-center justify-end gap-1.5">
            <button
              type="button"
              onClick={onQuickBatch}
              className="inline-flex items-center gap-1 rounded-xl bg-emerald-600 px-3 py-1 text-[11px] font-black text-white shadow-sm hover:bg-emerald-700"
            >
              <Plus className="h-3 w-3" />
              <span>+ Batch</span>
            </button>
          </div>
        </td>
      </tr>

      {/* Expanded Batches Sub-Table */}
      {isExpanded && (
        <tr className="bg-slate-50/90 dark:bg-slate-800/80">
          <td colSpan={7} className="p-4">
            <MedicationBatchesView medicationId={item.id} />
          </td>
        </tr>
      )}
    </>
  );
}

// -------------------------------------------------------------
// BATCHES VIEWER FOR INDIVIDUAL MEDICATION
// -------------------------------------------------------------
function MedicationBatchesView({ medicationId }: { medicationId: string }) {
  const detail = useInventoryItem(medicationId);
  // One clock read per mount, so every batch row in a pass is measured against
  // the same instant and render stays pure. Expiry is a date-level judgement —
  // it does not need to tick.
  const [renderedAt] = useState(() => Date.now());
  const batches = detail.data?.batches ?? [];

  if (detail.status === "loading") {
    return <div className="p-3 text-xs text-slate-500 font-bold">Loading batch inventory…</div>;
  }

  return (
    <div className="space-y-2 rounded-2xl border border-slate-200 bg-white p-3 shadow-inner dark:border-slate-700 dark:bg-slate-900">
      <div className="flex items-center justify-between border-b border-slate-100 pb-2 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <Barcode className="h-4 w-4 text-emerald-600" />
          <span className="text-xs font-black text-slate-900 dark:text-white">
            Active Physical Batches ({batches.length})
          </span>
        </div>
        <span className="text-[10px] text-slate-400">FEFO (First Expired, First Out) System</span>
      </div>

      {batches.length === 0 ? (
        <p className="py-2 text-xs text-slate-400">No active batches recorded yet for this item.</p>
      ) : (
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {batches.map((batch) => {
            const expiryAt = new Date(batch.expiryDate).getTime();
            const isExpired = expiryAt < renderedAt;
            const daysToExpiry = Math.ceil((expiryAt - renderedAt) / (1000 * 60 * 60 * 24));

            return (
              <div
                key={batch.id}
                className="rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs dark:border-slate-700 dark:bg-slate-800"
              >
                <div className="flex items-center justify-between font-mono font-bold">
                  <span className="text-slate-900 dark:text-white">{batch.batchNumber}</span>
                  <span
                    className={`rounded px-1.5 py-0.2 text-[9px] font-black ${
                      isExpired
                        ? "bg-rose-100 text-rose-800"
                        : daysToExpiry <= 90
                        ? "bg-amber-100 text-amber-800"
                        : "bg-emerald-100 text-emerald-800"
                    }`}
                  >
                    {isExpired ? "EXPIRED" : daysToExpiry <= 90 ? `Exp in ${daysToExpiry}d` : "SAFE"}
                  </span>
                </div>

                <div className="mt-2 flex justify-between text-[11px] text-slate-600 dark:text-slate-300">
                  <span>Batch Stock:</span>
                  <span className="font-black text-slate-950 dark:text-white">{batch.quantity} units</span>
                </div>

                <div className="mt-1 flex justify-between text-[10px] text-slate-400">
                  <span>Expiry Date:</span>
                  <span>{new Date(batch.expiryDate).toLocaleDateString()}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// -------------------------------------------------------------
// MODAL: CREATE MEDICATION
// -------------------------------------------------------------
function CreateMedicationModal({
  onClose,
  onSuccess,
}: {
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [code, setCode] = useState("MED-001");
  const [genericName, setGenericName] = useState("");
  const [brandName, setBrandName] = useState("");
  const [strength, setStrength] = useState("");
  const [dosageForm, setDosageForm] = useState("Tablet");
  const [unit, setUnit] = useState("tablet");
  const [reorderLevel, setReorderLevel] = useState("20");
  const [error, setError] = useState("");

  const create = useCreateMedication();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!genericName.trim()) {
      setError("Generic medication name is required.");
      return;
    }

    try {
      await create.mutate({
        code: code.trim(),
        genericName: genericName.trim(),
        brandName: brandName.trim() || undefined,
        strength: strength.trim() || undefined,
        dosageForm: dosageForm.trim() || undefined,
        unit: unit.trim() || "tablet",
        reorderLevel: Number(reorderLevel) || 10,
      });
      onSuccess();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Could not add medication.");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/70 p-4 backdrop-blur-md">
      <div className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-600 text-white">
              <Pill className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-950 dark:text-white">Add New Medication Item</h3>
              <p className="text-[11px] text-slate-500">Configure item master details and reorder threshold</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:text-slate-600">
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-3 text-xs">
          {error && <p className="rounded-xl bg-rose-50 p-2 text-xs font-bold text-rose-700">{error}</p>}

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block font-black uppercase text-[10px] text-slate-500 mb-1">Item Code / SKU</label>
              <div className="flex gap-1">
                <input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className="h-9 w-full rounded-xl border border-slate-200 px-3 font-mono font-bold"
                />
                <button
                  type="button"
                  onClick={() => setCode(`MED-${Date.now().toString(36).toUpperCase()}`)}
                  className="rounded-xl border border-slate-200 px-2 text-[10px] font-bold"
                >
                  Auto
                </button>
              </div>
            </div>

            <div>
              <label className="block font-black uppercase text-[10px] text-slate-500 mb-1">Brand Name (Optional)</label>
              <input
                type="text"
                placeholder="e.g. Augmentin, Panadol"
                value={brandName}
                onChange={(e) => setBrandName(e.target.value)}
                className="h-9 w-full rounded-xl border border-slate-200 px-3 font-bold"
              />
            </div>
          </div>

          <div>
            <label className="block font-black uppercase text-[10px] text-slate-500 mb-1">Generic Name *</label>
            <input
              type="text"
              placeholder="e.g. Amoxicillin / Clavulanic Acid"
              value={genericName}
              onChange={(e) => setGenericName(e.target.value)}
              className="h-9 w-full rounded-xl border border-slate-200 px-3 font-bold text-slate-900"
            />
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="block font-black uppercase text-[10px] text-slate-500 mb-1">Strength</label>
              <input
                type="text"
                placeholder="e.g. 625mg, 10ml"
                value={strength}
                onChange={(e) => setStrength(e.target.value)}
                className="h-9 w-full rounded-xl border border-slate-200 px-3 font-bold"
              />
            </div>

            <div>
              <label className="block font-black uppercase text-[10px] text-slate-500 mb-1">Dosage Form</label>
              <select
                value={dosageForm}
                onChange={(e) => setDosageForm(e.target.value)}
                className="h-9 w-full rounded-xl border border-slate-200 px-2 font-bold"
              >
                <option value="Tablet">Tablet</option>
                <option value="Capsule">Capsule</option>
                <option value="Syrup">Syrup</option>
                <option value="Injection">Injection</option>
                <option value="Suspension">Suspension</option>
                <option value="Drops">Drops</option>
                <option value="Ointment">Ointment</option>
              </select>
            </div>

            <div>
              <label className="block font-black uppercase text-[10px] text-slate-500 mb-1">Unit of Measure</label>
              <input
                type="text"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                className="h-9 w-full rounded-xl border border-slate-200 px-3 font-bold"
              />
            </div>
          </div>

          <div>
            <label className="block font-black uppercase text-[10px] text-slate-500 mb-1">
              Low Stock Reorder Threshold
            </label>
            <input
              type="number"
              min="0"
              value={reorderLevel}
              onChange={(e) => setReorderLevel(e.target.value)}
              className="h-9 w-full rounded-xl border border-slate-200 px-3 font-bold"
            />
          </div>

          <div className="mt-4 flex justify-end gap-2 pt-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-200 px-4 py-2 font-bold text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={create.saveState === "saving"}
              className="rounded-xl bg-emerald-600 px-5 py-2 font-black text-white shadow-md hover:bg-emerald-700 disabled:opacity-50"
            >
              {create.saveState === "saving" ? "Adding…" : "Save Medication"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// -------------------------------------------------------------
// MODAL: QUICK BATCH INTAKE
// -------------------------------------------------------------
function QuickBatchIntakeModal({
  medication,
  onClose,
  onSuccess,
}: {
  medication: InventoryItem;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [batchNumber, setBatchNumber] = useState("BAT-001");
  const [expiryDate, setExpiryDate] = useState("2028-12-31");
  const [quantity, setQuantity] = useState("100");
  const [error, setError] = useState("");

  const createBatch = useCreateBatch();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const qtyNum = Number(quantity);
    if (!qtyNum || qtyNum <= 0) {
      setError("Please enter a valid quantity greater than 0.");
      return;
    }

    try {
      await createBatch.mutate({
        medicationId: medication.id,
        batchNumber: batchNumber.trim(),
        expiryDate,
        quantity: qtyNum,
      });
      onSuccess();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Could not add batch.");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-md">
      <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <PackagePlus className="h-5 w-5 text-emerald-600" />
            <div>
              <h3 className="text-sm font-black text-slate-950 dark:text-white">Add Physical Stock Batch</h3>
              <p className="text-[11px] text-slate-500">{medication.genericName}</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:text-slate-600">
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-3 text-xs">
          {error && <p className="rounded-xl bg-rose-50 p-2 text-xs font-bold text-rose-700">{error}</p>}

          <div>
            <label className="block font-bold text-slate-700 mb-1">Batch Number</label>
            <input
              type="text"
              value={batchNumber}
              onChange={(e) => setBatchNumber(e.target.value)}
              className="h-9 w-full rounded-xl border border-slate-200 px-3 font-mono font-bold"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Expiry Date</label>
              <input
                type="date"
                value={expiryDate}
                onChange={(e) => setExpiryDate(e.target.value)}
                className="h-9 w-full rounded-xl border border-slate-200 px-3 font-bold"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Quantity ({medication.unit}s)</label>
              <input
                type="number"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="h-9 w-full rounded-xl border border-slate-200 px-3 font-black text-emerald-700"
              />
            </div>
          </div>

          <div className="mt-4 flex justify-end gap-2 pt-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-200 px-4 py-2 font-bold text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createBatch.saveState === "saving"}
              className="rounded-xl bg-emerald-600 px-5 py-2 font-black text-white shadow-md hover:bg-emerald-700 disabled:opacity-50"
            >
              {createBatch.saveState === "saving" ? "Saving…" : "Add Batch to Stock"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// -------------------------------------------------------------
// TAB 2: ADVANCED RECEIVE STOCK (PURCHASE INWARD GRN)
// -------------------------------------------------------------
function AdvancedReceiveStockTab({
  items,
  suppliers,
}: {
  items: InventoryItem[];
  suppliers: SupplierRecord[];
}) {
  const [supplierId, setSupplierId] = useState("");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [lines, setLines] = useState([
    { medicationId: "", batchNumber: "BAT-001", expiryDate: "2028-12-31", quantity: "100", unitCostPkr: "25" },
  ]);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const createReceipt = useCreatePurchaseReceipt();
  const session = useWonFlowSession();

  const totalGrnCost = useMemo(() => {
    return lines.reduce((sum, l) => sum + (Number(l.quantity) || 0) * (Number(l.unitCostPkr) || 0), 0);
  }, [lines]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setSuccessMessage(null);

    if (!supplierId) {
      setError("Please select a registered supplier vendor.");
      return;
    }

    try {
      await createReceipt.mutate({
        supplierId,
        supplierInvoiceNumber: invoiceNumber.trim() || `INV-${Date.now()}`,
        lines: lines.map((line) => ({
          medicationId: line.medicationId,
          batchNumber: line.batchNumber.trim(),
          expiryDate: line.expiryDate,
          quantity: Number(line.quantity),
          unitCostMinor: Math.round(Number(line.unitCostPkr) * 100),
        })),
      });

      setSuccessMessage(`Goods Received Note (GRN) posted successfully for PKR ${totalGrnCost.toLocaleString()}! Stock updated.`);
      setLines([{ medicationId: "", batchNumber: `BAT-${Date.now().toString(36).toUpperCase()}`, expiryDate: "2028-12-31", quantity: "100", unitCostPkr: "25" }]);
      setInvoiceNumber("");
    } catch (cause: unknown) {
      setError(cause instanceof Error ? cause.message : "The purchase receipt could not be posted.");
    }
  }

  return (
    <section className="space-y-4">
      <form onSubmit={submit} className="rounded-3xl border border-white/60 bg-white/95 p-6 shadow-xl backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/90 space-y-4">
        <div className="flex flex-wrap items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
          <div>
            <h2 className="text-sm font-black text-slate-950 dark:text-white">
              Receive Stock Inward (Goods Received Note - GRN)
            </h2>
            <p className="text-xs text-slate-500">Record supplier shipments, lot numbers, and unit purchase costs</p>
          </div>

          <div className="rounded-2xl bg-emerald-50 px-3.5 py-1.5 text-xs font-black text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
            Total Inward Value: PKR {totalGrnCost.toLocaleString()}
          </div>
        </div>

        {error && <p className="rounded-xl bg-rose-50 p-2.5 text-xs font-bold text-rose-700">{error}</p>}
        {successMessage && <p className="rounded-xl bg-emerald-50 p-2.5 text-xs font-black text-emerald-800">{successMessage}</p>}

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Supplier Vendor *</label>
            <select
              value={supplierId}
              onChange={(e) => setSupplierId(e.target.value)}
              className="h-10 w-full rounded-2xl border border-slate-200 bg-slate-50/70 px-3 text-xs font-bold text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            >
              <option value="">-- Choose Supplier --</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.code})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Supplier Invoice #</label>
            <input
              type="text"
              placeholder="e.g. INV-98472"
              value={invoiceNumber}
              onChange={(e) => setInvoiceNumber(e.target.value)}
              className="h-10 w-full rounded-2xl border border-slate-200 bg-slate-50/70 px-3 text-xs font-bold"
            />
          </div>
        </div>

        {/* Inward Line Items */}
        <div className="space-y-2 pt-2">
          <div className="flex items-center justify-between text-[10px] font-black uppercase text-slate-400 px-1">
            <span>Shipment Item Lines</span>
            <span>Batch & Costing</span>
          </div>

          {lines.map((line, idx) => (
            <div key={idx} className="grid grid-cols-12 gap-2 rounded-2xl border border-slate-200 bg-slate-50/60 p-3 dark:border-slate-700 dark:bg-slate-800/60 items-center">
              <div className="col-span-4">
                <select
                  value={line.medicationId}
                  onChange={(e) => setLines((cur) => cur.map((l, i) => (i === idx ? { ...l, medicationId: e.target.value } : l)))}
                  className="h-9 w-full rounded-xl border border-slate-200 bg-white px-2 text-xs font-bold"
                >
                  <option value="">-- Select Medication --</option>
                  {items.map((it) => (
                    <option key={it.id} value={it.id}>
                      {it.genericName} {it.brandName ? `(${it.brandName})` : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div className="col-span-2">
                <input
                  type="text"
                  placeholder="Batch #"
                  value={line.batchNumber}
                  onChange={(e) => setLines((cur) => cur.map((l, i) => (i === idx ? { ...l, batchNumber: e.target.value } : l)))}
                  className="h-9 w-full rounded-xl border border-slate-200 bg-white px-2 font-mono text-xs font-bold"
                />
              </div>

              <div className="col-span-2">
                <input
                  type="date"
                  value={line.expiryDate}
                  onChange={(e) => setLines((cur) => cur.map((l, i) => (i === idx ? { ...l, expiryDate: e.target.value } : l)))}
                  className="h-9 w-full rounded-xl border border-slate-200 bg-white px-2 text-xs font-bold"
                />
              </div>

              <div className="col-span-2">
                <input
                  type="number"
                  min="1"
                  placeholder="Qty"
                  value={line.quantity}
                  onChange={(e) => setLines((cur) => cur.map((l, i) => (i === idx ? { ...l, quantity: e.target.value } : l)))}
                  className="h-9 w-full rounded-xl border border-slate-200 bg-white px-2 text-center text-xs font-black text-emerald-700"
                />
              </div>

              <div className="col-span-1">
                <input
                  type="number"
                  min="0"
                  placeholder="Cost"
                  value={line.unitCostPkr}
                  onChange={(e) => setLines((cur) => cur.map((l, i) => (i === idx ? { ...l, unitCostPkr: e.target.value } : l)))}
                  className="h-9 w-full rounded-xl border border-slate-200 bg-white px-2 text-center text-xs font-bold"
                />
              </div>

              <div className="col-span-1 flex justify-end">
                <button
                  type="button"
                  onClick={() => setLines((cur) => cur.filter((_, i) => i !== idx))}
                  className="text-slate-400 hover:text-rose-600 p-1"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}

          <button
            type="button"
            onClick={() =>
              setLines((cur) => [
                ...cur,
                { medicationId: "", batchNumber: `BAT-${Date.now().toString(36).toUpperCase()}`, expiryDate: "2028-12-31", quantity: "50", unitCostPkr: "20" },
              ])
            }
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>+ Add Another Shipment Line</span>
          </button>
        </div>

        <div className="flex flex-wrap items-center justify-between border-t border-slate-100 pt-4 dark:border-slate-800">
          <div className="text-xs text-slate-500 font-semibold">
            Receiving Officer: <strong>{session?.name || "Attending Pharmacist"}</strong>
          </div>

          <button
            type="submit"
            disabled={createReceipt.saveState === "saving"}
            className="rounded-2xl bg-emerald-600 px-6 py-2.5 text-xs font-black text-white shadow-lg hover:bg-emerald-700 disabled:opacity-50"
          >
            {createReceipt.saveState === "saving" ? "Posting GRN…" : `Post Goods Receipt (PKR ${totalGrnCost.toLocaleString()})`}
          </button>
        </div>
      </form>
    </section>
  );
}

// -------------------------------------------------------------
// TAB 3: SUPPLIERS & VENDORS DIRECTORY
// -------------------------------------------------------------
function SuppliersVendorTab({
  suppliers,
  reloadSuppliers,
}: {
  suppliers: SupplierRecord[];
  reloadSuppliers: () => void;
}) {
  const [code, setCode] = useState("SUP-001");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [contactPerson, setContactPerson] = useState("");
  const [error, setError] = useState("");

  const create = useCreateSupplier();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!name.trim()) {
      setError("Supplier company name is required.");
      return;
    }

    try {
      await create.mutate({
        code: code.trim(),
        name: name.trim(),
        contactPerson: contactPerson.trim() || undefined,
        phone: phone.trim() || undefined,
      });
      setName("");
      setPhone("");
      setContactPerson("");
      setCode(`SUP-${Date.now().toString(36).toUpperCase()}`);
      reloadSuppliers();
    } catch (cause: unknown) {
      setError(cause instanceof Error ? cause.message : "The supplier could not be added.");
    }
  }

  return (
    <section className="space-y-4">
      {/* Add Supplier Form */}
      <form onSubmit={submit} className="rounded-3xl border border-white/60 bg-white/95 p-5 shadow-xl backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/90">
        <h2 className="text-sm font-black text-slate-950 dark:text-white mb-3">Register New Pharmaceutical Vendor</h2>
        {error && <p className="mb-3 rounded-xl bg-rose-50 p-2 text-xs font-bold text-rose-700">{error}</p>}

        <div className="grid gap-2 sm:grid-cols-4">
          <input
            type="text"
            placeholder="Vendor Code"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className="h-9 rounded-xl border border-slate-200 px-3 text-xs font-mono font-bold"
          />
          <input
            type="text"
            placeholder="Company Name *"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="h-9 rounded-xl border border-slate-200 px-3 text-xs font-bold text-slate-900"
          />
          <input
            type="text"
            placeholder="Contact Person"
            value={contactPerson}
            onChange={(e) => setContactPerson(e.target.value)}
            className="h-9 rounded-xl border border-slate-200 px-3 text-xs font-bold"
          />
          <input
            type="text"
            placeholder="Phone Number"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="h-9 rounded-xl border border-slate-200 px-3 text-xs font-bold"
          />
        </div>

        <div className="mt-3 flex justify-end">
          <button
            type="submit"
            disabled={create.saveState === "saving"}
            className="rounded-xl bg-indigo-600 px-4 py-1.5 text-xs font-black text-white shadow hover:bg-indigo-700"
          >
            {create.saveState === "saving" ? "Saving…" : "Add Vendor"}
          </button>
        </div>
      </form>

      {/* Suppliers Cards Grid */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {suppliers.map((supplier) => (
          <div key={supplier.id} className="rounded-3xl border border-white/60 bg-white/95 p-4 shadow-lg backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/90">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-50 text-indigo-700 font-bold">
                  <Truck className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="font-black text-xs text-slate-900 dark:text-white">{supplier.name}</h3>
                  <span className="font-mono text-[10px] text-slate-400">{supplier.code}</span>
                </div>
              </div>
              <span className="rounded bg-emerald-50 px-2 py-0.5 text-[9px] font-black text-emerald-800">
                {supplier.status}
              </span>
            </div>

            <div className="mt-3 space-y-1 text-[11px] text-slate-500 border-t border-slate-100 pt-2">
              {supplier.contactPerson && <p>Contact: <strong>{supplier.contactPerson}</strong></p>}
              {supplier.phone && <p>Phone: <strong>{supplier.phone}</strong></p>}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

// -------------------------------------------------------------
// TAB 4: STOCK MOVEMENTS & AUDIT LEDGER
// -------------------------------------------------------------
function StockMovementsAuditTab({ movements }: { movements: StockMovementRecord[] }) {
  return (
    <section className="overflow-hidden rounded-3xl border border-white/60 bg-white/95 p-5 shadow-xl backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/90">
      <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800 mb-3">
        <div>
          <h2 className="text-sm font-black text-slate-950 dark:text-white">Stock Movements & Transaction Audit Ledger</h2>
          <p className="text-xs text-slate-500">Real-time trace of dispensations, inward receipts, and adjustments</p>
        </div>
        <span className="rounded-xl bg-slate-100 px-3 py-1 text-xs font-black text-slate-700">
          {movements.length} Records
        </span>
      </div>

      {movements.length === 0 ? (
        <div className="py-12 text-center text-slate-400">
          <History className="mx-auto h-8 w-8 mb-2" />
          <p className="font-bold">No stock transactions recorded yet.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {movements.map((m) => {
            const isNegative = Number(m.quantityDelta) < 0;
            return (
              <div
                key={m.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-700 dark:bg-slate-800"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`flex h-8 w-8 items-center justify-center rounded-xl font-bold ${
                      isNegative ? "bg-rose-50 text-rose-700" : "bg-emerald-50 text-emerald-700"
                    }`}
                  >
                    {isNegative ? <ArrowDownRight className="h-4 w-4" /> : <ArrowUpRight className="h-4 w-4" />}
                  </div>
                  <div>
                    <div className="font-black text-xs text-slate-900 dark:text-white">
                      {m.medication.genericName}
                    </div>
                    <p className="text-[10px] text-slate-500">
                      Type: <strong>{m.type}</strong> {m.referenceType ? `• Ref: ${m.referenceType}` : ""}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <span
                    className={`text-sm font-black font-mono ${
                      isNegative ? "text-rose-600" : "text-emerald-600"
                    }`}
                  >
                    {m.quantityDelta} {m.unit}
                  </span>
                  <span className="text-[11px] text-slate-400">
                    {new Date(m.occurredAt).toLocaleTimeString()}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

// -------------------------------------------------------------
// TAB 5: STOCK ALERTS & EXPIRY RADAR
// -------------------------------------------------------------
function StockAlertsRadarTab({
  alerts,
  onReceiveClick,
}: {
  alerts?: {
    lowStock: { medication: InventoryItem; availableQuantity: number; reorderLevel: number }[];
    expiring: { batch: { id: string; batchNumber: string; expiryDate: string; medication: { genericName: string; brandName: string | null; code: string } }; state: ExpiryState }[];
  };
  onReceiveClick: () => void;
}) {
  const lowStock = alerts?.lowStock ?? [];
  const expiring = alerts?.expiring ?? [];

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Low Stock Radar */}
      <section className="rounded-3xl border border-rose-200 bg-rose-50/50 p-5 shadow-xl backdrop-blur-xl dark:border-rose-900/60 dark:bg-rose-950/30">
        <div className="flex items-center justify-between border-b border-rose-200 pb-3 mb-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-rose-600" />
            <h2 className="text-sm font-black text-rose-950 dark:text-rose-200">
              Low Stock Alert Radar ({lowStock.length})
            </h2>
          </div>

          <button
            type="button"
            onClick={onReceiveClick}
            className="rounded-xl bg-rose-600 px-3 py-1 text-xs font-black text-white hover:bg-rose-700"
          >
            + Create Purchase Order
          </button>
        </div>

        {lowStock.length === 0 ? (
          <p className="py-8 text-center text-xs font-bold text-emerald-800">
            🟢 All medication stock levels are above reorder thresholds.
          </p>
        ) : (
          <div className="space-y-2">
            {lowStock.map((entry) => (
              <div
                key={entry.medication.id}
                className="flex items-center justify-between rounded-2xl border border-rose-200 bg-white p-3 shadow-sm dark:bg-slate-900"
              >
                <div>
                  <div className="text-xs font-black text-slate-900 dark:text-white">
                    {entry.medication.genericName}
                  </div>
                  <div className="text-[10px] text-slate-500">
                    Reorder Threshold: {entry.reorderLevel} {entry.medication.unit}s
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-xs font-black text-rose-600">
                    {entry.availableQuantity} in stock
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Expiry Radar */}
      <section className="rounded-3xl border border-amber-200 bg-amber-50/50 p-5 shadow-xl backdrop-blur-xl dark:border-amber-900/60 dark:bg-amber-950/30">
        <div className="flex items-center justify-between border-b border-amber-200 pb-3 mb-3">
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-amber-600" />
            <h2 className="text-sm font-black text-amber-950 dark:text-amber-200">
              Expiry Countdown Radar ({expiring.length})
            </h2>
          </div>
        </div>

        {expiring.length === 0 ? (
          <p className="py-8 text-center text-xs font-bold text-emerald-800">
            🟢 No expired or near-expiry batches detected.
          </p>
        ) : (
          <div className="space-y-2">
            {expiring.map((entry) => (
              <div
                key={entry.batch.id}
                className="flex items-center justify-between rounded-2xl border border-amber-200 bg-white p-3 shadow-sm dark:bg-slate-900"
              >
                <div>
                  <div className="text-xs font-black text-slate-900 dark:text-white">
                    {entry.batch.medication.genericName}
                  </div>
                  <div className="font-mono text-[10px] text-slate-500">
                    Batch: {entry.batch.batchNumber} • Expiry: {new Date(entry.batch.expiryDate).toLocaleDateString()}
                  </div>
                </div>

                <span className="rounded bg-amber-100 px-2 py-0.5 text-[10px] font-black text-amber-900 uppercase">
                  {entry.state}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
