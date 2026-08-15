import { NotificationType } from "@prisma/client";
import { prisma } from "./prisma";

interface NotifyParams {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
}

export async function notify(params: NotifyParams): Promise<void> {
  await prisma.notification.create({ data: params });
}

export async function notifyMany(userIds: string[], rest: Omit<NotifyParams, "userId">): Promise<void> {
  if (userIds.length === 0) return;
  await prisma.notification.createMany({
    data: userIds.map((userId) => ({ userId, ...rest })),
  });
}
