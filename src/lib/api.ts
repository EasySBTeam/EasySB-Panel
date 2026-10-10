/*
 * The transport for the panel's JSON API.
 *
 * Three things make this more than a fetch wrapper:
 *
 * - The base path is read from the document's <base> tag. The Go panel mounts the
 *   whole console under a security-entry prefix (e.g. /manage/) by rewriting that
 *   tag, so every request has to be built from it rather than from a fixed /api.
 * - A cookie-authenticated mutation must carry the X-EasySB-Panel header, a value
 *   a cross-site form cannot set. Sending it on every mutation is what keeps the
 *   session usable without a token in JavaScript.
 * - A 401 is not an ordinary error: it means the session is gone, so it is
 *   broadcast once for the app shell to return to the login screen.
 */

/** The site base path, always with a trailing slash ("/" or "/manage/"). */
export function baseHref(): string {
  const el = document.querySelector('base')
  const href = el?.getAttribute('href') ?? '/'
  return href.endsWith('/') ? href : `${href}/`
}

/** The basename React Router should use ("" for the root). */
export function routerBasename(): string {
  return baseHref().replace(/\/$/, '')
}

/** The absolute URL for an API path such as "/nodes". */
export function apiUrl(path: string): string {
  return `${baseHref()}api/v1${path}`
}

/** The absolute WebSocket URL for an API path such as "/terminal/ws". */
export function wsUrl(path: string): string {
  const url = new URL(apiUrl(path), window.location.href)
  url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:'
  return url.toString()
}

/** Raised for any non-2xx response; `status` is the HTTP status. */
export class ApiError extends Error {
  readonly status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

type Method = 'GET' | 'POST' | 'PUT' | 'DELETE'

/** Signals the shell that the session ended; see api.ts header. */
export const UNAUTHORIZED_EVENT = 'easysb:unauthorized'

async function request(method: Method, path: string, body?: unknown): Promise<Response> {
  const headers: Record<string, string> = { Accept: 'application/json' }
  if (body !== undefined) {
    headers['Content-Type'] = 'application/json'
  }
  // The CSRF guard applies to every mutating verb; see api.ts header.
  if (method !== 'GET') {
    headers['X-EasySB-Panel'] = '1'
  }

  const res = await fetch(apiUrl(path), {
    method,
    headers,
    credentials: 'same-origin',
    body: body === undefined ? undefined : JSON.stringify(body),
  })

  if (res.status === 401) {
    window.dispatchEvent(new CustomEvent(UNAUTHORIZED_EVENT))
  }
  return res
}

async function parseError(res: Response): Promise<ApiError> {
  let message = `${res.status} ${res.statusText}`.trim()
  try {
    const data = await res.json()
    if (data && typeof data.error === 'string' && data.error) {
      message = data.error
    }
  } catch {
    // A body that is not JSON leaves the status line as the message.
  }
  return new ApiError(res.status, message)
}

/** A JSON request that rejects with ApiError on any non-2xx response. */
export async function api<T>(method: Method, path: string, body?: unknown): Promise<T> {
  const res = await request(method, path, body)
  if (!res.ok) {
    throw await parseError(res)
  }
  if (res.status === 204) {
    return undefined as T
  }
  const text = await res.text()
  if (!text) {
    return undefined as T
  }
  return JSON.parse(text) as T
}

/** A text request (the rendered subscription document) with the same error model. */
export async function apiText(path: string): Promise<string> {
  const res = await request('GET', path)
  if (!res.ok) {
    throw await parseError(res)
  }
  return res.text()
}

export const http = {
  get: <T>(path: string) => api<T>('GET', path),
  post: <T>(path: string, body?: unknown) => api<T>('POST', path, body),
  put: <T>(path: string, body?: unknown) => api<T>('PUT', path, body),
  del: <T>(path: string) => api<T>('DELETE', path),
}
