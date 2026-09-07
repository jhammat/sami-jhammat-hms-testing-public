import { NextResponse } from "next/server";
import { requireRequestContext } from "@/lib/auth/permission-service";
import { safeApiError } from "@/lib/api/route-helpers";
import { hospitalAdministrationService as s } from "@/server/admin/hospital-administration-service";

export async function GET(): Promise<NextResponse> {
  try {
    const rc = await requireRequestContext();
    const { bytes, contentType } = await s.readAdministratorAvatarBytes(rc);
    return new NextResponse(new Uint8Array(bytes), {
      status: 200,
      headers: {
        "content-type": contentType,
        "cache-control": "private, no-cache, no-store, must-revalidate",
      },
    });
  } catch (error) {
    return safeApiError(error);
  }
}

export async function PUT(request: Request): Promise<NextResponse> {
  try {
    const rc = await requireRequestContext();
    const formData = await request.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: "No image file was provided." }, { status: 400 });
    }

    const result = await s.uploadAdministratorAvatar(rc, file);
    return NextResponse.json(result);
  } catch (error) {
    return safeApiError(error);
  }
}

export async function POST(request: Request): Promise<NextResponse> {
  return PUT(request);
}

export async function DELETE(): Promise<NextResponse> {
  try {
    const rc = await requireRequestContext();
    const result = await s.removeAdministratorAvatar(rc);
    return NextResponse.json(result);
  } catch (error) {
    return safeApiError(error);
  }
}
