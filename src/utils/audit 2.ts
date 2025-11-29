import prisma from "../../prisma/client";
import crypto from "crypto";

export async function logAudit({ userId, pluginId, action, details }) {
  const signature = crypto.createHash("sha256").update(`${userId}:${pluginId}:${action}:${details}:${Date.now()}`).digest("hex");
  await prisma.auditLog.create({
    data: { userId, pluginId, action, details, signature }
  });
} 