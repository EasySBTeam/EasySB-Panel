import { useEffect, useState } from 'react'
import { Alert, Button, Card, Descriptions, Message, Radio, Space, Spin, Tag } from '@arco-design/web-react'
import { IconRefresh, IconThunderbolt } from '@arco-design/web-react/icon'
import { api, ApiError } from '../api/client'
import type { BBRActionResult, BBRStatus } from '../api/types'
import { useLoad } from '../hooks'
import { useI18n } from '../i18n'

// Bbr reads and writes the same drop-ins the TUI manages, so enabling BBR here
// is the same action as enabling it from the terminal UI.
export default function Bbr() {
  const { t } = useI18n()
  const { data, loading, error, reload } = useLoad(() => api.get<BBRStatus>('/bbr'))
  const [qdisc, setQdisc] = useState('fq')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (data?.qdisc) {
      setQdisc(data.qdisc)
    }
  }, [data?.qdisc])

  const enable = async () => {
    setBusy(true)
    try {
      const result = await api.post<BBRActionResult>('/bbr/enable', { qdisc })
      Message.success(t('bbr.enabledMsg'))
      if (result.qdisc) setQdisc(result.qdisc)
      reload()
    } catch (err) {
      Message.error(err instanceof ApiError ? err.message : t('bbr.actionFailed'))
    } finally {
      setBusy(false)
    }
  }

  const clear = async () => {
    setBusy(true)
    try {
      await api.post<BBRActionResult>('/bbr/clear')
      Message.success(t('bbr.clearedMsg'))
      reload()
    } catch (err) {
      Message.error(err instanceof ApiError ? err.message : t('bbr.actionFailed'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h2>{t('bbr.title')}</h2>
          <span className="muted">{t('bbr.subtitle')}</span>
        </div>
        <Button icon={<IconRefresh />} onClick={reload} loading={loading}>
          {t('common.refresh')}
        </Button>
      </div>

      {error && <Alert type="error" content={error} style={{ marginBottom: 16 }} />}

      {loading && !data ? (
        <Spin />
      ) : data ? (
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <Card className="panel-card" bordered={false} title={t('bbr.state')}>
            <Descriptions
              column={2}
              colon={false}
              data={[
                {
                  label: t('bbr.congestion'),
                  value: data.enabled ? (
                    <Tag color="green" icon={<IconThunderbolt />}>
                      {data.congestion || 'bbr'}
                    </Tag>
                  ) : (
                    <Tag>{data.congestion || t('bbr.notInUse')}</Tag>
                  ),
                },
                { label: t('bbr.qdisc'), value: <span className="mono">{data.qdisc || '-'}</span> },
                { label: t('bbr.running'), value: <span className="mono">{data.running || '-'}</span> },
                { label: t('bbr.arch'), value: data.arch || '-' },
                {
                  label: t('bbr.supportedYes'),
                  value: data.supported ? (
                    <Tag color="green">{t('bbr.supportedYes')}</Tag>
                  ) : (
                    <Tag color="orange">{t('bbr.supportedNo')}</Tag>
                  ),
                },
                {
                  label: t('bbr.customKernel'),
                  value: data.customKernel ? <span className="mono">{data.customKernel}</span> : t('bbr.customKernelNone'),
                },
                {
                  label: t('bbr.kernels'),
                  value: data.kernels?.length ? (
                    <span className="mono">{data.kernels.join('、')}</span>
                  ) : (
                    '-'
                  ),
                },
                {
                  label: t('bbr.needsReboot'),
                  value: data.needsReboot ? <Tag color="orange">{t('bbr.needsReboot')}</Tag> : <Tag color="green">{t('common.no')}</Tag>,
                },
              ]}
            />
          </Card>

          <Card className="panel-card" bordered={false} title={t('bbr.enable')}>
            <div className="bbr-qdisc">
              <span className="muted">{t('bbr.qdiscPick')}</span>
              <Radio.Group
                type="button"
                value={qdisc}
                onChange={(value) => setQdisc(value as string)}
                options={(data.qdiscs ?? ['fq']).map((item) => ({ label: item, value: item }))}
              />
            </div>
            <Space wrap style={{ marginTop: 16 }}>
              <Button type="primary" onClick={enable} loading={busy}>
                {t('bbr.enable')}
              </Button>
              <Button status="danger" onClick={clear} loading={busy}>
                {t('bbr.clear')}
              </Button>
            </Space>
            <div className="muted" style={{ marginTop: 12 }}>
              {t('bbr.note')}
            </div>
          </Card>
        </Space>
      ) : null}
    </div>
  )
}
