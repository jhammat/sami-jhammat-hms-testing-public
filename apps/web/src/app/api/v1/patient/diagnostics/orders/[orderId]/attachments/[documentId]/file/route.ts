import { NextResponse } from "next/server";
import { requireRequestContext } from "@/lib/auth/permission-service";
import { handleApiRoute } from "@/server/http/route-handler";
import { readPatientDiagnosticAttachmentBytes } from "@/server/diagnostics/diagnostic-attachment-service";

export function GET(_request: Request, context: { params: Promise<{ orderId: string; documentId: string }> }) {
  return handleApiRoute(async () => {
    const { orderId, documentId } = await context.params;
    const { document, bytes } = await readPatientDiagnosticAttachmentBytes(await requireRequestContext(), orderId, documentId);
    return new NextResponse(new Uint8Array(bytes), {
      headers: {
        "content-type": document.object.contentType,
        "content-disposition": `inline; filename="${encodeURIComponent(document.title)}"`,
        "cache-control": "private, no-store",
      },
    });
  });
}
