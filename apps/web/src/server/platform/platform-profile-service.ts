import { mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";

import { database } from "@wonflow/database";
import type { WonFlowPlatformRequestContext } from "@wonflow/contracts";

import { hashPassword, validateNewPassword, verifyPassword } from "@/lib/auth/password";
import { WonFlowApiError } from "@/server/http/route-handler";

const ALLOWED_AVATAR_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_AVATAR_BYTES = 2 * 1024 * 1024; // 2 MB

export const platformAvatarStorageRoot = path.join(process.cwd(), ".wonflow-private", "platform-avatars");

function avatarFilePath(identityId: string): string {
  return path.join(platformAvatarStorageRoot, `${identityId}.img`);
}

function avatarMetaFilePath(identityId: string): string {
  return path.join(platformAvatarStorageRoot, `${identityId}.meta.json`);
}

export interface PlatformProfileData {
  identityId: string;
  email: string;
  phone: string | null;
  status: string;
  isPlatformAdministrator: boolean;
  platformPermissionCodes: string[];
  passwordChangedAt: string | null;
  lastAuthenticatedAt: string | null;
  createdAt: string;
  hasAvatar: boolean;
  avatarUrl: string | null;
}

export interface ChangePasswordInput {
  currentPassword?: string;
  newPassword?: string;
  confirmation?: string;
}

export async function hasPlatformAvatar(identityId: string): Promise<boolean> {
  try {
    const info = await stat(avatarFilePath(identityId));
    return info.isFile() && info.size > 0;
  } catch {
    return false;
  }
}

export class PlatformProfileService {
  async getProfile(context: WonFlowPlatformRequestContext): Promise<PlatformProfileData> {
    const identity = await database.identity.findUnique({
      where: { id: context.identityId || context.userId },
    });

    if (!identity || !identity.isPlatformAdministrator) {
      throw new WonFlowApiError(404, "profile-not-found", "Platform administrator profile could not be found.");
    }

    const hasAvatar = await hasPlatformAvatar(identity.id);

    return {
      identityId: identity.id,
      email: identity.email,
      phone: identity.phone,
      status: identity.status,
      isPlatformAdministrator: identity.isPlatformAdministrator,
      platformPermissionCodes: identity.platformPermissionCodes,
      passwordChangedAt: identity.passwordChangedAt ? identity.passwordChangedAt.toISOString() : null,
      lastAuthenticatedAt: identity.lastAuthenticatedAt ? identity.lastAuthenticatedAt.toISOString() : null,
      createdAt: identity.createdAt.toISOString(),
      hasAvatar,
      avatarUrl: hasAvatar ? "/api/v1/platform/profile/avatar" : null,
    };
  }

  async uploadAvatar(
    context: WonFlowPlatformRequestContext,
    file: { type: string; size: number; arrayBuffer: () => Promise<ArrayBuffer> },
  ): Promise<{ ok: true; avatarUrl: string }> {
    const identityId = context.identityId || context.userId;

    if (!ALLOWED_AVATAR_TYPES.has(file.type)) {
      throw new WonFlowApiError(415, "unsupported-image-type", "Upload a JPG, PNG or WebP photo.");
    }

    if (file.size < 1 || file.size > MAX_AVATAR_BYTES) {
      throw new WonFlowApiError(413, "image-size-invalid", "Photos must be between 1 byte and 2 MB.");
    }

    const bytes = Buffer.from(await file.arrayBuffer());

    await mkdir(platformAvatarStorageRoot, { recursive: true });
    await writeFile(avatarFilePath(identityId), bytes);
    await writeFile(
      avatarMetaFilePath(identityId),
      JSON.stringify({ contentType: file.type, updatedAt: new Date().toISOString() }),
      "utf8",
    );

    await database.auditEvent.create({
      data: {
        tenantId: null,
        requestId: context.requestId,
        action: "platform.profile.avatar_uploaded",
        entityType: "identity",
        entityId: identityId,
        severity: "INFORMATION",
        metadata: { actorIdentityId: identityId, contentType: file.type, sizeBytes: file.size },
        sourceApplication: context.sourceApplication,
      },
    });

    return { ok: true, avatarUrl: "/api/v1/platform/profile/avatar" };
  }

  async removeAvatar(context: WonFlowPlatformRequestContext): Promise<{ ok: true }> {
    const identityId = context.identityId || context.userId;

    await Promise.allSettled([
      rm(avatarFilePath(identityId), { force: true }),
      rm(avatarMetaFilePath(identityId), { force: true }),
    ]);

    await database.auditEvent.create({
      data: {
        tenantId: null,
        requestId: context.requestId,
        action: "platform.profile.avatar_removed",
        entityType: "identity",
        entityId: identityId,
        severity: "INFORMATION",
        metadata: { actorIdentityId: identityId },
        sourceApplication: context.sourceApplication,
      },
    });

    return { ok: true };
  }

  async readAvatarBytes(identityId: string): Promise<{ bytes: Buffer; contentType: string } | null> {
    try {
      const bytes = await readFile(avatarFilePath(identityId));
      let contentType = "image/jpeg";
      try {
        const metaRaw = await readFile(avatarMetaFilePath(identityId), "utf8");
        const meta = JSON.parse(metaRaw) as { contentType?: string };
        if (meta.contentType) contentType = meta.contentType;
      } catch {
        // Fallback default image/jpeg
      }
      return { bytes, contentType };
    } catch {
      return null;
    }
  }

  async changePassword(
    context: WonFlowPlatformRequestContext,
    input: ChangePasswordInput,
  ): Promise<{ ok: true }> {
    const identityId = context.identityId || context.userId;

    if (!input.currentPassword || !input.newPassword || !input.confirmation) {
      throw new WonFlowApiError(400, "incomplete-password-fields", "Complete all password fields.");
    }

    if (input.newPassword !== input.confirmation) {
      throw new WonFlowApiError(400, "password-confirmation-mismatch", "The new passwords do not match.");
    }

    const identity = await database.identity.findUnique({
      where: { id: identityId },
    });

    if (!identity) {
      throw new WonFlowApiError(404, "identity-not-found", "The user account could not be found.");
    }

    if (!identity.passwordHash || !(await verifyPassword(input.currentPassword, identity.passwordHash))) {
      throw new WonFlowApiError(400, "incorrect-current-password", "The current password entered is incorrect.");
    }

    if (await verifyPassword(input.newPassword, identity.passwordHash)) {
      throw new WonFlowApiError(400, "same-password", "Choose a password different from your current password.");
    }

    try {
      validateNewPassword(input.newPassword);
    } catch (error) {
      throw new WonFlowApiError(
        400,
        "invalid-password",
        error instanceof Error ? error.message : "The new password does not meet security requirements.",
      );
    }

    const passwordHash = await hashPassword(input.newPassword);

    await database.$transaction(async (transaction) => {
      await transaction.identity.update({
        where: { id: identity.id },
        data: {
          passwordHash,
          mustChangePassword: false,
          passwordChangedAt: new Date(),
          failedLoginCount: 0,
          lockedUntil: null,
          status: "ACTIVE",
        },
      });

      // Invalidate all other active sessions for security
      await transaction.authSession.updateMany({
        where: {
          identityId: identity.id,
          status: "ACTIVE",
          ...(context.sessionId ? { id: { not: context.sessionId } } : {}),
        },
        data: {
          status: "REVOKED",
          revokedAt: new Date(),
          revocationReason: "password-changed",
        },
      });

      await transaction.auditEvent.create({
        data: {
          tenantId: null,
          requestId: context.requestId,
          action: "platform.profile.password_changed",
          entityType: "identity",
          entityId: identity.id,
          severity: "CRITICAL",
          metadata: { actorIdentityId: identity.id },
          sourceApplication: context.sourceApplication,
        },
      });
    });

    return { ok: true };
  }
}

export const platformProfileService = new PlatformProfileService();
