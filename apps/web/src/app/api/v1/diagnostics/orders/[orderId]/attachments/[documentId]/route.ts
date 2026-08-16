import { NextResponse } from "next/server";
import { requireRequestContext } from "@/lib/auth/permission-service";
import { handleApiRoute } from "@/server/http/route-handler";
import { deleteStaffDiagnosticAttachment } from "@/server/diagnostics/diagnostic-attachment-service";

/** Only lab/radiology staff can remove an attachment -- see diagnostic-attachment-service.ts. */
export function DELETE(_request: Request, context: { params: Promise<{ orderId: string; documentId: string }> }) {
  return handleApiRoute(async () => {
    const { orderId, documentId } = await context.params;
    return NextResponse.json(await deleteStaffDiagnosticAttachment(await requireRequestContext(), orderId, documentId));
  });
}
