import type { User } from '../types'
import { apiFetch } from './client'

export async function register(body: {
  name: string
  email: string
  password: string
}): Promise<{ user: User }> {
  const res = await apiFetch('/api/users/register', {
    method: 'POST',
    body: JSON.stringify(body),
  })
  const data = (await res.json().catch(() => ({}))) as { user?: User; message?: string }
  if (!res.ok) {
    throw new Error(data.message ?? 'Registration failed')
  }
  if (!data.user) throw new Error('Invalid response')
  return { user: data.user }
}

export async function login(body: {
  email: string
  password: string
}): Promise<{ user: User }> {
  const res = await apiFetch('/api/users/login', {
    method: 'POST',
    body: JSON.stringify(body),
  })
  const data = (await res.json().catch(() => ({}))) as { user?: User; message?: string }
  if (!res.ok) {
    throw new Error(data.message ?? 'Login failed')
  }
  if (!data.user) throw new Error('Invalid response')
  return { user: data.user }
}
