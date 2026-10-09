import { useState } from 'react'
import {
  Alert,
  Button,
  InputNumber,
  Message,
  Radio,
  Space,
  Spin,
  Table,
  Tag,
} from '@arco-design/web-react'
import { IconRefresh } from '@arco-design/web-react/icon'
import type { ColumnProps } from '@arco-design/web-react/es/Table'
import { api, ApiError } from '../api/client'
import type { LogResult, ServiceState, SystemInfo } from '../api/types'
import { useLoad } from '../hooks'
import { useI18n } from '../i18n'

type ServiceRow = { key: string; state: ServiceState }

// SystemSection is the three-service block on the dashboard. The host snapshot
// it used to repeat now lives once, in the 系统信息 card, so this section only
// carries the systemd units and the subscription controls.
export function SystemSection() {
  const { t } = useI18n()
  const system = useLoad(() => api.get<SystemInfo>('/system'))

  const subAction = async (action: string, ok: string) => {
    try {
      await api.post(`/system/subscription/${action}`)
      Message.success(ok)
      system.reload()
    } catch (err) {
      Message.error(err instanceof ApiError ? err.message : t('system.actionFailed'))
    }
  }

  const columns: ColumnProps<ServiceRow>[] = [
    { title: t('system.serviceName'), dataIndex: 'key' },
    {
      title: t('system.state'),
      render: (_, row) =>
        row.state.active ? <Tag color="green">{t('common.running')}</Tag> : <Tag>{t('common.stopped')}</Tag>,
    },
    {
      title: t('system.boot'),
      render: (_, row) =>
        row.state.enabled ? <Tag color="green">{t('common.enabled')}</Tag> : <Tag>{t('common.disabled')}</Tag>,
    },
    {
      title: t('system.unit'),
      render: (_, row) => <span className="mono">{row.state.unit || row.state.name}</span>,
    },
  ]

  return (
    <>
      {system.error && <Alert type="error" content={system.error} style={{ marginBottom: 16 }} />}

      {system.loading && !system.data ? (
        <Spin />
      ) : system.data ? (
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <div className="table-card">
            <Table
              rowKey="key"
              columns={columns}
              data={Object.entries(system.data.services).map(([key, state]) => ({ key, state }))}
              pagination={false}
            />
          </div>
          <Space wrap>
            <Button size="small" icon={<IconRefresh />} onClick={system.reload} loading={system.loading}>
              {t('common.refresh')}
            </Button>
            <Button size="small" onClick={() => subAction('install', t('system.subInstalled'))}>
              {t('system.installSub')}
            </Button>
            <Button size="small" onClick={() => subAction('restart', t('system.subRestarted'))}>
              {t('system.restartSub')}
            </Button>
            <Button size="small" onClick={() => subAction('stop', t('system.subStopped'))}>
              {t('system.stopSub')}
            </Button>
            <Button size="small" status="danger" onClick={() => subAction('uninstall', t('system.subUninstalled'))}>
              {t('system.uninstallSub')}
            </Button>
          </Space>
        </Space>
      ) : null}
    </>
  )
}

// LogSection is the log viewer card. It is a dashboard block rather than its own
// page, so it carries its own toolbar and no page header.
export function LogSection() {
  const { t } = useI18n()
  const [service, setService] = useState<'panel' | 'core' | 'subscription'>('panel')
  const [lines, setLines] = useState(200)
  const [logs, setLogs] = useState<LogResult | null>(null)
  const [logLoading, setLogLoading] = useState(false)

  const loadLogs = async (which = service, count = lines) => {
    setLogLoading(true)
    try {
      const result = await api.get<LogResult>(`/logs?service=${which}&lines=${count}`)
      setLogs(result)
    } catch (err) {
      Message.error(err instanceof ApiError ? err.message : t('system.cannotRead'))
    } finally {
      setLogLoading(false)
    }
  }

  return (
    <>
      <Space wrap style={{ marginBottom: 12 }}>
        <Radio.Group
          type="button"
          value={service}
          onChange={(value) => {
            const next = value as 'panel' | 'core' | 'subscription'
            setService(next)
            void loadLogs(next, lines)
          }}
          options={[
            { label: t('nav.panel'), value: 'panel' },
            { label: t('nav.core'), value: 'core' },
            { label: 'Subscription', value: 'subscription' },
          ]}
        />
        <Space>
          <InputNumber
            min={10}
            max={2000}
            value={lines}
            onChange={(value) => setLines(value ?? 200)}
            style={{ width: 120 }}
          />
          <span className="muted">{t('system.lines')}</span>
        </Space>
        <Button onClick={() => loadLogs()} loading={logLoading}>
          {t('system.loadBtn')}
        </Button>
      </Space>
      {logs?.note && <Alert type="warning" content={logs.note} style={{ marginBottom: 12 }} />}
      <pre className="log-view">
        {logs?.lines?.length ? logs.lines.join('\n') : t('system.noLines')}
      </pre>
      {logs?.path && <div className="muted mono">{logs.path}</div>}
    </>
  )
}

export default SystemSection
