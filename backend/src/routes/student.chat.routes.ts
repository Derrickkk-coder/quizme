import { Router } from "express";
import { z } from "zod";
import { Role } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { authenticate, requireRole } from "../middleware/auth";
import { validateBody, validateQuery } from "../middleware/validate";
import { asyncHandler } from "../utils/asyncHandler";
import { HttpError } from "../middleware/errorHandler";
import {
  assertStudentGroupAccess,
  createMessage,
  listGroupsForStudent,
  listMessages,
  listMessagesSince,
  markGroupRead,
} from "../lib/chat";

const router = Router();
router.use(authenticate, requireRole(Role.STUDENT));

async function requireStudentClassId(userId: string): Promise<string | null> {
  const profile = await prisma.studentProfile.findUnique({ where: { userId } });
  if (!profile) throw new HttpError(403, "No student profile is associated with this account");
  return profile.classId;
}

router.get(
  "/groups",
  asyncHandler(async (req, res) => {
    const classId = await requireStudentClassId(req.user!.sub);
    const groups = await listGroupsForStudent(classId, req.user!.sub);
    res.json({ data: groups });
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
    const classId = await requireStudentClassId(req.user!.sub);
    await assertStudentGroupAccess(req.params.id, classId);

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
    const classId = await requireStudentClassId(req.user!.sub);
    await assertStudentGroupAccess(req.params.id, classId);
    const message = await createMessage(req.params.id, req.user!.sub, req.body.text);
    res.status(201).json({ data: message });
  })
);

router.post(
  "/groups/:id/read",
  asyncHandler(async (req, res) => {
    const classId = await requireStudentClassId(req.user!.sub);
    await assertStudentGroupAccess(req.params.id, classId);
    await markGroupRead(req.params.id, req.user!.sub);
    res.status(204).send();
  })
);

export default router;
