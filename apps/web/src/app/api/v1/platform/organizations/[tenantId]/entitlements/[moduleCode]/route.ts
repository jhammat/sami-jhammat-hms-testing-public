import { NextResponse } from "next/server";
import { requirePlatformContext, safeApiError } from "@/lib/api/route-helpers";
import { platformAdministrationService as service } from "@/server/platform/platform-administration-service";
export async function PUT(request: Request, { params }: { params: Promise<{ tenantId: string; moduleCode: string }> }) { try { const p = await params; return NextResponse.json({ entitlement: await service.setEntitlement(await requirePlatformContext(), { ...p, ...await request.json() }) }); } catch (e) { return safeApiError(e); } }
