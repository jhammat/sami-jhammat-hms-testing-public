import { NextResponse } from "next/server";
import { requireRequestContext } from "@/lib/auth/permission-service";
import { handleApiRoute, WonFlowApiError } from "@/server/http/route-handler";
import { uploadPatientDiagnosticAttachment } from "@/server/diagnostics/diagnostic-attachment-service";

export function POST(request: Request, context: { params: Promise<{ orderId: string }> }) {
  return handleApiRoute(async () => {
    const { orderId } = await context.params;
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) throw new WonFlowApiError(400, "file-required", "Choose a file to attach.");
    const { document, scanResult } = await uploadPatientDiagnosticAttachment(await requireRequestContext(), orderId, file);
    return NextResponse.json({ document, scanResult }, { status: 201 });
  });
}
