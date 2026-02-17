// API configuration - Robust with automatic fallback
export const API_BASE_URL = (() => {
  // Priority 1: Environment variable (for production)
  if (import.meta.env.VITE_API_BASE_URL) {
    return import.meta.env.VITE_API_BASE_URL;
  }
  
  // Priority 2: Production check
  if (import.meta.env.MODE === 'production') {
    return 'https://finsmart-backend-bp85.onrender.com';
  }
  
  // Priority 3: Development - try localhost:8000 (default backend port)
  return 'http://localhost:8000';
})();

console.log(`[FinSmart] API Base URL: ${API_BASE_URL}`);
