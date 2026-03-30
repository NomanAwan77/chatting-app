import type { Message } from '../types'
import { apiFetch } from './client'

export async function fetchMessages(
  senderId: string,
  receiverId: string,
): Promise<Message[]> {
  const res = await apiFetch(`/api/messages/${senderId}/${receiverId}`)
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { message?: string }
    throw new Error(err.message ?? 'Failed to load messages')
  }
  return (await res.json()) as Message[]
}
