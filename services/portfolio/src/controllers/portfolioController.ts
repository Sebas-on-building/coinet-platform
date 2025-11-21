export const portfolios: any[] = [];

export function getPortfolios() {
  return portfolios;
}

export function createPortfolio(data: any) {
  const portfolio = { id: String(portfolios.length + 1), ...data };
  portfolios.push(portfolio);
  return portfolio;
}

export function getPortfolio(id: string) {
  return portfolios.find(p => p.id === id);
}

export function updatePortfolio(id: string, data: any) {
  const idx = portfolios.findIndex(p => p.id === id);
  if (idx === -1) throw new Error('Not found');
  portfolios[idx] = { ...portfolios[idx], ...data };
  return portfolios[idx];
}

export function deletePortfolio(id: string) {
  const idx = portfolios.findIndex(p => p.id === id);
  if (idx === -1) throw new Error('Not found');
  return portfolios.splice(idx, 1)[0];
} 