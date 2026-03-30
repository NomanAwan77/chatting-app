export function getCookie(name: string): string | null {
  const match = document.cookie.match(
    new RegExp(`(?:^|; )${name.replace(/[$()*+.?[\\\]^{|}]/g, '\\$&')}=([^;]*)`),
  )
  return match ? decodeURIComponent(match[1]) : null
}

export function clearCookie(name: string, path = '/'): void {
  document.cookie = `${encodeURIComponent(name)}=; Max-Age=0; Path=${path}`
}
