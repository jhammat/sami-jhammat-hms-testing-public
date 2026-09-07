import QRCode from "qrcode";

export type TicketPrintFormat = "thermal" | "pdf";

export interface TicketSlipPatient {
  fullName: string;
  mrNumber: string;
  mobile?: string | null;
  gender?: string | null;
  ageDisplay?: string | null;
  identityType?: string | null;
  identityNumber?: string | null;
  email?: string | null;
}

export interface TicketSlipDoctor {
  name: string;
  specialty?: string | null;
  roomLabel?: string | null;
}

export interface TicketSlipServiceItem {
  name: string;
  price?: number;
  quantity?: number;
}

export interface TicketSlipPayment {
  subtotal: number;
  discount: number;
  totalPayable: number;
  amountReceived: number;
  changeReturned: number;
  balance: number;
  paymentMethod: string;
  status: "Paid" | "Partially Paid" | "Unpaid";
  receiptDate?: string;
  notes?: string | null;
}

export interface TicketSlipPortalAccess {
  portalUrl?: string | null;
  loginIdentifier?: string | null;
  temporaryPassword?: string | null;
  isNewlyCreated?: boolean;
  videoCallUrl?: string | null;
}

export interface TicketSlipData {
  hospitalName: string;
  branchName?: string | null;
  hospitalLogoUrl?: string | null;
  hospitalPhone?: string | null;
  hospitalAddress?: string | null;

  tokenNumber: string;
  queuePosition?: number | null;
  estimatedWaitMinutes?: number | null;
  priorityLabel?: string | null; // "Standard", "Urgent", "Emergency", "Priority"

  appointmentDate: string;
  appointmentTime: string;

  patient: TicketSlipPatient;
  doctor: TicketSlipDoctor;

  visitPurpose: string;
  consultationReason?: string | null;
  consultationMode?: "IN_PERSON" | "ONLINE";
  routeDestination?: string | null;

  services?: TicketSlipServiceItem[];
  payment?: TicketSlipPayment | null;
  portalAccess?: TicketSlipPortalAccess | null;
}

