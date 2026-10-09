import { useState } from 'react'
import {
  Alert,
  Button,
  Descriptions,
  Drawer,
  Message,
  Space,
  Spin,
  Tag,
  Typography,
} from '@arco-design/web-react'
import { IconCheckCircle, IconPlayCircle, IconRefresh, IconSync } from '@arco-design/web-react/icon'
import { api, ApiError } from '../api/client'
import type { CheckResult, CoreInfo } from '../api/types'
import { useLoad } from '../hooks'
import { useI18n } from '../i18n'

// CoreSection is the core management block on the dashboard. It renders the
// service actions and build facts; the running state and counts already live in
// the 服务 and 概览 cards, so they are not repeated here.
export function CoreSection() {
  const { t } = useI18n()
  const { data, loading, error, reload } = useLoad(() => api.get<CoreInfo>('/core'))
  const [config, setConfig] = useState<string | null>(null)
  const [configLoading, setConfigLoading] = useState(false)
  const [check, setCheck] = useState<CheckResult | null>(null)
  const [busy, setBusy] = useState(false)

  const act = async (action: string, ok: string) => {
    setBusy(true)
    try {
      await api.post(`/core/${action}`)
      Message.success(ok)
      reload()
    } catch (err) {
      Message.error(err instanceof ApiError ? err.message : t('core.actionFailed'))
    } finally {
      setBusy(false)
    }
  }

  const apply = async () => {
    setBusy(true)
    try {
      await api.post('/core/apply')
      Message.success(t('core.applied'))
      reload()
    } catch (err) {
      Message.error(err instanceof ApiError ? err.message : t('core.applyFailed'))
    } finally {
      setBusy(false)
    }
  }

  const runCheck = async () => {
    setBusy(true)
    setCheck(null)
    try {
      const result = await api.post<CheckResult>('/core/check')
      setCheck(result)
      if (result.ok) Message.success(t('core.checkOk'))
    } catch (err) {
      Message.error(err instanceof ApiError ? err.message : t('core.checkFailed'))
    } finally {
      setBusy(false)
    }
  }

  const showConfig = async () => {
    setConfigLoading(true)
    try {
      const result = await api.get<{ path: string; config: string }>('/core/config')
      try {
        setConfig(JSON.stringify(JSON.parse(result.config), null, 2))
      } catch {
        setConfig(result.config)
      }
    } catch (err) {
      Message.error(err instanceof ApiError ? err.message : t('core.cannotRead'))
    } finally {
      setConfigLoading(false)
    }
  }

  return (
    <>
      {error && <Alert type="error" content={error} style={{ marginBottom: 16 }} />}

      {loading && !data ? (
        <Spin />
      ) : data ? (
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <Space wrap>
            <Button type="primary" icon={<IconPlayCircle />} onClick={() => act('start', t('core.started'))} loading={busy}>
              {t('core.start')}
            </Button>
            <Button icon={<IconSync />} onClick={apply} loading={busy}>
              {t('core.apply')}
            </Button>
            <Button onClick={() => act('restart', t('core.restarted'))} loading={busy}>
              {t('core.restart')}
            </Button>
            <Button status="danger" onClick={() => act('stop', t('core.stopped'))} loading={busy}>
              {t('core.stop')}
            </Button>
            <Button onClick={() => act('enable', t('core.enabledMsg'))} loading={busy}>
              {t('core.enable')}
            </Button>
            <Button onClick={() => act('disable', t('core.disabledMsg'))} loading={busy}>
              {t('core.disable')}
            </Button>
          </Space>

          <Descriptions
            column={1}
            colon={false}
            data={[
              { label: t('core.easysbVersion'), value: data.version },
              { label: t('core.coreVersion'), value: data.coreVersion },
              {
                label: t('core.counters'),
                value: data.statsCapable ? (
                  <Tag color="green">{t('core.available')}</Tag>
                ) : (
                  <Tag>{t('core.notInBuild')}</Tag>
                ),
              },
              {
                label: t('core.deployed'),
                value: data.deployed ? <Tag color="green">{t('common.yes')}</Tag> : <Tag>{t('common.no')}</Tag>,
              },
              { label: t('core.configPath'), value: <span className="mono">{data.configPath}</span> },
            ]}
          />

          <Space wrap>
            <Button icon={<IconRefresh />} onClick={reload} loading={loading}>
              {t('common.refresh')}
            </Button>
            <Button icon={<IconCheckCircle />} onClick={runCheck} loading={busy}>
              {t('core.check')}
            </Button>
            <Button onClick={showConfig} loading={configLoading}>
              {t('core.viewConfig')}
            </Button>
          </Space>

          {check && (
            <Alert
              type={check.ok ? 'success' : 'error'}
              title={check.ok ? t('core.checkOk') : t('core.checkFail')}
              content={check.error}
            />
          )}
        </Space>
      ) : null}

      <Drawer
        title={t('core.rendered')}
        visible={Boolean(config)}
        onCancel={() => setConfig(null)}
        width={720}
        placement="right"
        footer={null}
      >
        {configLoading ? <Spin /> : <pre className="log-view">{config}</pre>}
        <Typography.Paragraph type="secondary" style={{ marginTop: 12 }}>
          {t('core.renderedNote')}
        </Typography.Paragraph>
      </Drawer>
    </>
  )
}

export default CoreSection
