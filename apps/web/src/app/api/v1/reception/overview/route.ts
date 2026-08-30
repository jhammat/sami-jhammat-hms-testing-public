import{todayIn}from"@/server/time/business-day";
import{NextResponse}from"next/server";import{requireRequestContext}from"@/lib/auth/permission-service";import{receptionService as s}from"@/server/reception/reception-service";import{handleApiRoute}from"@/server/http/route-handler";
export function GET(r:Request){return handleApiRoute(async()=>{const rc=await requireRequestContext();const date=new URL(r.url).searchParams.get("date")??todayIn(rc.timezone);return NextResponse.json({overview:await s.getOverview(rc,date)})})}
