import { NextResponse } from "next/server";
import { database } from "@wonflow/database";
import type { WorkspaceCode } from "@wonflow/database";
import { readSession } from "@/lib/auth/session-server";
import { homePathForRole } from "@/lib/auth/accounts";
import { workspaceRoles } from "@/lib/auth/account-service";

export async function POST(request: Request) {
  try {
    const session = await readSession();
    if (!session || !session.sessionId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json().catch(() => null)) as { workspace?: WorkspaceCode } | null;
    if (!body?.workspace) {
      return NextResponse.json({ error: "Missing workspace code." }, { status: 400 });
    }

    const available = session.availableWorkspaces ?? [];
    if (!available.includes(body.workspace)) {
      return NextResponse.json({ error: "You do not have access to this workspace." }, { status: 403 });
    }

    await database.authSession.update({
      where: { id: session.sessionId },
      data: { workspace: body.workspace },
    });

    const role = workspaceRoles[body.workspace];
    const homePath = homePathForRole(role);

    return NextResponse.json({ success: true, homePath, workspace: body.workspace, role });
  } catch (error) {
    console.error("[auth] Failed to switch workspace:", error);
    return NextResponse.json({ error: "Could not switch workspace." }, { status: 500 });
  }
}
