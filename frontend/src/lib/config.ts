/** Empty string = same origin (use Vite proxy in dev). Set in production if API is on another host. */
export const API_BASE = import.meta.env.VITE_API_BASE ?? ''
