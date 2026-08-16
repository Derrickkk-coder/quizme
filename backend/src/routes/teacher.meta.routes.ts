import { Router } from "express";
import { Role } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { authenticate, requireRole } from "../middleware/auth";
import { asyncHandler } from "../utils/asyncHandler";
import { requireTeacherProfileId } from "../utils/context";
import { safeUserSelect } from "../utils/safeSelects";

const router = Router();
router.use(authenticate, requireRole(Role.TEACHER));

router.get(
  "/classes",
  asyncHandler(async (req, res) => {
    await requireTeacherProfileId(req);
    // Every teacher can access every class — classes aren't restricted by assignment.
    const classes = await prisma.class.findMany({ orderBy: { name: "asc" } });
    res.json({ data: classes });
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
  "/terms",
  asyncHandler(async (_req, res) => {
    const years = await prisma.academicYear.findMany({
      orderBy: { startDate: "desc" },
      include: { terms: { orderBy: { startDate: "asc" } } },
    });
    res.json({ data: years });
  })
);

router.get(
  "/students",
  asyncHandler(async (req, res) => {
    await requireTeacherProfileId(req);
    const classId = req.query.classId as string | undefined;

    // Every teacher can access every class's students — not restricted by assignment.
    const students = await prisma.studentProfile.findMany({
      where: classId ? { classId } : {},
      include: { user: { select: safeUserSelect }, class: true },
      orderBy: { user: { name: "asc" } },
    });
    res.json({ data: students });
  })
);

export default router;
