/**
 * 🌐 API Configuration Utility
 * 
 * Centralized backend URL detection logic for all API clients.
 * Ensures consistent behavior across the application.
 */

/**
 * Auto-detect backend URL based on environment
 */
export const getBackendURL = (): string => {
  // Check environment variable first
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  
  // In development (Vite dev server), use relative URLs to leverage Vite proxy
  // This avoids CORS issues by proxying through the same origin
  if (import.meta.env.DEV) {
    return ''; // Empty string = relative URL (same origin)
  }
  
  // In production or if explicitly needed, try direct backend URL
  if (typeof window !== 'undefined' && window.location.hostname.includes('github.dev')) {
    // Extract base URL and replace port with 3000
    const baseUrl = window.location.hostname.replace(/-\d+\.app\.github\.dev$/, '-3000.app.github.dev');
    return `https://${baseUrl}`;
  }
  
  // Production fallback - check if we're on coinet.ai domain
  if (typeof window !== 'undefined' && window.location.hostname.includes('coinet.ai')) {
    // Smart default: if frontend is on app.coinet.ai, backend is likely api.coinet.ai
    if (window.location.hostname === 'app.coinet.ai') {
      console.log('🔗 Using production API: https://api.coinet.ai');
      return 'https://api.coinet.ai';
    }
    
    // Fallback: warn if VITE_API_URL is not set
    console.warn('⚠️ VITE_API_URL is not set in production!');
    console.warn('💡 Please set VITE_API_URL environment variable in Vercel dashboard');
    console.warn('💡 Recommended: https://api.coinet.ai');
    // Return empty string to use relative URLs (might work if backend is on same domain)
    return '';
  }
  
  // Fallback to localhost (only for local development)
  console.warn('⚠️ Using localhost fallback - this will not work in production');
  return 'http://localhost:3000';
};

/**
 * Get the API base URL
 */
export const API_BASE_URL = getBackendURL();

// Log for debugging
if (typeof window !== 'undefined') {
  console.log('🔗 Backend API URL:', API_BASE_URL || '(relative URLs)');
  if (!API_BASE_URL && !import.meta.env.DEV) {
    console.warn('⚠️ No API URL configured - using relative URLs');
  }
}

