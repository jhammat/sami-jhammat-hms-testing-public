"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Banknote,
  Building2,
  Calculator,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  CreditCard,
  FileText,
  Filter,
  FlaskConical,
  Layers,
  Minus,
  Percent,
  Plus,
  Printer,
  QrCode,
  Receipt,
  RefreshCw,
  ScanLine,
  Search,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  Trash2,
  User,
  UserCheck,
  UserPlus,
  X,
} from "lucide-react";

import { useWonFlowSession } from "@/app/_providers";
import { usePatients, useRegisterPatient } from "@/lib/api/patients";
import type { PatientRecord } from "@/lib/api/patients";
import {
  updateInvoice,
  useCreateInvoice,
  useInvoices,
  useRecordPayment,
} from "@/lib/api/billing";
import type { BillingPaymentMethod, InvoiceRecord } from "@/lib/api/billing";
import type { DiagnosticOrder } from "@/components/diagnostics";

interface DraftLine {
  key: string;
  description: string;
  quantity: string;
  unitPricePkr: string;
  orderId?: string;
  department?: string;
  isDoctorPrescribed?: boolean;
}

function emptyLine(): DraftLine {
  return { key: crypto.randomUUID(), description: "", quantity: "1", unitPricePkr: "" };
}

function pkrToMinor(input: string): number {
  const value = Number(input);
  return Number.isFinite(value) ? Math.round(value * 100) : 0;
}

function minorToPkr(minor: number): string {
  return (minor / 100).toLocaleString("en-PK", { style: "currency", currency: "PKR" });
}

function lineTotalMinor(line: DraftLine): number {
  const quantity = Number(line.quantity);
  if (!Number.isFinite(quantity) || quantity <= 0) return 0;
  return Math.round(pkrToMinor(line.unitPricePkr) * quantity);
}

// Reusable Pagination Component
interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
}

function Pagination({
  currentPage,
  totalPages,
  totalItems,
  pageSize,
  onPageChange,
  onPageSizeChange,
}: PaginationProps) {
  if (totalItems === 0) return null;

  const startItem = (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalItems);

  const pages: (number | string)[] = [];
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i += 1) pages.push(i);
  } else {
    pages.push(1);
    if (currentPage > 3) pages.push("...");
    const start = Math.max(2, currentPage - 1);
    const end = Math.min(totalPages - 1, currentPage + 1);
    for (let i = start; i <= end; i += 1) pages.push(i);
    if (currentPage < totalPages - 2) pages.push("...");
    pages.push(totalPages);
  }

  return (
    <div className="flex flex-col items-center justify-between gap-3 border-t border-slate-200 bg-slate-50/50 px-4 py-3 sm:flex-row">
      <div className="flex items-center gap-3 text-sm font-medium text-slate-600">
        <span>
          Showing <span className="font-bold text-slate-900">{startItem}</span> to{" "}
          <span className="font-bold text-slate-900">{endItem}</span> of{" "}
          <span className="font-bold text-slate-900">{totalItems}</span> invoices
        </span>
        <span className="text-slate-300">|</span>
        <div className="flex items-center gap-1.5">
          <span>Per page:</span>
          <select
            className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-bold text-slate-700 outline-none focus:border-indigo-500"
            onChange={(e) => {
              onPageSizeChange(Number(e.target.value));
              onPageChange(1);
            }}
            value={pageSize}
          >
            <option value={5}>5</option>
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
          </select>
        </div>
      </div>

      <div className="flex items-center gap-1">
        <button
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white font-semibold text-slate-600 transition hover:bg-slate-100 disabled:opacity-40"
          disabled={currentPage === 1}
          onClick={() => onPageChange(currentPage - 1)}
          type="button"
        >
          <ChevronLeft size={16} />
        </button>

        {pages.map((p, idx) =>
          typeof p === "number" ? (
            <button
              className={`flex h-8 min-w-[32px] items-center justify-center rounded-lg px-2 text-xs font-black transition ${
                currentPage === p
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-100"
              }`}
              key={idx}
              onClick={() => onPageChange(p)}
              type="button"
            >
              {p}
            </button>
          ) : (
            <span className="px-1 text-xs font-bold text-slate-400" key={idx}>
              {p}
            </span>
          )
        )}

        <button
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-100 disabled:opacity-40"
          disabled={currentPage === totalPages || totalPages === 0}
          onClick={() => onPageChange(currentPage + 1)}
          type="button"
        >
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}

