import { NextResponse } from "next/server";
import { requirePlatformContext, safeApiError } from "@/lib/api/route-helpers";
import { platformAdministrationService as service } from "@/server/platform/platform-administration-service";
export async function GET() { try { return NextResponse.json({ tenants: await service.listTenants(await requirePlatformContext()) }); } catch (e) { return safeApiError(e); } }
export async function POST(request: Request) { try { return NextResponse.json({ tenant: await service.createTenant(await requirePlatformContext(), await request.json()) }, { status: 201 }); } catch (e) { return safeApiError(e); } }