function escapeHtml(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function formatPkr(amount: number): string {
  return "PKR " + Math.round(amount).toLocaleString("en-PK");
}

/**
 * Builds the canonical patient portal target URL for the QR code.
 * Scanning with any phone camera takes the patient directly to their portal dashboard,
 * live queue tracker, or online video consultation room.
 */
export function buildPatientPortalUrl(data: TicketSlipData, origin: string): string {
  if (data.consultationMode === "ONLINE" && data.portalAccess?.videoCallUrl) {
    return `${origin}${data.portalAccess.videoCallUrl}`;
  }

  const searchParams = new URLSearchParams();
  if (data.patient.mrNumber) {
    searchParams.set("mrn", data.patient.mrNumber);
  }
  if (data.tokenNumber) {
    searchParams.set("token", data.tokenNumber);
  }

  const query = searchParams.toString();
  return `${origin}/patient${query ? `?${query}` : ""}`;
}

/**
 * Generates the complete HTML for the interactive print preview and printable document.
 */
export async function generateTicketSlipHtml(
  data: TicketSlipData,
  initialFormat: TicketPrintFormat = "thermal",
  origin: string = typeof window !== "undefined" ? window.location.origin : "",
): Promise<string> {
  const portalUrl = buildPatientPortalUrl(data, origin);

  const qrDataUrl = await QRCode.toDataURL(portalUrl, {
    width: 240,
    margin: 1,
    errorCorrectionLevel: "M",
    color: {
      dark: "#0f172a",
      light: "#ffffff",
    },
  });

  const hospitalDisplayName = data.hospitalName?.trim() || "Hospital Care";
  const branchDisplayName = data.branchName?.trim() || "OPD & Clinical Services";
  const tokenNum = data.tokenNumber || "01";
  const priority = data.priorityLabel?.trim() || "Standard";
  const isUrgent = /emergency|urgent/i.test(priority);
  const queuePos = data.queuePosition != null ? String(data.queuePosition) : "1";
  const waitMins = data.estimatedWaitMinutes != null ? `${data.estimatedWaitMinutes} mins` : "—";
  const servicesList = data.services && data.services.length > 0
    ? data.services
    : [{ name: "General OPD Consultation", price: data.payment?.totalPayable ?? 0 }];

  // Clean vector hospital cross crest for fallback when no custom logo is uploaded
  const hospitalCrestSvg = `
    <svg viewBox="0 0 48 48" width="42" height="42" fill="none" xmlns="http://www.w3.org/2000/svg" style="display:inline-block;vertical-align:middle;">
      <rect width="48" height="48" rx="12" fill="#0f172a"/>
      <path d="M24 11v26M11 24h26" stroke="#ffffff" stroke-width="4.5" stroke-linecap="round"/>
      <circle cx="24" cy="24" r="16" stroke="#ffffff" stroke-width="1.5" stroke-opacity="0.25"/>
    </svg>
  `;

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${escapeHtml(hospitalDisplayName)} — Token #${escapeHtml(tokenNum)}</title>
    <style>
      * {
        box-sizing: border-box;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
        color-adjust: exact !important;
      }
      body {
        margin: 0;
        padding: 0;
        background: #f1f5f9;
        color: #0f172a;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
        -webkit-font-smoothing: antialiased;
      }

      /* Top interactive format toolbar - Hidden when printing */
      .no-print-toolbar {
        position: sticky;
        top: 0;
        z-index: 999;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        padding: 10px 18px;
        background: #0f172a;
        color: #fff;
        box-shadow: 0 4px 20px rgba(0,0,0,0.15);
      }
      .toolbar-left {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 12px;
        font-weight: 700;
        letter-spacing: 0.5px;
      }
      .toolbar-right {
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .btn-mode {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 6px 14px;
        border-radius: 8px;
        border: 1px solid rgba(255,255,255,0.2);
        background: rgba(255,255,255,0.08);
        color: #e2e8f0;
        font-size: 11px;
        font-weight: 700;
        cursor: pointer;
        transition: all 0.15s ease;
      }
      .btn-mode:hover {
        background: rgba(255,255,255,0.16);
        color: #fff;
      }
      .btn-mode.active {
        background: #3b82f6;
        border-color: #60a5fa;
        color: #fff;
        box-shadow: 0 2px 8px rgba(59,130,246,0.35);
      }
      .btn-print {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 6px 16px;
        border-radius: 8px;
        border: none;
        background: #10b981;
        color: #fff;
        font-size: 12px;
        font-weight: 800;
        cursor: pointer;
        box-shadow: 0 2px 8px rgba(16,185,129,0.35);
      }
      .btn-print:hover {
        background: #059669;
      }
      .btn-close {
        padding: 6px 12px;
        border-radius: 8px;
        border: 1px solid rgba(255,255,255,0.2);
        background: transparent;
        color: #cbd5e1;
        font-size: 11px;
        cursor: pointer;
      }

      .preview-wrap {
        padding: 24px 16px 40px;
        display: flex;
        justify-content: center;
      }

      /* ==============================================================
         COMMON SHARED CONTENT STYLES
         ============================================================== */
      .hosp-header {
        text-align: center;
      }
      .hosp-logo {
        max-height: 46px;
        max-width: 180px;
        object-fit: contain;
        display: block;
        margin: 0 auto 6px;
      }
      .hosp-title {
        font-size: 15px;
        font-weight: 900;
        letter-spacing: 0.6px;
        text-transform: uppercase;
        color: #0f172a;
        margin: 0;
      }
      .hosp-sub {
        font-size: 10px;
        font-weight: 700;
        color: #475569;
        letter-spacing: 0.8px;
        text-transform: uppercase;
        margin-top: 2px;
      }
      .doc-badge {
        display: inline-block;
        font-size: 9px;
        font-weight: 800;
        letter-spacing: 1px;
        text-transform: uppercase;
        color: #1e293b;
        background: #e2e8f0;
        padding: 2px 8px;
        border-radius: 4px;
        margin-top: 5px;
      }

      .token-hero {
        text-align: center;
        border-radius: 10px;
      }
      .token-caption {
        font-size: 9px;
        font-weight: 800;
        letter-spacing: 1.2px;
        text-transform: uppercase;
        color: #475569;
      }
      .token-number {
        font-size: 42px;
        font-weight: 900;
        font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
        letter-spacing: -1px;
        line-height: 1;
        margin: 4px 0;
        color: #0f172a;
      }
      .token-meta {
        font-size: 11px;
        font-weight: 700;
      }

      .priority-badge {
        display: inline-block;
        padding: 2px 8px;
        border-radius: 12px;
        font-size: 9px;
        font-weight: 800;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }
      .priority-urgent {
        background: #ffe4e6;
        color: #be123c;
        border: 1px solid #fecdd3;
      }
      .priority-standard {
        background: #f1f5f9;
        color: #334155;
        border: 1px solid #cbd5e1;
      }

      .key-val-row {
        display: flex;
        justify-content: space-between;
        align-items: baseline;
        margin-bottom: 5px;
        font-size: 11px;
      }
      .key-val-row:last-child {
        margin-bottom: 0;
      }
      .key-lbl {
        color: #64748b;
        font-weight: 600;
      }
      .key-val {
        font-weight: 700;
        color: #0f172a;
        text-align: right;
      }
      .key-val.mono {
        font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      }
      .key-val.highlight {
        color: #1d4ed8;
      }

      .qr-block {
        text-align: center;
        padding: 10px;
        border-radius: 10px;
      }
      .qr-img {
        width: 125px;
        height: 125px;
        display: block;
        margin: 0 auto;
      }
      .qr-title {
        font-size: 10px;
        font-weight: 800;
        color: #0f172a;
        margin-top: 6px;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }
      .qr-sub {
        font-size: 9px;
        font-weight: 600;
        color: #64748b;
        margin-top: 2px;
      }

      .charges-table {
        width: 100%;
        border-collapse: collapse;
        font-size: 11px;
      }
      .charges-table th {
        text-align: left;
        padding: 4px 0;
        font-size: 9px;
        text-transform: uppercase;
        color: #64748b;
        border-bottom: 1px solid #cbd5e1;
      }
      .charges-table td {
        padding: 5px 0;
        border-bottom: 1px dashed #e2e8f0;
      }
      .charges-table tr:last-child td {
        border-bottom: none;
      }

      .portal-box {
        background: #f8fafc;
        border: 1px solid #cbd5e1;
        border-radius: 8px;
        padding: 8px 10px;
        font-size: 10px;
      }

      .wf-micro-footer {
        text-align: center;
        font-size: 8px;
        color: #94a3b8;
        letter-spacing: 0.3px;
        margin-top: 8px;
      }

      /* ==============================================================
         MODE 1: THERMAL 80MM ROLL FORMAT
         ============================================================== */
      .format-thermal .ticket-root {
        width: 76mm;
        max-width: 76mm;
        margin: 0 auto;
        padding: 12px 10px;
        background: #fff;
        border: 1px solid #cbd5e1;
        border-radius: 6px;
        box-shadow: 0 4px 18px rgba(0,0,0,0.06);
        font-size: 11px;
      }
      .format-thermal .dashed-div {
        border-bottom: 1px dashed #64748b;
        margin: 8px 0;
      }
      .format-thermal .double-div {
        border-bottom: 2px solid #0f172a;
        margin: 8px 0;
      }
      .format-thermal .token-hero {
        background: #f8fafc;
        border: 1.5px solid #0f172a;
        padding: 8px 6px;
      }
      .format-thermal .token-number {
        font-size: 38px;
      }
      .format-thermal .room-banner {
        text-align: center;
        background: #0f172a;
        color: #fff;
        padding: 4px 6px;
        border-radius: 4px;
        font-size: 12px;
        font-weight: 800;
        letter-spacing: 0.6px;
        margin: 6px 0;
      }
      .format-thermal .qr-img {
        width: 115px;
        height: 115px;
      }

      /* ==============================================================
         MODE 2: EXECUTIVE SLIP / PDF (A4 / A5 LETTERHEAD)
         ============================================================== */
      .format-pdf .ticket-root {
        width: 100%;
        max-width: 680px;
        margin: 0 auto;
        padding: 24px 28px;
        background: #fff;
        border: 1px solid #cbd5e1;
        border-radius: 12px;
        box-shadow: 0 8px 30px rgba(0,0,0,0.08);
      }
      .format-pdf .hosp-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        text-align: left;
        border-bottom: 2px solid #0f172a;
        padding-bottom: 16px;
      }
      .format-pdf .hosp-logo {
        margin: 0 0 6px 0;
      }
      .format-pdf .pdf-header-left {
        flex: 1;
      }
      .format-pdf .pdf-header-right {
        text-align: right;
        min-width: 180px;
      }
      .format-pdf .pdf-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 18px;
        margin: 18px 0;
      }
      .format-pdf .pdf-card {
        border: 1px solid #e2e8f0;
        border-radius: 10px;
        padding: 12px 14px;
        background: #ffffff;
      }
      .format-pdf .pdf-card-title {
        font-size: 10px;
        font-weight: 800;
        text-transform: uppercase;
        letter-spacing: 0.8px;
        color: #475569;
        border-bottom: 1px solid #f1f5f9;
        padding-bottom: 6px;
        margin-bottom: 8px;
      }
      .format-pdf .room-banner {
        background: #eef2ff;
        border: 1px solid #c7d2fe;
        color: #1e1b4b;
        padding: 8px 12px;
        border-radius: 8px;
        font-size: 13px;
        font-weight: 800;
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 12px;
      }
      .format-pdf .payment-summary-box {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 10px;
        background: #f8fafc;
        border: 1px solid #e2e8f0;
        border-radius: 10px;
        padding: 12px;
        margin-top: 14px;
        font-size: 11px;
      }
      .format-pdf .payment-summary-box div small {
        display: block;
        color: #64748b;
        font-size: 9px;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }
      .format-pdf .payment-summary-box div strong {
        display: block;
        margin-top: 4px;
        font-size: 13px;
        font-weight: 800;
        color: #0f172a;
      }
      .format-pdf .dashed-div {
        display: none;
      }
      .format-pdf .double-div {
        display: none;
      }

      /* ==============================================================
         PRINT MEDIA RULES
         ============================================================== */
      @media print {
        .no-print-toolbar {
          display: none !important;
        }
        body {
          background: #ffffff !important;
          padding: 0 !important;
          margin: 0 !important;
        }
        .preview-wrap {
          padding: 0 !important;
          margin: 0 !important;
        }

        /* Thermal Print Sizing */
        .format-thermal {
          width: 76mm !important;
          margin: 0 auto !important;
        }
        .format-thermal .ticket-root {
          width: 76mm !important;
          max-width: 76mm !important;
          margin: 0 auto !important;
          border: none !important;
          box-shadow: none !important;
          padding: 2mm !important;
        }

        /* PDF / Slip Print Sizing */
        .format-pdf .ticket-root {
          max-width: 100% !important;
          border: 1px solid #94a3b8 !important;
          box-shadow: none !important;
          border-radius: 6px !important;
          padding: 16px 20px !important;
        }
      }
    </style>
  </head>
  <body class="format-${initialFormat}">
    <!-- Interactive Top Switcher Bar (Hidden during Print) -->
    <header class="no-print-toolbar">
      <div class="toolbar-left">
        <span>Print Preview:</span>
        <button id="btn-thermal" type="button" class="btn-mode ${initialFormat === "thermal" ? "active" : ""}" onclick="switchFormat('thermal')">
          🧾 Thermal (80mm)
        </button>
        <button id="btn-pdf" type="button" class="btn-mode ${initialFormat === "pdf" ? "active" : ""}" onclick="switchFormat('pdf')">
          📄 Executive Slip / PDF
        </button>
      </div>
      <div class="toolbar-right">
        <button type="button" class="btn-print" onclick="window.print()">
          🖨️ Print Slip Now
        </button>
        <button type="button" class="btn-close" onclick="window.close()">
          ✕ Close
        </button>
      </div>
    </header>

    <div class="preview-wrap">
      <article class="ticket-root">
        <!-- HEADER SECTION (HOSPITAL BRANDING FIRST) -->
        <header class="hosp-header">
          <div class="pdf-header-left">
            ${data.hospitalLogoUrl
              ? `<img class="hosp-logo" src="${escapeHtml(data.hospitalLogoUrl)}" alt="${escapeHtml(hospitalDisplayName)}" onerror="this.style.display='none'" />`
              : `<div style="margin-bottom:6px;">${hospitalCrestSvg}</div>`
            }
            <h1 class="hosp-title">${escapeHtml(hospitalDisplayName)}</h1>
            <div class="hosp-sub">${escapeHtml(branchDisplayName)}</div>
            <div class="doc-badge">OPD Consultation Token &amp; Receipt</div>
          </div>
          <div class="pdf-header-right" style="display:none;" id="pdf-header-token">
            <div class="token-caption">Queue Token</div>
            <div class="token-number" style="font-size:32px;">#${escapeHtml(tokenNum)}</div>
            <div style="font-size:10px;font-weight:700;color:#64748b;">
              ${escapeHtml(data.appointmentDate)} · ${escapeHtml(data.appointmentTime)}
            </div>
          </div>
        </header>

        <div class="double-div"></div>

        <!-- TOKEN HERO CALLOUT (PROMINENT QUEUE TOKEN NUMBER) -->
        <section class="token-hero">
          <div class="token-caption">Live Queue Token Number</div>
          <div class="token-number">#${escapeHtml(tokenNum)}</div>
          <div class="token-meta">
            <span class="priority-badge ${isUrgent ? "priority-urgent" : "priority-standard"}">
              ${escapeHtml(priority)} Visit
            </span>
            <span style="margin-left: 6px; color:#475569;">
              Queue Pos: <strong>#${escapeHtml(queuePos)}</strong> · Est. Wait: <strong>${escapeHtml(waitMins)}</strong>
            </span>
          </div>
        </section>

        <!-- ASSIGNED ROOM / CLINIC BANNER -->
        <div class="room-banner">
          <span>ASSIGNED: ${escapeHtml(data.doctor.roomLabel ? `ROOM ${data.doctor.roomLabel.toUpperCase()}` : "OPD CONSULTATION COUNTER")}</span>
          <span style="font-size:10px;opacity:0.85;">${escapeHtml(data.consultationMode === "ONLINE" ? "🎥 ONLINE" : "🏥 IN-PERSON")}</span>
        </div>

        <div class="dashed-div"></div>

        <!-- MAIN CONTENT (DUAL-MODE WRAPPER) -->
        <div class="pdf-grid">
          <!-- PATIENT & VISIT DETAILS -->
          <section class="pdf-card">
            <div class="pdf-card-title">Patient Demographics</div>
            <div class="key-val-row">
              <span class="key-lbl">Patient Name:</span>
              <span class="key-val">${escapeHtml(data.patient.fullName)}</span>
            </div>
            <div class="key-val-row">
              <span class="key-lbl">MRN:</span>
              <span class="key-val mono highlight">${escapeHtml(data.patient.mrNumber)}</span>
            </div>
            ${data.patient.mobile ? `
            <div class="key-val-row">
              <span class="key-lbl">Phone:</span>
              <span class="key-val">${escapeHtml(data.patient.mobile)}</span>
            </div>` : ""}
            ${data.patient.identityNumber ? `
            <div class="key-val-row">
              <span class="key-lbl">${escapeHtml(data.patient.identityType || "Identity")}:</span>
              <span class="key-val mono">${escapeHtml(data.patient.identityNumber)}</span>
            </div>` : ""}
            ${(data.patient.ageDisplay || data.patient.gender) ? `
            <div class="key-val-row">
              <span class="key-lbl">Age / Sex:</span>
              <span class="key-val">${escapeHtml([data.patient.ageDisplay, data.patient.gender].filter(Boolean).join(" · "))}</span>
            </div>` : ""}
          </section>

          <!-- DOCTOR & APPOINTMENT DETAILS -->
          <section class="pdf-card">
            <div class="pdf-card-title">Consultation Details</div>
            <div class="key-val-row">
              <span class="key-lbl">Clinician:</span>
              <span class="key-val">${escapeHtml(data.doctor.name)}</span>
            </div>
            <div class="key-val-row">
              <span class="key-lbl">Specialty:</span>
              <span class="key-val">${escapeHtml(data.doctor.specialty || "General Medicine")}</span>
            </div>
            <div class="key-val-row">
              <span class="key-lbl">Schedule:</span>
              <span class="key-val">${escapeHtml(data.appointmentDate)} · ${escapeHtml(data.appointmentTime)}</span>
            </div>
            <div class="key-val-row">
              <span class="key-lbl">Purpose:</span>
              <span class="key-val">${escapeHtml(data.visitPurpose)}</span>
            </div>
            ${data.consultationReason ? `
            <div class="key-val-row">
              <span class="key-lbl">Reason:</span>
              <span class="key-val">${escapeHtml(data.consultationReason)}</span>
            </div>` : ""}
          </section>
        </div>

        <div class="dashed-div"></div>

        <!-- PATIENT PORTAL ACCESS BOX (IF APPLICABLE) -->
        ${data.portalAccess ? `
        <section class="portal-box" style="margin-bottom: 8px;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 4px;">
            <strong style="color: #1e3a8a; font-size: 10px;">🌐 Patient Portal Access</strong>
            <span style="font-size: 8px; font-weight:800; background: #e0e7ff; color: #3730a3; padding: 1px 6px; border-radius: 4px;">
              ${data.portalAccess.isNewlyCreated ? "New Account Created" : "Active Portal"}
            </span>
          </div>
          <div style="display:grid; grid-template-columns: 1fr 1fr; gap: 4px; font-size: 10px;">
            <div><span class="key-lbl">Portal URL:</span> <strong>${escapeHtml(origin + "/patient")}</strong></div>
            <div><span class="key-lbl">User ID:</span> <strong>${escapeHtml(data.portalAccess.loginIdentifier || data.patient.email || data.patient.mrNumber)}</strong></div>
            ${data.portalAccess.temporaryPassword ? `<div><span class="key-lbl">Temp Password:</span> <strong class="mono" style="color:#0f172a;background:#e2e8f0;padding:1px 4px;border-radius:3px;">${escapeHtml(data.portalAccess.temporaryPassword)}</strong></div>` : ""}
            <div><span class="key-lbl">Mode:</span> <strong>${data.consultationMode === "ONLINE" ? "🎥 Online Video" : "🏥 In-Person"}</strong></div>
          </div>
          ${data.consultationMode === "ONLINE" && data.portalAccess.videoCallUrl ? `
          <div style="margin-top: 5px; padding-top: 4px; border-top: 1px dashed #cbd5e1; font-size: 9px; color: #1e3a8a;">
            <strong>🎥 Direct Video Call Room:</strong> ${escapeHtml(origin + data.portalAccess.videoCallUrl)}
          </div>` : ""}
        </section>` : ""}

        <div class="dashed-div"></div>

        <!-- CHARGES & PAYMENT SUMMARY -->
        <section>
          <div style="font-size:10px;font-weight:800;text-transform:uppercase;color:#475569;margin-bottom:4px;letter-spacing:0.5px;">
            Itemized Services &amp; Payment Receipt
          </div>
          <table class="charges-table">
            <thead>
              <tr>
                <th>Description</th>
                <th style="text-align:right;">Fee</th>
              </tr>
            </thead>
            <tbody>
              ${servicesList.map((s) => `
                <tr>
                  <td>${escapeHtml(s.name)}${s.quantity && s.quantity > 1 ? ` &times; ${s.quantity}` : ""}</td>
                  <td style="text-align:right;font-weight:700;">${formatPkr(s.price ?? 0)}</td>
                </tr>
              `).join("")}
            </tbody>
          </table>

          <div style="margin-top: 6px; font-size: 11px;">
            <div class="key-val-row">
              <span class="key-lbl">Subtotal:</span>
              <span class="key-val">${formatPkr(data.payment?.subtotal ?? (data.payment?.totalPayable ?? 0))}</span>
            </div>
            ${(data.payment?.discount ?? 0) > 0 ? `
            <div class="key-val-row" style="color: #059669;">
              <span class="key-lbl" style="color: #059669;">Discount:</span>
              <span class="key-val" style="color: #059669;">-${formatPkr(data.payment?.discount ?? 0)}</span>
            </div>` : ""}
            <div class="key-val-row" style="font-size: 12px; font-weight: 800; border-top: 1px dashed #94a3b8; padding-top: 4px; margin-top: 4px;">
              <span>Total Payable:</span>
              <span class="highlight">${formatPkr(data.payment?.totalPayable ?? 0)}</span>
            </div>
            <div class="key-val-row">
              <span class="key-lbl">Amount Received:</span>
              <span class="key-val">${formatPkr(data.payment?.amountReceived ?? (data.payment?.totalPayable ?? 0))}</span>
            </div>
            ${(data.payment?.balance ?? 0) > 0 ? `
            <div class="key-val-row" style="color: #dc2626;">
              <span class="key-lbl" style="color: #dc2626;">Remaining Balance:</span>
              <span class="key-val" style="color: #dc2626;">${formatPkr(data.payment?.balance ?? 0)}</span>
            </div>` : ""}
            <div class="key-val-row">
              <span class="key-lbl">Payment Status:</span>
              <span class="key-val" style="color:${data.payment?.status === "Paid" ? "#059669" : "#d97706"};text-transform:uppercase;">
                ${escapeHtml(data.payment?.status || "Paid")} (${escapeHtml(data.payment?.paymentMethod || "Cash")})
              </span>
            </div>
          </div>
        </section>

        <div class="dashed-div"></div>

        <!-- QR CODE TO PATIENT PORTAL -->
        <section class="qr-block">
          <img class="qr-img" src="${qrDataUrl}" alt="Patient Portal QR Code" />
          <div class="qr-title">Scan for Live Queue &amp; Patient Portal</div>
          <div class="qr-sub">Scan with phone camera to track live waiting time &amp; lab reports</div>
        </section>

        <div class="double-div"></div>

        <!-- HOSPITAL INSTRUCTIONS -->
        <div style="font-size: 9px; color: #475569; text-align: center; line-height: 1.4; margin-top: 6px;">
          Please retain this token for check-in and consult routing. When your token is called on the display board, proceed to Room ${escapeHtml(data.doctor.roomLabel || "OPD Desk")}.
        </div>

        <!-- SUBTLE MINIMAL WONFLOW BRANDING FOOTER (AVOIDABLE MICRO-LINK) -->
        <div class="wf-micro-footer">
          Powered by WonFlow Health Systems
        </div>
      </article>
    </div>

    <script>
      function switchFormat(mode) {
        document.body.className = 'format-' + mode;
        var btnThermal = document.getElementById('btn-thermal');
        var btnPdf = document.getElementById('btn-pdf');
        var pdfToken = document.getElementById('pdf-header-token');

        if (mode === 'thermal') {
          btnThermal.className = 'btn-mode active';
          btnPdf.className = 'btn-mode';
          if (pdfToken) pdfToken.style.display = 'none';
        } else {
          btnThermal.className = 'btn-mode';
          btnPdf.className = 'btn-mode active';
          if (pdfToken) pdfToken.style.display = 'block';
        }
      }

      // If initial format is pdf, ensure header styling reflects it
      if (document.body.classList.contains('format-pdf')) {
        var pdfToken = document.getElementById('pdf-header-token');
        if (pdfToken) pdfToken.style.display = 'block';
      }
    </script>
  </body>
</html>`;
}

/**
 * Triggers printing of the token slip using a high-fidelity popup preview window
 * with fallback to an in-page hidden iframe.
 */
export async function printTicketSlip(
  data: TicketSlipData,
  preferredFormat: TicketPrintFormat = "thermal",
): Promise<void> {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const html = await generateTicketSlipHtml(data, preferredFormat, origin);

  // Try opening dedicated print window with interactive switcher
  const win = window.open("", "_blank", "width=820,height=920,menubar=no,toolbar=no,status=no");
  if (win) {
    win.document.open();
    win.document.write(html);
    win.document.close();
    win.focus();
    return;
  }

  // Fallback to hidden iframe if popups are blocked by user browser
  let iframe = document.getElementById("wonflow-token-print-frame") as HTMLIFrameElement | null;
  if (iframe) {
    iframe.remove();
  }
  iframe = document.createElement("iframe");
  iframe.id = "wonflow-token-print-frame";
  iframe.style.position = "fixed";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "none";
  iframe.style.opacity = "0";
  iframe.style.pointerEvents = "none";
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document;
  if (doc) {
    doc.open();
    doc.write(html);
    doc.close();
    setTimeout(() => {
      iframe?.contentWindow?.focus();
      iframe?.contentWindow?.print();
    }, 250);
  }
}
