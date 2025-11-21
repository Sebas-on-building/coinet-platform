import axios from 'axios';
const api = axios.create({ baseURL: '/api' });
api.interceptors.request.use(config => {
  config.headers.Authorization = `Bearer ${localStorage.getItem('token')}`;
  return config;
});
api.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401) window.location.href = '/login';
    return Promise.reject(err);
  }
);
export default {
  getPortfolio: (userId) => api.get(`/portfolio/${userId}`).then(r => r.data),
  getAlerts: () => api.get('/alerts').then(r => r.data),
  getChart: (symbol) => api.get(`/charts/${symbol}`).then(r => r.data),
  getUser: () => api.get('/user').then(r => r.data),
  getSettings: () => api.get('/settings').then(r => r.data),
  // ...add more endpoints here
};

export * from './portfolio';
export * from './alerts';
export * from './charts';
export * from './user';
export * from './settings'; 