import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Create a new portfolio
export async function createPortfolio(userId: string, name: string) {
  return prisma.portfolio.create({
    data: { userId, name },
  });
}

// Get all portfolios for a user
export async function getPortfoliosByUser(userId: string) {
  return prisma.portfolio.findMany({
    where: { userId },
  });
}

// Update a portfolio's name
export async function updatePortfolioName(portfolioId: string, name: string) {
  return prisma.portfolio.update({
    where: { id: portfolioId },
    data: { name },
  });
}

// Delete a portfolio
export async function deletePortfolio(portfolioId: string) {
  return prisma.portfolio.delete({
    where: { id: portfolioId },
  });
}
