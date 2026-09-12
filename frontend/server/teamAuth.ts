import { createHash, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { parse } from "cookie";
import type { Request, Response } from "express";
import { getSessionCookieOptions } from "./_core/cookies";

export const PARTICIPANT_COOKIE = "code_cortex_participant";
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 14;

export function normalizeTeamId(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, "-");
}

export function normalizeTeamName(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

export function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const derivedKey = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${derivedKey}`;
}

export function verifyPassword(password: string, storedHash: string) {
  const [salt, key] = storedHash.split(":");
  if (!salt || !key) return false;
  const derivedKey = scryptSync(password, salt, 64);
  const storedKey = Buffer.from(key, "hex");
  return storedKey.length === derivedKey.length && timingSafeEqual(storedKey, derivedKey);
}

export function createSessionToken() {
  return randomBytes(32).toString("hex");
}

export function hashSessionToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function getSessionExpiry() {
  return new Date(Date.now() + SESSION_TTL_MS);
}

export function getParticipantToken(req: Request) {
  return parse(req.headers.cookie ?? "")[PARTICIPANT_COOKIE];
}

export function setParticipantCookie(req: Request, res: Response, token: string) {
  res.cookie(PARTICIPANT_COOKIE, token, {
    ...getSessionCookieOptions(req),
    maxAge: SESSION_TTL_MS,
  });
}

export function clearParticipantCookie(req: Request, res: Response) {
  res.clearCookie(PARTICIPANT_COOKIE, getSessionCookieOptions(req));
}