// 100% Reliable POS Financial Calculator Modal
function CalculatorModal({
  isOpen,
  onClose,
  totalPayablePkr,
  onApplyChangeTender,
}: {
  isOpen: boolean;
  onClose: () => void;
  totalPayablePkr: number;
  onApplyChangeTender: (tendered: number) => void;
}) {
  const [expression, setExpression] = useState<string>("");
  const [result, setResult] = useState<string>("0");
  const [cashTendered, setCashTendered] = useState<string>("");

  useEffect(() => {
    if (!isOpen) return;
    const timer = setTimeout(() => {
      setCashTendered("");
      setExpression("");
      setResult(String(totalPayablePkr));
    }, 0);
    return () => clearTimeout(timer);
  }, [isOpen, totalPayablePkr]);

  const handleInput = (val: string) => {
    if (val === "C") {
      setExpression("");
      setResult("0");
      return;
    }
    if (val === "DEL") {
      setExpression((prev) => prev.slice(0, -1));
      return;
    }
    if (val === "=") {
      if (!expression.trim()) return;
      try {
        const sanitized = expression
          .replace(/×/g, "*")
          .replace(/÷/g, "/")
          .replace(/[^0-9+\-*/.]/g, "");
        if (!sanitized) return;
        // eslint-disable-next-line @typescript-eslint/no-implied-eval
        const calc = new Function(`return (${sanitized})`)();
        if (typeof calc === "number" && Number.isFinite(calc)) {
          const resStr = String(Math.round(calc * 100) / 100);
          setResult(resStr);
          setExpression(resStr);
        }
      } catch {
        setResult("Error");
      }
      return;
    }

    setExpression((prev) => {
      // Prevent double operators
      const lastChar = prev.slice(-1);
      const isOp = ["+", "-", "×", "÷"].includes(val);
      const isLastOp = ["+", "-", "×", "÷"].includes(lastChar);
      if (isOp && isLastOp) {
        return prev.slice(0, -1) + val;
      }
      return prev + val;
    });
  };

  const tenderedNum = parseFloat(cashTendered) || 0;
  const changeDue = Math.max(0, tenderedNum - totalPayablePkr);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
      <div className="w-full max-w-md rounded-3xl border border-slate-700 bg-slate-900 p-6 text-white shadow-2xl space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-400 text-slate-950">
              <Calculator size={20} />
            </div>
            <div>
              <h3 className="text-base font-black text-white">POS Cashier Calculator</h3>
              <p className="text-xs text-slate-400 font-medium">Quick math & customer cash change return</p>
            </div>
          </div>
          <button
            className="text-slate-400 hover:text-white p-1"
            onClick={onClose}
            type="button"
          >
            <X size={20} />
          </button>
        </div>

        {/* Display Screen */}
        <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4 text-right">
          <div className="h-5 text-xs font-mono text-slate-400 overflow-hidden">
            {expression || "0"}
          </div>
          <div className="text-3xl font-black font-mono tracking-wider text-emerald-400 truncate mt-1">
            {result}
          </div>
        </div>

        {/* Keypad Grid */}
        <div className="grid grid-cols-4 gap-2 text-base font-black">
          <button className="rounded-xl bg-slate-800 py-3 text-rose-300 hover:bg-slate-700 transition" onClick={() => handleInput("C")} type="button">C</button>
          <button className="rounded-xl bg-slate-800 py-3 text-slate-300 hover:bg-slate-700 transition" onClick={() => handleInput("DEL")} type="button">DEL</button>
          <button className="rounded-xl bg-slate-800 py-3 text-slate-300 hover:bg-slate-700 transition" onClick={() => handleInput("%")} type="button">%</button>
          <button className="rounded-xl bg-indigo-600 py-3 text-white hover:bg-indigo-500 transition text-lg" onClick={() => handleInput("÷")} type="button">÷</button>

          <button className="rounded-xl bg-slate-800 py-3 text-white hover:bg-slate-700 transition" onClick={() => handleInput("7")} type="button">7</button>
          <button className="rounded-xl bg-slate-800 py-3 text-white hover:bg-slate-700 transition" onClick={() => handleInput("8")} type="button">8</button>
          <button className="rounded-xl bg-slate-800 py-3 text-white hover:bg-slate-700 transition" onClick={() => handleInput("9")} type="button">9</button>
          <button className="rounded-xl bg-indigo-600 py-3 text-white hover:bg-indigo-500 transition text-lg" onClick={() => handleInput("×")} type="button">×</button>

          <button className="rounded-xl bg-slate-800 py-3 text-white hover:bg-slate-700 transition" onClick={() => handleInput("4")} type="button">4</button>
          <button className="rounded-xl bg-slate-800 py-3 text-white hover:bg-slate-700 transition" onClick={() => handleInput("5")} type="button">5</button>
          <button className="rounded-xl bg-slate-800 py-3 text-white hover:bg-slate-700 transition" onClick={() => handleInput("6")} type="button">6</button>
          <button className="rounded-xl bg-indigo-600 py-3 text-white hover:bg-indigo-500 transition text-lg" onClick={() => handleInput("-")} type="button">-</button>

          <button className="rounded-xl bg-slate-800 py-3 text-white hover:bg-slate-700 transition" onClick={() => handleInput("1")} type="button">1</button>
          <button className="rounded-xl bg-slate-800 py-3 text-white hover:bg-slate-700 transition" onClick={() => handleInput("2")} type="button">2</button>
          <button className="rounded-xl bg-slate-800 py-3 text-white hover:bg-slate-700 transition" onClick={() => handleInput("3")} type="button">3</button>
          <button className="rounded-xl bg-indigo-600 py-3 text-white hover:bg-indigo-500 transition text-lg" onClick={() => handleInput("+")} type="button">+</button>

          <button className="col-span-2 rounded-xl bg-slate-800 py-3 text-white hover:bg-slate-700 transition" onClick={() => handleInput("0")} type="button">0</button>
          <button className="rounded-xl bg-slate-800 py-3 text-white hover:bg-slate-700 transition" onClick={() => handleInput(".")} type="button">.</button>
          <button className="rounded-xl bg-amber-400 py-3 text-slate-950 font-black hover:bg-amber-300 transition text-lg" onClick={() => handleInput("=")} type="button">=</button>
        </div>

        {/* Cash Tender Helper Box */}
        <div className="rounded-2xl border border-slate-700 bg-slate-800/80 p-4 space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400 font-bold uppercase">Customer Cash Given:</span>
            <div className="flex items-center gap-1.5">
              <button
                className="rounded-lg bg-slate-700 px-2 py-1 text-xs font-bold text-amber-300 hover:bg-slate-600"
                onClick={() => setCashTendered(String(totalPayablePkr))}
                type="button"
              >
                Exact (Rs {totalPayablePkr})
              </button>
              {[500, 1000, 5000].map((amt) => (
                <button
                  className="rounded-lg bg-slate-700 px-2 py-1 text-xs font-bold text-white hover:bg-slate-600"
                  key={amt}
                  onClick={() => setCashTendered(String(amt))}
                  type="button"
                >
                  +{amt}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              className="w-full rounded-xl border border-slate-600 bg-slate-900 px-3 py-2 text-sm font-mono font-bold text-white outline-none focus:border-amber-400"
              min="0"
              onChange={(e) => setCashTendered(e.target.value)}
              placeholder="Enter Cash Given..."
              type="number"
              value={cashTendered}
            />
            {tenderedNum > 0 && (
              <div className="shrink-0 rounded-xl bg-emerald-950 border border-emerald-500/50 px-3 py-1.5 text-right">
                <div className="text-[9px] font-black uppercase text-emerald-400">Change Due</div>
                <div className="text-base font-black font-mono text-emerald-300">
                  PKR {changeDue.toLocaleString()}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
          <button
            className="rounded-xl border border-slate-700 px-4 py-2 text-xs font-bold text-slate-300 hover:bg-slate-800"
            onClick={onClose}
            type="button"
          >
            Close
          </button>
          <button
            className="rounded-xl bg-indigo-600 px-5 py-2 text-xs font-black text-white hover:bg-indigo-500 transition"
            onClick={() => {
              if (tenderedNum > 0) onApplyChangeTender(tenderedNum);
              onClose();
            }}
            type="button"
          >
            Apply & Close
          </button>
        </div>
      </div>
    </div>
  );
}

const PRESET_CATEGORIES = [
  {
    category: "Laboratory",
    items: [
      { name: "CBC Blood Test (Laboratory)", price: "800", dept: "Laboratory" },
      { name: "LFT / Liver Function (Laboratory)", price: "1200", dept: "Laboratory" },
      { name: "Urinary Routine Exam (Laboratory)", price: "400", dept: "Laboratory" },
      { name: "Blood Glucose Fasting (Laboratory)", price: "250", dept: "Laboratory" },
      { name: "Lipid Profile (Laboratory)", price: "1500", dept: "Laboratory" },
      { name: "Thyroid Profile / TSH (Laboratory)", price: "1800", dept: "Laboratory" },
    ],
  },
  {
    category: "Radiology & Imaging",
    items: [
      { name: "Chest X-Ray PA View (Radiology)", price: "1500", dept: "Radiology" },
      { name: "Abdominal Ultrasound (Radiology)", price: "2500", dept: "Radiology" },
      { name: "Pelvic Ultrasound (Radiology)", price: "2200", dept: "Radiology" },
      { name: "CT Brain Plain (Radiology)", price: "7500", dept: "Radiology" },
      { name: "MRI Spine (Radiology)", price: "12000", dept: "Radiology" },
    ],
  },
  {
    category: "Procedures & Cardiology",
    items: [
      { name: "ECG 12-Lead (Cardiology)", price: "1000", dept: "Cardiology" },
      { name: "Echocardiography (Cardiology)", price: "4500", dept: "Cardiology" },
      { name: "Nebulization Session (OPD)", price: "500", dept: "OPD" },
      { name: "Wound Dressing / Suturing (Minor OT)", price: "1500", dept: "Minor OT" },
      { name: "General OPD Consultation Fee", price: "1000", dept: "Consultation" },
    ],
  },
];

export function BillingCounterWorkflow({ initialPatientId }: { initialPatientId?: string }) {
  const session = useWonFlowSession();
  const [activeTab, setActiveTab] = useState<"pos" | "history">("pos");
  const [patientQuery, setPatientQuery] = useState("");
  const [patientId, setPatientId] = useState(initialPatientId ?? "");
  const [selectedPatientRecord, setSelectedPatientRecord] = useState<PatientRecord | null>(null);
  const [isSearchingPatient, setIsSearchingPatient] = useState(false);

  // Quick Register Modal state
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [regForm, setRegForm] = useState({
    givenName: "",
    familyName: "",
    phone: "",
    sex: "MALE",
    city: "Karachi",
  });
  const [regError, setRegError] = useState("");
  const registerPatient = useRegisterPatient();

  // Calculator modal state
  const [showCalculator, setShowCalculator] = useState(false);
  const [tenderedCash, setTenderedCash] = useState<number>(0);

  const [lines, setLines] = useState<DraftLine[]>([emptyLine()]);
  const [discountPkr, setDiscountPkr] = useState("0");
  const [method, setMethod] = useState<BillingPaymentMethod>("cash");
  const [paymentAccount, setPaymentAccount] = useState<string>("Main Cash Drawer");
  const [reference, setReference] = useState("");
  const [collectNow, setCollectNow] = useState(true);
  const [error, setError] = useState("");
  const [receipt, setReceipt] = useState<{
    invoice: InvoiceRecord;
    paidMinor: number;
    tendered?: number;
    change?: number;
    account?: string;
  } | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>("All");

  // Pending Doctor Orders
  const [pendingOrders, setPendingOrders] = useState<DiagnosticOrder[]>([]);

  // Invoices list & pagination
  const [invoiceSearchQuery, setInvoiceSearchQuery] = useState("");
  const [invoiceStatusFilter, setInvoiceStatusFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const patients = usePatients({ query: patientQuery, pageSize: 6 });
  const invoicesResource = useInvoices();
  const createInvoice = useCreateInvoice();
  const recordPayment = useRecordPayment();
  const [issuing, setIssuing] = useState(false);

  // Synchronize initial patient if provided
  useEffect(() => {
    if (!patientId || !patients.data?.patients) return;
    const found = patients.data.patients.find((p) => p.id === patientId);
    if (!found) return;
    const timer = setTimeout(() => {
      setSelectedPatientRecord(found);
    }, 0);
    return () => clearTimeout(timer);
  }, [patientId, patients.data?.patients]);

  // Fetch pending doctor orders for the hospital
  const fetchPendingOrders = useCallback(async () => {
    try {
      const today = new Date().toISOString().slice(0, 10);
      const [labRes, radRes] = await Promise.all([
        fetch(`/api/v1/diagnostics/worklist?type=LABORATORY&date=${today}`, { credentials: "same-origin", cache: "no-store" }).then((r) => (r.ok ? r.json() : { orders: [] })),
        fetch(`/api/v1/diagnostics/worklist?type=RADIOLOGY&date=${today}`, { credentials: "same-origin", cache: "no-store" }).then((r) => (r.ok ? r.json() : { orders: [] })),
      ]);
      const combined: DiagnosticOrder[] = [...(labRes.orders ?? []), ...(radRes.orders ?? [])];
      const waiting = combined.filter((o) => o.status === "ORDERED" || o.status === "ACCEPTED");
      setPendingOrders(waiting);
    } catch {
      setPendingOrders([]);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      void fetchPendingOrders();
    }, 0);
    return () => clearTimeout(timer);
  }, [fetchPendingOrders]);

  // Doctor orders relevant for the selected patient
  const patientPrescribedOrders = useMemo(() => {
    if (!selectedPatientRecord && !patientId) return [];
    return pendingOrders.filter(
      (order) =>
        order.patient.patientNumber === selectedPatientRecord?.patientNumber ||
        order.patient.givenName.toLowerCase() === selectedPatientRecord?.givenName.toLowerCase()
    );
  }, [pendingOrders, selectedPatientRecord, patientId]);

  // Group all pending orders by patient for arriving queue
  const arrivingPatientsWithOrders = useMemo(() => {
    const map = new Map<string, { patient: DiagnosticOrder["patient"]; orders: DiagnosticOrder[] }>();
    for (const ord of pendingOrders) {
      const key = ord.patient.patientNumber;
      if (!map.has(key)) {
        map.set(key, { patient: ord.patient, orders: [] });
      }
      map.get(key)!.orders.push(ord);
    }
    return Array.from(map.values());
  }, [pendingOrders]);

  const subtotalMinor = useMemo(() => lines.reduce((sum, line) => sum + lineTotalMinor(line), 0), [lines]);
  const discountMinor = Math.min(Math.max(0, pkrToMinor(discountPkr)), subtotalMinor);
  const totalMinor = subtotalMinor - discountMinor;
  const totalPkr = totalMinor / 100;

  const updateLine = useCallback((key: string, patch: Partial<DraftLine>) => {
    setLines((current) => current.map((line) => (line.key === key ? { ...line, ...patch } : line)));
  }, []);

  const removeLine = useCallback((key: string) => {
    setLines((current) => {
      const filtered = current.filter((line) => line.key !== key);
      return filtered.length === 0 ? [emptyLine()] : filtered;
    });
  }, []);

  const addPresetLine = (preset: { name: string; price: string; dept?: string; orderId?: string; isDoctor?: boolean }) => {
    setLines((current) => {
      const cleaned = current.filter((l) => l.description.trim() !== "" || l.unitPricePkr !== "");
      return [
        ...cleaned,
        {
          key: crypto.randomUUID(),
          description: preset.name,
          quantity: "1",
          unitPricePkr: preset.price,
          department: preset.dept,
          orderId: preset.orderId,
          isDoctorPrescribed: preset.isDoctor,
        },
      ];
    });
  };

  // 1-Click Action: Add all doctor prescribed tests
  const addAllDoctorOrders = () => {
    if (!patientPrescribedOrders.length) return;
    const newItems = patientPrescribedOrders.map((order) => {
      let price = "1000";
      const lower = order.name.toLowerCase();
      if (lower.includes("ct") || lower.includes("computed")) price = "7500";
      else if (lower.includes("mri")) price = "12000";
      else if (lower.includes("x-ray") || lower.includes("xray")) price = "1500";
      else if (lower.includes("ultrasound")) price = "2500";
      else if (lower.includes("cbc")) price = "800";
      else if (lower.includes("lft")) price = "1200";
      else if (lower.includes("urine")) price = "400";
      else if (lower.includes("sugar") || lower.includes("glucose")) price = "250";

      return {
        key: crypto.randomUUID(),
        description: `[Doctor Prescribed] ${order.name} (${order.code})`,
        quantity: "1",
        unitPricePkr: price,
        department: order.specimenOrBodySite ?? "Diagnostics",
        orderId: order.id,
        isDoctorPrescribed: true,
      };
    });

    setLines((current) => {
      const cleaned = current.filter((l) => l.description.trim() !== "" || l.unitPricePkr !== "");
      return [...cleaned, ...newItems];
    });
  };

  const applyDiscountPercent = (percent: number) => {
    if (subtotalMinor <= 0) return;
    const calc = Math.round((subtotalMinor * percent) / 100) / 100;
    setDiscountPkr(calc.toString());
  };

  // Quick Register Patient at Billing Counter
  const handleQuickRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegError("");
    if (!regForm.givenName.trim() || !regForm.familyName.trim()) {
      setRegError("Patient given name and family name are required.");
      return;
    }
    try {
      const result = await registerPatient.mutate({
        givenName: regForm.givenName.trim(),
        familyName: regForm.familyName.trim(),
        phone: regForm.phone.trim() || undefined,
        sex: regForm.sex,
        city: regForm.city.trim() || undefined,
        registeredVia: "reception",
      });

      setSelectedPatientRecord(result.patient);
      setPatientId(result.patient.id);
      setShowRegisterModal(false);
      setRegForm({ givenName: "", familyName: "", phone: "", sex: "MALE", city: "Karachi" });
    } catch (caught) {
      setRegError(caught instanceof Error ? caught.message : "Failed to register patient.");
    }
  };

  const busy = createInvoice.saveState === "saving" || issuing || recordPayment.saveState === "saving";

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    if (!patientId) {
      setError("Please search and select a patient first, or use + Register Walk-In Patient.");
      return;
    }
    const validLines = lines.filter((line) => line.description.trim() && lineTotalMinor(line) > 0);
    if (!validLines.length) {
      setError("Please add at least one billable test or procedure item.");
      return;
    }

    try {
      const { invoice } = await createInvoice.mutate({
        patientId,
        discountMinor,
        lines: validLines.map((line) => ({
          description: line.description.trim(),
          quantity: Number(line.quantity),
          unitPriceMinor: pkrToMinor(line.unitPricePkr),
        })),
      });

      setIssuing(true);
      const issued = await updateInvoice(invoice.id, { status: "ISSUED", reason: "Issued at billing counter" });
      setIssuing(false);

      let paidMinor = 0;
      if (collectNow && issued.invoice.totalMinor > 0) {
        await recordPayment.mutate({
          invoiceId: invoice.id,
          method,
          amountMinor: issued.invoice.totalMinor,
          reference: reference.trim() ? `${paymentAccount}: ${reference.trim()}` : paymentAccount,
          reason: "Collected at billing counter",
        });
        paidMinor = issued.invoice.totalMinor;
      }

      const calculatedChange = tenderedCash > totalPkr ? tenderedCash - totalPkr : 0;

      setReceipt({
        invoice: issued.invoice,
        paidMinor,
        tendered: tenderedCash > 0 ? tenderedCash : undefined,
        change: calculatedChange > 0 ? calculatedChange : undefined,
        account: paymentAccount,
      });
      setLines([emptyLine()]);
      setDiscountPkr("0");
      setReference("");
      setTenderedCash(0);
      void fetchPendingOrders();
    } catch (cause) {
      setIssuing(false);
      setError(cause instanceof Error ? cause.message : "The invoice could not be processed.");
    }
  }

  // Official Hospital Execution Slip / Receipt with Hospital Logo
  function printReceipt(targetInvoice?: InvoiceRecord, paidAmountMinor?: number) {
    const inv = targetInvoice ?? receipt?.invoice;
    if (!inv) return;
    const paid = paidAmountMinor ?? receipt?.paidMinor ?? inv.paidMinor;

    const hospitalLogo =
      typeof window !== "undefined"
        ? // eslint-disable-next-line no-restricted-syntax
          localStorage.getItem("wonflow_hospital_logo") || "/brand/wonflow-logo.png"
        : "/brand/wonflow-logo.png";

    const popup = window.open("", "_blank", "width=580,height=820");
    if (!popup) return;

    const lineRows = inv.lines
      .map(
        (line) =>
          `<tr>
            <td style="padding:9px 12px;border-bottom:1px solid #e2e8f0;font-size:13px">
              <strong>${line.description}</strong>
              <div style="font-size:11px;color:#64748b;font-weight:600">✓ Authorized for immediate department execution</div>
            </td>
            <td style="padding:9px 12px;border-bottom:1px solid #e2e8f0;text-align:center;font-size:13px">${line.quantity}</td>
            <td style="padding:9px 12px;border-bottom:1px solid #e2e8f0;text-align:right;font-size:13px">${minorToPkr(line.unitPriceMinor)}</td>
            <td style="padding:9px 12px;border-bottom:1px solid #e2e8f0;text-align:right;font-size:13px;font-weight:bold">${minorToPkr(line.totalMinor)}</td>
          </tr>`
      )
      .join("");

    popup.document.write(`<!DOCTYPE html><html><head><title>Receipt ${inv.invoiceNumber}</title></head><body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;padding:32px;color:#0f172a;max-width:520px;margin:0 auto">
      <div style="text-align:center;border-bottom:2px solid #0f172a;padding-bottom:16px;margin-bottom:16px">
        <div style="display:flex;align-items:center;justify-content:center;margin-bottom:8px">
          <img src="${hospitalLogo}" alt="Hospital Logo" style="max-height:55px;max-width:200px;object-fit:contain" onerror="this.style.display='none'" />
        </div>
        <h2 style="margin:4px 0 0 0;font-size:20px;font-weight:900;letter-spacing:-0.5px;color:#1e3a8a">WONFLOW HOSPITAL PLATFORM</h2>
        <p style="margin:3px 0 0 0;font-size:11px;color:#475569;font-weight:700">Official Diagnostic Authorization & Counter Payment Token</p>
      </div>

      <div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:16px;background:#f8fafc;padding:12px 14px;border-radius:10px;border:1px solid #e2e8f0">
        <div>
          <span style="color:#64748b">Invoice #:</span> <strong style="font-size:13px">${inv.invoiceNumber}</strong><br/>
          <span style="color:#64748b">Patient:</span> <strong>${selectedPatientRecord ? `${selectedPatientRecord.givenName} ${selectedPatientRecord.familyName}` : "Walk-in Patient"}</strong><br/>
          <span style="color:#64748b">MR Number:</span> <strong style="font-family:monospace">${selectedPatientRecord?.patientNumber ?? "—"}</strong>
        </div>
        <div style="text-align:right">
          <span style="color:#64748b">Date:</span> <strong>${new Date().toLocaleDateString("en-PK")}</strong><br/>
          <span style="color:#64748b">Status:</span> <strong style="color:#059669;text-transform:uppercase">${inv.status === "ISSUED" && paid > 0 ? "PAID IN FULL" : inv.status}</strong><br/>
          <span style="color:#64748b">Method:</span> <strong style="text-transform:capitalize">${method} (${receipt?.account ?? paymentAccount})</strong>
        </div>
      </div>

      <table width="100%" cellspacing="0" style="margin-bottom:16px;border-collapse:collapse">
        <thead>
          <tr style="background:#f1f5f9;font-size:11px;text-transform:uppercase;color:#475569">
            <th align="left" style="padding:8px 12px">Prescribed Service / Test</th>
            <th align="center" style="padding:8px 12px">Qty</th>
            <th align="right" style="padding:8px 12px">Price</th>
            <th align="right" style="padding:8px 12px">Total</th>
          </tr>
        </thead>
        <tbody>${lineRows}</tbody>
      </table>

      <div style="border-top:1px solid #cbd5e1;padding-top:10px;font-size:13px">
        <div style="display:flex;justify-content:space-between;margin-bottom:4px"><span style="color:#64748b">Subtotal:</span> <span>${minorToPkr(inv.subtotalMinor)}</span></div>
        <div style="display:flex;justify-content:space-between;margin-bottom:4px"><span style="color:#64748b">Discount:</span> <span>${minorToPkr(inv.discountMinor)}</span></div>
        <div style="display:flex;justify-content:space-between;margin-top:8px;font-size:17px;font-weight:900;color:#0f172a;border-top:2px solid #0f172a;padding-top:8px">
          <span>Net Paid:</span> <span style="color:#2563eb">${minorToPkr(inv.totalMinor)}</span>
        </div>
        ${
          receipt?.tendered
            ? `<div style="display:flex;justify-content:space-between;margin-top:6px;font-size:12px;color:#047857;font-weight:bold">
                <span>Cash Received:</span> <span>PKR ${receipt.tendered.toLocaleString()}</span>
              </div>
              <div style="display:flex;justify-content:space-between;margin-top:2px;font-size:12px;color:#047857;font-weight:bold">
                <span>Change Returned:</span> <span>PKR ${(receipt.change ?? 0).toLocaleString()}</span>
              </div>`
            : ""
        }
      </div>

      <!-- Department Execution Routing Instructions -->
      <div style="margin-top:16px;background:#eff6ff;border:1.5px dashed #93c5fd;padding:12px;border-radius:10px;font-size:11px;color:#1e40af">
        <strong style="font-size:12px;display:block;margin-bottom:4px">🏥 Department Routing Slip:</strong>
        <div style="line-height:1.5">
          • <strong>Laboratory Tests:</strong> Proceed to Laboratory / Sample Collection with this token.<br/>
          • <strong>Radiology / Scan:</strong> Proceed to Imaging Dept with this token for scan execution.<br/>
          • <strong>Status:</strong> Automatically synchronized with Doctor & Diagnostic Worklists.
        </div>
      </div>

      <div style="margin-top:24px;display:flex;justify-content:space-between;align-items:flex-end;font-size:11px;color:#64748b">
        <div>Authorized Cashier: <strong>${session?.name ?? "Billing Cashier"}</strong></div>
        <div style="text-align:center">
          <div style="width:140px;border-bottom:1px dashed #94a3b8;height:24px"></div>
          <span style="font-size:10px;text-transform:uppercase">Cashier Stamp / Signature</span>
        </div>
      </div>
    </body></html>`);
    popup.document.close();
    popup.print();
  }

  // Filtered & Paginated Recent Invoices
  const allInvoices = invoicesResource.data?.invoices ?? [];
  const filteredInvoices = useMemo(() => {
    return allInvoices.filter((inv) => {
      const q = invoiceSearchQuery.toLowerCase().trim();
      const matchesSearch =
        q === "" ||
        inv.invoiceNumber.toLowerCase().includes(q) ||
        inv.patientId.toLowerCase().includes(q);

      const matchesStatus =
        invoiceStatusFilter === "all" || inv.status.toLowerCase() === invoiceStatusFilter.toLowerCase();

      return matchesSearch && matchesStatus;
    });
  }, [allInvoices, invoiceSearchQuery, invoiceStatusFilter]);

  const totalPages = Math.ceil(filteredInvoices.length / pageSize);
  const paginatedInvoices = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredInvoices.slice(start, start + pageSize);
  }, [filteredInvoices, currentPage, pageSize]);

  // Available Presets Filtered by category
  const activePresets = useMemo(() => {
    if (selectedCategory === "All") {
      return PRESET_CATEGORIES.flatMap((c) => c.items);
    }
    return PRESET_CATEGORIES.find((c) => c.category === selectedCategory)?.items ?? [];
  }, [selectedCategory]);

  return (
    <div className="w-full space-y-4 px-2 sm:px-4 pb-8">
      {/* 1. Generous Header Bar */}
      <header className="rounded-2xl bg-gradient-to-r from-blue-700 via-indigo-700 to-slate-900 px-5 py-4 text-white shadow-md flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10 text-white backdrop-blur-md border border-white/15 shadow-sm">
            <ShieldCheck size={22} className="text-blue-300" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg sm:text-xl font-black tracking-tight">Billing Counter Desk</h1>
              <span className="rounded-full bg-white/15 px-2.5 py-0.5 text-xs font-bold text-blue-100 border border-white/15">
                POS Terminal
              </span>
            </div>
            <p className="text-xs text-blue-100/90 font-medium">
              Cashier: <strong className="text-white">{session?.name ?? "Billing Cashier"}</strong> · Real-time order synchronization active
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Tab Switcher */}
          <div className="flex items-center rounded-xl bg-black/20 p-1 border border-white/10">
            <button
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                activeTab === "pos" ? "bg-white text-slate-900 shadow-sm font-black" : "text-blue-100 hover:text-white"
              }`}
              onClick={() => setActiveTab("pos")}
              type="button"
            >
              <Receipt size={14} /> New Invoice
            </button>
            <button
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                activeTab === "history" ? "bg-white text-slate-900 shadow-sm font-black" : "text-blue-100 hover:text-white"
              }`}
              onClick={() => setActiveTab("history")}
              type="button"
            >
              <FileText size={14} /> Day&apos;s Ledger ({allInvoices.length})
            </button>
          </div>

          <button
            className="flex items-center gap-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 px-3.5 py-2 text-xs font-black text-slate-950 shadow-sm transition"
            onClick={() => setShowCalculator(true)}
            type="button"
          >
            <Calculator size={15} />
            <span>POS Calculator</span>
          </button>

          <button
            className="flex items-center gap-1.5 rounded-xl bg-indigo-500 hover:bg-indigo-400 px-3.5 py-2 text-xs font-bold text-white shadow-sm transition"
            onClick={() => setShowRegisterModal(true)}
            type="button"
          >
            <UserPlus size={15} />
            <span>+ Register Patient</span>
          </button>

          {activeTab === "pos" && (
            <button
              className="flex items-center gap-1.5 rounded-xl bg-white/10 hover:bg-white/20 px-3 py-2 text-xs font-bold text-white transition border border-white/15"
              onClick={() => {
                setLines([emptyLine()]);
                setPatientId("");
                setSelectedPatientRecord(null);
                setDiscountPkr("0");
                setReceipt(null);
                setError("");
                setTenderedCash(0);
              }}
              title="Reset Form"
              type="button"
            >
              <RefreshCw size={13} /> Reset
            </button>
          )}
        </div>
      </header>

      {/* POS Calculator Modal */}
      <CalculatorModal
        isOpen={showCalculator}
        onApplyChangeTender={(tendered) => setTenderedCash(tendered)}
        onClose={() => setShowCalculator(false)}
        totalPayablePkr={totalPkr}
      />

      {/* Quick Register Patient Modal */}
      {showRegisterModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-600 text-white">
                  <UserPlus size={20} />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">Register Walk-In Patient</h3>
                  <p className="text-xs text-slate-500">Quickly create a patient record directly at the Billing Desk</p>
                </div>
              </div>
              <button
                className="text-slate-400 hover:text-slate-600"
                onClick={() => setShowRegisterModal(false)}
                type="button"
              >
                <X size={20} />
              </button>
            </div>

            {regError && (
              <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-bold text-rose-700">
                {regError}
              </div>
            )}

            <form className="space-y-3 text-xs font-bold" onSubmit={handleQuickRegister}>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 mb-1">First Name (Given Name) *</label>
                  <input
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium outline-none focus:border-indigo-500"
                    onChange={(e) => setRegForm({ ...regForm, givenName: e.target.value })}
                    placeholder="e.g. Tariq"
                    required
                    value={regForm.givenName}
                  />
                </div>
                <div>
                  <label className="block text-slate-700 mb-1">Last Name (Family Name) *</label>
                  <input
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium outline-none focus:border-indigo-500"
                    onChange={(e) => setRegForm({ ...regForm, familyName: e.target.value })}
                    placeholder="e.g. Khan"
                    required
                    value={regForm.familyName}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 mb-1">Mobile Phone *</label>
                  <input
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium outline-none focus:border-indigo-500"
                    onChange={(e) => setRegForm({ ...regForm, phone: e.target.value })}
                    placeholder="e.g. 03001234567"
                    value={regForm.phone}
                  />
                </div>
                <div>
                  <label className="block text-slate-700 mb-1">Gender</label>
                  <select
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium outline-none focus:border-indigo-500"
                    onChange={(e) => setRegForm({ ...regForm, sex: e.target.value })}
                    value={regForm.sex}
                  >
                    <option value="MALE">Male</option>
                    <option value="FEMALE">Female</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 mb-1">City / Region</label>
                <input
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium outline-none focus:border-indigo-500"
                  onChange={(e) => setRegForm({ ...regForm, city: e.target.value })}
                  placeholder="e.g. Karachi"
                  value={regForm.city}
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50"
                  onClick={() => setShowRegisterModal(false)}
                  type="button"
                >
                  Cancel
                </button>
                <button
                  className="rounded-xl bg-indigo-600 px-5 py-2 text-xs font-black text-white hover:bg-indigo-700 disabled:opacity-50"
                  disabled={registerPatient.saveState === "saving"}
                  type="submit"
                >
                  {registerPatient.saveState === "saving" ? "Registering..." : "Register & Start Bill"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Success Receipt Banner */}
      {receipt && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 rounded-2xl border border-emerald-300 bg-emerald-50 p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-sm">
              <CheckCircle2 size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-black text-slate-900">
                  Invoice {receipt.invoice.invoiceNumber} Paid & Synchronized!
                </h3>
                <span className="rounded-full bg-emerald-200 px-2.5 py-0.5 text-[10px] font-black text-emerald-900 uppercase">
                  {receipt.invoice.status}
                </span>
              </div>
              <p className="mt-0.5 text-xs text-slate-600 font-medium">
                Total: <strong className="text-slate-900">{minorToPkr(receipt.invoice.totalMinor)}</strong> · Paid: <strong className="text-emerald-700">{minorToPkr(receipt.paidMinor)}</strong>
                {receipt.change ? ` · Change Returned: PKR ${receipt.change.toLocaleString()}` : ""}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-black text-white shadow-xs hover:bg-indigo-700 transition"
              onClick={() => printReceipt()}
              type="button"
            >
              <Printer size={15} /> Print Official Slip
            </button>
            <button
              className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50"
              onClick={() => setReceipt(null)}
              type="button"
            >
              New Bill
            </button>
          </div>
        </div>
      )}

      {/* 2-COLUMN MAIN WORKSPACE */}
      {activeTab === "pos" && (
        <form className="grid grid-cols-1 gap-5 lg:grid-cols-12" onSubmit={submit}>
          {/* LEFT COLUMN: Patient Selection, Doctor Prescriptions & Service Catalog (7 Columns) */}
          <div className="space-y-4 lg:col-span-7">
            {error ? (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 p-3.5 text-xs font-bold text-rose-700 flex items-center justify-between">
                <span>{error}</span>
                <button onClick={() => setError("")} type="button" className="text-rose-500 hover:text-rose-700">
                  <X size={15} />
                </button>
              </div>
            ) : null}

            {/* 1. Patient Selector Card */}
            <div className="relative rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs">
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-black text-slate-900 flex items-center gap-1.5">
                  <User size={16} className="text-indigo-600" /> Patient Selection *
                </label>
                {selectedPatientRecord && (
                  <button
                    className="text-xs font-bold text-rose-600 hover:underline flex items-center gap-1"
                    onClick={() => {
                      setPatientId("");
                      setSelectedPatientRecord(null);
                      setPatientQuery("");
                    }}
                    type="button"
                  >
                    <X size={13} /> Change Patient
                  </button>
                )}
              </div>

              {selectedPatientRecord ? (
                <div className="flex items-center justify-between rounded-xl border border-indigo-200 bg-indigo-50/60 p-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white font-black text-sm">
                      {selectedPatientRecord.givenName[0]}
                      {selectedPatientRecord.familyName[0]}
                    </div>
                    <div>
                      <h4 className="text-sm font-black text-slate-900">
                        {selectedPatientRecord.givenName} {selectedPatientRecord.familyName}
                      </h4>
                      <p className="text-xs text-slate-500 font-medium mt-0.5">
                        MR Number: <span className="font-mono font-bold text-slate-800">{selectedPatientRecord.patientNumber}</span>
                        {selectedPatientRecord.phone ? ` · Tel: ${selectedPatientRecord.phone}` : ""}
                      </p>
                    </div>
                  </div>
                  <span className="rounded-full bg-indigo-200/70 px-2.5 py-0.5 text-[10px] font-black text-indigo-900 uppercase">
                    Verified
                  </span>
                </div>
              ) : (
                <div className="relative space-y-2">
                  <div className="relative">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input
                      className="w-full rounded-xl border border-slate-200 bg-slate-50/60 pl-10 pr-4 py-2.5 text-sm font-medium text-slate-800 placeholder-slate-400 outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-500/20"
                      onChange={(e) => {
                        setPatientQuery(e.target.value);
                        setIsSearchingPatient(true);
                      }}
                      onFocus={() => setIsSearchingPatient(true)}
                      placeholder="Search arriving patient by Name, MR Number, or Phone..."
                      value={patientQuery}
                    />
                  </div>

                  {/* FLOATING Autocomplete Dropdown - Absolute overlay so it doesn't push layout down */}
                  {isSearchingPatient && patients.data?.patients.length ? (
                    <div className="absolute left-0 right-0 top-full z-40 mt-1 max-h-56 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-1.5 shadow-2xl">
                      <div className="flex items-center justify-between px-3 py-1.5 text-xs font-bold text-slate-400 border-b border-slate-100 mb-1">
                        <span>Select Matching Patient</span>
                        <button
                          className="hover:text-slate-700"
                          onClick={() => setIsSearchingPatient(false)}
                          type="button"
                        >
                          Close [X]
                        </button>
                      </div>
                      {patients.data.patients.map((patient) => (
                        <button
                          className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-xs transition hover:bg-indigo-50"
                          key={patient.id}
                          onClick={() => {
                            setPatientId(patient.id);
                            setSelectedPatientRecord(patient);
                            setIsSearchingPatient(false);
                            setPatientQuery("");
                          }}
                          type="button"
                        >
                          <div>
                            <span className="font-bold text-slate-900 text-sm">
                              {patient.givenName} {patient.familyName}
                            </span>
                            <span className="ml-2 font-mono text-xs text-slate-500 font-bold">
                              {patient.patientNumber}
                            </span>
                          </div>
                          <span className="text-xs text-slate-400 font-medium">{patient.phone ?? "No phone"}</span>
                        </button>
                      ))}
                    </div>
                  ) : null}

                  {/* Arrived Patients with Pending Doctor Prescriptions Queue */}
                  {!selectedPatientRecord && arrivingPatientsWithOrders.length > 0 && (
                    <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-2.5">
                      <div className="flex items-center gap-1.5 text-xs font-black text-amber-900 mb-1.5">
                        <Clock size={14} className="text-amber-600" />
                        <span>Arrived Patients with Doctor-Prescribed Tests ({arrivingPatientsWithOrders.length}):</span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {arrivingPatientsWithOrders.map(({ patient, orders }) => (
                          <button
                            className="flex items-center gap-1.5 rounded-lg border border-amber-300 bg-white px-2.5 py-1 text-xs font-bold text-amber-900 shadow-2xs hover:bg-amber-100 transition"
                            key={patient.patientNumber}
                            onClick={() => {
                              const found = patients.data?.patients.find((p) => p.patientNumber === patient.patientNumber);
                              if (found) {
                                setPatientId(found.id);
                                setSelectedPatientRecord(found);
                              } else {
                                setPatientId(patient.patientNumber);
                                setSelectedPatientRecord({
                                  id: patient.patientNumber,
                                  patientNumber: patient.patientNumber,
                                  status: "ACTIVE",
                                  givenName: patient.givenName,
                                  middleName: null,
                                  familyName: patient.familyName,
                                  dateOfBirth: null,
                                  sex: null,
                                  phone: null,
                                  email: null,
                                  address: null,
                                  guardianData: null,
                                  consentData: null,
                                  identifiers: [],
                                  createdAt: new Date().toISOString(),
                                  updatedAt: new Date().toISOString(),
                                });
                              }
                            }}
                            type="button"
                          >
                            <UserCheck size={13} className="text-amber-600" />
                            <span>{patient.givenName} {patient.familyName}</span>
                            <span className="rounded-full bg-amber-200 px-1.5 py-0.2 text-[10px] font-black">
                              {orders.length} {orders.length === 1 ? "test" : "tests"}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* 2. DOCTOR-RECOMMENDED TESTS (If Patient Has Prescribed Tests) */}
            {selectedPatientRecord && patientPrescribedOrders.length > 0 && (
              <div className="rounded-2xl border border-indigo-200 bg-indigo-50/60 p-4 shadow-xs space-y-2.5">
                <div className="flex items-center justify-between border-b border-indigo-200/80 pb-2">
                  <div className="flex items-center gap-2">
                    <Stethoscope size={17} className="text-indigo-600" />
                    <h3 className="text-sm font-black text-indigo-950">
                      Doctor-Prescribed Tests ({patientPrescribedOrders.length})
                    </h3>
                  </div>

                  <button
                    className="flex items-center gap-1.5 rounded-xl bg-indigo-700 px-3 py-1.5 text-xs font-black text-white hover:bg-indigo-800 transition shadow-2xs"
                    onClick={addAllDoctorOrders}
                    type="button"
                  >
                    <Sparkles size={13} /> ⚡ Bill All Doctor Tests
                  </button>
                </div>

                <div className="grid gap-2 sm:grid-cols-2 max-h-40 overflow-y-auto pr-1">
                  {patientPrescribedOrders.map((order) => {
                    const isLab = order.specimenOrBodySite !== "Study";
                    let estPrice = "1000";
                    const lower = order.name.toLowerCase();
                    if (lower.includes("ct")) estPrice = "7500";
                    else if (lower.includes("mri")) estPrice = "12000";
                    else if (lower.includes("x-ray")) estPrice = "1500";
                    else if (lower.includes("ultrasound")) estPrice = "2500";
                    else if (lower.includes("cbc")) estPrice = "800";
                    else if (lower.includes("lft")) estPrice = "1200";
                    else if (lower.includes("urine")) estPrice = "400";

                    return (
                      <div
                        className="flex items-center justify-between rounded-xl border border-indigo-200 bg-white p-2.5 text-xs shadow-2xs"
                        key={order.id}
                      >
                        <div className="min-w-0 pr-2">
                          <div className="flex items-center gap-1 text-[10px] font-black uppercase text-indigo-600">
                            {isLab ? <FlaskConical size={11} /> : <ScanLine size={11} />}
                            {order.specimenOrBodySite ?? (isLab ? "Lab" : "Radiology")}
                          </div>
                          <h4 className="font-bold text-slate-900 text-xs truncate mt-0.5">{order.name}</h4>
                          <span className="text-xs font-mono font-bold text-indigo-700">PKR {estPrice}</span>
                        </div>

                        <button
                          className="rounded-lg border border-indigo-300 bg-indigo-50 px-2.5 py-1 text-xs font-bold text-indigo-800 hover:bg-indigo-100 shrink-0 transition"
                          onClick={() =>
                            addPresetLine({
                              name: `[Doctor Prescribed] ${order.name} (${order.code})`,
                              price: estPrice,
                              dept: order.specimenOrBodySite ?? "Diagnostics",
                              orderId: order.id,
                              isDoctor: true,
                            })
                          }
                          type="button"
                        >
                          + Add
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 3. Quick-Add Diagnostic Catalog */}
            <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm font-black text-slate-900 flex items-center gap-1.5">
                    <Layers size={16} className="text-indigo-600" /> Hospital Catalog (Add Extra Tests)
                  </h3>
                  <p className="text-xs text-slate-400 font-medium">Click any test or procedure to add to bill</p>
                </div>

                {/* Category Pills */}
                <div className="flex items-center gap-1">
                  {["All", "Laboratory", "Radiology & Imaging", "Procedures & Cardiology"].map((cat) => (
                    <button
                      className={`rounded-lg px-2.5 py-1 text-xs font-bold transition ${
                        selectedCategory === cat
                          ? "bg-indigo-600 text-white font-black shadow-xs"
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      }`}
                      key={cat}
                      onClick={() => setSelectedCategory(cat)}
                      type="button"
                    >
                      {cat.split(" ")[0]}
                    </button>
                  ))}
                </div>
              </div>

              {/* Service Chips */}
              <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto pr-1">
                {activePresets.map((preset) => (
                  <button
                    className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50/80 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:border-indigo-400 hover:bg-indigo-50 hover:text-indigo-700 transition"
                    key={preset.name}
                    onClick={() => addPresetLine(preset)}
                    type="button"
                  >
                    <Plus size={12} className="text-indigo-500" />
                    <span>{preset.name}</span>
                    <span className="rounded-md bg-white px-1.5 py-0.5 text-[10px] font-bold font-mono text-indigo-700 border border-slate-200">
                      PKR {preset.price}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* 4. Invoice Bill Items Table */}
            <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <h3 className="text-sm font-black text-slate-900 flex items-center gap-1.5">
                  <Receipt size={16} className="text-indigo-600" /> Bill Line Items ({lines.length})
                </h3>
                <button
                  className="flex items-center gap-1 rounded-lg border border-indigo-200 bg-indigo-50 px-2.5 py-1 text-xs font-bold text-indigo-700 hover:bg-indigo-100 transition"
                  onClick={() => setLines((current) => [...current, emptyLine()])}
                  type="button"
                >
                  <Plus size={13} /> + Add Custom Line
                </button>
              </div>

              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {lines.map((line, idx) => (
                  <div
                    className={`grid grid-cols-12 gap-2 items-center rounded-xl border p-2 text-xs ${
                      line.isDoctorPrescribed
                        ? "border-indigo-200 bg-indigo-50/40"
                        : "border-slate-100 bg-slate-50/50"
                    }`}
                    key={line.key}
                  >
                    <span className="col-span-1 text-center font-mono font-bold text-slate-400">{idx + 1}</span>
                    <div className="col-span-6">
                      <input
                        className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium placeholder-slate-400 outline-none focus:border-indigo-500"
                        onChange={(e) => updateLine(line.key, { description: e.target.value })}
                        placeholder="Item / Test Name"
                        value={line.description}
                      />
                    </div>
                    <div className="col-span-2 flex items-center">
                      <button
                        className="flex h-7 w-6 items-center justify-center rounded-l-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-100"
                        onClick={() => {
                          const q = Math.max(1, Number(line.quantity) - 1);
                          updateLine(line.key, { quantity: q.toString() });
                        }}
                        type="button"
                      >
                        <Minus size={11} />
                      </button>
                      <input
                        className="h-7 w-full border-y border-slate-200 bg-white text-center text-xs font-bold text-slate-800 outline-none"
                        min="1"
                        onChange={(e) => updateLine(line.key, { quantity: e.target.value })}
                        type="number"
                        value={line.quantity}
                      />
                      <button
                        className="flex h-7 w-6 items-center justify-center rounded-r-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-100"
                        onClick={() => {
                          const q = Number(line.quantity) + 1;
                          updateLine(line.key, { quantity: q.toString() });
                        }}
                        type="button"
                      >
                        <Plus size={11} />
                      </button>
                    </div>
                    <div className="col-span-2">
                      <input
                        className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs font-mono font-bold text-slate-800 placeholder-slate-400 outline-none focus:border-indigo-500"
                        min="0"
                        onChange={(e) => updateLine(line.key, { unitPricePkr: e.target.value })}
                        placeholder="PKR"
                        step="0.01"
                        type="number"
                        value={line.unitPricePkr}
                      />
                    </div>
                    <div className="col-span-1 flex justify-center">
                      <button
                        className="flex h-7 w-7 items-center justify-center rounded-lg border border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100 transition"
                        onClick={() => removeLine(line.key)}
                        type="button"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: Payment & Settlement Card (5 Columns) */}
          <div className="lg:col-span-5 space-y-4">
            <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm space-y-4">
              <div className="border-b border-slate-100 pb-2.5 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-black text-slate-900 flex items-center gap-1.5">
                    <CreditCard size={17} className="text-indigo-600" /> Payment & Settlement
                  </h3>
                  <p className="text-xs text-slate-400 font-medium">Verify bill totals and collect cashier payment</p>
                </div>
              </div>

              {/* Totals Breakdown */}
              <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-3.5 space-y-2.5 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span className="text-sm">Subtotal Amount</span>
                  <span className="font-mono font-bold text-slate-900 text-sm">{minorToPkr(subtotalMinor)}</span>
                </div>

                {/* Discount input with percentage buttons */}
                <div>
                  <div className="flex items-center justify-between text-slate-600 mb-1.5">
                    <span className="flex items-center gap-1 font-bold text-xs">
                      <Percent size={12} /> Discount
                    </span>
                    <div className="flex items-center gap-1">
                      {[0, 5, 10, 15].map((pct) => (
                        <button
                          className="rounded-md border border-slate-200 bg-white px-2 py-0.5 text-xs font-bold text-slate-600 hover:bg-indigo-50 hover:text-indigo-700"
                          key={pct}
                          onClick={() => applyDiscountPercent(pct)}
                          type="button"
                        >
                          {pct}%
                        </button>
                      ))}
                    </div>
                  </div>
                  <input
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-mono font-bold text-slate-800 outline-none focus:border-indigo-500"
                    min="0"
                    onChange={(e) => setDiscountPkr(e.target.value)}
                    placeholder="Discount (PKR)"
                    step="0.01"
                    type="number"
                    value={discountPkr}
                  />
                </div>

                {/* Net Payable Highlight */}
                <div className="border-t border-slate-200 pt-2.5 flex items-center justify-between">
                  <span className="text-xs font-black uppercase text-slate-700">Net Payable</span>
                  <span className="text-xl font-black text-indigo-700 font-mono tracking-tight">
                    {minorToPkr(totalMinor)}
                  </span>
                </div>
              </div>

              {/* Payment Methods */}
              <div className="space-y-3 pt-1">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Payment Method</label>
                  <div className="grid grid-cols-4 gap-1.5">
                    {[
                      { id: "cash", label: "Cash", icon: <Banknote size={15} /> },
                      { id: "card", label: "Card/POS", icon: <CreditCard size={15} /> },
                      { id: "bank-transfer", label: "Bank", icon: <Building2 size={15} /> },
                      { id: "jazzcash", label: "QR/Wallet", icon: <QrCode size={15} /> },
                    ].map((m) => (
                      <button
                        className={`flex flex-col items-center justify-center gap-1 rounded-xl border py-2 text-xs font-bold transition ${
                          method === m.id
                            ? "border-indigo-600 bg-indigo-50 text-indigo-700 font-black shadow-xs"
                            : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                        }`}
                        key={m.id}
                        onClick={() => setMethod(m.id as BillingPaymentMethod)}
                        type="button"
                      >
                        {m.icon}
                        <span>{m.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* 2-Column: Account & Cash Tender */}
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Hospital Account</label>
                    <select
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-800 outline-none focus:border-indigo-500"
                      onChange={(e) => setPaymentAccount(e.target.value)}
                      value={paymentAccount}
                    >
                      <option value="Main Cash Drawer">Main Cash Drawer</option>
                      <option value="HBL Operating #4928">HBL Operating #4928</option>
                      <option value="Meezan Bank #1092">Meezan Bank #1092</option>
                      <option value="Bank Alfalah POS #2">Bank Alfalah POS #2</option>
                      <option value="JazzCash Merchant">JazzCash Merchant</option>
                    </select>
                  </div>

                  <div>
                    <div className="flex items-center justify-between text-xs font-bold text-slate-700 mb-1">
                      <span>Cash Received</span>
                      {tenderedCash > totalPkr && (
                        <span className="text-emerald-700 font-bold">
                          Chg: {(tenderedCash - totalPkr).toLocaleString()}
                        </span>
                      )}
                    </div>
                    <input
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-mono font-bold text-slate-800 outline-none focus:border-indigo-500"
                      min="0"
                      onChange={(e) => setTenderedCash(Number(e.target.value) || 0)}
                      placeholder={`e.g. ${totalPkr || 1500}`}
                      type="number"
                      value={tenderedCash || ""}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Reference / Auth # (Optional)
                  </label>
                  <input
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium placeholder-slate-400 outline-none focus:border-indigo-500"
                    onChange={(e) => setReference(e.target.value)}
                    placeholder="POS Auth Code or Slip #"
                    value={reference}
                  />
                </div>
              </div>

              {/* Automatic Order Sync Notice */}
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-2.5 text-xs font-bold text-emerald-800 flex items-center gap-2">
                <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                <span>Payment automatically unlocks Laboratory & Radiology execution.</span>
              </div>

              {/* Submit CTA Button */}
              <button
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-indigo-600 py-3 text-sm font-black text-white shadow-lg shadow-indigo-200 transition hover:bg-indigo-700 disabled:opacity-50"
                disabled={busy}
                type="submit"
              >
                {busy ? (
                  <>
                    <RefreshCw className="animate-spin" size={16} />
                    Processing Payment...
                  </>
                ) : (
                  <>
                    <Receipt size={16} />
                    {collectNow ? `Collect & Authorize (${minorToPkr(totalMinor)})` : "Issue Unpaid Invoice"}
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      )}

      {/* DAY'S INVOICES & HISTORY VIEW */}
      {activeTab === "history" && (
        <section className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-sm space-y-0">
          {/* Filter & Search Bar */}
          <div className="border-b border-slate-200 bg-slate-50/40 p-5 space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
                  Hospital Invoices Ledger
                  <span className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-black text-indigo-700 border border-indigo-100">
                    {filteredInvoices.length}
                  </span>
                </h2>
                <p className="text-xs text-slate-500 font-medium">All invoices and counter receipts recorded today</p>
              </div>

              {/* Status Filter Chips */}
              <div className="flex items-center gap-1.5">
                <span className="flex items-center gap-1 text-xs font-bold text-slate-400 mr-1">
                  <Filter size={13} /> Status:
                </span>
                {["all", "ISSUED", "PAID", "DRAFT"].map((st) => (
                  <button
                    className={`rounded-xl px-3 py-1 text-xs font-bold transition ${
                      invoiceStatusFilter === st
                        ? "bg-indigo-600 text-white shadow-xs"
                        : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-100"
                    }`}
                    key={st}
                    onClick={() => {
                      setInvoiceStatusFilter(st);
                      setCurrentPage(1);
                    }}
                    type="button"
                  >
                    {st === "all" ? `All (${allInvoices.length})` : st}
                  </button>
                ))}
              </div>
            </div>

            {/* Search Bar */}
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input
                className="w-full rounded-2xl border border-slate-200 bg-white pl-10 pr-9 py-2.5 text-xs font-medium text-slate-800 placeholder-slate-400 outline-none shadow-xs transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                onChange={(e) => {
                  setInvoiceSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Search invoices by Invoice # or Patient ID..."
                value={invoiceSearchQuery}
              />
              {invoiceSearchQuery ? (
                <button
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  onClick={() => {
                    setInvoiceSearchQuery("");
                    setCurrentPage(1);
                  }}
                  type="button"
                >
                  <X size={15} />
                </button>
              ) : null}
            </div>
          </div>

          {/* Invoices List / Table */}
          {invoicesResource.status === "loading" ? (
            <div className="flex items-center justify-center gap-2 p-10 text-xs font-bold text-slate-500">
              <RefreshCw className="animate-spin text-indigo-600" size={18} />
              Loading invoice records...
            </div>
          ) : null}

          {invoicesResource.status === "success" && filteredInvoices.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 mb-3">
                <Receipt size={24} />
              </div>
              <h4 className="text-sm font-black text-slate-800">No invoices found</h4>
              <p className="mt-1 text-xs text-slate-500 max-w-sm">
                {invoiceSearchQuery
                  ? `No invoices match "${invoiceSearchQuery}".`
                  : "No billing invoices have been issued yet today."}
              </p>
            </div>
          ) : null}

          <div className="divide-y divide-slate-200/80">
            {paginatedInvoices.map((inv) => (
              <article
                className="flex flex-wrap items-center justify-between gap-4 p-4 transition hover:bg-slate-50/80"
                key={inv.id}
              >
                <div className="flex items-center gap-3.5">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 font-bold">
                    <Receipt size={20} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono font-black text-slate-900 text-sm">
                        {inv.invoiceNumber}
                      </span>
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase ${
                          inv.status === "ISSUED" || inv.paidMinor >= inv.totalMinor
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : "bg-amber-50 text-amber-700 border border-amber-200"
                        }`}
                      >
                        {inv.paidMinor >= inv.totalMinor ? "PAID" : inv.status}
                      </span>
                    </div>
                    <div className="mt-1 flex items-center gap-2 text-xs text-slate-500 font-medium">
                      <span>{inv.lines.length} {inv.lines.length === 1 ? "item" : "items"}</span>
                      <span>·</span>
                      <span>{new Date(inv.createdAt).toLocaleString("en-PK")}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="font-mono font-black text-slate-900 text-sm">{minorToPkr(inv.totalMinor)}</p>
                    <p className="text-[11px] font-bold text-emerald-600">
                      Paid: {minorToPkr(inv.paidMinor)}
                    </p>
                  </div>

                  <button
                    className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 shadow-xs transition hover:bg-slate-50 hover:text-indigo-600"
                    onClick={() => printReceipt(inv, inv.paidMinor)}
                    type="button"
                  >
                    <Printer size={14} /> Print
                  </button>
                </div>
              </article>
            ))}
          </div>

          {/* Pagination */}
          <Pagination
            currentPage={currentPage}
            onPageChange={setCurrentPage}
            onPageSizeChange={setPageSize}
            pageSize={pageSize}
            totalItems={filteredInvoices.length}
            totalPages={totalPages}
          />
        </section>
      )}
    </div>
  );
}
