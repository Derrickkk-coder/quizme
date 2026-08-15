import { Request } from "express";
import { prisma } from "../lib/prisma";
import { HttpError } from "../middleware/errorHandler";

export async function requireTeacherProfileId(req: Request): Promise<string> {
  const profile = await prisma.teacherProfile.findUnique({ where: { userId: req.user!.sub } });
  if (!profile) throw new HttpError(403, "No teacher profile is associated with this account");
  return profile.id;
}

export async function requireStudentProfileId(req: Request): Promise<string> {
  const profile = await prisma.studentProfile.findUnique({ where: { userId: req.user!.sub } });
  if (!profile) throw new HttpError(403, "No student profile is associated with this account");
  return profile.id;
}
