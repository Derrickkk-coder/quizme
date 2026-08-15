import { NextFunction, Request, Response } from "express";
import { ZodTypeAny, z } from "zod";

export function validateBody<T extends ZodTypeAny>(schema: T) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    req.body = schema.parse(req.body) as z.infer<T>;
    next();
  };
}

export function validateQuery<T extends ZodTypeAny>(schema: T) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    req.query = schema.parse(req.query) as any;
    next();
  };
}
