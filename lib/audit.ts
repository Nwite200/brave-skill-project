import "server-only";

import { db } from "@/lib/db";

export async function audit(input: {
  actorId?: string | null;
  action: string;
  entity: string;
  entityId?: string | null;
  meta?: Record<string, unknown>;
  ip?: string | null;
  userAgent?: string | null;
}) {
  try {
    await db.auditLog.create({
      data: {
        actorId: input.actorId ?? undefined,
        action: input.action,
        entity: input.entity,
        entityId: input.entityId ?? undefined,
        meta: input.meta ? JSON.stringify(input.meta) : undefined,
        ip: input.ip ?? undefined,
        userAgent: input.userAgent?.slice(0, 300) ?? undefined,
      },
    });
  } catch (error) {
    console.error("[audit] failed to write log", error);
  }
}

export async function notify(input: {
  userId: string;
  title: string;
  body: string;
  type?: "SYSTEM" | "PAYMENT" | "COURSE" | "CERTIFICATE" | "ANNOUNCEMENT";
  link?: string;
}) {
  try {
    await db.notification.create({
      data: {
        userId: input.userId,
        title: input.title,
        body: input.body,
        type: input.type ?? "SYSTEM",
        link: input.link,
      },
    });
  } catch (error) {
    console.error("[notify] failed", error);
  }
}
