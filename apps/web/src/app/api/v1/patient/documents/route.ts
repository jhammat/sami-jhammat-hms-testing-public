import { NextResponse } from "next/server";
import { requireRequestContext } from "@/lib/auth/permission-service";
import { handleApiRoute } from "@/server/http/route-handler";
import { listPatientDocuments } from "@/server/patient/patient-document-service";

export function GET() { return handleApiRoute(async () => NextResponse.json({ documents: await listPatientDocuments(await requireRequestContext()) })); }
