import {
  type FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { fetchMessages } from '../api/messages'
import { fetchUsers } from '../api/users'
import { useAuth } from '../context/AuthContext'
import {
  emitSendMessage,
  emitTypingStart,
  emitTypingStop,
  useChatSocket,
} from '../hooks/useChatSocket'
import type { Message, RecentPeer, User } from '../types'

const RECENT_KEY = 'chat_app_recent_peers'

function loadRecent(): RecentPeer[] {
  try {
    const raw = localStorage.getItem(RECENT_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed.filter(
      (p): p is RecentPeer =>
        p != null &&
        typeof p === 'object' &&
        'id' in p &&
        typeof (p as RecentPeer).id === 'string',
    )
  } catch {
    return []
  }
}

function saveRecent(peers: RecentPeer[]) {
  localStorage.setItem(RECENT_KEY, JSON.stringify(peers))
}

const objectIdPattern = /^[a-f\d]{24}$/i

export function ChatPage() {
  const { user, logout } = useAuth()
  const [receiverId, setReceiverId] = useState('')
  const [activePeerId, setActivePeerId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [draft, setDraft] = useState('')
  const [loadError, setLoadError] = useState<string | null>(null)
  const [loadingThread, setLoadingThread] = useState(false)
  const [recent, setRecent] = useState<RecentPeer[]>(() => loadRecent())
  const [directory, setDirectory] = useState<User[]>([])
  const [loadingUsers, setLoadingUsers] = useState(false)
  const [usersError, setUsersError] = useState<string | null>(null)
  const [userFilter, setUserFilter] = useState('')
  const bottomRef = useRef<HTMLDivElement | null>(null)

  const meId = user?._id ?? ''

  useEffect(() => {
    if (!user) return
    let cancelled = false
    setLoadingUsers(true)
    setUsersError(null)
    fetchUsers()
      .then((rows) => {
        if (!cancelled) setDirectory(rows)
      })
      .catch((err: unknown) => {
        if (!cancelled)
          setUsersError(err instanceof Error ? err.message : 'Failed to load users')
      })
      .finally(() => {
        if (!cancelled) setLoadingUsers(false)
      })
    return () => {
      cancelled = true
    }
  }, [user])

  const onReceive = useCallback(
    (payload: { senderId: string; message: string }) => {
      if (!activePeerId || payload.senderId !== activePeerId) return
      const optimistic: Message = {
        _id: `tmp-${Date.now()}`,
        senderId: payload.senderId,
        receiverId: meId,
        message: payload.message,
        createdAt: new Date().toISOString(),
      }
      setMessages((prev) => [...prev, optimistic])
    },
    [activePeerId, meId],
  )

  const { socket, connected, socketError, onlineUsers, typingUsers } =
    useChatSocket(!!user, onReceive)
  const onlineSet = useMemo(() => new Set(onlineUsers), [onlineUsers])
  const typingSet = useMemo(() => new Set(typingUsers), [typingUsers])

  const typingTimeoutRef = useRef<number | null>(null)
  const typingPeerRef = useRef<string | null>(null)

  function stopTyping(receiver: string) {
    if (!receiver) return
    emitTypingStop(socket, receiver)
    typingPeerRef.current = null
    if (typingTimeoutRef.current != null) {
      window.clearTimeout(typingTimeoutRef.current)
      typingTimeoutRef.current = null
    }
  }

  function startTyping(receiver: string) {
    if (!receiver) return
    if (typingPeerRef.current === receiver) return
    typingPeerRef.current = receiver
    emitTypingStart(socket, receiver)
  }

  useEffect(() => {
    const prev = typingPeerRef.current
    if (prev && prev !== activePeerId) {
      stopTyping(prev)
    }
    if (!activePeerId) {
      if (typingPeerRef.current) stopTyping(typingPeerRef.current)
      typingPeerRef.current = null
    }
    return () => {
      // stop typing for the last active peer on unmount
      if (typingPeerRef.current) stopTyping(typingPeerRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activePeerId])

  useEffect(() => {
    if (!user || !activePeerId) return

    let cancelled = false
    setLoadingThread(true)
    setLoadError(null)
    fetchMessages(meId, activePeerId)
      .then((rows) => {
        if (!cancelled) setMessages(rows)
      })
      .catch((err: unknown) => {
        if (!cancelled)
          setLoadError(err instanceof Error ? err.message : 'Failed to load')
      })
      .finally(() => {
        if (!cancelled) setLoadingThread(false)
      })

    return () => {
      cancelled = true
    }
  }, [user, meId, activePeerId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, activePeerId])

  const title = useMemo(() => {
    if (!activePeerId) return 'Messages'
    const peer = recent.find((p) => p.id === activePeerId)
    const fromDir = directory.find((u) => u._id === activePeerId)
    return peer?.name ?? fromDir?.name ?? `Chat · ${activePeerId.slice(0, 8)}…`
  }, [activePeerId, recent, directory])

  function addRecent(id: string, name?: string) {
    setRecent((prev) => {
      const next = [{ id, name }, ...prev.filter((p) => p.id !== id)].slice(0, 20)
      saveRecent(next)
      return next
    })
  }

  function handleStartChat(e: FormEvent) {
    e.preventDefault()
    const id = receiverId.trim()
    if (!objectIdPattern.test(id)) {
      setLoadError('Enter a valid 24-character user id (MongoDB ObjectId).')
      return
    }
    addRecent(id)
    setActivePeerId(id)
    setReceiverId('')
    setLoadError(null)
  }

  function handleSend(e: FormEvent) {
    e.preventDefault()
    const text = draft.trim()
    if (!text || !activePeerId || !meId) return

    const optimistic: Message = {
      _id: `local-${Date.now()}`,
      senderId: meId,
      receiverId: activePeerId,
      message: text,
      createdAt: new Date().toISOString(),
    }
    setMessages((prev) => [...prev, optimistic])
    setDraft('')
    emitSendMessage(socket, activePeerId, text)

    // Sending ends "typing" immediately.
    stopTyping(activePeerId)
  }

  function pickPeer(id: string) {
    setActivePeerId(id)
    setLoadError(null)
  }

  function pickDirectoryUser(u: User) {
    if (u._id === meId) return
    addRecent(u._id, u.name)
    setActivePeerId(u._id)
    setLoadError(null)
  }

  const others = useMemo(
    () => directory.filter((u) => u._id !== meId),
    [directory, meId],
  )

  const filteredOthers = useMemo(() => {
    const q = userFilter.trim().toLowerCase()
    if (!q) return others
    return others.filter(
      (u) =>
        u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q),
    )
  }, [others, userFilter])

  if (!user) return null

  return (
    <div className="chat-layout">
      <aside className="chat-sidebar">
        <div className="sidebar-header">
          <div className="brand">Chat</div>
          <button type="button" className="btn ghost small" onClick={logout}>
            Log out
          </button>
        </div>
        <div className="user-pill">
          <span className="avatar">{user.name.slice(0, 1).toUpperCase()}</span>
          <div>
            <div className="user-name">{user.name}</div>
            <div className="user-email">{user.email}</div>
          </div>
        </div>

        <div className="recent-label">People</div>
        <input
          type="search"
          className="user-search"
          placeholder="Filter by name or email…"
          value={userFilter}
          onChange={(e) => setUserFilter(e.target.value)}
          disabled={loadingUsers || !!usersError}
          aria-label="Filter users"
        />
        {usersError ? (
          <p className="form-error users-error">{usersError}</p>
        ) : loadingUsers ? (
          <p className="hint">Loading users…</p>
        ) : (
          <ul className="peer-list directory-list">
            {filteredOthers.length === 0 ? (
              <li className="empty-peers">
                {others.length === 0 ? 'No other users yet' : 'No matches'}
              </li>
            ) : (
              filteredOthers.map((u) => (
                <li key={u._id}>
                  <button
                    type="button"
                    className={`peer-item directory-user ${activePeerId === u._id ? 'active' : ''}`}
                    onClick={() => pickDirectoryUser(u)}
                  >
                    <span
                      className={`peer-dot ${onlineSet.has(u._id) ? 'online' : 'offline'}`}
                    />
                    <span className="avatar small">{u.name.slice(0, 1).toUpperCase()}</span>
                    <span className="peer-meta">
                      <span className="peer-name">{u.name}</span>
                      <span className="peer-email">{u.email}</span>
                      <span
                        className={`peer-status ${
                          typingSet.has(u._id)
                            ? 'typing'
                            : onlineSet.has(u._id)
                              ? 'online'
                              : ''
                        }`}
                      >
                        {typingSet.has(u._id)
                          ? 'Typing…'
                          : onlineSet.has(u._id)
                            ? 'Online'
                            : 'Offline'}
                      </span>
                    </span>
                  </button>
                </li>
              ))
            )}
          </ul>
        )}

        <div className="recent-label">Or paste user id</div>
        <form className="start-chat" onSubmit={handleStartChat}>
          <label>
            MongoDB user id
            <input
              placeholder="24-character ObjectId"
              value={receiverId}
              onChange={(e) => setReceiverId(e.target.value)}
            />
          </label>
          <button type="submit" className="btn secondary">
            Open chat
          </button>
        </form>

        <div className="recent-label">Recent</div>
        <ul className="peer-list">
          {recent.length === 0 ? (
            <li className="empty-peers">No conversations yet</li>
          ) : (
            recent.map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  className={`peer-item ${activePeerId === p.id ? 'active' : ''}`}
                  onClick={() => pickPeer(p.id)}
                >
                  <span
                    className={`peer-dot ${onlineSet.has(p.id) ? 'online' : 'offline'}`}
                    aria-hidden="true"
                  />
                  <span className="peer-id">{p.name ?? p.id}</span>
                  <span
                    className={`peer-status-inline ${
                      typingSet.has(p.id)
                        ? 'typing'
                        : onlineSet.has(p.id)
                          ? 'online'
                          : ''
                    }`}
                  >
                    {typingSet.has(p.id)
                      ? 'Typing…'
                      : onlineSet.has(p.id)
                        ? 'Online'
                        : 'Offline'}
                  </span>
                </button>
              </li>
            ))
          )}
        </ul>
      </aside>

      <main className="chat-main">
        <header className="chat-toolbar">
          <h2>{title}</h2>
          <div className="status">
        {socketError ? (
              <span className="badge warn" title={socketError}>
                Realtime: {socketError}
              </span>
            ) : connected ? (
              <span className="badge ok">Live</span>
            ) : (
              <span className="badge">Connecting…</span>
        )}

        {activePeerId ? (
          <span
            className={`badge ${onlineSet.has(activePeerId) ? 'ok' : ''}`.trim()}
            title={
              onlineSet.has(activePeerId) ? 'User is online' : 'User is offline'
            }
          >
            {onlineSet.has(activePeerId) ? 'Peer online' : 'Peer offline'}
          </span>
        ) : null}

            {activePeerId && typingSet.has(activePeerId) ? (
              <span className="badge typing">Typing…</span>
            ) : null}
          </div>
        </header>

        {!activePeerId ? (
          <div className="empty-thread">
            <p>Choose someone from People, a recent chat, or open by user id.</p>
          </div>
        ) : loadingThread ? (
          <div className="empty-thread">
            <p>Loading messages…</p>
          </div>
        ) : (
          <div className="message-scroll">
            {loadError ? <p className="form-error thread-error">{loadError}</p> : null}
            <ul className="message-list">
              {messages.map((m) => {
                const mine = m.senderId === meId
                return (
                  <li key={m._id} className={`bubble-row ${mine ? 'mine' : 'theirs'}`}>
                    <div className="bubble">
                      <p>{m.message}</p>
                      {m.createdAt ? (
                        <time dateTime={m.createdAt}>
                          {new Date(m.createdAt).toLocaleTimeString(undefined, {
                            hour: 'numeric',
                            minute: '2-digit',
                          })}
                        </time>
                      ) : null}
                    </div>
                  </li>
                )
              })}
            </ul>
            <div ref={bottomRef} />
          </div>
        )}

        <form className="composer" onSubmit={handleSend}>
          <input
            placeholder={activePeerId ? 'Message…' : 'Pick a chat first'}
            value={draft}
            onChange={(e) => {
              const next = e.target.value
              setDraft(next)

              if (!activePeerId) return
              const receiver = activePeerId
              const trimmed = next.trim()

              if (!trimmed) {
                if (typingPeerRef.current === receiver) stopTyping(receiver)
                return
              }

              startTyping(receiver)

              if (typingTimeoutRef.current != null) {
                window.clearTimeout(typingTimeoutRef.current)
              }
              typingTimeoutRef.current = window.setTimeout(() => {
                stopTyping(receiver)
              }, 900)
            }}
            disabled={!activePeerId}
          />
          <button type="submit" className="btn primary" disabled={!activePeerId || !draft.trim()}>
            Send
          </button>
        </form>
      </main>
    </div>
  )
}
