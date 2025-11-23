import http from './http';

export async function getCharts(userId: string) {
  try {
    const res = await http.get(`/charts/${userId}`);
    return { data: res.data, error: null };
  } catch (error: any) {
    return { data: null, error };
  }
}

export async function getChartBySymbol(userId: string, symbol: string) {
  try {
    const res = await http.get(`/charts/${userId}/${symbol}`);
    return { data: res.data, error: null };
  } catch (error: any) {
    return { data: null, error };
  }
} 