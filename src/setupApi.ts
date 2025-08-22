import axios from 'axios';

// Determine API base URL; for packaged Electron (file://), force 127.0.0.1:3001
const DEFAULT_API_BASE = 'http://127.0.0.1:3001';
const envBase = (import.meta as any).env?.VITE_API_BASE_URL as string | undefined;
const isFileProtocol = typeof window !== 'undefined' && window.location && window.location.protocol === 'file:';
// If running from file:// (packaged app), ignore env override to avoid accidental localhost leak
const API_BASE_URL: string = isFileProtocol
  ? DEFAULT_API_BASE
  : (envBase && envBase.trim().length > 0 ? envBase : DEFAULT_API_BASE);

// Configure axios global base URL for all axios.* calls
axios.defaults.baseURL = API_BASE_URL;

try {
  // Minimal debug to help trace base URL selection in packaged builds
  console.log('[setupApi] Using API_BASE_URL =', API_BASE_URL);
} catch {}

// Patch window.fetch to support relative '/api' or '/fournisseurs' paths under file:// origin
const originalFetch = window.fetch.bind(window);
window.fetch = (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
  let urlString: string;

  if (typeof input === 'string') {
    urlString = input;
  } else if (input instanceof URL) {
    urlString = input.toString();
  } else {
    urlString = input.url;
  }

  if (urlString.startsWith('/api') || urlString.startsWith('/fournisseurs')) {
    const absoluteUrl = API_BASE_URL.replace(/\/$/, '') + urlString;
    return originalFetch(absoluteUrl, init);
  }

  return originalFetch(input as any, init);
};

export { API_BASE_URL };


