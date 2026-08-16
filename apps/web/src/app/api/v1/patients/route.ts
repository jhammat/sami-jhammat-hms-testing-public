import { NextResponse } from "next/server";
import { requireRequestContext } from "@/lib/auth/permission-service";
import { receptionService as s } from "@/server/reception/reception-service";
import { handleApiRoute } from "@/server/http/route-handler";

function parseIntParam(value: string | null): number | undefined {
  if (value === null || value.trim() === "") return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

// A duplicate check (before-save, name+mobile lookup) and the paginated,
// server-filtered directory listing both live on this collection endpoint
// rather than as separate routes.
export function GET(request: Request) {
  return handleApiRoute(async () => {
    const context = await requireRequestContext();
    const params = new URL(request.url).searchParams;

    if (params.get("duplicateCheck") === "1") {
      const duplicates = await s.findDuplicatePatients(context, {
        givenName: params.get("givenName") ?? undefined,
        familyName: params.get("familyName") ?? undefined,
        phone: params.get("phone") ?? undefined,
      });
      return NextResponse.json({ duplicates });
    }

    const sortParam = params.get("sort");
    const sort =
      sortParam === "name-ascending" ||
      sortParam === "mr-ascending" ||
      sortParam === "age-ascending" ||
      sortParam === "age-descending"
        ? sortParam
        : "recent";

    const result = await s.listPatients(context, {
      query: params.get("query") ?? undefined,
      gender: params.get("gender") ?? undefined,
      minimumAge: parseIntParam(params.get("minimumAge")),
      maximumAge: parseIntParam(params.get("maximumAge")),
      page: parseIntParam(params.get("page")),
      pageSize: parseIntParam(params.get("pageSize")),
      sort,
    });

    return NextResponse.json(result);
  });
}

export function POST(request: Request) {
  return handleApiRoute(async () => NextResponse.json(await s.registerPatient(await requireRequestContext(), await request.json()), { status: 201 }));
}
