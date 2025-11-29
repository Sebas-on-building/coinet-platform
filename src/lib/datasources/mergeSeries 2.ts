/**
 * Utility to normalize and merge multiple time series data from different sources
 */

export interface SeriesPoint {
  time: number;
  value: number;
  [key: string]: any; // Allow additional properties for extended data
}

export interface NamedSeries {
  name: string;
  points: SeriesPoint[];
  color?: string;
  yAxisId?: number;
  unit?: string;
  visible?: boolean;
}

interface MergedPoint {
  time: number;
  [seriesName: string]: number | null;
}

/**
 * Merge multiple series on a common time axis
 * 
 * @param seriesArray Array of series with name and points[{time, value}]
 * @returns Array of objects, each with 'time' and a value for each series name (or null if no data at that time)
 */
export function mergeSeries(seriesArray: NamedSeries[]): MergedPoint[] {
  if (!seriesArray.length) return [];

  // Collect all unique timestamps
  const allTimesSet = new Set<number>();
  seriesArray.forEach(s => {
    s.points.forEach(p => allTimesSet.add(p.time));
  });

  // Sort timestamps chronologically
  const allTimes = Array.from(allTimesSet).sort((a, b) => a - b);

  // Initialize merged array with all timestamps
  const merged: MergedPoint[] = allTimes.map(t => ({ time: t }));

  // For each series, mark its values on the merged timeline
  for (const { name, points } of seriesArray) {
    // Create a map for quick lookup of values by time
    const timeValueMap = new Map<number, number>();
    points.forEach(p => timeValueMap.set(p.time, p.value));

    // Set values in the merged array
    for (let i = 0; i < merged.length; i++) {
      const t = merged[i].time;
      merged[i][name] = timeValueMap.has(t) ? timeValueMap.get(t)! : null;
    }
  }

  return merged;
}

/**
 * Downsample a time series to a target number of points
 * Useful for performance optimization when dealing with large datasets
 * 
 * @param points Original time series data points
 * @param targetCount Target number of points
 * @returns Downsampled series
 */
export function downsampleSeries(points: SeriesPoint[], targetCount: number): SeriesPoint[] {
  if (points.length <= targetCount) return points;

  const step = Math.floor(points.length / targetCount);
  const result: SeriesPoint[] = [];

  for (let i = 0; i < points.length; i += step) {
    result.push(points[i]);
  }

  // Ensure we include the last point for proper visualization
  if (result[result.length - 1] !== points[points.length - 1]) {
    result.push(points[points.length - 1]);
  }

  return result;
}

/**
 * Downsample a merged series to a target number of points
 * 
 * @param mergedPoints The merged series
 * @param targetCount Target number of points
 * @returns Downsampled merged series
 */
export function downsampleMergedSeries(mergedPoints: MergedPoint[], targetCount: number): MergedPoint[] {
  if (mergedPoints.length <= targetCount) return mergedPoints;

  const step = Math.floor(mergedPoints.length / targetCount);
  const result: MergedPoint[] = [];

  for (let i = 0; i < mergedPoints.length; i += step) {
    result.push(mergedPoints[i]);
  }

  // Ensure we include the last point
  if (result[result.length - 1] !== mergedPoints[mergedPoints.length - 1]) {
    result.push(mergedPoints[mergedPoints.length - 1]);
  }

  return result;
}

/**
 * Normalize series values to a common scale (0-1 range)
 * Useful for comparing series with different magnitudes
 * 
 * @param series Series to normalize
 * @returns Normalized series
 */
export function normalizeSeries(series: SeriesPoint[]): SeriesPoint[] {
  if (series.length === 0) return [];

  // Find min and max values
  let min = series[0].value;
  let max = series[0].value;

  for (const point of series) {
    if (point.value < min) min = point.value;
    if (point.value > max) max = point.value;
  }

  // If all values are the same, return as is
  if (min === max) return series;

  // Normalize to 0-1 range
  const range = max - min;
  return series.map(point => ({
    ...point,
    value: (point.value - min) / range
  }));
}

/**
 * Calculate percentage change from first point
 * Useful for comparing relative performance over time
 * 
 * @param series Series to convert to percentage change
 * @returns Series with percentage changes
 */
export function calculatePercentageChange(series: SeriesPoint[]): SeriesPoint[] {
  if (series.length === 0) return [];

  const baseValue = series[0].value;

  // If base value is 0, we can't calculate percentage change
  if (baseValue === 0) return series;

  return series.map(point => ({
    ...point,
    value: ((point.value - baseValue) / baseValue) * 100
  }));
}

/**
 * Aligns multiple series to the same date range by
 * extending the first/last values or interpolating missing points
 * 
 * @param seriesArray Array of series to align
 * @returns Aligned series
 */
export function alignSeriesDates(seriesArray: NamedSeries[]): NamedSeries[] {
  if (seriesArray.length <= 1) return seriesArray;

  // Find global min and max times
  let globalMinTime = Infinity;
  let globalMaxTime = -Infinity;

  seriesArray.forEach(series => {
    if (series.points.length === 0) return;

    const minTime = Math.min(...series.points.map(p => p.time));
    const maxTime = Math.max(...series.points.map(p => p.time));

    if (minTime < globalMinTime) globalMinTime = minTime;
    if (maxTime > globalMaxTime) globalMaxTime = maxTime;
  });

  // Extend each series to cover the global range
  return seriesArray.map(series => {
    if (series.points.length === 0) return series;

    const points = [...series.points].sort((a, b) => a.time - b.time);
    const result = [...points];

    // Add point at the start if needed
    if (points[0].time > globalMinTime) {
      result.unshift({
        time: globalMinTime,
        value: points[0].value
      });
    }

    // Add point at the end if needed
    if (points[points.length - 1].time < globalMaxTime) {
      result.push({
        time: globalMaxTime,
        value: points[points.length - 1].value
      });
    }

    return {
      ...series,
      points: result
    };
  });
} 