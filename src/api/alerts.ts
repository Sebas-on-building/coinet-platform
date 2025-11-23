import http from './http';

export async function getAlerts(userId: string) {
  try {
    const res = await http.get(`/alerts/${userId}`);
    return { data: res.data, error: null };
  } catch (error: any) {
    return { data: null, error };
  }
}

export async function markAlertRead(userId: string, alertId: string) {
  try {
    const res = await http.post(`/alerts/${userId}/read`, { alertId });
    return { data: res.data, error: null };
  } catch (error: any) {
    return { data: null, error };
  }
}

export async function markAllRead(userId: string) {
  try {
    const res = await http.post(`/alerts/${userId}/read-all`);
    return { data: res.data, error: null };
  } catch (error: any) {
    return { data: null, error };
  }
} 