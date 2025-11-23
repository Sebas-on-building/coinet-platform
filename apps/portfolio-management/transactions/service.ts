import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

// Create a transaction
export async function createTransaction(portfolioId: string, symbol: string, side: 'BUY' | 'SELL', quantity: number, price: number, executedAt: Date) {
  return prisma.transaction.create({
    data: { portfolioId, symbol, side, quantity, price, executedAt },
  });
}

// Read transactions for a portfolio
export async function getTransactionsByPortfolio(portfolioId: string) {
  return prisma.transaction.findMany({
    where: { portfolioId },
  });
}

// Update a transaction
export async function updateTransaction(transactionId: string, data: Partial<{ symbol: string, side: 'BUY' | 'SELL', quantity: number, price: number, executedAt: Date }>) {
  return prisma.transaction.update({
    where: { id: transactionId },
    data,
  });
}

// Delete a transaction
export async function deleteTransaction(transactionId: string) {
  return prisma.transaction.delete({
    where: { id: transactionId },
  });
} 