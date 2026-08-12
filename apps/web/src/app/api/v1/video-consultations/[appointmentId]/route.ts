import { NextResponse } from "next/server";
import { requireRequestContext } from "@/lib/auth/permission-service";
import { handleApiRoute } from "@/server/http/route-handler";
import { endVideoConsultation, getVideoConsultation, joinVideoConsultation } from "@/server/video-consultation/video-consultation-service";

export function GET(_: Request, { params }: { params: Promise<{ appointmentId: string }> }) {
  return handleApiRoute(async () => {
    const { appointmentId } = await params;
    return NextResponse.json({ call: await getVideoConsultation(await requireRequestContext(), appointmentId) });
  });
}

export function POST(request: Request, { params }: { params: Promise<{ appointmentId: string }> }) {
  return handleApiRoute(async () => {
    const { appointmentId } = await params;
    const input = await request.json() as { action?: string };
    if (input.action === "join") return NextResponse.json({ session: await joinVideoConsultation(await requireRequestContext(), appointmentId) });
    if (input.action === "end") return NextResponse.json({ session: await endVideoConsultation(await requireRequestContext(), appointmentId) });
    return NextResponse.json({ error: "Unsupported video-call action." }, { status: 400 });
  });
}
