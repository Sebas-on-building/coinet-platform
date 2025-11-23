import axios from 'axios';

const secureApi = axios.create({
  baseURL: '/api',
  withCredentials: true, // send cookies
});

// CSRF protection: attach CSRF token for non-GET requests
secureApi.interceptors.request.use(config => {
  if (config.method && config.method.toUpperCase() !== 'GET') {
    const csrfToken = document.cookie.split('; ').find(row => row.startsWith('csrfToken='))?.split('=')[1];
    if (csrfToken) config.headers['X-CSRF-Token'] = csrfToken;
  }
  return config;
});

// Never store sensitive data in Redux (handled at usage sites)

export default secureApi; 