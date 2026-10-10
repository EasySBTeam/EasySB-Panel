import { useEffect, useRef, useState } from 'react'
import { Eraser, Plug, RefreshCw, SquareTerminal } from 'lucide-react'
import { Terminal } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import '@xterm/xterm/css/xterm.css'
import { wsUrl } from '@/lib/api'
import { PageHeader, Section } from '@/components/shared/page'
import { StatusBadge } from '@/components/shared/status-badge'
import { Button } from '@/components/ui/button'

type Status = 'connecting' | 'open' | 'closed'

const statusLabel: Record<Status, string> = {
  connecting: '连接中',
  open: '已连接',
  closed: '已断开',
}

const statusTone: Record<Status, 'warning' | 'success' | 'muted'> = {
  connecting: 'warning',
  open: 'success',
  closed: 'muted',
}

/** A root shell over a WebSocket-backed pseudo-terminal. */
export function TerminalPage() {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const termRef = useRef<Terminal | null>(null)
  const fitRef = useRef<FitAddon | null>(null)
  const socketRef = useRef<WebSocket | null>(null)
  const [status, setStatus] = useState<Status>('connecting')
  const [nonce, setNonce] = useState(0)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const term = new Terminal({
      cursorBlink: true,
      fontFamily:
        '"Geist Mono Variable", ui-monospace, SFMono-Regular, Menlo, monospace',
      fontSize: 13,
      theme: {
        background: '#0a0a0a',
        foreground: '#e5e5e5',
        cursor: '#e5e5e5',
        selectionBackground: '#404040',
      },
    })
    const fit = new FitAddon()
    term.loadAddon(fit)
    term.open(container)
    termRef.current = term
    fitRef.current = fit
    fit.fit()

    const socket = new WebSocket(wsUrl('/terminal/ws'))
    socket.binaryType = 'arraybuffer'
    socketRef.current = socket
    setStatus('connecting')

    socket.onopen = () => {
      setStatus('open')
      sendResize()
      term.focus()
    }
    socket.onmessage = (event) => {
      if (typeof event.data === 'string') return
      const data =
        event.data instanceof ArrayBuffer
          ? new Uint8Array(event.data)
          : new TextEncoder().encode(String(event.data))
      term.write(data)
    }
    socket.onclose = () => {
      setStatus('closed')
      term.write('\r\n\x1b[33m连接已关闭\x1b[0m\r\n')
    }
    socket.onerror = () => {
      setStatus('closed')
    }

    const dataDisposable = term.onData((data) => {
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(new TextEncoder().encode(data))
      }
    })
    const resizeDisposable = term.onResize(() => sendResize())

    function sendResize() {
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(
          JSON.stringify({ type: 'resize', cols: term.cols, rows: term.rows }),
        )
      }
    }

    const observer = new ResizeObserver(() => {
      try {
        fit.fit()
      } catch {
        // A hidden or zero-size container cannot be measured; skip the fit.
      }
    })
    observer.observe(container)

    return () => {
      observer.disconnect()
      dataDisposable.dispose()
      resizeDisposable.dispose()
      socket.close()
      term.dispose()
      termRef.current = null
      fitRef.current = null
      socketRef.current = null
    }
  }, [nonce])

  return (
    <>
      <PageHeader
        title="终端"
        description="以面板进程身份连接本机 Shell，请谨慎操作"
        actions={
          <Button variant="outline" size="sm" onClick={() => setNonce((n) => n + 1)}>
            <RefreshCw />
            重新连接
          </Button>
        }
      />

      <Section
        title="Shell 会话"
        actions={
          <div className="flex items-center gap-2">
            <StatusBadge tone={statusTone[status]}>
              <SquareTerminal className="size-3" />
              {statusLabel[status]}
            </StatusBadge>
            <Button
              variant="outline"
              size="icon-sm"
              aria-label="清屏"
              onClick={() => termRef.current?.clear()}
            >
              <Eraser />
            </Button>
          </div>
        }
      >
        <div
          ref={containerRef}
          className="h-[65svh] min-h-80 overflow-hidden rounded-lg border bg-[#0a0a0a] p-2"
        />
        {status === 'closed' ? (
          <p className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
            <Plug className="size-3.5" />
            会话已断开，点击「重新连接」可建立新会话
          </p>
        ) : null}
      </Section>
    </>
  )
}
