import { NextResponse } from "next/server";
import { requireRequestContext } from "@/lib/auth/permission-service";
import { doctorService as s } from "@/server/doctor/doctor-service";
import { handleApiRoute, WonFlowApiError } from "@/server/http/route-handler";

export function POST(r: Request, c: { params: Promise<{ encounterId: string }> }) {
  return handleApiRoute(async () =>
    NextResponse.json(
      {
        order: await s.createOrder(
          await requireRequestContext(),
          (await c.params).encounterId,
          await r.json(),
        ),
      },
      { status: 201 },
    ),
  );
}

export function DELETE(r: Request, c: { params: Promise<{ encounterId: string }> }) {
  return handleApiRoute(async () => {
    const url = new URL(r.url);
    const orderId = url.searchParams.get("orderId");
    if (!orderId) {
      throw new WonFlowApiError(400, "missing-order-id", "orderId parameter is required");
    }
    const { encounterId } = await c.params;
    await s.removeOrder(await requireRequestContext(), encounterId, orderId);
    return NextResponse.json({ success: true });
  });
}
