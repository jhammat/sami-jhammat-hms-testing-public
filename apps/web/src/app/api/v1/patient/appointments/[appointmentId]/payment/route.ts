import { NextResponse } from "next/server";
import { requireRequestContext } from "@/lib/auth/permission-service";
import { handleApiRoute } from "@/server/http/route-handler";
import { getMyAppointmentPayment, submitMyAppointmentPaymentProof } from "@/server/patient/patient-self-service";

export function GET(_request: Request, { params }: { params: Promise<{ appointmentId: string }> }) {
  return handleApiRoute(async () => {
    const { appointmentId } = await params;
    const payment = await getMyAppointmentPayment(await requireRequestContext(), appointmentId);
    return NextResponse.json({ payment });
  });
}

export function POST(request: Request, { params }: { params: Promise<{ appointmentId: string }> }) {
  return handleApiRoute(async () => {
    const { appointmentId } = await params;
    const body = await request.json() as { documentId?: string };
    if (!body.documentId) {
      return NextResponse.json({ error: "Upload a payment proof first.", code: "document-id-required" }, { status: 400 });
    }
    const appointment = await submitMyAppointmentPaymentProof(await requireRequestContext(), appointmentId, body.documentId);
    return NextResponse.json({ appointment });
  });
}
