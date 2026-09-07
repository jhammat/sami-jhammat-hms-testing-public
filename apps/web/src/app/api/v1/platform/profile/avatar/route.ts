import { NextResponse } from "next/server";

import { requirePlatformContext, safeApiError } from "@/lib/api/route-helpers";
import { platformProfileService } from "@/server/platform/platform-profile-service";

export async function GET(): Promise<NextResponse> {
  try {
    const context = await requirePlatformContext();
    const avatar = await platformProfileService.readAvatarBytes(context.identityId || context.userId);
    if (!avatar) {
      return new NextResponse("Not Found", { status: 404 });
    }

    return new NextResponse(avatar.bytes as unknown as BodyInit, {
      status: 200,
      headers: {
        "content-type": avatar.contentType,
        "cache-control": "private, no-cache, no-store, must-revalidate",
      },
    });
  } catch (error) {
    return safeApiError(error);
  }
}

export async function PUT(request: Request): Promise<NextResponse> {
  try {
    const context = await requirePlatformContext();
    const formData = await request.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: "No image file was provided." }, { status: 400 });
    }

    const result = await platformProfileService.uploadAvatar(context, file);
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
    const context = await requirePlatformContext();
    const result = await platformProfileService.removeAvatar(context);
    return NextResponse.json(result);
  } catch (error) {
    return safeApiError(error);
  }
}
