import type { User } from '../types'
import { apiFetch } from './client'

type RawUser = User & { password?: string }

export async function fetchUsers(): Promise<User[]> {
  const res = await apiFetch('/api/users/get-users')
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { message?: string }
    throw new Error(err.message ?? 'Failed to load users')
  }
  const rows = (await res.json()) as RawUser[]
  return rows.map(({ _id, name, email }) => ({ _id, name, email }))
}
