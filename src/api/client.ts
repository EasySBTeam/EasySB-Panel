// The single place the browser talks to the panel API. It attaches the session
// token to every request and unwraps the panel's shared error shape
// ({"error": "..."}) into an ApiError a page can render.

const TOKEN_KEY = 'easysb_panel_token'

// The panel can be mounted under a security entry prefix such as /manage/. The
// served index.html carries a <base> tag for that prefix, so every relative URL
// resolves to the right place. apiBase() reads it back for the WebSocket, which
// has to build an absolute URL.
export function apiBase(): string {
  const href = document.querySelector('base')?.getAttribute('href') ?? '/'
  return href.endsWith('/') ? href : `${href}/`
}

const BASE = `${apiBase()}api/v1`

export class ApiError extends Error {
  status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

export function getToken(): string {
  return localStorage.getItem(TOKEN_KEY) ?? ''
}

export function setToken(token: string): void {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token)
  } else {
    localStorage.removeItem(TOKEN_KEY)
  }
}

interface RequestOptions {
  method?: string
  body?: unknown
  signal?: AbortSignal
  raw?: boolean
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = {}
  const token = getToken()
  if (token) {
    headers.Authorization = `Bearer ${token}`
  }
  // The cookie path needs this header; the bearer path ignores it. Sending it
  // on every call keeps both authentication modes working.
  headers['X-EasySB-Panel'] = '1'
  let body: string | undefined
  if (options.body !== undefined) {
    headers['Content-Type'] = 'application/json'
    body = JSON.stringify(options.body)
  }

  const response = await fetch(BASE + path, {
    method: options.method ?? 'GET',
    headers,
    body,
    signal: options.signal,
  })

  if (response.status === 401) {
    setToken('')
  }

  if (options.raw) {
    if (!response.ok) {
      throw new ApiError(response.status, await errorMessage(response))
    }
    return (await response.text()) as T
  }

  if (response.status === 204) {
    return undefined as T
  }
  const text = await response.text()
  let data: unknown = null
  if (text) {
    try {
      data = JSON.parse(text)
    } catch {
      throw new ApiError(response.status, 'the server returned a non-JSON response')
    }
  }
  if (!response.ok) {
    const message =
      data && typeof data === 'object' && 'error' in data
        ? String((data as { error: unknown }).error)
        : response.statusText || 'request failed'
    throw new ApiError(response.status, message)
  }
  return data as T
}

async function errorMessage(response: Response): Promise<string> {
  const text = await response.text()
  if (!text) {
    return response.statusText || 'request failed'
  }
  try {
    const data = JSON.parse(text) as { error?: string }
    return data.error ?? text
  } catch {
    return text
  }
}

export const api = {
  get: <T>(path: string, signal?: AbortSignal) => request<T>(path, { signal }),
  post: <T>(path: string, body?: unknown) => request<T>(path, { method: 'POST', body }),
  put: <T>(path: string, body?: unknown) => request<T>(path, { method: 'PUT', body }),
  del: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
  text: (path: string) => request<string>(path, { raw: true }),
}
