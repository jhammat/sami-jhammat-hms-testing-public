import { NextResponse } from "next/server";

import { requireRequestContext } from "@/lib/auth/permission-service";
import { requireTenantContext } from "@wonflow/contracts";
import {
  isWorkspaceEntitled,
  readEnabledModules,
  WORKSPACE_MODULE,
} from "@/server/access/workspace-modules";
import { handleApiRoute } from "@/server/http/route-handler";

/**
 * The modules and staff workspaces this tenant may use.
 *
 * Scoped to the caller's own tenant from the session — there is no id in the
 * path, so one hospital cannot read another's licensing.
 */
export function GET(): Promise<NextResponse> {
  return handleApiRoute(async () => {
    const context = requireTenantContext(await requireRequestContext());
    const enabledModules = await readEnabledModules(context.tenantId);

    const workspaces = Object.keys(WORKSPACE_MODULE).filter((code) =>
      isWorkspaceEntitled(code, enabledModules),
    );

    return NextResponse.json({
      modules: [...enabledModules].sort(),
      workspaces,
    });
  });
}
