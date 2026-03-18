/**
 * VITE_API_BASE   — dùng cho authenticated requests (qua Vite proxy khi dev)
 * VITE_API_DIRECT — URL gọi thẳng backend, dùng cho public endpoints & download
 *                   Dev:  http://localhost:8080/api/v1
 *                   Prod: https://jobtracker-ats.up.railway.app/api/v1
 */
export const API_BASE = import.meta.env.VITE_API_BASE || '/api/v1';
export const API_DIRECT = import.meta.env.VITE_API_DIRECT || API_BASE;
