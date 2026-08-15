import { Router } from "express";
import { Role } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { authenticate, requireRole } from "../middleware/auth";
import { asyncHandler } from "../utils/asyncHandler";
import { requireTeacherProfileId } from "../utils/context";

const router = Router();
router.use(authenticate, requireRole(Role.TEACHER));

router.get(
  "/classes",
  asyncHandler(async (req, res) => {
    const teacherId = await requireTeacherProfileId(req);
    const assignments = await prisma.teacherClassSubject.findMany({
      where: { teacherId },
      include: { class: true },
      distinct: ["classId"],
    });
    res.json({ data: assignments.map((a) => a.class) });
  })
);

router.get(
  "/subjects",
  asyncHandler(async (req, res) => {
    const teacherId = await requireTeacherProfileId(req);
    const assignments = await prisma.teacherClassSubject.findMany({
      where: { teacherId },
      include: { subject: true },
      distinct: ["subjectId"],
    });
    res.json({ data: assignments.map((a) => a.subject) });
  })
);

router.get(
  "/students",
  asyncHandler(async (req, res) => {
    const teacherId = await requireTeacherProfileId(req);
    const classId = req.query.classId as string | undefined;

    const assignedClassIds = (
      await prisma.teacherClassSubject.findMany({ where: { teacherId }, distinct: ["classId"] })
    ).map((a) => a.classId);

    if (classId && !assignedClassIds.includes(classId)) {
      res.json({ data: [] });
      return;
    }

    const students = await prisma.studentProfile.findMany({
      where: { classId: classId ?? { in: assignedClassIds } },
      include: { user: true, class: true },
      orderBy: { user: { name: "asc" } },
    });
    res.json({ data: students });
  })
);

export default router;
