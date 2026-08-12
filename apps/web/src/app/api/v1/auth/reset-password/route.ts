import {
  database,
} from "@wonflow/database";

import {
  NextResponse,
} from "next/server";

import {
  consumeOneTimeToken,
} from "@/lib/auth/one-time-token";

import {
  hashPassword,
} from "@/lib/auth/password";

interface RequestBody {
  token?: string;
  password?: string;
}

export async function POST(
  request: Request,
): Promise<NextResponse> {
  const body =
    await request
      .json()
      .catch(
        () => null,
      ) as RequestBody | null;

  if (
    !body?.token ||
    !body.password
  ) {
    return NextResponse.json(
      {
        error:
          "Token and password are required.",
      },
      {
        status: 400,
      },
    );
  }

  const consumed =
    await consumeOneTimeToken(
      body.token,
      "PASSWORD_RESET",
    );

  if (!consumed) {
    return NextResponse.json(
      {
        error:
          "The recovery link is invalid or expired.",
      },
      {
        status: 400,
      },
    );
  }

  const passwordHash =
    await hashPassword(
      body.password,
    );

  await database.$transaction(
    async (
      transaction,
    ) => {
      await transaction.identity.update({
        where: {
          id:
            consumed.identityId,
        },
        data: {
          passwordHash,
          mustChangePassword: false,
          passwordChangedAt:
            new Date(),
          failedLoginCount: 0,
          lockedUntil: null,
          status: "ACTIVE",
        },
      });

      await transaction.authSession.updateMany({
        where: {
          identityId:
            consumed.identityId,
          status: "ACTIVE",
        },
        data: {
          status: "REVOKED",
          revokedAt:
            new Date(),
          revocationReason:
            "password-reset",
        },
      });
    },
  );

  return NextResponse.json({
    ok: true,
  });
}
