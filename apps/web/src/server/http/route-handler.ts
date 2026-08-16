import { NextResponse } from "next/server";
import { WonFlowRequestContextError } from "@wonflow/contracts";
import { database } from "@wonflow/database";
export class WonFlowApiError extends Error { constructor(readonly status:number,readonly code:string,message:string){super(message);this.name="WonFlowApiError";} }
function contextErrorStatus(error:WonFlowRequestContextError){switch(error.code){case"permission-required":return 403;case"tenant-context-required":case"branch-context-required":return 400;default:return 401;}}

/**
 * A permission denial is a security-relevant event even though it "worked
 * correctly" (the server refused). Without this, there was no record
 * anywhere of who was denied what — see FIX-21. Fire-and-forget: a logging
 * failure must never turn an already-handled 403 into a 500.
 */
export function logPermissionDenial(error: WonFlowRequestContextError): void {
  if (error.code !== "permission-required" || !error.context) return;
  const c = error.context;
  database.auditEvent.create({
    data: {
      tenantId: c.tenantId,
      branchId: c.scope === "tenant" ? c.branchId : null,
      actorMembershipId: c.membershipId,
      sessionId: c.sessionId,
      requestId: c.requestId,
      action: "access.denied",
      entityType: "permission",
      entityId: error.permissionCode ?? null,
      severity: "WARNING",
      reason: error.message,
      sourceApplication: c.sourceApplication,
    },
  }).catch((cause: unknown) => { console.error("Failed to record a permission denial", cause); });
}

export async function handleApiRoute(handler:()=>Promise<NextResponse>):Promise<NextResponse>{try{return await handler();}catch(error){if(error instanceof WonFlowApiError)return NextResponse.json({error:error.message,code:error.code},{status:error.status});if(error instanceof WonFlowRequestContextError){logPermissionDenial(error);return NextResponse.json({error:error.message,code:error.code},{status:contextErrorStatus(error)});}console.error("WonFlow API failure",error);return NextResponse.json({error:"The request could not be completed.",code:"internal-error"},{status:500});}}
