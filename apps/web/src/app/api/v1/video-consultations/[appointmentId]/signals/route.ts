import { NextResponse } from "next/server";
import { requireRequestContext } from "@/lib/auth/permission-service";
import { handleApiRoute } from "@/server/http/route-handler";
import { listVideoSignals, sendVideoSignal } from "@/server/video-consultation/video-consultation-service";

export function GET(request: Request, { params }: { params: Promise<{ appointmentId: string }> }) {
  return handleApiRoute(async () => {
    const { appointmentId } = await params;
    const after = new URL(request.url).searchParams.get("after") ?? undefined;
    return NextResponse.json({ signals: await listVideoSignals(await requireRequestContext(), appointmentId, after) });
  });
}

export function POST(request: Request, { params }: { params: Promise<{ appointmentId: string }> }) {
  return handleApiRoute(async () => {
    const { appointmentId } = await params;
    const input = await request.json() as { type: "SDP_OFFER" | "SDP_ANSWER" | "ICE_CANDIDATE"; payload: unknown };
    return NextResponse.json({ signal: await sendVideoSignal(await requireRequestContext(), appointmentId, input) }, { status: 201 });
  });
}
