/**
 * Export Data API Endpoint
 * 
 * Exports various types of data (historical prices, indicator values, or backtest results)
 * in Excel or CSV format for download.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from './auth/[...nextauth]';
import { z } from 'zod';
import ExcelJS from 'exceljs';
import { fetchHistoricalData } from '@/lib/backtester';
import { calculateSMA } from '@/lib/indicators/sma';
import { calculateEMA } from '@/lib/indicators/ema';
import { calculateRSI } from '@/lib/indicators/rsi';
import { calculateMACD } from '@/lib/indicators/macd';
import { createDataFromCandles, parseFormula, evalFormulaOnData } from '@/lib/formula';

// Input validation schema
const ExportQuerySchema = z.object({
  type: z.enum(['history', 'indicator', 'backtest', 'custom']),
  symbol: z.string().optional(),
  timeframe: z.string().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  indicator: z.string().optional(),
  period: z.string().optional().transform(val => val ? parseInt(val, 10) : undefined),
  formula: z.string().optional(),
  format: z.enum(['xlsx', 'csv']).default('xlsx'),
  backtestId: z.string().optional()
});

/**
 * Export Data API Handler
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Get authenticated user if authentication is enabled
  const session = await getServerSession(req, res, authOptions);

  // Validate query parameters
  const parseResult = ExportQuerySchema.safeParse(req.query);
  if (!parseResult.success) {
    return res.status(400).json({
      error: 'Invalid query parameters',
      details: parseResult.error.format()
    });
  }

  const { type, symbol, timeframe, from, to, indicator, period, formula, format, backtestId } = parseResult.data;

  try {
    // Create a new workbook
    const workbook = new ExcelJS.Workbook();
    let sheet;

    switch (type) {
      // Historical OHLCV data
      case 'history': {
        if (!symbol || !from || !to || !timeframe) {
          return res.status(400).json({ error: 'Missing required parameters for historical data export' });
        }

        // Fetch historical data
        const candles = await fetchHistoricalData(symbol, timeframe, from, to);

        if (!candles || candles.length === 0) {
          return res.status(404).json({ error: 'No data found for the specified parameters' });
        }

        // Create worksheet
        sheet = workbook.addWorksheet('Historical Data');

        // Set up columns
        sheet.columns = [
          { header: 'Time', key: 'time', width: 20 },
          { header: 'Open', key: 'open', width: 15 },
          { header: 'High', key: 'high', width: 15 },
          { header: 'Low', key: 'low', width: 15 },
          { header: 'Close', key: 'close', width: 15 },
          { header: 'Volume', key: 'volume', width: 15 }
        ];

        // Add data rows
        candles.forEach(candle => {
          sheet.addRow({
            time: new Date(candle.time as number),
            open: candle.open,
            high: candle.high,
            low: candle.low,
            close: candle.close,
            volume: candle.volume || 0
          });
        });

        // Format numbers
        sheet.getColumn('open').numFmt = '#,##0.00';
        sheet.getColumn('high').numFmt = '#,##0.00';
        sheet.getColumn('low').numFmt = '#,##0.00';
        sheet.getColumn('close').numFmt = '#,##0.00';
        sheet.getColumn('volume').numFmt = '#,##0';

        break;
      }

      // Technical indicator values
      case 'indicator': {
        if (!symbol || !from || !to || !timeframe || !indicator) {
          return res.status(400).json({ error: 'Missing required parameters for indicator data export' });
        }

        // Fetch historical data
        const candles = await fetchHistoricalData(symbol, timeframe, from, to);

        if (!candles || candles.length === 0) {
          return res.status(404).json({ error: 'No data found for the specified parameters' });
        }

        // Extract price series
        const prices = candles.map(c => c.close);
        const times = candles.map(c => c.time as number);

        // Calculate indicator values
        let indicatorValues: (number | null)[] = [];
        let indicatorName = indicator;
        let additionalValues: Record<string, (number | null)[]> = {};

        switch (indicator) {
          case 'SMA':
            if (!period) return res.status(400).json({ error: 'Period is required for SMA' });
            indicatorValues = calculateSMA(prices, period);
            indicatorName = `SMA(${period})`;
            break;

          case 'EMA':
            if (!period) return res.status(400).json({ error: 'Period is required for EMA' });
            indicatorValues = calculateEMA(prices, period);
            indicatorName = `EMA(${period})`;
            break;

          case 'RSI':
            if (!period) return res.status(400).json({ error: 'Period is required for RSI' });
            indicatorValues = calculateRSI(prices, period);
            indicatorName = `RSI(${period})`;
            break;

          case 'MACD':
            const fastPeriod = 12;
            const slowPeriod = 26;
            const signalPeriod = 9;
            const macdResult = calculateMACD(prices, fastPeriod, slowPeriod, signalPeriod);
            indicatorValues = macdResult.macdLine;
            additionalValues = {
              signal: macdResult.signalLine,
              histogram: macdResult.histogram
            };
            indicatorName = `MACD(${fastPeriod},${slowPeriod},${signalPeriod})`;
            break;

          default:
            return res.status(400).json({ error: 'Unsupported indicator type' });
        }

        // Create worksheet
        sheet = workbook.addWorksheet('Indicator Data');

        // Set up columns
        const columns: any[] = [
          { header: 'Time', key: 'time', width: 20 },
          { header: 'Price', key: 'price', width: 15 },
          { header: indicatorName, key: 'indicator', width: 15 }
        ];

        // Add additional columns for MACD
        if (indicator === 'MACD') {
          columns.push(
            { header: 'Signal Line', key: 'signal', width: 15 },
            { header: 'Histogram', key: 'histogram', width: 15 }
          );
        }

        sheet.columns = columns;

        // Add data rows
        for (let i = 0; i < prices.length; i++) {
          const row: any = {
            time: new Date(times[i]),
            price: prices[i],
            indicator: indicatorValues[i]
          };

          // Add additional values for MACD
          if (indicator === 'MACD') {
            row.signal = additionalValues.signal[i];
            row.histogram = additionalValues.histogram[i];
          }

          sheet.addRow(row);
        }

        // Format numbers
        sheet.getColumn('price').numFmt = '#,##0.00';
        sheet.getColumn('indicator').numFmt = '#,##0.00';

        if (indicator === 'MACD') {
          sheet.getColumn('signal').numFmt = '#,##0.00';
          sheet.getColumn('histogram').numFmt = '#,##0.00';
        }

        break;
      }

      // Custom formula
      case 'custom': {
        if (!symbol || !from || !to || !timeframe || !formula) {
          return res.status(400).json({ error: 'Missing required parameters for custom formula export' });
        }

        // Fetch historical data
        const candles = await fetchHistoricalData(symbol, timeframe, from, to);

        if (!candles || candles.length === 0) {
          return res.status(404).json({ error: 'No data found for the specified parameters' });
        }

        // Prepare data for formula evaluation
        const dataSeries = createDataFromCandles(candles);

        // Parse and evaluate formula
        const ast = parseFormula(formula);
        const result = evalFormulaOnData(ast, dataSeries);

        // Create worksheet
        sheet = workbook.addWorksheet('Custom Formula');

        // Set up columns
        sheet.columns = [
          { header: 'Time', key: 'time', width: 20 },
          { header: 'Price', key: 'price', width: 15 },
          { header: 'Formula Result', key: 'result', width: 20 }
        ];

        // Add data rows
        for (let i = 0; i < candles.length; i++) {
          sheet.addRow({
            time: new Date(candles[i].time as number),
            price: candles[i].close,
            result: result[i]
          });
        }

        // Format numbers
        sheet.getColumn('price').numFmt = '#,##0.00';
        sheet.getColumn('result').numFmt = '#,##0.00';

        break;
      }

      // Backtest results
      case 'backtest': {
        if (!backtestId) {
          return res.status(400).json({ error: 'Missing backtest ID for backtest export' });
        }

        // Fetch backtest result from database
        // This is a placeholder; you would implement this to retrieve 
        // the stored backtest result based on the backtestId
        const backtestResult = await fetchBacktestResult(backtestId);

        if (!backtestResult) {
          return res.status(404).json({ error: 'Backtest result not found' });
        }

        // Create equity curve worksheet
        const equityCurveSheet = workbook.addWorksheet('Equity Curve');

        equityCurveSheet.columns = [
          { header: 'Time', key: 'time', width: 20 },
          { header: 'Equity', key: 'value', width: 15 }
        ];

        backtestResult.equityCurve.forEach(point => {
          equityCurveSheet.addRow({
            time: new Date(point.time),
            value: point.value
          });
        });

        equityCurveSheet.getColumn('value').numFmt = '#,##0.00';

        // Create trades worksheet
        const tradesSheet = workbook.addWorksheet('Trades');

        tradesSheet.columns = [
          { header: 'Entry Time', key: 'entryTime', width: 20 },
          { header: 'Exit Time', key: 'exitTime', width: 20 },
          { header: 'Side', key: 'side', width: 10 },
          { header: 'Entry Price', key: 'entryPrice', width: 15 },
          { header: 'Exit Price', key: 'exitPrice', width: 15 },
          { header: 'Quantity', key: 'quantity', width: 15 },
          { header: 'P&L', key: 'profitLoss', width: 15 },
          { header: 'P&L %', key: 'profitPct', width: 15 }
        ];

        backtestResult.trades.forEach(trade => {
          tradesSheet.addRow({
            entryTime: new Date(trade.entryTime),
            exitTime: trade.exitTime ? new Date(trade.exitTime) : null,
            side: trade.side,
            entryPrice: trade.entryPrice,
            exitPrice: trade.exitPrice,
            quantity: trade.quantity,
            profitLoss: trade.profitLoss,
            profitPct: trade.profitPct
          });
        });

        tradesSheet.getColumn('entryPrice').numFmt = '#,##0.00';
        tradesSheet.getColumn('exitPrice').numFmt = '#,##0.00';
        tradesSheet.getColumn('quantity').numFmt = '#,##0.00';
        tradesSheet.getColumn('profitLoss').numFmt = '#,##0.00';
        tradesSheet.getColumn('profitPct').numFmt = '#,##0.00%';

        // Create summary worksheet
        const summarySheet = workbook.addWorksheet('Summary');

        summarySheet.columns = [
          { header: 'Metric', key: 'metric', width: 25 },
          { header: 'Value', key: 'value', width: 15 }
        ];

        summarySheet.addRow({ metric: 'Total Return', value: backtestResult.totalReturn / 100 });
        summarySheet.addRow({ metric: 'Win Rate', value: backtestResult.winRate / 100 });
        summarySheet.addRow({ metric: 'Profit Factor', value: backtestResult.profitFactor });
        summarySheet.addRow({ metric: 'Max Drawdown', value: backtestResult.maxDrawdown / 100 });
        summarySheet.addRow({ metric: 'Sharpe Ratio', value: backtestResult.sharpeRatio });
        summarySheet.addRow({ metric: 'Average Win', value: backtestResult.averageWin / 100 });
        summarySheet.addRow({ metric: 'Average Loss', value: backtestResult.averageLoss / 100 });
        summarySheet.addRow({ metric: 'Max Consecutive Losses', value: backtestResult.maxConsecutiveLosses });
        summarySheet.addRow({ metric: 'Total Trades', value: backtestResult.trades.length });

        summarySheet.getColumn('value').numFmt = '#,##0.00';
        summarySheet.getCell('B1').numFmt = '#,##0.00%';
        summarySheet.getCell('B2').numFmt = '#,##0.00%';
        summarySheet.getCell('B4').numFmt = '#,##0.00%';
        summarySheet.getCell('B6').numFmt = '#,##0.00%';
        summarySheet.getCell('B7').numFmt = '#,##0.00%';

        // Create monthly returns worksheet
        const monthlySheet = workbook.addWorksheet('Monthly Returns');

        monthlySheet.columns = [
          { header: 'Month', key: 'month', width: 15 },
          { header: 'Return %', key: 'return', width: 15 }
        ];

        backtestResult.monthlyReturns.forEach(month => {
          monthlySheet.addRow({
            month: month.month,
            return: month.return / 100
          });
        });

        monthlySheet.getColumn('return').numFmt = '#,##0.00%';

        break;
      }

      default:
        return res.status(400).json({ error: 'Invalid export type' });
    }

    // Set response headers
    const fileName = `${type}_${symbol || 'data'}_${new Date().toISOString().split('T')[0]}.${format}`;

    if (format === 'xlsx') {
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);

      // Write workbook to response
      await workbook.xlsx.write(res);
    } else { // CSV format
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);

      // Get the first sheet
      const firstSheet = workbook.getWorksheet(1);

      // Create CSV content
      const rows = firstSheet.getSheetValues();
      const csvContent = rows
        .slice(1) // Skip empty first value
        .map((row: any) =>
          row
            .slice(1) // Skip empty first value
            .map((val: any) => {
              if (val instanceof Date) return val.toISOString();
              if (val === null || val === undefined) return '';
              return typeof val === 'string' && val.includes(',') ? `"${val}"` : val;
            })
            .join(',')
        )
        .join('\n');

      // Write CSV to response
      res.write(csvContent);
      res.end();
    }
  } catch (err: any) {
    console.error('Export error:', err);

    // Only send error response if headers haven't been sent yet
    if (!res.headersSent) {
      return res.status(500).json({ error: err.message || 'Export failed' });
    }
  }
}

/**
 * Placeholder function to fetch a backtest result from the database
 * This would be implemented with your database of choice (e.g., Prisma)
 */
async function fetchBacktestResult(backtestId: string) {
  // This is a placeholder; you would implement this to retrieve 
  // the stored backtest result based on the backtestId
  // return await prisma.backtestResult.findUnique({ where: { id: backtestId } });

  // For now, returning null to simulate not found
  return null;
} 