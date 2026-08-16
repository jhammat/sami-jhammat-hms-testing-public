import { NextResponse } from "next/server";
import { handleApiRoute } from "@/server/http/route-handler";
import { consumePatientDocumentAccessToken } from "@/server/patient/patient-document-service";

/**
 * The bearer token itself is the authorization — an unguessable, short-lived,
 * single-use capability, not a session-scoped route. No requireRequestContext()
 * here on purpose: a second request with the same token is refused regardless
 * of who sends it.
 */
export function GET(_request: Request, context: { params: Promise<{ token: string }> }) {
  return handleApiRoute(async () => {
    const { token } = await context.params;
    const { document, bytes } = await consumePatientDocumentAccessToken(token);
    return new NextResponse(new Uint8Array(bytes), {
      headers: {
        "content-type": document.object.contentType,
        "content-disposition": `inline; filename="${encodeURIComponent(document.title)}"`,
        "cache-control": "private, no-store",
      },
    });
  });
}
