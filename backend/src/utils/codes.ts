import crypto from "crypto";

function randomDigits(length: number): string {
  return Array.from({ length }, () => crypto.randomInt(0, 10)).join("");
}

export function generateStudentCode(): string {
  return `STU-${randomDigits(6)}`;
}

export function generateStaffCode(): string {
  return `TCH-${randomDigits(6)}`;
}

export function generateTempPassword(): string {
  return crypto.randomBytes(6).toString("base64url");
}
