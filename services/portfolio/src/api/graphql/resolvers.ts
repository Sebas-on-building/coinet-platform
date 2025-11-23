import { portfolios } from '../../models/Portfolio';
import { publishPortfolioEvent } from '../../kafka/producer';

export const resolvers = {
  Query: {
    portfolios: () => portfolios,
    portfolio: (_: any, { id }: { id: string }) => portfolios.find(p => p.id === id),
  },
  Mutation: {
    createPortfolio: async (_: any, { name, assets }: any) => {
      const portfolio = { id: String(portfolios.length + 1), name, assets };
      portfolios.push(portfolio);
      await publishPortfolioEvent({ type: 'created', portfolio });
      return portfolio;
    },
    updatePortfolio: async (_: any, { id, name, assets }: any) => {
      const idx = portfolios.findIndex(p => p.id === id);
      if (idx === -1) throw new Error('Not found');
      if (name) portfolios[idx].name = name;
      if (assets) portfolios[idx].assets = assets;
      await publishPortfolioEvent({ type: 'updated', portfolio: portfolios[idx] });
      return portfolios[idx];
    },
    deletePortfolio: async (_: any, { id }: any) => {
      const idx = portfolios.findIndex(p => p.id === id);
      if (idx === -1) return false;
      const [deleted] = portfolios.splice(idx, 1);
      await publishPortfolioEvent({ type: 'deleted', portfolio: deleted });
      return true;
    },
  },
}; 