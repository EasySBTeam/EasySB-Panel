import { useEffect, useRef, useState } from 'react'
import { ApiError } from './api/client'

interface LoadState<T> {
  data: T | null
  loading: boolean
  error: string
}

// useLoad runs an async loader on mount and whenever the given dependencies
// change, and exposes a reload for the refresh buttons. The loader is held in a
// ref so an inline arrow does not restart the request on every render.
export function useLoad<T>(fn: () => Promise<T>, deps: unknown[] = []) {
  const [state, setState] = useState<LoadState<T>>({ data: null, loading: true, error: '' })
  const [tick, setTick] = useState(0)
  const ref = useRef(fn)
  ref.current = fn

  useEffect(() => {
    let alive = true
    setState((prev) => ({ ...prev, loading: true, error: '' }))
    ref
      .current()
      .then((data) => {
        if (alive) setState({ data, loading: false, error: '' })
      })
      .catch((err: unknown) => {
        if (alive) {
          setState((prev) => ({
            ...prev,
            loading: false,
            error: err instanceof ApiError ? err.message : 'request failed',
          }))
        }
      })
    return () => {
      alive = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tick])

  return { ...state, reload: () => setTick((value) => value + 1) }
}
