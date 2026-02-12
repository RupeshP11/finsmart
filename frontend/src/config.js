// API configuration
// In production (Vercel), VITE_API_BASE_URL should be set to https://finsmart-backend-bp85.onrender.com
// In local development, it defaults to localhost:8000
// Usage: Vercel Environment Variables should have: VITE_API_BASE_URL=https://finsmart-backend-bp85.onrender.com
export const API_BASE_URL = 
  import.meta.env.VITE_API_BASE_URL || 
  import.meta.env.MODE === 'production' 
    ? 'https://finsmart-backend-bp85.onrender.com'
    : 'http://127.0.0.1:8000';

// Fallback for safety
if (!API_BASE_URL) {
  console.warn(
    'API_BASE_URL is not set. Using http://127.0.0.1:8000 as fallback. ' +
    'Set VITE_API_BASE_URL environment variable for production.'
  );
}
