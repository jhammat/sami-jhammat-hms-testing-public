import { NextResponse } from "next/server";
import { requireRequestContext } from "@/lib/auth/permission-service";
import { handleApiRoute } from "@/server/http/route-handler";
import { AlertEscalationService } from "@/server/clinical/alert-escalation-service";
import type { CreateAlertRotaInput } from "@wonflow/contracts";

export function GET(): Promise<NextResponse> {
  return handleApiRoute(async () => {
    const rc = await requireRequestContext();
    const service = new AlertEscalationService();
    const rotas = await service.listRotas(rc);
    return NextResponse.json({ rotas });
  });
}

export function POST(request: Request): Promise<NextResponse> {
  return handleApiRoute(async () => {
    const rc = await requireRequestContext();
    const input = (await request.json()) as CreateAlertRotaInput;
    const service = new AlertEscalationService();
    const rota = await service.createRota(rc, input);
    return NextResponse.json({ rota }, { status: 201 });
  });
}
