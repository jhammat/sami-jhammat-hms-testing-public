import { NextResponse } from "next/server";

import { safeApiError } from "@/lib/api/route-helpers";
import { requireRequestContext } from "@/lib/auth/permission-service";
import {
  createInstantDoctorVideoCall,
  listDoctorVideoConsultations,
} from "@/server/doctor/doctor-video-service";

export async function GET() {
  try {
    const rc = await requireRequestContext();
    const data = await listDoctorVideoConsultations(rc);
    return NextResponse.json(data);
  } catch (error) {
    return safeApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const rc = await requireRequestContext();
    const body = (await request.json()) as { patientId: string; reason?: string };
    if (!body?.patientId) {
      return NextResponse.json({ error: "patientId is required" }, { status: 400 });
    }
    const result = await createInstantDoctorVideoCall(rc, body);
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return safeApiError(error);
  }
}
