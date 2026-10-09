import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { ConfigProvider } from '@arco-design/web-react'
import zhCN from '@arco-design/web-react/es/locale/zh-CN'
import enUS from '@arco-design/web-react/es/locale/en-US'
// React 19 dropped the legacy root API; Arco ships an adapter that routes its
// Message / Notification portals through react-dom/client's createRoot.
import '@arco-design/web-react/es/_util/react-19-adapter'
import '@arco-design/web-react/dist/css/arco.css'
import App from './App'
import { AuthProvider } from './auth'
import { I18nProvider, useI18n } from './i18n'
import { ThemeProvider } from './theme'
import './index.css'

function Shell() {
  const { lang } = useI18n()
  return (
    <ConfigProvider locale={lang === 'zh' ? zhCN : enUS}>
      <BrowserRouter basename={routerBasename()}>
        <AuthProvider>
          <App />
        </AuthProvider>
      </BrowserRouter>
    </ConfigProvider>
  )
}

// The panel may be mounted under a security entry prefix. The served index.html
// carries a <base> tag for it, so the router adopts that prefix as its basename
// and client-side routes stay under it. The tag is read directly rather than via
// document.baseURI, which would otherwise fall back to the current path on a deep
// link when no base tag is present.
function routerBasename(): string {
  const href = document.querySelector('base')?.getAttribute('href') ?? '/'
  try {
    const path = new URL(href, window.location.origin).pathname
    return path === '/' ? '/' : path.replace(/\/$/, '')
  } catch {
    return '/'
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <I18nProvider>
      <ThemeProvider>
        <Shell />
      </ThemeProvider>
    </I18nProvider>
  </StrictMode>,
)
