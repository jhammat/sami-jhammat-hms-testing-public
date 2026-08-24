import { NextRequest, NextResponse } from "next/server";
import { requireRequestContext } from "@/lib/auth/permission-service";
import { physiotherapyService } from "@/server/allied/physiotherapy-service";
import { handleApiRoute } from "@/server/http/route-handler";

export function GET(request: NextRequest): Promise<NextResponse> {
  return handleApiRoute(async () => {
    const rc = await requireRequestContext();
    const category = request.nextUrl.searchParams.get("category") || undefined;
    const exercises = await physiotherapyService.listExerciseDefinitions(rc, category);
    return NextResponse.json({ exercises });
  });
}

export function POST(request: NextRequest): Promise<NextResponse> {
  return handleApiRoute(async () => {
    const rc = await requireRequestContext();
    const body = await request.json();
    const exercise = await physiotherapyService.createExerciseDefinition(rc, body);
    return NextResponse.json({ exercise }, { status: 201 });
  });
}
