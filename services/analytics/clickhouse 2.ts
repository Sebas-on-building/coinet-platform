import { createClient } from '@clickhouse/client';

const clickhouse = createClient({
  host: process.env.CLICKHOUSE_HOST || 'http://localhost:8123',
  username: process.env.CLICKHOUSE_USER || 'default',
  password: process.env.CLICKHOUSE_PASSWORD || '',
  database: process.env.CLICKHOUSE_DB || 'default',
});

export async function queryMarketTicks({
  symbol,
  from,
  to,
  limit = 1000,
}: {
  symbol?: string;
  from?: string;
  to?: string;
  limit?: number;
}) {
  let where = [];
  if (symbol) where.push(`symbol = '${symbol}'`);
  if (from) where.push(`time >= '${from}'`);
  if (to) where.push(`time <= '${to}'`);
  const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const sql = `
    SELECT time, symbol, price, volume
    FROM market_ticks_ch
    ${whereClause}
    ORDER BY time DESC
    LIMIT ${limit}
  `;
  const result = await clickhouse.query({ query: sql, format: 'JSONEachRow' });
  return result.json();
}

export async function queryCrossMarketCorrelation(symbolA: string, symbolB: string, from: string, to: string) {
  const sql = `
    SELECT corr(a.price, b.price) AS correlation
    FROM
      (SELECT time, price FROM market_ticks_ch WHERE symbol = '${symbolA}' AND time >= '${from}' AND time <= '${to}') AS a
    JOIN
      (SELECT time, price FROM market_ticks_ch WHERE symbol = '${symbolB}' AND time >= '${from}' AND time <= '${to}') AS b
    ON a.time = b.time
  `;
  const result = await clickhouse.query({ query: sql, format: 'JSONEachRow' });
  return result.json();
} 