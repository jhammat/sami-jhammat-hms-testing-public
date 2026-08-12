import {
  database,
} from "@wonflow/database";

import {
  NextResponse,
} from "next/server";

import {
  createOneTimeToken,
} from "@/lib/auth/one-time-token";

interface RequestBody {
  email?: string;
}

const genericResponse = {
  ok: true,
  message:
    "If the account exists, recovery instructions will be sent.",
};

export async function POST(
  request: Request,
): Promise<NextResponse> {
  const body =
    await request
      .json()
      .catch(
        () => null,
      ) as RequestBody | null;

  const normalizedEmail =
    body?.email
      ?.trim()
      .toLowerCase();

  if (!normalizedEmail) {
    return NextResponse.json(
      genericResponse,
    );
  }

  const identity =
    await database.identity.findUnique({
      where: {
        normalizedEmail,
      },
    });

  if (
    !identity ||
    identity.status ===
      "ARCHIVED"
  ) {
    return NextResponse.json(
      genericResponse,
    );
  }

  const token =
    await createOneTimeToken({
      identityId:
        identity.id,
      purpose:
        "PASSWORD_RESET",
      lifetimeMinutes: 30,
    });

  await database.outboxEvent.create({
    data: {
      type:
        "auth.password-reset.requested",
      aggregateType:
        "identity",
      aggregateId:
        identity.id,
      payload: {
        identityId:
          identity.id,
        email:
          identity.email,
        token,
      },
    },
  });

  return NextResponse.json(
    genericResponse,
  );
}
