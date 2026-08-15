import jwt from "jsonwebtoken";
import { env } from "./env";
import { Role } from "@prisma/client";

export interface AuthTokenPayload {
  sub: string;
  role: Role;
  email: string;
  name: string;
}

export function signToken(payload: AuthTokenPayload): string {
  return jwt.sign(payload, env.jwtSecret, { expiresIn: env.jwtExpiresIn as jwt.SignOptions["expiresIn"] });
}

export function verifyToken(token: string): AuthTokenPayload {
  return jwt.verify(token, env.jwtSecret) as AuthTokenPayload;
}
