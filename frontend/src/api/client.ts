import { API_BASE } from '../lib/config'

export async function apiFetch(
  path: string,
  init?: RequestInit,
): Promise<Response> {
  const url = `${API_BASE}${path.startsWith('/') ? path : `/${path}`}`
  return fetch(url, {
    ...init,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...init?.headers,
    },
  })
}
