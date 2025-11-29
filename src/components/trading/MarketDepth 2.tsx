import React, { useEffect, useRef } from 'react';
import { Chart, registerables } from 'chart.js';

// Register Chart.js components
Chart.register(...registerables);

// Types
interface OrderBookEntry {
  price: number;
  amount: number;
  total: number;
  type: 'bid' | 'ask';
}

interface MarketDepthProps {
  data: {
    asks: OrderBookEntry[];
    bids: OrderBookEntry[];
  };
  lastPrice: number;
  market: { base: string; quote: string };
  precision?: number;
}

const MarketDepth: React.FC<MarketDepthProps> = ({
  data,
  lastPrice,
  market,
  precision = 2,
}) => {
  const chartRef = useRef<HTMLCanvasElement>(null);
  const chartInstance = useRef<Chart | null>(null);

  // Prepare data for chart
  const prepareDatasets = () => {
    // Sort bids in descending order (highest bid first)
    const bids = [...data.bids].sort((a, b) => b.price - a.price);

    // Sort asks in ascending order (lowest ask first)
    const asks = [...data.asks].sort((a, b) => a.price - b.price);

    // Calculate accumulated depth
    const bidPoints = bids.reduce<{ price: number; total: number }[]>((acc, bid, index) => {
      const prevTotal = index > 0 ? acc[index - 1].total : 0;
      acc.push({ price: bid.price, total: prevTotal + bid.amount });
      return acc;
    }, []);

    const askPoints = asks.reduce<{ price: number; total: number }[]>((acc, ask, index) => {
      const prevTotal = index > 0 ? acc[index - 1].total : 0;
      acc.push({ price: ask.price, total: prevTotal + ask.amount });
      return acc;
    }, []);

    return {
      bidPrices: bidPoints.map(point => point.price),
      bidTotals: bidPoints.map(point => point.total),
      askPrices: askPoints.map(point => point.price),
      askTotals: askPoints.map(point => point.total),
    };
  };

  // Create or update chart
  useEffect(() => {
    if (!chartRef.current) return;

    // Prepare data
    const { bidPrices, bidTotals, askPrices, askTotals } = prepareDatasets();

    // Destroy existing chart
    if (chartInstance.current) {
      chartInstance.current.destroy();
    }

    // Create new chart
    const ctx = chartRef.current.getContext('2d');
    if (!ctx) return;

    chartInstance.current = new Chart(ctx, {
      type: 'line',
      data: {
        datasets: [
          {
            label: 'Bids',
            data: bidPrices.map((price, index) => ({
              x: price,
              y: bidTotals[index],
            })),
            borderColor: 'rgba(46, 204, 113, 0.8)',
            backgroundColor: 'rgba(46, 204, 113, 0.2)',
            pointRadius: 0,
            pointHoverRadius: 3,
            pointHoverBackgroundColor: 'rgba(46, 204, 113, 1)',
            fill: 'start',
            stepped: true,
          },
          {
            label: 'Asks',
            data: askPrices.map((price, index) => ({
              x: price,
              y: askTotals[index],
            })),
            borderColor: 'rgba(231, 76, 60, 0.8)',
            backgroundColor: 'rgba(231, 76, 60, 0.2)',
            pointRadius: 0,
            pointHoverRadius: 3,
            pointHoverBackgroundColor: 'rgba(231, 76, 60, 1)',
            fill: 'start',
            stepped: true,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        interaction: {
          intersect: false,
          mode: 'index',
        },
        scales: {
          x: {
            grid: {
              color: 'rgba(200, 200, 200, 0.1)',
            },
            title: {
              display: true,
              text: `Price (${market.quote})`,
              font: {
                size: 10,
              },
            },
          },
          y: {
            grid: {
              color: 'rgba(200, 200, 200, 0.1)',
            },
            title: {
              display: true,
              text: `Cumulative Amount (${market.base})`,
              font: {
                size: 10,
              },
            },
          },
        },
        plugins: {
          tooltip: {
            callbacks: {
              label: (context) => {
                const label = context.dataset.label || '';
                const price = parseFloat(context.parsed.x.toString()).toFixed(precision);
                const amount = parseFloat(context.parsed.y.toString()).toFixed(precision);
                return `${label}: ${amount} ${market.base} at ${price} ${market.quote}`;
              },
            },
          },
          legend: {
            position: 'top',
            labels: {
              font: {
                size: 10,
              },
            },
          },
          annotation: {
            annotations: {
              lastPrice: {
                type: 'line',
                xMin: lastPrice,
                xMax: lastPrice,
                borderColor: 'rgba(99, 132, 255, 0.8)',
                borderWidth: 1,
                borderDash: [5, 5],
                label: {
                  backgroundColor: 'rgba(99, 132, 255, 0.8)',
                  content: `Last Price: ${lastPrice.toFixed(precision)}`,
                  display: true,
                  position: 'center',
                  font: {
                    size: 10,
                  },
                },
              },
            },
          },
        },
      },
    });

    return () => {
      if (chartInstance.current) {
        chartInstance.current.destroy();
        chartInstance.current = null;
      }
    };
  }, [data.asks, data.bids, lastPrice, market.base, market.quote, precision]);

  return (
    <div className="h-full w-full">
      <canvas ref={chartRef}></canvas>
    </div>
  );
};

export default MarketDepth;
