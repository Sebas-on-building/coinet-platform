import { getAuth } from "@clerk/nextjs/server";
import { PrismaClient } from "@prisma/client";
import type { NextApiRequest, NextApiResponse } from "next";
import { Parser as Json2csvParser } from "json2csv";

const prisma = new PrismaClient();

type PerScopeStatus = Record<string, string>;

declare module 'json2csv';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  const { userId } = getAuth(req);
  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  if (req.method === "POST" && req.query.action === "revoke") {
    const { consentId } = req.body;
    if (!consentId) return res.status(400).json({ error: "Missing consentId" });
    const consent = await prisma.consent.findUnique({
      where: { id: consentId },
    });
    if (!consent || consent.userId !== userId)
      return res.status(403).json({ error: "Forbidden" });
    const updated = await prisma.consent.update({
      where: { id: consentId },
      data: { revokedAt: new Date() },
    });
    return res.status(200).json(updated);
  }
  if (req.method === "POST" && req.query.action === "revoke-scope") {
    const { consentId, scope } = req.body;
    if (!consentId || !scope)
      return res.status(400).json({ error: "Missing consentId or scope" });
    const consent = await prisma.consent.findUnique({
      where: { id: consentId },
    });
    if (!consent || consent.userId !== userId)
      return res.status(403).json({ error: "Forbidden" });
    let perScopeStatus: PerScopeStatus = (consent.perScopeStatus || {}) as PerScopeStatus;
    if (typeof perScopeStatus === "string")
      perScopeStatus = JSON.parse(perScopeStatus);
    let scopesJson: string[] = [];
    if (Array.isArray(consent.scopesJson)) {
      scopesJson = consent.scopesJson as string[];
    } else if (typeof consent.scopesJson === "string") {
      try {
        scopesJson = JSON.parse(consent.scopesJson);
      } catch {
        scopesJson = [];
      }
    }
    if (!scopesJson.includes(scope))
      return res.status(400).json({ error: "Scope not found" });
    perScopeStatus[scope] = "revoked";
    // If all scopes revoked, set revokedAt
    const allRevoked = scopesJson.every((s: string) => perScopeStatus[s] === "revoked");
    const updated = await prisma.consent.update({
      where: { id: consentId },
      data: {
        perScopeStatus,
        revokedAt: allRevoked ? new Date() : null,
      },
    });
    await prisma.auditLog.create({
      data: {
        userId: userId,
        event: "SCOPE_REVOKE",
        provider: consent.provider,
        scopes: scope,
        timestamp: new Date(),
        details: JSON.stringify({ action: "scope_revoke", scope }),
      },
    });
    return res.status(200).json(updated);
  }
  if (req.method === "POST" && req.query.action === "restore-scope") {
    const { consentId, scope } = req.body;
    if (!consentId || !scope)
      return res.status(400).json({ error: "Missing consentId or scope" });
    const consent = await prisma.consent.findUnique({
      where: { id: consentId },
    });
    if (!consent || consent.userId !== userId)
      return res.status(403).json({ error: "Forbidden" });
    let perScopeStatus: PerScopeStatus = (consent.perScopeStatus || {}) as PerScopeStatus;
    if (typeof perScopeStatus === "string")
      perScopeStatus = JSON.parse(perScopeStatus);
    perScopeStatus[scope] = "approved";
    const anyApproved = Object.values(perScopeStatus).includes("approved");
    const updated = await prisma.consent.update({
      where: { id: consentId },
      data: {
        perScopeStatus,
        revokedAt: anyApproved ? null : consent.revokedAt,
      },
    });
    await prisma.auditLog.create({
      data: {
        userId: userId,
        event: "SCOPE_RESTORE",
        provider: consent.provider,
        scopes: scope,
        timestamp: new Date(),
        details: JSON.stringify({ action: "scope_restore", scope }),
      },
    });
    return res.status(200).json(updated);
  }
  if (req.method === "GET" && req.query.action === "export") {
    const type = req.query.type || "json";
    const consents = await prisma.consent.findMany({
      where: { userId: userId },
    });
    const auditLogs = await prisma.auditLog.findMany({
      where: { userId: userId },
    });

    await prisma.auditLog.create({
      data: {
        userId: userId,
        event: "EXPORT",
        provider: null,
        scopes: null,
        timestamp: new Date(),
        details: JSON.stringify({ type }),
      },
    });

    if (type === "csv") {
      const parser = new Json2csvParser({
        fields: [
          "id",
          "provider",
          "scopes",
          "scopesJson",
          "perScopeStatus",
          "consentedAt",
          "expiresAt",
          "revokedAt",
        ],
      });
      const csv = parser.parse(consents);
      res.setHeader("Content-Type", "text/csv");
      res.setHeader(
        "Content-Disposition",
        'attachment; filename="consents.csv"',
      );
      return res.status(200).send(csv);
    }
    res.setHeader("Content-Type", "application/json");
    res.setHeader(
      "Content-Disposition",
      'attachment; filename="consents.json"',
    );
    return res.status(200).json({ consents, auditLogs });
  }
  // Default: GET all consents
  const consents = await prisma.consent.findMany({
    where: { userId: userId },
  });
  return res.status(200).json(consents);
}
