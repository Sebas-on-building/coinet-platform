import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

// Create an alert
export async function createAlert(userId: string, symbol: string, condition: string, threshold: number) {
  return prisma.alert.create({
    data: { userId, symbol, condition, threshold },
  });
}

// Read alerts for a user
export async function getAlertsByUser(userId: string) {
  return prisma.alert.findMany({
    where: { userId },
  });
}

// Update an alert
export async function updateAlert(alertId: string, data: Partial<{ symbol: string, condition: string, threshold: number, isActive: boolean }>) {
  return prisma.alert.update({
    where: { id: alertId },
    data,
  });
}

// Delete an alert
export async function deleteAlert(alertId: string) {
  return prisma.alert.delete({
    where: { id: alertId },
  });
} 