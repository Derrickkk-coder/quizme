import { NextFunction, Request, Response } from "express";
import { Role } from "@prisma/client";
import { verifyToken, AuthTokenPayload } from "../lib/jwt";
import { prisma } from "../lib/prisma";
import { HttpError } from "./errorHandler";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthTokenPayload;
    }
  }
}

export async function authenticate(req: Request, _res: Response, next: NextFunction): Promise<void> {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith("Bearer ")) {
      throw new HttpError(401, "Authentication required");
    }
    const token = header.slice("Bearer ".length);
    const payload = verifyToken(token);

    const user = await prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user || !user.isActive) {
      throw new HttpError(401, "Account is not available");
    }

    req.user = payload;
    next();
  } catch (err) {
    if (err instanceof HttpError) return next(err);
    next(new HttpError(401, "Invalid or expired session"));
  }
}

export function requireRole(...roles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) return next(new HttpError(401, "Authentication required"));
    if (!roles.includes(req.user.role)) {
      return next(new HttpError(403, "You do not have permission to perform this action"));
    }
    next();
  };
}
