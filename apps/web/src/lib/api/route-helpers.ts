import { NextResponse } from "next/server";
import type { WonFlowPlatformRequestContext } from "@wonflow/contracts";
import { WonFlowRequestContextError } from "@wonflow/contracts";
import { WonFlowApiError, logPermissionDenial } from "@/server/http/route-handler";
import { requireRequestContext } from "@/lib/auth/permission-service";

export async function requirePlatformContext(): Promise<WonFlowPlatformRequestContext> {
  const context = await requireRequestContext();
  if (context.scope !== "platform") throw new WonFlowRequestContextError("permission-required", "Platform access is required.", { context, permissionCode: "platform.access" });
  return context;
}
export function safeApiError(error: unknown): NextResponse {
  if (error instanceof WonFlowApiError) return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
  if (error instanceof WonFlowRequestContextError) { logPermissionDenial(error); return NextResponse.json({ error: error.message }, { status: error.code === "invalid-request-context" ? 401 : 403 }); }
  if (error instanceof SyntaxError) return NextResponse.json({ error: "The request body is invalid." }, { status: 400 });
  console.error("API request failed", error);
  return NextResponse.json({ error: error instanceof Error && error.message === "A reason is required." ? error.message : "The request could not be completed." }, { status: 400 });
}
