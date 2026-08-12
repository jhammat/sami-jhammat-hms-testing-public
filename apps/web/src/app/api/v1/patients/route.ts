import{NextResponse}from"next/server";import{requireRequestContext}from"@/lib/auth/permission-service";import{receptionService as s}from"@/server/reception/reception-service";import{handleApiRoute}from"@/server/http/route-handler";
// With a query this searches; without one it lists recent patients, which is
// what the patient directory needs — searchPatients returns nothing for "".
export function GET(r:Request){return handleApiRoute(async()=>{const context=await requireRequestContext(),query=new URL(r.url).searchParams.get("query")??"";return NextResponse.json({patients:query.trim()===""?await s.listPatients(context):await s.searchPatients(context,query)})})}
export function POST(r:Request){return handleApiRoute(async()=>NextResponse.json(await s.registerPatient(await requireRequestContext(),await r.json()),{status:201}))}
