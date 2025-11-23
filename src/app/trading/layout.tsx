import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Advanced Trading Dashboard | Coinet',
  description: 'Professional-grade cryptocurrency trading platform with real-time charts, orderbook, market depth, and portfolio tracking.',
  keywords: 'crypto trading, bitcoin trading, cryptocurrency exchange, trading dashboard, market analysis, trading chart',
  openGraph: {
    title: 'Advanced Trading Dashboard | Coinet',
    description: 'Professional-grade cryptocurrency trading platform with real-time market data',
    images: ['/images/trading-dashboard-preview.jpg'],
  },
};

export default function TradingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <section>
      {children}
    </section>
  );
} 