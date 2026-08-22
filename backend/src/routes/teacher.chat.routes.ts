import { Router } from "express";
import { z } from "zod";
import { Role } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { authenticate, requireRole } from "../middleware/auth";
import { validateBody, validateQuery } from "../middleware/validate";
import { asyncHandler } from "../utils/asyncHandler";
import { HttpError } from "../middleware/errorHandler";
import { requireTeacherProfileId } from "../utils/context";
import { recordAudit } from "../lib/audit";
import {
  assertTeacherGroupAccess,
  createMessage,
  listGroupsForTeacher,
  listMessages,
  listMessagesSince,
  markGroupRead,
  serializeGroup,
} from "../lib/chat";

const router = Router();
router.use(authenticate, requireRole(Role.TEACHER));

router.get(
  "/groups",
  asyncHandler(async (req, res) => {
    const teacherId = await requireTeacherProfileId(req);
    const groups = await listGroupsForTeacher(teacherId, req.user!.sub);
    res.json({ data: groups });
  })
);

const createGroupSchema = z.object({
  subjectId: z.string(),
  classId: z.string(),
});

router.post(
  "/groups",
  validateBody(createGroupSchema),
  asyncHandler(async (req, res) => {
    const teacherId = await requireTeacherProfileId(req);
    const { subjectId, classId } = req.body;

    const assignment = await prisma.teacherClassSubject.findUnique({ where: { teacherId_subjectId: { teacherId, subjectId } } });
    if (!assignment) throw new HttpError(403, "You aren't assigned to this subject");

    const [subject, klass] = await Promise.all([
      prisma.subject.findUnique({ where: { id: subjectId } }),
      prisma.class.findUnique({ where: { id: classId } }),
    ]);
    if (!subject) throw new HttpError(404, "Subject not found");
    if (!klass) throw new HttpError(404, "Class not found");

    const existing = await prisma.chatGroup.findUnique({ where: { subjectId_classId: { subjectId, classId } } });
    if (existing) {
      res.json({ data: await serializeGroup(existing.id, req.user!.sub) });
      return;
    }

    const created = await prisma.chatGroup.create({
      data: { subjectId, classId, teacherId, name: `${subject.name} · ${klass.name}` },
    });

    await recordAudit({ actorId: req.user!.sub, action: "CHAT_GROUP_CREATED", entityType: "ChatGroup", entityId: created.id, req });

    res.status(201).json({ data: await serializeGroup(created.id, req.user!.sub) });
  })
);

router.delete(
  "/groups/:id",
  asyncHandler(async (req, res) => {
    const teacherId = await requireTeacherProfileId(req);
    const group = await prisma.chatGroup.findUnique({ where: { id: req.params.id } });
    if (!group) throw new HttpError(404, "Chat group not found");
    if (group.teacherId !== teacherId) throw new HttpError(403, "Only the teacher who created this chat can delete it");

    await prisma.chatGroup.delete({ where: { id: group.id } });
    await recordAudit({ actorId: req.user!.sub, action: "CHAT_GROUP_DELETED", entityType: "ChatGroup", entityId: group.id, req });
    res.status(204).send();
  })
);

const messagesQuerySchema = z.object({
  before: z.string().optional(),
  since: z.string().optional(),
});

router.get(
  "/groups/:id/messages",
  validateQuery(messagesQuerySchema),
  asyncHandler(async (req, res) => {
    const teacherId = await requireTeacherProfileId(req);
    await assertTeacherGroupAccess(req.params.id, teacherId);

    const { before, since } = req.query as unknown as z.infer<typeof messagesQuerySchema>;
    const messages = since ? await listMessagesSince(req.params.id, since) : await listMessages(req.params.id, before);
    res.json({ data: messages });
  })
);

const sendMessageSchema = z.object({ text: z.string().min(1).max(2000) });

router.post(
  "/groups/:id/messages",
  validateBody(sendMessageSchema),
  asyncHandler(async (req, res) => {
    const teacherId = await requireTeacherProfileId(req);
    await assertTeacherGroupAccess(req.params.id, teacherId);
    const message = await createMessage(req.params.id, req.user!.sub, req.body.text);
    res.status(201).json({ data: message });
  })
);

router.post(
  "/groups/:id/read",
  asyncHandler(async (req, res) => {
    const teacherId = await requireTeacherProfileId(req);
    await assertTeacherGroupAccess(req.params.id, teacherId);
    await markGroupRead(req.params.id, req.user!.sub);
    res.status(204).send();
  })
);

export default router;
