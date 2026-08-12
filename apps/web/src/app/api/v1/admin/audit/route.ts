import{NextResponse}from"next/server";import{requireRequestContext}from"@/lib/auth/permission-service";import{safeApiError}from"@/lib/api/route-helpers";import{hospitalAdministrationService as s}from"@/server/admin/hospital-administration-service";
export async function GET(){try{return NextResponse.json({audit:await s.listAudit(await requireRequestContext())})}catch(e){return safeApiError(e)}}
