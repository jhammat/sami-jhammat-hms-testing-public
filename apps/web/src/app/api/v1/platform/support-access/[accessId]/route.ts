import { NextResponse } from "next/server";
import { requirePlatformContext, safeApiError } from "@/lib/api/route-helpers";
import { platformAdministrationService as service } from "@/server/platform/platform-administration-service";
export async function PATCH(request: Request, { params }: { params: Promise<{ accessId: string }> }) { try { const { accessId } = await params; return NextResponse.json({ access: await service.updateSupportAccess(await requirePlatformContext(), { accessId, ...await request.json() }) }); } catch (e) { return safeApiError(e); } }
