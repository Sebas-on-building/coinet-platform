import fetch from 'node-fetch';

const FRED_API_BASE = 'https://api.stlouisfed.org/fred/series/observations';

export interface FredOptions {
  seriesId: string;  // e.g., "FEDFUNDS" for Fed Funds Rate
  apiKey: string;
  frequency?: string; // optional: FRED allows filtering by frequency
  from?: string;     // optional: start date in format YYYY-MM-DD
  to?: string;       // optional: end date in format YYYY-MM-DD
}

interface FredApiResponse {
  observations: FredObservation[];
}

interface FredObservation {
  date: string;
  value: string;
}

/**
 * Fetches time series data from FRED API
 * @param options Configuration for the API request
 * @returns Array of normalized data points
 */
export async function fetchFredSeries(options: FredOptions) {
  const { seriesId, apiKey, frequency, from, to } = options;

  let url = `${FRED_API_BASE}?series_id=${seriesId}&api_key=${apiKey}&file_type=json`;

  // Add optional parameters if provided
  if (frequency) url += `&frequency=${frequency}`;
  if (from) url += `&observation_start=${from}`;
  if (to) url += `&observation_end=${to}`;

  try {
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`FRED API error: ${res.statusText} (${res.status})`);
    }

    const data: FredApiResponse = await res.json();
    if (!data.observations) {
      throw new Error('Invalid FRED response: no observations found');
    }

    // Normalize to { time, value } format
    return data.observations
      .filter(obs => obs.value !== "." && obs.value !== "")  // FRED uses "." for missing data
      .map(obs => ({
        time: new Date(obs.date).getTime(),
        value: parseFloat(obs.value)
      }));
  } catch (error) {
    console.error('Error fetching from FRED:', error);
    throw error;
  }
}

/**
 * Popular FRED series for financial analysis
 */
export const popularFredSeries = [
  { id: 'FEDFUNDS', name: 'Federal Funds Rate', category: 'Rates' },
  { id: 'DFF', name: 'Federal Funds Effective Rate', category: 'Rates' },
  { id: 'UNRATE', name: 'Unemployment Rate', category: 'Employment' },
  { id: 'CPIAUCSL', name: 'Consumer Price Index', category: 'Inflation' },
  { id: 'PCEPI', name: 'Personal Consumption Expenditures', category: 'Inflation' },
  { id: 'GDP', name: 'Gross Domestic Product', category: 'Output' },
  { id: 'INDPRO', name: 'Industrial Production Index', category: 'Production' },
  { id: 'HOUST', name: 'Housing Starts', category: 'Housing' },
  { id: 'MORTGAGE30US', name: '30-Year Fixed Rate Mortgage', category: 'Housing' },
  { id: 'SP500', name: 'S&P 500 Index', category: 'Markets' },
  { id: 'VIXCLS', name: 'CBOE Volatility Index (VIX)', category: 'Markets' },
  { id: 'M2', name: 'M2 Money Stock', category: 'Money Supply' },
  { id: 'USREC', name: 'US Recession Probability', category: 'Indicators' },
];

/**
 * FRED data frequencies
 */
export const fredFrequencies = [
  { id: 'd', name: 'Daily' },
  { id: 'w', name: 'Weekly' },
  { id: 'bw', name: 'Biweekly' },
  { id: 'm', name: 'Monthly' },
  { id: 'q', name: 'Quarterly' },
  { id: 'sa', name: 'Semiannual' },
  { id: 'a', name: 'Annual' },
]; 