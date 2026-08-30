import { NextResponse } from "next/server";

import { safeApiError } from "@/lib/api/route-helpers";
import { requireRequestContext } from "@/lib/auth/permission-service";
import {
  saveVideoConsultationChart,
  type SaveVideoChartInput,
} from "@/server/doctor/doctor-video-service";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ appointmentId: string }> },
) {
  try {
    const rc = await requireRequestContext();
    const { appointmentId } = await params;
    const body = (await request.json()) as Omit<SaveVideoChartInput, "appointmentId">;

    const result = await saveVideoConsultationChart(rc, {
      ...body,
      appointmentId,
    });
    return NextResponse.json(result);
  } catch (error) {
    return safeApiError(error);
  }
}
