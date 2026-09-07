import { NextResponse } from "next/server";
import { requireRequestContext } from "@/lib/auth/permission-service";
import { doctorService as s } from "@/server/doctor/doctor-service";
import { handleApiRoute, WonFlowApiError } from "@/server/http/route-handler";

export function POST(r: Request, c: { params: Promise<{ encounterId: string }> }) {
  return handleApiRoute(async () =>
    NextResponse.json(
      {
        observation: await s.recordObservation(
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
    const observationId = url.searchParams.get("observationId") || undefined;
    const clearEncounter = url.searchParams.get("clearEncounter") === "true";
    const observedAt = url.searchParams.get("observedAt") || undefined;

    if (!observationId && !clearEncounter && !observedAt) {
      throw new WonFlowApiError(400, "missing-params", "observationId, clearEncounter, or observedAt parameter is required");
    }

    const { encounterId } = await c.params;
    await s.removeObservation(await requireRequestContext(), encounterId, {
      observationId,
      clearEncounter,
      observedAt,
    });
    return NextResponse.json({ success: true });
  });
}
