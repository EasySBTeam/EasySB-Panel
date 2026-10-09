import { useEffect, useState, type ReactNode } from 'react'
import {
  Alert,
  Button,
  Card,
  Form,
  Input,
  InputNumber,
  Message,
  Radio,
  Select,
  Space,
  Spin,
  Switch,
  Tag,
} from '@arco-design/web-react'
import { IconRefresh } from '@arco-design/web-react/icon'
import { api, apiBase, ApiError } from '../api/client'
import type { PanelConfigResult, PanelInfo, SecurityView, TLSSaveResult } from '../api/types'
import { useLoad } from '../hooks'
import { useI18n, type Lang } from '../i18n'
import { useTheme, type ThemeMode } from '../theme'

interface PasswordValues {
  current: string
  next: string
}

type Tab = 'panel' | 'security'

// The backend reports the address it is configured to listen on. For a wildcard
// bind (0.0.0.0 / ::) that address is not reachable, so the host the operator
// actually reached the panel on is substituted to keep the URL copyable.
function withReachableHost(url: string): string {
  try {
    const parsed = new URL(url)
    if (parsed.hostname === '0.0.0.0' || parsed.hostname === '::' || parsed.hostname === '') {
      parsed.hostname = window.location.hostname
    }
    return parsed.toString()
  } catch {
    return url
  }
}

// The URL to return to after a transport change: scheme, host and the new port
// come from the server's answer, the entry prefix from the value just saved.
function redirectUrl(accessUrl: string, entry: string): string {
  const prefix = entry ? `/${entry}/` : '/'
  try {
    const parsed = new URL(accessUrl)
    if (parsed.hostname === '0.0.0.0' || parsed.hostname === '::' || parsed.hostname === '') {
      parsed.hostname = window.location.hostname
    }
    parsed.pathname = prefix
    parsed.search = ''
    parsed.hash = ''
    return parsed.toString()
  } catch {
    return `${window.location.origin}${prefix}`
  }
}

// SettingRow mirrors 1Panel's settings layout: a fixed label column with an
// optional hint, and a control column that carries the input or the action.
function SettingRow({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div className="setting-row">
      <div className="setting-label">
        <span>{label}</span>
        {hint && <span className="setting-hint">{hint}</span>}
      </div>
      <div className="setting-control">{children}</div>
    </div>
  )
}

export default function PanelSettings() {
  const { t } = useI18n()
  const [tab, setTab] = useState<Tab>('panel')
  const { data, loading, error, reload } = useLoad(() => api.get<PanelInfo>('/panel'))

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h2>{t('panel.title')}</h2>
          <span className="muted">{t('panel.subtitle')}</span>
        </div>
        <Space>
          <Radio.Group
            type="button"
            value={tab}
            onChange={(value) => setTab(value as Tab)}
            options={[
              { label: t('security.tabPanel'), value: 'panel' },
              { label: t('security.tabSecurity'), value: 'security' },
            ]}
          />
          <Button icon={<IconRefresh />} onClick={reload} loading={loading}>
            {t('common.refresh')}
          </Button>
        </Space>
      </div>

      {error && <Alert type="error" content={error} style={{ marginBottom: 16 }} />}

      {loading && !data ? (
        <Spin />
      ) : data ? (
        tab === 'panel' ? (
          <PanelTab data={data} onSaved={reload} />
        ) : (
          <SecurityTab data={data} onSaved={reload} />
        )
      ) : null}
    </div>
  )
}

