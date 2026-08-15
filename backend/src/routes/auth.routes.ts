import { Router } from "express";
import rateLimit from "express-rate-limit";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { signToken } from "../lib/jwt";
import { validateBody } from "../middleware/validate";
import { authenticate } from "../middleware/auth";
import { asyncHandler } from "../utils/asyncHandler";
import { HttpError } from "../middleware/errorHandler";
import { recordAudit } from "../lib/audit";

const router = Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many login attempts. Please try again later." },
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

router.post(
  "/login",
  loginLimiter,
  validateBody(loginSchema),
  asyncHandler(async (req, res) => {
    const { email, password } = req.body;

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      include: {
        studentProfile: { include: { class: true } },
        teacherProfile: true,
      },
    });

    if (!user || !user.isActive) {
      throw new HttpError(401, "Invalid email or password");
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      await recordAudit({ actorId: user.id, action: "LOGIN_FAILED", entityType: "User", entityId: user.id, req });
      throw new HttpError(401, "Invalid email or password");
    }

    const token = signToken({ sub: user.id, role: user.role, email: user.email, name: user.name });

    await recordAudit({ actorId: user.id, action: "LOGIN_SUCCESS", entityType: "User", entityId: user.id, req });

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        mustResetPassword: user.mustResetPassword,
        studentProfile: user.studentProfile,
        teacherProfile: user.teacherProfile,
      },
    });
  })
);

router.get(
  "/me",
  authenticate,
  asyncHandler(async (req, res) => {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.sub },
      include: {
        studentProfile: { include: { class: true } },
        teacherProfile: { include: { assignments: { include: { class: true, subject: true } } } },
      },
    });
    if (!user) throw new HttpError(404, "User not found");

    res.json({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      mustResetPassword: user.mustResetPassword,
      studentProfile: user.studentProfile,
      teacherProfile: user.teacherProfile,
    });
  })
);

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8, "New password must be at least 8 characters"),
});

router.post(
  "/change-password",
  authenticate,
  validateBody(changePasswordSchema),
  asyncHandler(async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    const user = await prisma.user.findUniqueOrThrow({ where: { id: req.user!.sub } });

    const valid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!valid) throw new HttpError(400, "Current password is incorrect");

    const passwordHash = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash, mustResetPassword: false },
    });

    await recordAudit({ actorId: user.id, action: "PASSWORD_CHANGED", entityType: "User", entityId: user.id, req });

    res.json({ message: "Password updated successfully" });
  })
);

export default router;
