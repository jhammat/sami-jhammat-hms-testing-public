import {
  createHash,
  randomBytes,
} from "node:crypto";

import {
  database,
} from "@wonflow/database";

import type {
  TokenPurpose,
} from "@wonflow/database";

function hashToken(
  value: string,
): string {
  return createHash(
    "sha256",
  )
    .update(value)
    .digest("hex");
}

export async function createOneTimeToken(
  input: {
    identityId: string;
    tenantId?: string | null;
    purpose: TokenPurpose;
    lifetimeMinutes: number;
  },
): Promise<string> {
  const rawToken =
    randomBytes(32)
      .toString("base64url");

  const expiresAt =
    new Date(
      Date.now() +
        input.lifetimeMinutes *
          60_000,
    );

  await database.$transaction(
    async (
      transaction,
    ) => {
      await transaction.oneTimeToken.updateMany({
        where: {
          identityId:
            input.identityId,
          purpose:
            input.purpose,
          status: "ACTIVE",
        },
        data: {
          status: "REVOKED",
        },
      });

      await transaction.oneTimeToken.create({
        data: {
          identityId:
            input.identityId,
          tenantId:
            input.tenantId ??
            null,
          purpose:
            input.purpose,
          tokenHash:
            hashToken(
              rawToken,
            ),
          expiresAt,
        },
      });
    },
  );

  return rawToken;
}

export async function consumeOneTimeToken(
  rawToken: string,
  purpose:
    TokenPurpose,
): Promise<{
  identityId: string;
  tenantId: string | null;
} | null> {
  const record =
    await database.oneTimeToken.findUnique({
      where: {
        tokenHash:
          hashToken(rawToken),
      },
    });

  if (
    !record ||
    record.purpose !==
      purpose ||
    record.status !==
      "ACTIVE" ||
    record.expiresAt <=
      new Date()
  ) {
    return null;
  }

  const updated =
    await database.oneTimeToken.updateMany({
      where: {
        id: record.id,
        status: "ACTIVE",
      },
      data: {
        status: "CONSUMED",
        consumedAt:
          new Date(),
      },
    });

  if (
    updated.count !== 1
  ) {
    return null;
  }

  return {
    identityId:
      record.identityId,
    tenantId:
      record.tenantId,
  };
}
