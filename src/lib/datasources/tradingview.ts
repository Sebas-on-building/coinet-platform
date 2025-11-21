/**
 * TradingView adapter for embedding charts or getting alternative price data
 * 
 * Note: This is a placeholder implementation since TradingView does not offer a direct API for data.
 * In a real application, you might:
 * 1. Use TradingView's widget embedding capabilities
 * 2. Use an alternative market data source with an API
 */

import fetch from 'node-fetch';
import { fetchJson } from '@/utils/fetch';

// Interface for TradingView widget options
export interface TradingViewWidgetOptions {
  symbol: string;             // e.g., "BINANCE:BTCUSDT"
  interval?: string;          // e.g., "D" for daily, "60" for 60 minutes
  theme?: 'light' | 'dark';
  width?: number | string;    // width of the widget
  height?: number | string;   // height of the widget
  containerId: string;        // ID of the container where the widget will be embedded
  timezone?: string;          // e.g., "Etc/UTC"
  locale?: string;            // e.g., "en"
  toolbar_bg?: string;        // background color of the toolbar
  enable_publishing?: boolean;
  withdateranges?: boolean;
  hide_side_toolbar?: boolean;
  allow_symbol_change?: boolean;
  details?: boolean;
  hotlist?: boolean;
  calendar?: boolean;
  studies?: string[];         // technical indicators to show
  show_popup_button?: boolean;
  popup_width?: number | string;
  popup_height?: number | string;
}

/**
 * Generates the HTML code to embed a TradingView chart widget
 */
export function getTradingViewWidgetHtml(options: TradingViewWidgetOptions): string {
  const {
    symbol,
    interval = 'D',
    theme = 'dark',
    width = '100%',
    height = '500px',
    containerId,
    timezone = 'Etc/UTC',
    locale = 'en',
    toolbar_bg = '#f1f3f6',
    enable_publishing = false,
    withdateranges = true,
    hide_side_toolbar = false,
    allow_symbol_change = true,
    details = true,
    hotlist = false,
    calendar = false,
    studies = [],
    show_popup_button = false,
    popup_width = '1000',
    popup_height = '650'
  } = options;

  // Construct the script tag with the TradingView widget configuration
  return `
    <div id="${containerId}" style="width: ${width}; height: ${height};"></div>
    <script type="text/javascript" src="https://s3.tradingview.com/tv.js"></script>
    <script type="text/javascript">
      new TradingView.widget({
        "width": "${width}",
        "height": "${height}",
        "symbol": "${symbol}",
        "interval": "${interval}",
        "timezone": "${timezone}",
        "theme": "${theme}",
        "style": "1",
        "locale": "${locale}",
        "toolbar_bg": "${toolbar_bg}",
        "enable_publishing": ${enable_publishing},
        "withdateranges": ${withdateranges},
        "hide_side_toolbar": ${hide_side_toolbar},
        "allow_symbol_change": ${allow_symbol_change},
        "details": ${details},
        "hotlist": ${hotlist},
        "calendar": ${calendar},
        "studies": ${JSON.stringify(studies)},
        "show_popup_button": ${show_popup_button},
        "popup_width": "${popup_width}",
        "popup_height": "${popup_height}",
        "container_id": "${containerId}"
      });
    </script>
  `;
}

/**
 * Simulated function to fetch price data for a symbol
 * 
 * In a real app, you would use your own market data API or a third-party provider
 * This is a placeholder that could be extended to use another data source
 */
export async function fetchTradingViewSeries(
  symbol: string,
  interval: string = 'D',
  from?: number,
  to?: number
) {
  try {
    // Use an internal API (maybe Price-Tick) to fetch historical data
    // This is just a placeholder - in reality you'd use your actual data source
    const endpoint = `/api/price-tick?symbol=${symbol}&timeframe=${interval}&limit=500`;
    const data = await fetchJson(endpoint);

    // Normalize to { time, value } format
    return data.map((candle: any) => ({
      time: candle.time,
      value: candle.close
    }));
  } catch (error) {
    console.error('Error fetching trading data:', error);
    throw error;
  }
}

/**
 * List of popular symbols that could be used with TradingView
 */
export const popularTradingViewSymbols = [
  { id: 'BINANCE:BTCUSDT', name: 'Bitcoin (Binance)', category: 'Crypto' },
  { id: 'BINANCE:ETHUSDT', name: 'Ethereum (Binance)', category: 'Crypto' },
  { id: 'BINANCE:SOLUSDT', name: 'Solana (Binance)', category: 'Crypto' },
  { id: 'COINBASE:BTCUSD', name: 'Bitcoin (Coinbase)', category: 'Crypto' },
  { id: 'NASDAQ:AAPL', name: 'Apple', category: 'Stocks' },
  { id: 'NASDAQ:MSFT', name: 'Microsoft', category: 'Stocks' },
  { id: 'NYSE:JPM', name: 'JPMorgan', category: 'Stocks' },
  { id: 'FOREX:EURUSD', name: 'EUR/USD', category: 'Forex' },
  { id: 'OANDA:USDJPY', name: 'USD/JPY', category: 'Forex' },
  { id: 'TVC:GOLD', name: 'Gold', category: 'Commodities' },
  { id: 'TVC:USOIL', name: 'Crude Oil', category: 'Commodities' },
]; 