import { Request } from "express";
import { prisma } from "./prisma";

interface AuditParams {
  actorId?: string | null;
  action: string;
  entityType?: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
  req?: Request;
}

export async function recordAudit(params: AuditParams): Promise<void> {
  const { actorId, action, entityType, entityId, metadata, req } = params;
  await prisma.auditLog.create({
    data: {
      actorId: actorId ?? null,
      action,
      entityType,
      entityId,
      metadata: metadata as any,
      ipAddress: req?.ip,
      userAgent: req?.headers["user-agent"],
    },
  });
}
