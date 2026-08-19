"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Calendar,
  Check,
  CheckCircle2,
  Copy,
  Edit2,
  Eye,
  File,
  FileCheck,
  FileCode,
  FileImage,
  FileSpreadsheet,
  FileText,
  Filter,
  History,
  KeyRound,
  Plus,
  Printer,
  Search,
  Share2,
  ShieldCheck,
  Smartphone,
  Stethoscope,
  Trash2,
  UploadCloud,
  User,
  X,
} from "lucide-react";

interface StoredObjectInfo {
  contentType: string;
  sizeBytes: string;
}

interface DocumentItem {
  id: string;
  title: string;
  category: string;
  status: string;
  createdAt: string;
  releasedAt: string | null;
  object?: StoredObjectInfo;
}

interface ClinicalNote {
  id: string;
  noteType: string;
  content: string;
  createdAt: string;
}

interface EncounterItem {
  id: string;
  status: string;
  startedAt: string;
  endedAt: string | null;
  clinicalNotes: ClinicalNote[];
}

interface Patient {
  id: string;
  patientNumber: string;
  givenName: string;
  middleName: string | null;
  familyName: string;
  dateOfBirth: string | null;
  gender: string | null;
  phoneNumber: string | null;
  bloodGroup: string | null;
  documents: DocumentItem[];
  encounters: EncounterItem[];
}

const ACCEPTED_EXTENSIONS =
  ".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.rtf,.md,.png,.jpg,.jpeg,.webp,.gif,.svg,.bmp,.tiff,.heic";

function formatBytes(bytesStrOrNum: string | number): string {
  const bytes = typeof bytesStrOrNum === "string" ? Number(bytesStrOrNum) : bytesStrOrNum;
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return dateStr;
  }
}

function getFileCategoryBadge(fileName: string, mimeType = ""): { label: string; icon: typeof FileText; color: string } {
  const lower = fileName.toLowerCase();
  if (mimeType.startsWith("image/") || /\.(png|jpe?g|webp|gif|svg|bmp|tiff|heic)$/i.test(lower)) {
    return { label: "Image / Photo", icon: FileImage, color: "text-emerald-700 bg-emerald-50 border-emerald-200" };
  }
  if (mimeType.includes("pdf") || lower.endsWith(".pdf")) {
    return { label: "PDF Document", icon: FileText, color: "text-rose-700 bg-rose-50 border-rose-200" };
  }
  if (mimeType.includes("word") || /\.(docx?|rtf)$/i.test(lower)) {
    return { label: "Word Document", icon: FileCheck, color: "text-blue-700 bg-blue-50 border-blue-200" };
  }
  if (mimeType.includes("sheet") || mimeType.includes("excel") || /\.(xlsx?|csv)$/i.test(lower)) {
    return { label: "Spreadsheet", icon: FileSpreadsheet, color: "text-teal-700 bg-teal-50 border-teal-200" };
  }
  if (mimeType.includes("presentation") || mimeType.includes("powerpoint") || /\.(pptx?)$/i.test(lower)) {
    return { label: "Presentation", icon: FileCode, color: "text-amber-700 bg-amber-50 border-amber-200" };
  }
  return { label: "Document", icon: File, color: "text-slate-700 bg-slate-50 border-slate-200" };
}

