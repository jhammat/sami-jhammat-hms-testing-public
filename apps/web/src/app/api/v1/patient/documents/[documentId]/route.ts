import { NextResponse } from "next/server";
import { requireRequestContext } from "@/lib/auth/permission-service";
import { handleApiRoute } from "@/server/http/route-handler";
import { readPatientDocument } from "@/server/patient/patient-document-service";

export function GET(_request: Request, context: { params: Promise<{ documentId: string }> }) { return handleApiRoute(async () => { const { documentId } = await context.params; const { document, bytes } = await readPatientDocument(await requireRequestContext(), documentId); return new NextResponse(new Uint8Array(bytes), { headers: { "content-type": document.object.contentType, "content-disposition": `inline; filename="${encodeURIComponent(document.title)}"`, "cache-control": "private, no-store" } }); }); }
