import { useEffect, useRef, useState } from 'react'
import { Button, Tag } from '@arco-design/web-react'
import { IconRefresh } from '@arco-design/web-react/icon'
import { Terminal as XTerm } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import '@xterm/xterm/css/xterm.css'
import { useI18n } from '../i18n'
import { apiBase } from '../api/client'

type Status = 'connecting' | 'connected' | 'closed'

// The terminal is a WebSocket to the panel, which bridges it to a shell on a PTY.
// Keystrokes go out as binary frames and output comes back the same way; the only
// text frame is a resize, so terminal data never has to be JSON-escaped.
export default function Terminal() {
  const { t } = useI18n()
  const boxRef = useRef<HTMLDivElement>(null)
  const [status, setStatus] = useState<Status>('connecting')
  const [nonce, setNonce] = useState(0)

  useEffect(() => {
    const box = boxRef.current
    if (!box) {
      return
    }
    const term = new XTerm({
      cursorBlink: true,
      fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
      fontSize: 13,
      theme: {
        background: '#1b1b1f',
        foreground: '#e5e6eb',
        cursor: '#3c7eff',
        selectionBackground: 'rgba(60, 126, 255, 0.35)',
      },
    })
    const fit = new FitAddon()
    term.loadAddon(fit)
    term.open(box)
    fit.fit()

    const scheme = window.location.protocol === 'https:' ? 'wss' : 'ws'
    const socket = new WebSocket(`${scheme}://${window.location.host}${apiBase()}api/v1/terminal/ws`)
    socket.binaryType = 'arraybuffer'
    setStatus('connecting')

    const sendResize = () => {
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ type: 'resize', cols: term.cols, rows: term.rows }))
      }
    }

    socket.onopen = () => {
      setStatus('connected')
      fit.fit()
      sendResize()
      term.focus()
    }
    socket.onmessage = (event) => {
      if (typeof event.data !== 'string') {
        term.write(new Uint8Array(event.data as ArrayBuffer))
      }
    }
    socket.onclose = () => setStatus('closed')
    socket.onerror = () => setStatus('closed')

    const encoder = new TextEncoder()
    const dataSub = term.onData((data) => {
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(encoder.encode(data))
      }
    })
    const resizeSub = term.onResize(sendResize)
    const observer = new ResizeObserver(() => fit.fit())
    observer.observe(box)

    return () => {
      observer.disconnect()
      dataSub.dispose()
      resizeSub.dispose()
      socket.close()
      term.dispose()
    }
    // Reconnecting is driven by nonce; the translator is read through a fresh closure
    // each run but does not need to tear the socket down when the language changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nonce])

  const statusTag =
    status === 'connected' ? (
      <Tag color="green">{t('terminal.connected')}</Tag>
    ) : status === 'connecting' ? (
      <Tag color="arcoblue">{t('terminal.connecting')}</Tag>
    ) : (
      <Tag color="red">{t('terminal.closed')}</Tag>
    )

  return (
    <div className="page terminal-page">
      <div className="page-header">
        <div>
          <h2>{t('terminal.title')}</h2>
          <span className="muted">{t('terminal.subtitle')}</span>
        </div>
        <div className="terminal-actions">
          {statusTag}
          <Button icon={<IconRefresh />} onClick={() => setNonce((value) => value + 1)}>
            {t('terminal.reconnect')}
          </Button>
        </div>
      </div>
      <div ref={boxRef} className="terminal-box" />
      <div className="muted terminal-hint">{t('terminal.hint')}</div>
    </div>
  )
}