export default function DoctorDocumentsPage() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState("");
  const [patientSearch, setPatientSearch] = useState("");
  const [docFilterCategory, setDocFilterCategory] = useState("ALL");
  const [docSearchQuery, setDocSearchQuery] = useState("");

  // Upload Form States
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("CLINICAL_REPORT");
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [showUploadModal, setShowUploadModal] = useState(false);

  // Edit Document Modal State
  const [editingDoc, setEditingDoc] = useState<DocumentItem | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [deletingDocId, setDeletingDocId] = useState<string | null>(null);

  // Active Tab: documents vs consultations history
  const [activeTab, setActiveTab] = useState<"documents" | "consultations">("documents");

  // Patient App Credentials Modal State
  const [showCredentialsModal, setShowCredentialsModal] = useState(false);
  const [customLoginEmail, setCustomLoginEmail] = useState("");
  const [customLoginPassword, setCustomLoginPassword] = useState("");
  const [credentialsResult, setCredentialsResult] = useState<{
    email: string;
    temporaryPassword: string;
    patientName: string;
    patientNumber: string;
    portalUrl: string;
  } | null>(null);
  const [provisioningBusy, setProvisioningBusy] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleCopy = (text: string, key: string) => {
    void navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  const handleGenerateCredentials = async (auto = true) => {
    if (!selectedPatientId) return;
    const typedPassword = customLoginPassword.trim();
    // Mirrors validateNewPassword on the server, so a password the server
    // would reject is caught before the round-trip.
    if (!auto && typedPassword) {
      if (typedPassword.length < 12) {
        setError("The temporary password must contain at least 12 characters.");
        return;
      }
      if (!/[A-Z]/.test(typedPassword) || !/[a-z]/.test(typedPassword) || !/[0-9]/.test(typedPassword)) {
        setError("The temporary password must contain uppercase, lowercase and numeric characters.");
        return;
      }
    }
    setProvisioningBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/v1/patients/${selectedPatientId}/portal-credentials`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          auto ? {} : { email: customLoginEmail.trim() || undefined, password: customLoginPassword.trim() || undefined },
        ),
      });
      const body = (await response.json()) as {
        email: string;
        temporaryPassword: string;
        patientName: string;
        patientNumber: string;
        portalUrl: string;
        error?: string;
      };
      if (!response.ok) throw new Error(body.error ?? "Failed to generate patient credentials.");
      setCredentialsResult(body);
      setSuccessMessage(`Patient app credentials created for ${body.patientName}.`);
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Failed to generate patient credentials.");
    } finally {
      setProvisioningBusy(false);
    }
  };

  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/v1/doctor/documents", { cache: "no-store" });
      const body = (await response.json()) as { patients?: Patient[]; error?: string };
      if (!response.ok) throw new Error(body.error);
      setPatients(body.patients ?? []);
      setSelectedPatientId((current) => current || body.patients?.[0]?.id || "");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Patient documents could not be loaded.");
    }
  }, []);

  useEffect(() => {
    queueMicrotask(() => {
      void load();
    });
  }, [load]);

  const previewUrl = useMemo(() => {
    if (!attachedFile || !attachedFile.type.startsWith("image/")) {
      return null;
    }
    return URL.createObjectURL(attachedFile);
  }, [attachedFile]);

  const handleSelectedFile = useCallback((file: File) => {
    setAttachedFile(file);
    setError("");
    setSuccessMessage("");
    setTitle((prev) => {
      if (prev.trim()) return prev;
      const baseName = file.name.replace(/\.[^/.]+$/, "");
      return baseName.replace(/[-_]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
    });
  }, []);

  // Global & dropzone Paste Handler (Ctrl+V / Command+V)
  useEffect(() => {
    const handlePaste = (event: ClipboardEvent) => {
      const clipboardData = event.clipboardData;
      if (!clipboardData) return;

      if (clipboardData.files && clipboardData.files.length > 0) {
        const file = clipboardData.files[0];
        if (file) {
          handleSelectedFile(file);
          setShowUploadModal(true);
          return;
        }
      }

      const items = clipboardData.items;
      if (items) {
        for (let i = 0; i < items.length; i++) {
          const item = items[i];
          if (item?.type.startsWith("image/")) {
            const blob = item.getAsFile();
            if (blob) {
              const now = new Date();
              const timeString = now.toISOString().replace(/[:.]/g, "-").slice(0, 19);
              const fileConstructor = window.File;
              const pastedFile =
                typeof fileConstructor === "function"
                  ? new fileConstructor([blob], `pasted-image-${timeString}.png`, { type: blob.type || "image/png" })
                  : (blob as unknown as File);
              handleSelectedFile(pastedFile);
              setShowUploadModal(true);
              return;
            }
          }
        }
      }
    };

    window.addEventListener("paste", handlePaste);
    return () => {
      window.removeEventListener("paste", handlePaste);
    };
  }, [handleSelectedFile]);

  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(false);

    if (event.dataTransfer.files && event.dataTransfer.files.length > 0) {
      const file = event.dataTransfer.files[0];
      if (file) {
        handleSelectedFile(file);
        setShowUploadModal(true);
      }
    }
  };

  async function upload(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!attachedFile) {
      setError("Please select, paste, or drop a document or image to upload.");
      return;
    }
    if (!selectedPatientId) {
      setError("Please select a patient.");
      return;
    }

    setBusy(true);
    setError("");
    setSuccessMessage("");

    try {
      const data = new FormData();
      data.set("patientId", selectedPatientId);
      data.set("title", title.trim() || attachedFile.name);
      data.set("category", category);
      data.set("file", attachedFile);

      const response = await fetch("/api/v1/doctor/documents", {
        method: "POST",
        body: data,
      });

      const body = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(body.error ?? "Failed to upload document");

      setAttachedFile(null);
      setTitle("");
      setSuccessMessage("Document successfully uploaded and released to patient.");
      setShowUploadModal(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The report could not be released.");
    } finally {
      setBusy(false);
    }
  }

  async function handleDeleteDocument(documentId: string) {
    setDeletingDocId(documentId);
    try {
      const response = await fetch(`/api/v1/doctor/documents/${documentId}`, {
        method: "DELETE",
      });
      const body = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(body.error ?? "Could not delete document.");
      setSuccessMessage("Document removed successfully.");
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not delete document.");
    } finally {
      setDeletingDocId(null);
    }
  }

  async function handleSaveEditDocument() {
    if (!editingDoc) return;
    setBusy(true);
    try {
      const response = await fetch(`/api/v1/doctor/documents/${editingDoc.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: editTitle.trim() || editingDoc.title,
          category: editCategory || editingDoc.category,
        }),
      });
      const body = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(body.error ?? "Could not update document.");
      setSuccessMessage("Document updated successfully.");
      setEditingDoc(null);
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not update document.");
    } finally {
      setBusy(false);
    }
  }

  const selectedPatient = patients.find((p) => p.id === selectedPatientId);

  const filteredPatients = useMemo(() => {
    if (!patientSearch.trim()) return patients;
    const q = patientSearch.toLowerCase();
    return patients.filter((p) => {
      const name = [p.givenName, p.middleName, p.familyName].filter(Boolean).join(" ").toLowerCase();
      const num = p.patientNumber.toLowerCase();
      return name.includes(q) || num.includes(q);
    });
  }, [patients, patientSearch]);

  const filteredDocuments = useMemo(() => {
    if (!selectedPatient) return [];
    let docs = selectedPatient.documents;
    if (docFilterCategory !== "ALL") {
      docs = docs.filter((d) => d.category === docFilterCategory);
    }
    if (docSearchQuery.trim()) {
      const q = docSearchQuery.toLowerCase();
      docs = docs.filter((d) => d.title.toLowerCase().includes(q));
    }
    return docs;
  }, [selectedPatient, docFilterCategory, docSearchQuery]);

  const badgeInfo = attachedFile ? getFileCategoryBadge(attachedFile.name, attachedFile.type) : null;
  const BadgeIcon = badgeInfo?.icon ?? File;

  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="rounded-3xl bg-gradient-to-r from-slate-950 via-indigo-950 to-violet-900 p-6 text-white shadow-xl">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-violet-200">Clinical workspace</p>
            <h1 className="mt-1 text-3xl font-black">Patient reports & document history</h1>
            <p className="mt-1 text-xs text-indigo-100">
              Click any patient to view, manage, download, or delete their full medical reports, scans, and consultation history.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowUploadModal(true)}
            className="inline-flex items-center gap-2 rounded-2xl bg-indigo-500 px-4 py-2.5 text-xs font-black text-white shadow-md transition hover:bg-indigo-600 active:scale-95"
          >
            <Plus className="h-4 w-4" />
            Upload New Document
          </button>
        </div>
      </header>

      {/* Notifications */}
      {error ? (
        <div className="flex items-center justify-between rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700 shadow-sm">
          <span>{error}</span>
          <button type="button" onClick={() => setError("")}>
            <X className="h-4 w-4 text-red-500" />
          </button>
        </div>
      ) : null}

      {successMessage ? (
        <div className="flex items-center justify-between rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-bold text-emerald-800 shadow-sm">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            <span>{successMessage}</span>
          </div>
          <button type="button" onClick={() => setSuccessMessage("")}>
            <X className="h-4 w-4 text-emerald-600" />
          </button>
        </div>
      ) : null}

      {/* Main Two-Column Layout */}
      <div className="grid gap-6 lg:grid-cols-[340px_minmax(0,1fr)]">
        {/* Left Column: Patient Directory Selector */}
        <aside className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-black text-slate-900">Patients ({patients.length})</h2>
            <span className="text-[10px] font-bold text-slate-400">Select to view</span>
          </div>

          <div className="relative mt-3">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by name or MRN..."
              value={patientSearch}
              onChange={(e) => setPatientSearch(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2 pl-9 pr-3 text-xs font-semibold text-slate-900 outline-none focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-100"
            />
          </div>

          <div className="mt-3.5 max-h-[620px] space-y-2 overflow-y-auto pr-1">
            {filteredPatients.map((p) => {
              const isSelected = p.id === selectedPatientId;
              const fullName = [p.givenName, p.middleName, p.familyName].filter(Boolean).join(" ");
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => {
                    setSelectedPatientId(p.id);
                    setError("");
                    setSuccessMessage("");
                  }}
                  className={`w-full rounded-2xl p-3.5 text-left transition ${
                    isSelected
                      ? "border-2 border-indigo-600 bg-indigo-50/80 shadow-sm"
                      : "border border-slate-100 bg-slate-50/60 hover:border-slate-200 hover:bg-slate-100/70"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="font-black text-xs text-slate-900 line-clamp-1">{fullName}</div>
                    <span className="rounded-md bg-indigo-100/80 px-1.5 py-0.5 text-[9px] font-extrabold text-indigo-700">
                      {p.documents.length} {p.documents.length === 1 ? "report" : "reports"}
                    </span>
                  </div>
                  <div className="mt-1 flex items-center justify-between text-[10px] font-bold text-slate-500">
                    <span>MRN: {p.patientNumber}</span>
                    <span>{p.gender || "Patient"}</span>
                  </div>
                </button>
              );
            })}
            {filteredPatients.length === 0 ? (
              <div className="py-8 text-center text-xs font-semibold text-slate-400">No patients found.</div>
            ) : null}
          </div>
        </aside>

        {/* Right Column: Patient Profile, Reports & History */}
        <main className="space-y-6">
          {selectedPatient ? (
            <>
              {/* Selected Patient Banner Card */}
              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-4">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-700 shadow-sm">
                      <User className="h-7 w-7" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-xl font-black text-slate-900">
                          {[selectedPatient.givenName, selectedPatient.middleName, selectedPatient.familyName]
                            .filter(Boolean)
                            .join(" ")}
                        </h2>
                        <span className="rounded-lg bg-slate-100 px-2 py-0.5 text-[10px] font-extrabold text-slate-600">
                          {selectedPatient.patientNumber}
                        </span>
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-3 text-xs font-bold text-slate-500">
                        {selectedPatient.gender ? <span>Gender: {selectedPatient.gender}</span> : null}
                        {selectedPatient.phoneNumber ? <span>Phone: {selectedPatient.phoneNumber}</span> : null}
                        {selectedPatient.bloodGroup ? (
                          <span className="rounded bg-rose-50 px-1.5 py-0.5 text-rose-700">
                            Blood: {selectedPatient.bloodGroup}
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2.5">
                    <button
                      type="button"
                      onClick={() => {
                        setCredentialsResult(null);
                        setCustomLoginEmail(selectedPatient.phoneNumber ? "" : "");
                        setCustomLoginPassword("");
                        setShowCredentialsModal(true);
                      }}
                      className="inline-flex items-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50 px-3.5 py-2.5 text-xs font-black text-indigo-700 shadow-sm transition hover:bg-indigo-100 active:scale-95"
                    >
                      <User className="h-4 w-4 text-indigo-600" />
                      Patient App Login
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowUploadModal(true)}
                      className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-black text-white shadow-sm transition hover:bg-indigo-700 active:scale-95"
                    >
                      <Plus className="h-4 w-4" />
                      Attach Document
                    </button>
                  </div>
                </div>

                {/* Tabs */}
                <div className="mt-6 flex border-b border-slate-100">
                  <button
                    type="button"
                    onClick={() => setActiveTab("documents")}
                    className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-black transition ${
                      activeTab === "documents"
                        ? "border-indigo-600 text-indigo-600"
                        : "border-transparent text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    <FileText className="h-4 w-4" />
                    Uploaded Reports & Documents ({selectedPatient.documents.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab("consultations")}
                    className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-black transition ${
                      activeTab === "consultations"
                        ? "border-indigo-600 text-indigo-600"
                        : "border-transparent text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    <History className="h-4 w-4" />
                    Consultation History & Notes ({selectedPatient.encounters.length})
                  </button>
                </div>
              </div>

              {/* Tab 1: Documents Management */}
              {activeTab === "documents" ? (
                <div className="space-y-4">
                  {/* Filters & Search */}
                  <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-2">
                      <Filter className="h-4 w-4 text-slate-400" />
                      <select
                        value={docFilterCategory}
                        onChange={(e) => setDocFilterCategory(e.target.value)}
                        className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-800 outline-none focus:border-indigo-500"
                      >
                        <option value="ALL">All Categories</option>
                        <option value="CLINICAL_REPORT">Clinical report</option>
                        <option value="PRESCRIPTION">Prescription</option>
                        <option value="DISCHARGE_SUMMARY">Discharge summary</option>
                        <option value="REFERRAL">Referral</option>
                        <option value="PREVIOUS_MEDICAL_HISTORY">Patient-brought record</option>
                      </select>
                    </div>

                    <div className="relative">
                      <Search className="absolute left-3 top-2 h-3.5 w-3.5 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Search document title..."
                        value={docSearchQuery}
                        onChange={(e) => setDocSearchQuery(e.target.value)}
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 py-1.5 pl-8 pr-3 text-xs font-semibold text-slate-900 outline-none focus:border-indigo-500 sm:w-60"
                      />
                    </div>
                  </div>

                  {/* Documents List */}
                  {filteredDocuments.length > 0 ? (
                    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                      {filteredDocuments.map((doc) => {
                        const badge = getFileCategoryBadge(doc.title, doc.object?.contentType);
                        const DocIcon = badge.icon;
                        const isDeleting = deletingDocId === doc.id;

                        return (
                          <div
                            key={doc.id}
                            className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:shadow-md"
                          >
                            <div>
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                                  <DocIcon className="h-5 w-5" />
                                </div>
                                <span className={`rounded-md border px-2 py-0.5 text-[9px] font-black ${badge.color}`}>
                                  {badge.label}
                                </span>
                              </div>

                              <h3 className="mt-3 font-black text-sm text-slate-900 line-clamp-2" title={doc.title}>
                                {doc.title}
                              </h3>

                              <div className="mt-2 space-y-1 text-[10px] font-bold text-slate-500">
                                <div className="flex items-center gap-1.5">
                                  <Calendar className="h-3 w-3 text-slate-400" />
                                  <span>{formatDate(doc.createdAt)}</span>
                                </div>
                                {doc.object?.sizeBytes ? (
                                  <div className="text-slate-400">Size: {formatBytes(doc.object.sizeBytes)}</div>
                                ) : null}
                                <div className="flex items-center gap-1">
                                  <span className="rounded bg-slate-100 px-1.5 py-0.5 text-slate-600 font-extrabold">
                                    {doc.category.replace(/_/g, " ")}
                                  </span>
                                  <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-emerald-800 font-extrabold">
                                    {doc.status}
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Actions */}
                            <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
                              <a
                                href={`/api/v1/doctor/documents/${doc.id}`}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 text-[11px] font-black text-indigo-600 hover:text-indigo-800"
                              >
                                <Eye className="h-3.5 w-3.5" />
                                View / Open
                              </a>

                              <div className="flex items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingDoc(doc);
                                    setEditTitle(doc.title);
                                    setEditCategory(doc.category);
                                  }}
                                  className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-800"
                                  title="Edit title & category"
                                >
                                  <Edit2 className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  type="button"
                                  disabled={isDeleting}
                                  onClick={() => {
                                    if (confirm(`Are you sure you want to delete "${doc.title}"?`)) {
                                      void handleDeleteDocument(doc.id);
                                    }
                                  }}
                                  className="rounded-lg p-1.5 text-rose-500 hover:bg-rose-50 hover:text-rose-700 disabled:opacity-50"
                                  title="Delete document"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-12 text-center">
                      <FileText className="mx-auto h-10 w-10 text-slate-300" />
                      <p className="mt-3 text-sm font-bold text-slate-700">No documents match the filter</p>
                      <p className="mt-1 text-xs text-slate-400">
                        Upload or paste documents directly using the button above or Ctrl+V.
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                /* Tab 2: Consultation History & Notes */
                <div className="space-y-4">
                  {selectedPatient.encounters.length > 0 ? (
                    <div className="space-y-3">
                      {selectedPatient.encounters.map((enc) => (
                        <div key={enc.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Stethoscope className="h-5 w-5 text-indigo-600" />
                              <span className="font-black text-sm text-slate-900">
                                Consultation on {formatDate(enc.startedAt)}
                              </span>
                            </div>
                            <span className="rounded-lg bg-indigo-50 px-2 py-0.5 text-[10px] font-black text-indigo-700">
                              {enc.status}
                            </span>
                          </div>

                          {enc.clinicalNotes.length > 0 ? (
                            <div className="mt-3 space-y-2 border-t border-slate-100 pt-3">
                              {enc.clinicalNotes.map((note) => (
                                <div key={note.id} className="rounded-xl bg-slate-50 p-3 text-xs">
                                  <span className="font-extrabold text-indigo-700 block">
                                    {note.noteType.replace(/_/g, " ")}:
                                  </span>
                                  <p className="mt-1 font-semibold text-slate-700 whitespace-pre-wrap">
                                    {note.content}
                                  </p>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="mt-2 text-xs text-slate-400 font-semibold">No notes recorded for this visit.</p>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-12 text-center text-sm font-semibold text-slate-500">
                      No past consultation history recorded for this patient.
                    </div>
                  )}
                </div>
              )}
            </>
          ) : (
            <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-16 text-center text-slate-500 font-semibold">
              Select a patient from the list on the left to view their reports and medical history.
            </div>
          )}
        </main>
      </div>

      {/* Upload Document Modal */}
      {showUploadModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-xl rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-lg font-black text-slate-900">Upload & Release Document</h3>
                <p className="text-xs text-slate-500">
                  Directly paste with <kbd className="rounded bg-slate-100 px-1 font-mono font-bold">Ctrl+V</kbd> or drag and drop
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowUploadModal(false);
                  setAttachedFile(null);
                }}
                className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form className="mt-4 space-y-4" onSubmit={(e) => void upload(e)}>
              {/* Patient Selection */}
              <label className="block text-xs font-bold text-slate-700">
                Target Patient
                <select
                  className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2 text-sm font-bold text-slate-900 outline-none focus:border-indigo-500"
                  onChange={(e) => setSelectedPatientId(e.target.value)}
                  required
                  value={selectedPatientId}
                >
                  <option value="">Select patient</option>
                  {patients.map((item) => (
                    <option key={item.id} value={item.id}>
                      {[item.givenName, item.middleName, item.familyName].filter(Boolean).join(" ")} · {item.patientNumber}
                    </option>
                  ))}
                </select>
              </label>

              {/* Title & Category */}
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block text-xs font-bold text-slate-700">
                  Document Title
                  <input
                    className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2 text-sm font-semibold text-slate-900 outline-none focus:border-indigo-500"
                    name="title"
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. CBC Blood Report, Chest X-Ray"
                    required
                    value={title}
                  />
                </label>

                <label className="block text-xs font-bold text-slate-700">
                  Category
                  <select
                    className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2 text-sm font-semibold text-slate-900 outline-none focus:border-indigo-500"
                    name="category"
                    onChange={(e) => setCategory(e.target.value)}
                    value={category}
                  >
                    <option value="CLINICAL_REPORT">Clinical report</option>
                    <option value="PRESCRIPTION">Prescription</option>
                    <option value="DISCHARGE_SUMMARY">Discharge summary</option>
                    <option value="REFERRAL">Referral</option>
                    <option value="PREVIOUS_MEDICAL_HISTORY">Previous medical history</option>
                  </select>
                </label>
              </div>

              {/* Dropzone */}
              <div
                onDragLeave={handleDragLeave}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                className={`relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-6 text-center transition ${
                  isDragging
                    ? "border-indigo-500 bg-indigo-50/80 scale-[1.01]"
                    : attachedFile
                      ? "border-indigo-300 bg-slate-50/80"
                      : "border-slate-300 bg-slate-50/50 hover:border-indigo-400 hover:bg-indigo-50/30"
                }`}
              >
                <input
                  accept={ACCEPTED_EXTENSIONS}
                  className="sr-only"
                  id="modal-file-upload-input"
                  name="file"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) handleSelectedFile(file);
                  }}
                  ref={fileInputRef}
                  type="file"
                />

                {!attachedFile ? (
                  <label
                    htmlFor="modal-file-upload-input"
                    className="flex cursor-pointer flex-col items-center justify-center space-y-2 py-3"
                  >
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-600">
                      <UploadCloud className="h-6 w-6" />
                    </div>
                    <div className="text-xs font-bold text-slate-800">
                      <span className="text-indigo-600 underline">Click to browse</span> or drag and drop
                    </div>
                    <p className="text-[11px] font-semibold text-slate-400">
                      PDF, Word, Excel, PowerPoint, PNG, JPG, Text up to 25 MB
                    </p>
                  </label>
                ) : (
                  <div className="w-full">
                    <div className="flex items-center justify-between gap-3 rounded-xl border border-indigo-200 bg-white p-3">
                      <div className="flex items-center gap-3">
                        {previewUrl ? (
                          <div className="relative h-12 w-12 overflow-hidden rounded-lg border border-slate-200">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img alt="preview" className="h-full w-full object-cover" src={previewUrl} />
                          </div>
                        ) : (
                          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600">
                            <BadgeIcon className="h-5 w-5" />
                          </div>
                        )}
                        <div className="text-left">
                          <p className="font-bold text-xs text-slate-900 line-clamp-1">{attachedFile.name}</p>
                          <p className="text-[10px] text-slate-500">{formatBytes(attachedFile.size)}</p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setAttachedFile(null);
                          if (fileInputRef.current) fileInputRef.current.value = "";
                        }}
                        className="rounded-lg p-1 text-rose-500 hover:bg-rose-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowUploadModal(false);
                    setAttachedFile(null);
                  }}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={busy || !selectedPatientId || !attachedFile}
                  className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2 text-xs font-black text-white shadow-md hover:bg-indigo-700 disabled:opacity-50"
                >
                  {busy ? "Uploading…" : "Upload & Release"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {/* Edit Document Modal */}
      {editingDoc ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-black text-slate-900">Edit Document</h3>
              <button
                type="button"
                onClick={() => setEditingDoc(null)}
                className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 space-y-3">
              <label className="block text-xs font-bold text-slate-700">
                Document Title
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2 text-xs font-semibold text-slate-900 outline-none focus:border-indigo-500"
                />
              </label>

              <label className="block text-xs font-bold text-slate-700">
                Category
                <select
                  value={editCategory}
                  onChange={(e) => setEditCategory(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2 text-xs font-semibold text-slate-900 outline-none focus:border-indigo-500"
                >
                  <option value="CLINICAL_REPORT">Clinical report</option>
                  <option value="PRESCRIPTION">Prescription</option>
                  <option value="DISCHARGE_SUMMARY">Discharge summary</option>
                  <option value="REFERRAL">Referral</option>
                  <option value="PREVIOUS_MEDICAL_HISTORY">Previous medical history</option>
                </select>
              </label>

              <div className="flex items-center justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setEditingDoc(null)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void handleSaveEditDocument()}
                  className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-black text-white hover:bg-indigo-700"
                >
                  {busy ? "Saving…" : "Save Changes"}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {/* Patient App Access & Credentials Modal */}
      {showCredentialsModal && selectedPatient ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/65 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-600">
                  <Smartphone className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">Patient App & Portal Access</h3>
                  <p className="text-xs text-slate-500">
                    Provide{" "}
                    <span className="font-bold text-slate-800">
                      {[selectedPatient.givenName, selectedPatient.middleName, selectedPatient.familyName]
                        .filter(Boolean)
                        .join(" ")}
                    </span>{" "}
                    with real-time app access.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowCredentialsModal(false);
                  setCredentialsResult(null);
                }}
                className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body */}
            {!credentialsResult ? (
              <div className="mt-4 space-y-4">
                <div className="rounded-2xl border border-indigo-100 bg-indigo-50/70 p-4 text-xs text-indigo-950">
                  <div className="flex items-center gap-2 font-black text-indigo-900">
                    <ShieldCheck className="h-4 w-4 text-indigo-600" />
                    How Patient App Works
                  </div>
                  <p className="mt-1 leading-relaxed text-indigo-800 font-medium">
                    Patients can log into their secure portal at{" "}
                    <span className="font-mono font-bold">/patient</span> or download the PWA app on their phone. All
                    prescriptions, clinical reports, scans, and visit history you release will synchronize
                    automatically in their personal app.
                  </p>
                </div>

                <div className="space-y-3 pt-1">
                  <label className="block text-xs font-bold text-slate-700">
                    Login Email (Optional — auto-generated if empty)
                    <input
                      type="email"
                      placeholder="e.g. patient.email@gmail.com"
                      value={customLoginEmail}
                      onChange={(e) => setCustomLoginEmail(e.target.value)}
                      className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2 text-xs font-semibold text-slate-900 outline-none focus:border-indigo-500"
                    />
                  </label>

                  <label className="block text-xs font-bold text-slate-700">
                    Temporary Password (Optional — secure PIN generated if empty)
                    <input
                      type="text"
                      placeholder="e.g. CustomPass@123"
                      value={customLoginPassword}
                      onChange={(e) => setCustomLoginPassword(e.target.value)}
                      className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2 text-xs font-semibold text-slate-900 outline-none focus:border-indigo-500"
                    />
                  </label>
                </div>

                <div className="flex items-center justify-end gap-3 pt-3">
                  <button
                    type="button"
                    onClick={() => setShowCredentialsModal(false)}
                    className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={provisioningBusy}
                    onClick={() => void handleGenerateCredentials(false)}
                    className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2 text-xs font-black text-white shadow-md hover:bg-indigo-700 disabled:opacity-50"
                  >
                    <KeyRound className="h-4 w-4" />
                    {provisioningBusy ? "Generating Credentials…" : "Generate Patient App Access"}
                  </button>
                </div>
              </div>
            ) : (
              /* Generated Credentials Slip */
              <div className="mt-4 space-y-4">
                <div className="rounded-3xl border-2 border-emerald-300 bg-emerald-50/60 p-5 shadow-inner">
                  <div className="flex items-center justify-between border-b border-emerald-200/80 pb-3">
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-wider text-emerald-800">
                        WonFlow Patient Portal Card
                      </span>
                      <h4 className="text-base font-black text-slate-950">{credentialsResult.patientName}</h4>
                    </div>
                    <span className="rounded-lg bg-emerald-200 px-2 py-0.5 text-[10px] font-extrabold text-emerald-900">
                      MRN: {credentialsResult.patientNumber}
                    </span>
                  </div>

                  <div className="mt-3 space-y-2.5">
                    {/* Portal URL */}
                    <div className="flex items-center justify-between rounded-xl bg-white p-2.5 shadow-sm">
                      <div className="text-left">
                        <span className="block text-[9px] font-bold text-slate-400 uppercase">Patient App URL</span>
                        <span className="font-mono text-xs font-black text-indigo-700">
                          {typeof window !== "undefined"
                            ? `${window.location.origin}/patient`
                            : "https://wonflow.com/patient"}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          handleCopy(
                            typeof window !== "undefined"
                              ? `${window.location.origin}/patient`
                              : "https://wonflow.com/patient",
                            "url",
                          )
                        }
                        className="rounded-lg border border-slate-200 bg-slate-50 p-1.5 text-xs font-bold text-slate-700 hover:bg-slate-100"
                        title="Copy App URL"
                      >
                        {copiedKey === "url" ? (
                          <Check className="h-3.5 w-3.5 text-emerald-600" />
                        ) : (
                          <Copy className="h-3.5 w-3.5" />
                        )}
                      </button>
                    </div>

                    {/* Email */}
                    <div className="flex items-center justify-between rounded-xl bg-white p-2.5 shadow-sm">
                      <div className="text-left">
                        <span className="block text-[9px] font-bold text-slate-400 uppercase">Login Email</span>
                        <span className="font-mono text-xs font-black text-slate-900">{credentialsResult.email}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleCopy(credentialsResult.email, "email")}
                        className="rounded-lg border border-slate-200 bg-slate-50 p-1.5 text-xs font-bold text-slate-700 hover:bg-slate-100"
                        title="Copy Email"
                      >
                        {copiedKey === "email" ? (
                          <Check className="h-3.5 w-3.5 text-emerald-600" />
                        ) : (
                          <Copy className="h-3.5 w-3.5" />
                        )}
                      </button>
                    </div>

                    {/* Password */}
                    <div className="flex items-center justify-between rounded-xl bg-white p-2.5 shadow-sm">
                      <div className="text-left">
                        <span className="block text-[9px] font-bold text-slate-400 uppercase">
                          Temporary Login Password
                        </span>
                        <span className="font-mono text-xs font-black text-emerald-700">
                          {credentialsResult.temporaryPassword}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleCopy(credentialsResult.temporaryPassword, "pass")}
                        className="rounded-lg border border-slate-200 bg-slate-50 p-1.5 text-xs font-bold text-slate-700 hover:bg-slate-100"
                        title="Copy Password"
                      >
                        {copiedKey === "pass" ? (
                          <Check className="h-3.5 w-3.5 text-emerald-600" />
                        ) : (
                          <Copy className="h-3.5 w-3.5" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Quick Share & Print Controls */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      const portalLink =
                        typeof window !== "undefined"
                          ? `${window.location.origin}/patient`
                          : "https://wonflow.com/patient";
                      const text = `WonFlow Patient App Login:\nPatient: ${credentialsResult.patientName} (${credentialsResult.patientNumber})\nPortal: ${portalLink}\nEmail: ${credentialsResult.email}\nPassword: ${credentialsResult.temporaryPassword}`;
                      handleCopy(text, "all");
                    }}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-indigo-200 bg-indigo-50 px-3.5 py-2 text-xs font-bold text-indigo-700 hover:bg-indigo-100"
                  >
                    {copiedKey === "all" ? (
                      <Check className="h-3.5 w-3.5 text-emerald-600" />
                    ) : (
                      <Share2 className="h-3.5 w-3.5" />
                    )}
                    {copiedKey === "all" ? "Copied to Clipboard!" : "Copy Full Login Slip"}
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => window.print()}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100"
                    >
                      <Printer className="h-3.5 w-3.5" />
                      Print Card
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setShowCredentialsModal(false);
                        setCredentialsResult(null);
                      }}
                      className="rounded-xl bg-slate-900 px-4 py-2 text-xs font-black text-white hover:bg-slate-800"
                    >
                      Done
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