// PanelTab is 1Panel's 面板 tab: the appearance (theme, language), the running
// panel facts, the service lifecycle and the password.
function PanelTab({ data, onSaved }: { data: PanelInfo; onSaved: () => void }) {
  const { t, lang, setLang } = useI18n()
  const { mode, setMode } = useTheme()
  const [form] = Form.useForm<PasswordValues>()
  const [busy, setBusy] = useState(false)

  const act = async (action: string, ok: string) => {
    setBusy(true)
    try {
      await api.post(`/panel/${action}`)
      Message.success(ok)
      onSaved()
    } catch (err) {
      Message.error(err instanceof ApiError ? err.message : t('panel.actionFailed'))
    } finally {
      setBusy(false)
    }
  }

  const changePassword = async (values: PasswordValues) => {
    setBusy(true)
    try {
      await api.post('/auth/password', values)
      Message.success(t('panel.passwordChanged'))
      form.resetFields()
    } catch (err) {
      Message.error(err instanceof ApiError ? err.message : t('panel.cannotChange'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card className="panel-card" bordered={false}>
      <div className="setting-rows">
        <SettingRow label={t('panel.themeColor')}>
          <Radio.Group
            type="button"
            value={mode}
            onChange={(value) => setMode(value as ThemeMode)}
            options={[
              { label: t('theme.light'), value: 'light' },
              { label: t('theme.dark'), value: 'dark' },
              { label: t('theme.system'), value: 'system' },
            ]}
          />
        </SettingRow>

        <SettingRow label={t('panel.language')}>
          <Select
            value={lang}
            onChange={(value) => setLang(value as Lang)}
            style={{ width: 200 }}
            options={[
              { label: '简体中文', value: 'zh' },
              { label: 'English', value: 'en' },
            ]}
          />
        </SettingRow>

        <SettingRow label={t('panel.accessUrl')}>
          <a className="mono" href={withReachableHost(data.accessUrl)} target="_blank" rel="noreferrer">
            {withReachableHost(data.accessUrl)}
          </a>
        </SettingRow>

        <SettingRow label={t('system.state')}>
          <Space>
            {data.active ? <Tag color="green">{t('common.running')}</Tag> : <Tag>{t('common.stopped')}</Tag>}
            {data.enabled ? <Tag color="green">{t('common.enabled')}</Tag> : <Tag>{t('common.disabled')}</Tag>}
            {data.installed ? (
              <Tag color="arcoblue">{t('common.installed')}</Tag>
            ) : (
              <Tag>{t('common.notInstalled')}</Tag>
            )}
          </Space>
        </SettingRow>

        <SettingRow label={t('panel.version')}>
          <span className="mono">{`v${data.version} · API v${data.apiVersion}`}</span>
        </SettingRow>

        <SettingRow label={t('panel.configPath')}>
          <span className="mono">{data.configPath}</span>
        </SettingRow>

        <SettingRow label={t('panel.unit')}>
          <span className="mono">{data.unitPath}</span>
        </SettingRow>

        <SettingRow label={t('panel.service')}>
          <Space wrap>
            <Button type="primary" onClick={() => act('install', t('panel.installedMsg'))} loading={busy}>
              {t('panel.install')}
            </Button>
            <Button onClick={() => act('restart', t('panel.restartedMsg'))} loading={busy}>
              {t('panel.restart')}
            </Button>
            <Button onClick={() => act('stop', t('panel.stoppedMsg'))} loading={busy}>
              {t('panel.stop')}
            </Button>
            <Button status="danger" onClick={() => act('uninstall', t('panel.uninstalledMsg'))} loading={busy}>
              {t('panel.uninstall')}
            </Button>
          </Space>
        </SettingRow>
      </div>

      <div className="setting-divider" />
      <h4 className="setting-title">{t('panel.changePassword')}</h4>
      <Form
        form={form}
        layout="vertical"
        requiredSymbol={false}
        onSubmit={changePassword}
        style={{ maxWidth: 420 }}
      >
        <Form.Item field="current" label={t('panel.current')} rules={[{ required: true }]}>
          <Input.Password autoComplete="current-password" />
        </Form.Item>
        <Form.Item
          field="next"
          label={t('panel.newPassword')}
          rules={[{ required: true, minLength: 8, message: t('panel.minChars') }]}
        >
          <Input.Password autoComplete="new-password" />
        </Form.Item>
        <Button type="primary" htmlType="submit" loading={busy}>
          {t('panel.update')}
        </Button>
      </Form>
    </Card>
  )
}

// SecurityTab is 1Panel's 安全 tab: the transport the panel listens on (port and
// address), the security entry prefix, the TLS certificate and the firewall.
function SecurityTab({ data, onSaved }: { data: PanelInfo; onSaved: () => void }) {
  const { t } = useI18n()
  const [listen, setListen] = useState(data.listen)
  const [port, setPort] = useState(data.port)
  const [entry, setEntry] = useState(data.security)
  const [busy, setBusy] = useState(false)

  // Re-seed the editable transport fields when the panel reloads, so a refresh
  // after a save shows the persisted values rather than the prior draft.
  useEffect(() => {
    setListen(data.listen)
    setPort(data.port)
    setEntry(data.security)
  }, [data.listen, data.port, data.security])

  const saveTransport = async () => {
    setBusy(true)
    try {
      const result = await api.post<PanelConfigResult>('/panel/config', {
        listen,
        port,
        securityEntry: entry,
      })
      Message.success(t('security.transportSaved'))
      onSaved()
      const target = redirectUrl(result.accessUrl, result.securityEntry)
      const newPrefix = result.securityEntry ? `/${result.securityEntry}/` : '/'
      if (result.restartRequired) {
        Message.info(t('security.restarting'))
        window.setTimeout(() => window.location.assign(target), 2500)
      } else if (newPrefix !== apiBase()) {
        // The entry prefix changed, so the current URL no longer resolves. A full
        // reload is required for the SPA to pick up the new <base>.
        window.setTimeout(() => window.location.assign(target), 400)
      }
    } catch (err) {
      Message.error(err instanceof ApiError ? err.message : t('security.actionFailed'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      <Card className="panel-card" bordered={false} title={t('security.transport')}>
        <div className="setting-rows">
          <SettingRow label={t('security.port')}>
            <InputNumber min={1} max={65535} value={port} onChange={(value) => setPort(value ?? data.port)} style={{ width: 200 }} />
          </SettingRow>
          <SettingRow label={t('security.listenAddress')}>
            <Input value={listen} onChange={(value) => setListen(value)} style={{ width: 240 }} placeholder="0.0.0.0" />
          </SettingRow>
          <SettingRow label={t('security.entry')} hint={t('security.entryHint')}>
            <Input value={entry} onChange={(value) => setEntry(value)} style={{ width: 240 }} placeholder={t('security.entryPlaceholder')} />
          </SettingRow>
          <SettingRow label="">
            <Space>
              <Button type="primary" onClick={saveTransport} loading={busy}>
                {t('security.saveTransport')}
              </Button>
            </Space>
          </SettingRow>
        </div>
        <div className="muted setting-footnote">{t('security.transportNote')}</div>
      </Card>

      <TLSSection accessUrl={withReachableHost(data.accessUrl)} />
      <FirewallSection />
    </Space>
  )
}

// TLSSection manages the certificate the panel serves itself with.
function TLSSection({ accessUrl }: { accessUrl: string }) {
  const { t } = useI18n()
  const { data, loading, error, reload } = useLoad(() => api.get<SecurityView>('/security'))
  const [enabled, setEnabled] = useState(false)
  const [domain, setDomain] = useState('')
  const [certFile, setCertFile] = useState('')
  const [keyFile, setKeyFile] = useState('')
  const [busy, setBusy] = useState(false)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (data && !ready) {
      setEnabled(data.tls.enabled)
      setCertFile(data.tls.certFile)
      setKeyFile(data.tls.keyFile)
      setReady(true)
    }
  }, [data, ready])

  const pickDomain = (value: string) => {
    setDomain(value)
    const option = data?.domains?.find((item) => item.domain === value)
    if (option) {
      setCertFile(option.certFile)
      setKeyFile(option.keyFile)
    }
  }

  const saveTls = async () => {
    setBusy(true)
    try {
      await api.post<TLSSaveResult>('/security/tls', { enabled, certFile, keyFile, domain })
      Message.success(t('security.tlsSaved'))
      reload()
    } catch (err) {
      Message.error(err instanceof ApiError ? err.message : t('security.actionFailed'))
    } finally {
      setBusy(false)
    }
  }

  if (loading && !data) {
    return <Spin />
  }

  const hasDomains = Boolean(data?.domains?.length)

  return (
    <Card className="panel-card" bordered={false} title={t('security.tls')}>
      {error && <Alert type="error" content={error} style={{ marginBottom: 12 }} />}
      <div className="muted" style={{ marginBottom: 12 }}>
        {t('security.tlsDesc')}
      </div>
      {!hasDomains && <Alert type="warning" content={t('security.noDomains')} style={{ marginBottom: 12 }} />}
      <div className="setting-rows">
        <SettingRow label={t('security.enable')}>
          <Switch checked={enabled} onChange={(value) => setEnabled(value)} />
        </SettingRow>
        <SettingRow label={t('security.domain')}>
          <Select
            placeholder={t('security.domainPlaceholder')}
            value={domain || undefined}
            onChange={(value) => pickDomain(value as string)}
            allowClear
            style={{ width: 280 }}
          >
            {data?.domains?.map((option) => (
              <Select.Option key={option.domain} value={option.domain}>
                {option.domain}
              </Select.Option>
            ))}
          </Select>
        </SettingRow>
        <SettingRow label={t('security.certFile')}>
          <Input value={certFile} onChange={(value) => setCertFile(value)} placeholder="/etc/sing-box/acme/..." />
        </SettingRow>
        <SettingRow label={t('security.keyFile')}>
          <Input value={keyFile} onChange={(value) => setKeyFile(value)} placeholder="/etc/sing-box/acme/..." />
        </SettingRow>
        <SettingRow label={t('panel.accessUrl')}>
          <span className="mono">{accessUrl}</span>
        </SettingRow>
        <SettingRow label="">
          <Button type="primary" onClick={saveTls} loading={busy}>
            {t('security.saveTls')}
          </Button>
        </SettingRow>
      </div>
      <div className="muted setting-footnote">{t('security.tlsNote')}</div>
    </Card>
  )
}

// FirewallSection applies the node ports to the host firewall.
function FirewallSection() {
  const { t } = useI18n()
  const { data, loading, error, reload } = useLoad(() => api.get<SecurityView>('/security'))
  const [busy, setBusy] = useState(false)

  const firewall = async (action: 'apply' | 'remove') => {
    setBusy(true)
    try {
      await api.post(`/security/firewall/${action}`)
      Message.success(action === 'apply' ? t('security.appliedMsg') : t('security.removedMsg'))
      reload()
    } catch (err) {
      Message.error(err instanceof ApiError ? err.message : t('security.actionFailed'))
    } finally {
      setBusy(false)
    }
  }

  if (loading && !data) {
    return <Spin />
  }

  const ports = data?.firewall.ports ?? []

  return (
    <Card className="panel-card" bordered={false} title={t('security.firewall')}>
      {error && <Alert type="error" content={error} style={{ marginBottom: 12 }} />}
      <div className="setting-rows">
        <SettingRow label={t('security.backend')}>
          {data?.firewall.backend ? (
            <Tag color="arcoblue">{data.firewall.backend}</Tag>
          ) : (
            <Tag>{t('security.none')}</Tag>
          )}
        </SettingRow>
        <SettingRow label={t('security.unit')}>
          <span className="mono">{data?.firewall.unit || '-'}</span>
        </SettingRow>
        <SettingRow label={t('security.ports')}>
          {ports.length ? (
            <Space wrap>
              {ports.map((port) => (
                <Tag key={`${port.protocol}-${port.port}`}>
                  {port.network}:{port.port} · {port.protocol}
                </Tag>
              ))}
            </Space>
          ) : (
            <span className="muted">{t('security.noPorts')}</span>
          )}
        </SettingRow>
        <SettingRow label="">
          <Space wrap>
            <Button type="primary" onClick={() => firewall('apply')} loading={busy}>
              {t('security.apply')}
            </Button>
            <Button status="danger" onClick={() => firewall('remove')} loading={busy}>
              {t('security.remove')}
            </Button>
          </Space>
        </SettingRow>
      </div>
    </Card>
  )
}
