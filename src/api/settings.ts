import http from './http';

export async function getSettings(userId: string) {
  try {
    const res = await http.get(`/settings/${userId}`);
    return { data: res.data, error: null };
  } catch (error: any) {
    return { data: null, error };
  }
}

export async function updateSettings(userId: string, data: any) {
  try {
    const res = await http.put(`/settings/${userId}`, data);
    return { data: res.data, error: null };
  } catch (error: any) {
    return { data: null, error };
  }
} 