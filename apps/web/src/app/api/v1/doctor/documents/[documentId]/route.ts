import { NextResponse } from "next/server";
import { requireRequestContext } from "@/lib/auth/permission-service";
import { handleApiRoute } from "@/server/http/route-handler";
import {
  deleteClinicianDocument,
  getClinicianDocumentBytes,
  updateClinicianDocument,
} from "@/server/patient/patient-document-service";

export async function GET(
  _request: Request,
  props: { params: Promise<{ documentId: string }> },
) {
  try {
    const { documentId } = await props.params;
    const context = await requireRequestContext();
    const { document, bytes, contentType } = await getClinicianDocumentBytes(context, documentId);

    return new Response(new Uint8Array(bytes), {
      status: 200,
      headers: {
        "Content-Type": contentType || "application/octet-stream",
        "Content-Disposition": `inline; filename="${encodeURIComponent(document.title)}"`,
        "Cache-Control": "private, max-age=300",
      },
    });
  } catch {
    return NextResponse.json({ error: "Document not found." }, { status: 404 });
  }
}

export function DELETE(
  _request: Request,
  props: { params: Promise<{ documentId: string }> },
) {
  return handleApiRoute(async () => {
    const { documentId } = await props.params;
    const context = await requireRequestContext();
    return NextResponse.json(await deleteClinicianDocument(context, documentId));
  });
}

export function PATCH(
  request: Request,
  props: { params: Promise<{ documentId: string }> },
) {
  return handleApiRoute(async () => {
    const { documentId } = await props.params;
    const context = await requireRequestContext();
    const body = (await request.json()) as { title?: string; category?: string; status?: string };
    return NextResponse.json(await updateClinicianDocument(context, documentId, body));
  });
}
