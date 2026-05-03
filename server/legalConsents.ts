import type { Request } from "express";
import { and, desc, eq } from "drizzle-orm";
import { db } from "./db";
import { legalConsents } from "@shared/schema";
import {
  LEGAL_DOCUMENT_VERSIONS,
  LEGAL_DOCUMENT_TYPES,
  requiredConsentsForRole,
  type LegalDocumentType,
} from "@shared/legalVersions";

function getClientIp(req: Request): string | null {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded.length > 0) {
    return forwarded.split(",")[0].trim().slice(0, 64);
  }
  if (Array.isArray(forwarded) && forwarded.length > 0) {
    return forwarded[0].slice(0, 64);
  }
  return (req.ip || req.socket?.remoteAddress || "").slice(0, 64) || null;
}

function getUserAgent(req: Request): string | null {
  const ua = req.headers["user-agent"];
  return typeof ua === "string" ? ua.slice(0, 1024) : null;
}

export async function recordConsents(
  userId: string,
  documents: LegalDocumentType[],
  req: Request,
): Promise<void> {
  if (documents.length === 0) return;
  const ip = getClientIp(req);
  const ua = getUserAgent(req);
  const rows = documents.map((doc) => ({
    userId,
    documentType: doc,
    version: LEGAL_DOCUMENT_VERSIONS[doc],
    ipAddress: ip,
    userAgent: ua,
  }));
  await db.insert(legalConsents).values(rows);
}

export function validateConsentsForRole(
  role: string,
  accepted: unknown,
): { ok: true; documents: LegalDocumentType[] } | { ok: false; message: string } {
  const required = requiredConsentsForRole(role);
  if (required.length === 0) {
    return { ok: true, documents: [] };
  }
  if (!Array.isArray(accepted)) {
    return { ok: false, message: "You must accept the required legal documents to continue." };
  }
  const acceptedSet = new Set(
    accepted.filter((v): v is string => typeof v === "string"),
  );
  for (const doc of required) {
    if (!acceptedSet.has(doc)) {
      return {
        ok: false,
        message: "You must accept the Privacy Policy and the relevant terms/agreements to continue.",
      };
    }
  }
  return { ok: true, documents: required };
}

/**
 * Returns the list of legal documents this user must (re)accept.
 * A document is "pending" if there is no row for it, or the latest accepted
 * version differs from the current version.
 */
export async function getPendingConsents(
  userId: string,
  role: string,
): Promise<LegalDocumentType[]> {
  const required = requiredConsentsForRole(role);
  if (required.length === 0) return [];

  const rows = await db
    .select({
      documentType: legalConsents.documentType,
      version: legalConsents.version,
      acceptedAt: legalConsents.acceptedAt,
    })
    .from(legalConsents)
    .where(eq(legalConsents.userId, userId))
    .orderBy(desc(legalConsents.acceptedAt));

  // Latest accepted version per documentType
  const latest = new Map<string, string>();
  for (const r of rows) {
    if (!latest.has(r.documentType)) {
      latest.set(r.documentType, r.version);
    }
  }

  return required.filter(
    (doc) => latest.get(doc) !== LEGAL_DOCUMENT_VERSIONS[doc],
  );
}

export function isValidDocumentType(value: unknown): value is LegalDocumentType {
  return typeof value === "string" && (LEGAL_DOCUMENT_TYPES as string[]).includes(value);
}
