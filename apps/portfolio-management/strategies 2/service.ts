import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

// Create a strategy
export async function createStrategy(userId: string, name: string, definition: object) {
  return prisma.strategy.create({
    data: { userId, name, definition },
  });
}

// Read strategies for a user
export async function getStrategiesByUser(userId: string) {
  return prisma.strategy.findMany({
    where: { userId },
  });
}

// Update a strategy
export async function updateStrategy(strategyId: string, data: Partial<{ name: string, definition: object }>) {
  return prisma.strategy.update({
    where: { id: strategyId },
    data,
  });
}

// Delete a strategy
export async function deleteStrategy(strategyId: string) {
  return prisma.strategy.delete({
    where: { id: strategyId },
  });
} 