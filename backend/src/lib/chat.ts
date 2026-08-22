import { prisma } from "./prisma";
import { HttpError } from "../middleware/errorHandler";
import { broadcastToGroup } from "./ws";
import { safeUserSelect } from "../utils/safeSelects";

const groupInclude = {
  subject: true,
  class: true,
  teacher: { include: { user: { select: safeUserSelect } } },
} as const;

async function unreadCounts(groupIds: string[], userId: string): Promise<Map<string, number>> {
  if (groupIds.length === 0) return new Map();
  const reads = await prisma.chatGroupRead.findMany({ where: { groupId: { in: groupIds }, userId } });
  const lastReadByGroup = new Map(reads.map((r) => [r.groupId, r.lastReadAt]));

  const counts = await Promise.all(
    groupIds.map(async (groupId) => {
      const lastReadAt = lastReadByGroup.get(groupId);
      const count = await prisma.chatMessage.count({
        where: {
          groupId,
          senderId: { not: userId },
          ...(lastReadAt ? { createdAt: { gt: lastReadAt } } : {}),
        },
      });
      return [groupId, count] as const;
    })
  );
  return new Map(counts);
}

async function serializeGroups(groups: Awaited<ReturnType<typeof prisma.chatGroup.findMany<{ include: typeof groupInclude }>>>, userId: string) {
  const groupIds = groups.map((g) => g.id);
  const [unread, lastMessages] = await Promise.all([
    unreadCounts(groupIds, userId),
    prisma.chatMessage.findMany({
      where: { groupId: { in: groupIds } },
      orderBy: { createdAt: "desc" },
      distinct: ["groupId"],
      include: { sender: { select: safeUserSelect } },
    }),
  ]);
  const lastMessageByGroup = new Map(lastMessages.map((m) => [m.groupId, m]));

  return groups
    .map((g) => ({
      id: g.id,
      name: g.name,
      subject: g.subject,
      class: g.class,
      teacher: g.teacher,
      createdAt: g.createdAt,
      unreadCount: unread.get(g.id) ?? 0,
      lastMessage: lastMessageByGroup.get(g.id) ?? null,
    }))
    .sort((a, b) => {
      const at = a.lastMessage?.createdAt ?? a.createdAt;
      const bt = b.lastMessage?.createdAt ?? b.createdAt;
      return bt.getTime() - at.getTime();
    });
}

export async function serializeGroup(groupId: string, userId: string) {
  const group = await prisma.chatGroup.findUniqueOrThrow({ where: { id: groupId }, include: groupInclude });
  const [serialized] = await serializeGroups([group], userId);
  return serialized;
}

export async function listGroupsForTeacher(teacherId: string, userId: string) {
  const assignments = await prisma.teacherClassSubject.findMany({ where: { teacherId }, select: { subjectId: true } });
  const subjectIds = assignments.map((a) => a.subjectId);
  if (subjectIds.length === 0) return [];
  const groups = await prisma.chatGroup.findMany({ where: { subjectId: { in: subjectIds } }, include: groupInclude });
  return serializeGroups(groups, userId);
}

export async function listGroupsForStudent(classId: string | null, userId: string) {
  if (!classId) return [];
  const groups = await prisma.chatGroup.findMany({ where: { classId }, include: groupInclude });
  return serializeGroups(groups, userId);
}

export async function assertTeacherGroupAccess(groupId: string, teacherId: string) {
  const group = await prisma.chatGroup.findUnique({ where: { id: groupId }, include: groupInclude });
  if (!group) throw new HttpError(404, "Chat group not found");
  const assignment = await prisma.teacherClassSubject.findUnique({
    where: { teacherId_subjectId: { teacherId, subjectId: group.subjectId } },
  });
  if (!assignment) throw new HttpError(403, "You don't teach this subject");
  return group;
}

export async function assertStudentGroupAccess(groupId: string, classId: string | null) {
  const group = await prisma.chatGroup.findUnique({ where: { id: groupId }, include: groupInclude });
  if (!group) throw new HttpError(404, "Chat group not found");
  if (!classId || group.classId !== classId) throw new HttpError(403, "This chat isn't for your class");
  return group;
}

export async function listMessages(groupId: string, before?: string, limit = 50) {
  const messages = await prisma.chatMessage.findMany({
    where: { groupId, ...(before ? { createdAt: { lt: new Date(before) } } : {}) },
    orderBy: { createdAt: "desc" },
    take: limit,
    include: { sender: { select: safeUserSelect } },
  });
  return messages.reverse();
}

export async function listMessagesSince(groupId: string, sinceMessageId?: string) {
  let after: Date | undefined;
  if (sinceMessageId) {
    const anchor = await prisma.chatMessage.findUnique({ where: { id: sinceMessageId }, select: { createdAt: true } });
    after = anchor?.createdAt;
  }
  return prisma.chatMessage.findMany({
    where: { groupId, ...(after ? { createdAt: { gt: after } } : {}) },
    orderBy: { createdAt: "asc" },
    include: { sender: { select: safeUserSelect } },
  });
}

export async function createMessage(groupId: string, senderId: string, text: string) {
  const trimmed = text.trim();
  if (!trimmed) throw new HttpError(400, "Message can't be empty");
  if (trimmed.length > 2000) throw new HttpError(400, "Message is too long (2000 characters max)");

  const message = await prisma.chatMessage.create({
    data: { groupId, senderId, text: trimmed },
    include: { sender: { select: safeUserSelect } },
  });

  await prisma.chatGroupRead.upsert({
    where: { groupId_userId: { groupId, userId: senderId } },
    update: { lastReadAt: message.createdAt },
    create: { groupId, userId: senderId, lastReadAt: message.createdAt },
  });

  broadcastToGroup(groupId, { type: "message", groupId, message });

  return message;
}

export async function markGroupRead(groupId: string, userId: string) {
  await prisma.chatGroupRead.upsert({
    where: { groupId_userId: { groupId, userId } },
    update: { lastReadAt: new Date() },
    create: { groupId, userId, lastReadAt: new Date() },
  });
}
