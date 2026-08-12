import { NextResponse } from "next/server";
import { requirePlatformContext, safeApiError } from "@/lib/api/route-helpers";
import { platformAdministrationService as service } from "@/server/platform/platform-administration-service";
export async function PUT(request: Request, { params }: { params: Promise<{ tenantId: string }> }) { try { const { tenantId } = await params; return NextResponse.json({ subscription: await service.updateSubscription(await requirePlatformContext(), { tenantId, ...await request.json() }) }); } catch (e) { return safeApiError(e); } }
