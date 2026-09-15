/**
 * A printable prescription slip for the patient portal.
 *
 * Patients could read a prescription on screen and had no way to take it with
 * them — no copy for the pharmacy counter, nothing to file, nothing to show a
 * clinician elsewhere. This renders the same prescription as a clean A5 sheet
 * and hands it to the browser's print dialog, whose "Save as PDF" destination
 * is how every other printable in this app (the token slip, the pharmacy
 * receipt, the laboratory report) produces a PDF.
 *
 * Deliberately built from the data already on the page rather than a fresh
 * request: the slip must say exactly what the patient was looking at.
 */

export interface PrescriptionSlipItem {
  name: string;
  genericName?: string | null;
  strength?: string | null;
  dose?: string | null;
  frequency?: string | null;
  duration?: string | null;
  route?: string | null;
  quantity?: string | null;
  instructions?: string | null;
}

export interface PrescriptionSlipData {
  hospitalName: string;
  prescriptionId: string;
  prescribedAt: string;
  status: string;
  doctorName?: string | null;
  patientName: string;
  patientNumber: string;
  items: PrescriptionSlipItem[];
  instructions?: string | null;
}

/** HTML-escapes text before it is written into the slip markup. */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

const row = (label: string, value: string) =>
  `<div class="row"><span class="label">${escapeHtml(label)}</span><span class="value">${escapeHtml(value)}</span></div>`;

function renderItem(item: PrescriptionSlipItem, index: number): string {
  const detail = [item.dose, item.frequency, item.duration, item.route]
    .filter((entry): entry is string => Boolean(entry && entry.trim()))
    .map((entry) => `<span class="chip">${escapeHtml(entry)}</span>`)
    .join("");

  const heading = [item.name, item.strength].filter(Boolean).join(" ");
  const generic =
    item.genericName && item.genericName !== item.name
      ? `<div class="generic">${escapeHtml(item.genericName)}</div>`
      : "";

  return `
    <li class="item">
      <div class="item-head">
        <span class="item-name">${index + 1}. ${escapeHtml(heading)}</span>
        ${item.quantity ? `<span class="qty">Qty: ${escapeHtml(item.quantity)}</span>` : ""}
      </div>
      ${generic}
      ${detail ? `<div class="chips">${detail}</div>` : ""}
      ${item.instructions ? `<div class="note">${escapeHtml(item.instructions)}</div>` : ""}
    </li>`;
}

