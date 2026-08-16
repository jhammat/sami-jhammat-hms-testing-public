import { NextResponse } from "next/server";
import { requireRequestContext } from "@/lib/auth/permission-service";
import { handleApiRoute } from "@/server/http/route-handler";
import { createPatientDocumentAccessToken } from "@/server/patient/patient-document-service";

/** Issues a short-lived, single-use link to fetch this document's bytes — the client opens the returned url directly rather than re-fetching this document by id. */
export function POST(_request: Request, context: { params: Promise<{ documentId: string }> }) {
  return handleApiRoute(async () => {
    const { documentId } = await context.params;
    return NextResponse.json(await createPatientDocumentAccessToken(await requireRequestContext(), documentId));
  });
}
