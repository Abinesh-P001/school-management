/**
 * Centralized API Base URL Configuration
 * 
 * On Windows systems, resolving 'localhost' prioritizes IPv6 [::1] (RFC 6724),
 * which fails when Uvicorn is bound to IPv4 (0.0.0.0 or 127.0.0.1).
 * Standardizing on 127.0.0.1 guarantees direct, zero-latency IPv4 loopback communication.
 */

export const getApiBaseUrl = () => {
  if (typeof window !== 'undefined' && window.__API_BASE__) {
    return window.__API_BASE__;
  }
  if (import.meta.env?.VITE_API_URL) {
    return import.meta.env.VITE_API_URL.replace(/\/+$/, '');
  }
  return 'http://127.0.0.1:8000/api';
};

export const API_BASE_URL = getApiBaseUrl();