export function generatePrescriptionSlipHtml(data: PrescriptionSlipData, autoPrint: boolean): string {
  const items = data.items.map(renderItem).join("");

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Prescription ${escapeHtml(data.patientNumber)} — ${escapeHtml(data.patientName)}</title>
<style>
  @page { size: A5; margin: 12mm; }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    font-family: ui-sans-serif, system-ui, "Segoe UI", Roboto, Arial, sans-serif;
    color: #0f172a;
    background: #f8fafc;
    padding: 16px;
  }
  .sheet {
    max-width: 148mm;
    margin: 0 auto;
    background: #fff;
    border: 1px solid #e2e8f0;
    border-radius: 10px;
    padding: 20px 22px;
  }
  h1 { font-size: 16px; margin: 0; letter-spacing: -0.01em; }
  .sub { font-size: 11px; color: #64748b; margin-top: 2px; }
  .rule { border-top: 1px solid #e2e8f0; margin: 14px 0; }
  .row { display: flex; justify-content: space-between; gap: 12px; font-size: 11px; padding: 2px 0; }
  .label { color: #64748b; }
  .value { font-weight: 700; text-align: right; }
  ul { list-style: none; margin: 0; padding: 0; }
  .item { border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px 12px; margin-bottom: 8px; }
  .item-head { display: flex; justify-content: space-between; gap: 10px; align-items: baseline; }
  .item-name { font-weight: 800; font-size: 12.5px; }
  .qty { font-size: 11px; font-weight: 700; color: #7e22ce; white-space: nowrap; }
  .generic { font-size: 10.5px; color: #64748b; margin-top: 1px; }
  .chips { margin-top: 6px; display: flex; flex-wrap: wrap; gap: 5px; }
  .chip { border: 1px solid #e9d5ff; background: #faf5ff; color: #6b21a8; border-radius: 6px; padding: 2px 7px; font-size: 10.5px; font-weight: 700; }
  .note { margin-top: 6px; font-size: 10.5px; font-style: italic; color: #475569; }
  .instructions { margin-top: 12px; border: 1px solid #e9d5ff; background: #faf5ff; border-radius: 8px; padding: 10px 12px; font-size: 11px; line-height: 1.5; }
  .instructions b { color: #6b21a8; }
  .foot { margin-top: 16px; font-size: 9.5px; color: #94a3b8; line-height: 1.5; }
  .actions { max-width: 148mm; margin: 0 auto 12px; display: flex; gap: 8px; }
  .actions button {
    font: inherit; font-size: 12px; font-weight: 700; cursor: pointer;
    border-radius: 8px; padding: 8px 14px; border: 1px solid #c4b5fd; background: #7c3aed; color: #fff;
  }
  .actions .ghost { background: #fff; color: #4c1d95; }
  .hint { max-width: 148mm; margin: 0 auto 10px; font-size: 11px; color: #475569; }
  @media print { .actions, .hint { display: none !important; } body { background: #fff; padding: 0; } .sheet { border: none; border-radius: 0; padding: 0; } }
</style>
</head>
<body>
  <div class="hint">To save this as a PDF, choose <b>Save as PDF</b> as the destination in the print dialog.</div>
  <div class="actions">
    <button type="button" onclick="window.print()">Print / Save as PDF</button>
    <button type="button" class="ghost" onclick="window.close()">Close</button>
  </div>

  <div class="sheet">
    <h1>${escapeHtml(data.hospitalName)}</h1>
    <div class="sub">Prescription record</div>
    <div class="rule"></div>

    ${row("Patient", data.patientName)}
    ${row("MR number", data.patientNumber)}
    ${row("Prescribed by", data.doctorName || "Hospital clinical team")}
    ${row("Date", data.prescribedAt)}
    ${row("Status", data.status)}

    <div class="rule"></div>
    <ul>${items}</ul>

    ${
      data.instructions
        ? `<div class="instructions"><b>Doctor instructions:</b> ${escapeHtml(data.instructions)}</div>`
        : ""
    }

    <div class="foot">
      Reference ${escapeHtml(data.prescriptionId)}.<br />
      This is a patient copy of a prescription held in the hospital record. Take medicines only as directed.
    </div>
  </div>
  ${autoPrint ? "<script>window.addEventListener('load', function () { setTimeout(function () { window.print(); }, 300); });</script>" : ""}
</body>
</html>`;
}

/**
 * Opens the slip in its own window, falling back to a hidden iframe when the
 * browser blocks popups — the same two-step the token slip uses, because a
 * blocked popup would otherwise look like a button that does nothing.
 */
export function printPrescriptionSlip(data: PrescriptionSlipData, autoPrint = true): void {
  const html = generatePrescriptionSlipHtml(data, autoPrint);

  const win = window.open("", "_blank", "width=760,height=900,menubar=no,toolbar=no,status=no");
  if (win) {
    win.document.open();
    win.document.write(html);
    win.document.close();
    win.focus();
    return;
  }

  const existing = document.getElementById("wonflow-prescription-print-frame");
  existing?.remove();

  const iframe = document.createElement("iframe");
  iframe.id = "wonflow-prescription-print-frame";
  iframe.setAttribute(
    "style",
    "position:fixed;right:0;bottom:0;width:0;height:0;border:none;opacity:0;pointer-events:none;",
  );
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document;
  if (doc) {
    doc.open();
    doc.write(generatePrescriptionSlipHtml(data, false));
    doc.close();
    setTimeout(() => {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    }, 300);
  }
}
