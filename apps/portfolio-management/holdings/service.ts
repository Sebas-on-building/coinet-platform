import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

// Create a holding
export async function createHolding(portfolioId: string, symbol: string, quantity: number, avgCost: number) {
  return prisma.portfolioHolding.create({
    data: { portfolioId, symbol, quantity, avgCost },
  });
}

// Read holdings for a portfolio
export async function getHoldingsByPortfolio(portfolioId: string) {
  return prisma.portfolioHolding.findMany({
    where: { portfolioId },
  });
}

// Update a holding
export async function updateHolding(holdingId: string, quantity: number, avgCost: number) {
  return prisma.portfolioHolding.update({
    where: { id: holdingId },
    data: { quantity, avgCost },
  });
}

// Delete a holding
export async function deleteHolding(holdingId: string) {
  return prisma.portfolioHolding.delete({
    where: { id: holdingId },
  });
}

export class HoldingsService {
  async addAsset(portfolioId: string, symbol: string, quantity: number, price: number) {
    // Add asset to portfolio
    // Extensible: support new asset types
  }
} 