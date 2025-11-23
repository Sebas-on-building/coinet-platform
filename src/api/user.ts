import http from './http';

export async function getUser(userId: string) {
  try {
    const res = await http.get(`/user/${userId}`);
    return { data: res.data, error: null };
  } catch (error: any) {
    return { data: null, error };
  }
}

export async function updateUser(userId: string, data: any) {
  try {
    const res = await http.put(`/user/${userId}`, data);
    return { data: res.data, error: null };
  } catch (error: any) {
    return { data: null, error };
  }
} 