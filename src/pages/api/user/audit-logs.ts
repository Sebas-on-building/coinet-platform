import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]";
import { PrismaClient } from "../../../generated/prisma-client";
import type { NextApiRequest, NextApiResponse } from "next";

const prisma = new PrismaClient();

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  const session = await getServerSession(req, res, authOptions);
  if (!session || !session.user?.email) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
  });
  if (!user) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  const auditLogs = await prisma.auditLog.findMany({
    where: { userId: user.id },
    orderBy: { timestamp: "desc" },
  });
  return res.status(200).json(auditLogs);
}
