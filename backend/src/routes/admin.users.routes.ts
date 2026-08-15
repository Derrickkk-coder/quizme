import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { Role } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { authenticate, requireRole } from "../middleware/auth";
import { validateBody, validateQuery } from "../middleware/validate";
import { asyncHandler } from "../utils/asyncHandler";
import { HttpError } from "../middleware/errorHandler";
import { recordAudit } from "../lib/audit";
import { generateStaffCode, generateStudentCode, generateTempPassword } from "../utils/codes";
import { paginationMeta, paginationSchema } from "../utils/pagination";

const router = Router();
router.use(authenticate, requireRole(Role.ADMIN));

const listQuerySchema = paginationSchema.extend({
  role: z.nativeEnum(Role).optional(),
  search: z.string().optional(),
  classId: z.string().optional(),
  isActive: z
    .enum(["true", "false"])
    .optional()
    .transform((v) => (v === undefined ? undefined : v === "true")),
});

router.get(
  "/",
  validateQuery(listQuerySchema),
  asyncHandler(async (req, res) => {
    const { page, pageSize, role, search, classId, isActive } = req.query as unknown as z.infer<typeof listQuerySchema>;

    const where: any = {
      ...(role ? { role } : {}),
      ...(isActive !== undefined ? { isActive } : {}),
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: "insensitive" } },
              { email: { contains: search, mode: "insensitive" } },
              { studentProfile: { studentCode: { contains: search, mode: "insensitive" } } },
              { teacherProfile: { staffCode: { contains: search, mode: "insensitive" } } },
            ],
          }
        : {}),
      ...(classId ? { studentProfile: { classId } } : {}),
    };

    const [total, users] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          studentProfile: { include: { class: true } },
          teacherProfile: { include: { assignments: { include: { class: true, subject: true } } } },
        },
      }),
    ]);

    res.json({ data: users.map(stripSensitive), meta: paginationMeta(total, page, pageSize) });
  })
);

function stripSensitive(user: any) {
  const { passwordHash, ...rest } = user;
  return rest;
}

const createUserSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  role: z.enum([Role.STUDENT, Role.TEACHER, Role.ADMIN]),
  classId: z.string().optional(),
});

router.post(
  "/",
  validateBody(createUserSchema),
  asyncHandler(async (req, res) => {
    const { name, email, role, classId } = req.body;

    const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (existing) throw new HttpError(409, "A user with this email already exists");

    if (role === Role.STUDENT && !classId) {
      throw new HttpError(400, "classId is required when creating a student");
    }

    const tempPassword = generateTempPassword();
    const passwordHash = await bcrypt.hash(tempPassword, 12);

    const user = await prisma.user.create({
      data: {
        name,
        email: email.toLowerCase(),
        role,
        passwordHash,
        mustResetPassword: true,
        ...(role === Role.STUDENT
          ? { studentProfile: { create: { studentCode: generateStudentCode(), classId } } }
          : {}),
        ...(role === Role.TEACHER ? { teacherProfile: { create: { staffCode: generateStaffCode() } } } : {}),
      },
      include: { studentProfile: true, teacherProfile: true },
    });

    await recordAudit({
      actorId: req.user!.sub,
      action: "USER_CREATED",
      entityType: "User",
      entityId: user.id,
      metadata: { role },
      req,
    });

    res.status(201).json({ user: stripSensitive(user), tempPassword });
  })
);

const updateUserSchema = z.object({
  name: z.string().min(2).optional(),
  email: z.string().email().optional(),
  classId: z.string().nullable().optional(),
  isActive: z.boolean().optional(),
});

router.patch(
  "/:id",
  validateBody(updateUserSchema),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { name, email, classId, isActive } = req.body;

    const user = await prisma.user.findUnique({ where: { id }, include: { studentProfile: true } });
    if (!user) throw new HttpError(404, "User not found");

    await prisma.user.update({
      where: { id },
      data: {
        ...(name ? { name } : {}),
        ...(email ? { email: email.toLowerCase() } : {}),
        ...(isActive !== undefined ? { isActive } : {}),
      },
    });

    if (classId !== undefined && user.studentProfile) {
      await prisma.studentProfile.update({ where: { userId: id }, data: { classId } });
    }

    await recordAudit({
      actorId: req.user!.sub,
      action: isActive === false ? "USER_DEACTIVATED" : isActive === true ? "USER_ACTIVATED" : "USER_UPDATED",
      entityType: "User",
      entityId: id,
      req,
    });

    const updated = await prisma.user.findUnique({
      where: { id },
      include: { studentProfile: { include: { class: true } }, teacherProfile: true },
    });
    res.json({ user: stripSensitive(updated) });
  })
);

router.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    if (id === req.user!.sub) throw new HttpError(400, "You cannot delete your own account");

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) throw new HttpError(404, "User not found");

    await prisma.user.delete({ where: { id } });

    await recordAudit({ actorId: req.user!.sub, action: "USER_DELETED", entityType: "User", entityId: id, req });

    res.status(204).send();
  })
);

router.post(
  "/:id/reset-password",
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) throw new HttpError(404, "User not found");

    const tempPassword = generateTempPassword();
    const passwordHash = await bcrypt.hash(tempPassword, 12);

    await prisma.user.update({ where: { id }, data: { passwordHash, mustResetPassword: true } });

    await recordAudit({ actorId: req.user!.sub, action: "PASSWORD_RESET_BY_ADMIN", entityType: "User", entityId: id, req });

    res.json({ tempPassword });
  })
);

export default router;
