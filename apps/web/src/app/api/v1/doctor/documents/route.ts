import { NextResponse } from "next/server";
import { requireRequestContext } from "@/lib/auth/permission-service";
import { handleApiRoute, WonFlowApiError } from "@/server/http/route-handler";
import { listClinicianDocumentPatients, uploadClinicianDocument } from "@/server/patient/patient-document-service";
export function GET() { return handleApiRoute(async () => NextResponse.json({ patients: await listClinicianDocumentPatients(await requireRequestContext()) })); }
export function POST(request: Request) { return handleApiRoute(async () => { const form = await request.formData(); const file = form.get("file"); const patientId = String(form.get("patientId") ?? ""); if (!patientId || !(file instanceof File)) throw new WonFlowApiError(400, "document-input-required", "Select a patient and document."); return NextResponse.json({ document: await uploadClinicianDocument(await requireRequestContext(), patientId, file, String(form.get("title") ?? ""), String(form.get("category") ?? "CLINICAL_REPORT")) }, { status: 201 }); }); }
