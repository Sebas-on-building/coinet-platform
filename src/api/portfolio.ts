import http from './http';

export async function getPortfolio(userId: string) {
  try {
    const res = await http.get(`/portfolio/${userId}`);
    return { data: res.data, error: null };
  } catch (error: any) {
    return { data: null, error };
  }
}

export async function addAsset(userId: string, asset: { symbol: string; amount: number }) {
  try {
    const res = await http.post(`/portfolio/${userId}/assets`, asset);
    return { data: res.data, error: null };
  } catch (error: any) {
    return { data: null, error };
  }
}

export async function removeAsset(userId: string, assetId: string) {
  try {
    const res = await http.delete(`/portfolio/${userId}/assets/${assetId}`);
    return { data: res.data, error: null };
  } catch (error: any) {
    return { data: null, error };
  }
} 