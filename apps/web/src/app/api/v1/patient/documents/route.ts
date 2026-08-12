import { NextResponse } from "next/server";
import { requireRequestContext } from "@/lib/auth/permission-service";
import { handleApiRoute, WonFlowApiError } from "@/server/http/route-handler";
import { listPatientDocuments, uploadPatientDocument } from "@/server/patient/patient-document-service";

export function GET() { return handleApiRoute(async () => NextResponse.json({ documents: await listPatientDocuments(await requireRequestContext()) })); }
export function POST(request: Request) { return handleApiRoute(async () => { const form = await request.formData(); const file = form.get("file"); if (!(file instanceof File)) throw new WonFlowApiError(400, "document-required", "Choose a document to upload."); return NextResponse.json({ document: await uploadPatientDocument(await requireRequestContext(), file, String(form.get("title") ?? ""), String(form.get("category") ?? "PATIENT_UPLOAD")) }, { status: 201 }); }); }
