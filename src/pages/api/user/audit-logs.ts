import { getAuth } from "@clerk/nextjs/server";
import { PrismaClient } from "@prisma/client";
import type { NextApiRequest, NextApiResponse } from "next";

const prisma = new PrismaClient();

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  const { userId } = getAuth(req);
  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  const auditLogs = await prisma.auditLog.findMany({
    where: { userId },
    orderBy: { timestamp: "desc" },
  });
  return res.status(200).json(auditLogs);
}
