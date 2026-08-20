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

  let errorMessage = "The request could not be completed.";
  let statusCode = 400;

  if (error && typeof error === "object") {
    const err = error as { code?: string; message?: string };
    if (err.code === "P2002") {
      statusCode = 409;
      const target = String(err.message ?? "").toLowerCase();
      if (target.includes("slug")) {
        errorMessage = "A tenant with this slug already exists. Please choose a different slug.";
      } else if (target.includes("email")) {
        errorMessage = "An account with this email address already exists.";
      } else {
        errorMessage = "A record with these unique details already exists.";
      }
      return NextResponse.json({ error: errorMessage, code: "unique-conflict" }, { status: statusCode });
    }
    if (typeof err.message === "string" && err.message.trim().length > 0) {
      if (err.message.includes("invocation") || err.message.includes("TURBOPACK")) {
        const lines = err.message.split("\n").map((l) => l.trim()).filter(Boolean);
        const lastLine = lines[lines.length - 1] ?? "";
        errorMessage = lastLine.replace(/^→\s*\d*\s*/, "").replace(/^Error:\s*/, "") || "The request could not be completed.";
      } else {
        errorMessage = err.message;
      }
    }
  }

  return NextResponse.json({ error: errorMessage }, { status: statusCode });
}
