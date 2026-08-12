import { NextResponse } from "next/server";
import { requirePlatformContext, safeApiError } from "@/lib/api/route-helpers";
import { platformAdministrationService as service } from "@/server/platform/platform-administration-service";
export async function GET() { try { return NextResponse.json({ audit: await service.listAudit(await requirePlatformContext()) }); } catch (e) { return safeApiError(e); } }
