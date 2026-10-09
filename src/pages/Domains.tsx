import { useState } from 'react'
import {
  Alert,
  Button,
  Card,
  Descriptions,
  Form,
  Input,
  Message,
  Popconfirm,
  Space,
  Spin,
  Tag,
  Typography,
} from '@arco-design/web-react'
import { IconDelete, IconRefresh, IconSafe, IconUpload } from '@arco-design/web-react/icon'
import { api, ApiError } from '../api/client'
import type { DomainsResponse, IssueResult, TimerState } from '../api/types'
import { useLoad } from '../hooks'
import { useI18n } from '../i18n'

interface IssueValues {
  domain: string
  email: string
}

export default function Domains() {
  const { t } = useI18n()
  const domains = useLoad(() => api.get<DomainsResponse>('/domains'))
  const timer = useLoad(() => api.get<TimerState>('/domains/timer'))
  const [form] = Form.useForm<IssueValues>()
  const [busy, setBusy] = useState(false)
  const [steps, setSteps] = useState<string[] | null>(null)

  const issue = async (values: IssueValues) => {
    setBusy(true)
    setSteps(null)
    try {
      const result = await api.post<IssueResult>('/domains/issue', values)
      setSteps(result.steps ?? [])
      if (result.error) {
        Message.error(result.error)
      } else {
        Message.success(t('domains.issued'))
      }
      domains.reload()
      timer.reload()
    } catch (err) {
      Message.error(err instanceof ApiError ? err.message : t('domains.issueFailed'))
    } finally {
      setBusy(false)
    }
  }

  const action = async (path: string, body: unknown, ok: string) => {
    try {
      await api.post(path, body)
      Message.success(ok)
      domains.reload()
      timer.reload()
    } catch (err) {
      Message.error(err instanceof ApiError ? err.message : t('domains.actionFailed'))
    }
  }

  const info = domains.data

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h2>{t('domains.title')}</h2>
          <span className="muted">{t('domains.subtitle')}</span>
        </div>
        <Space>
          <Button icon={<IconRefresh />} onClick={domains.reload} loading={domains.loading}>
            {t('common.refresh')}
          </Button>
          <Button
            icon={<IconUpload />}
            onClick={() => action('/domains/renew', {}, t('domains.renewed'))}
            disabled={!info?.registered}
          >
            {t('domains.renewAll')}
          </Button>
        </Space>
      </div>

      {domains.error && <Alert type="error" content={domains.error} style={{ marginBottom: 16 }} />}

      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <Card className="panel-card" bordered={false} title={t('domains.issuedTitle')}>
          {domains.loading && !info ? (
            <Spin />
          ) : (info?.domains?.length ?? 0) === 0 ? (
            <span className="muted">{t('domains.empty')}</span>
          ) : (
            <div className="list-rows">
              {info?.domains?.map((domain) => (
                <div key={domain} className="list-row">
                  <Space>
                    <IconSafe />
                    <span>{domain}</span>
                    {info.active === domain && <Tag color="green">{t('domains.active')}</Tag>}
                  </Space>
                  <Space>
                    <Button
                      size="mini"
                      disabled={info.active === domain}
                      onClick={() => action('/domains/activate', { domain }, t('domains.nowServing', { domain }))}
                    >
                      {info.active === domain ? t('domains.active') : t('domains.activate')}
                    </Button>
                    <Popconfirm
                      title={t('domains.removeConfirm', { domain })}
                      onOk={() => action('/domains/remove', { domain }, t('domains.removed'))}
                    >
                      <Button size="mini" status="danger" icon={<IconDelete />} />
                    </Popconfirm>
                  </Space>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card className="panel-card" bordered={false} title={t('domains.renewal')}>
          <Descriptions
            column={1}
            colon={false}
            data={[
              {
                label: t('domains.acmeAccount'),
                value: (
                  <Space>
                    {info?.registered ? (
                      <Tag color="green">{t('domains.registered')}</Tag>
                    ) : (
                      <Tag>{t('domains.notRegistered')}</Tag>
                    )}
                    {info?.staging && <Tag color="orange">{t('domains.staging')}</Tag>}
                  </Space>
                ),
              },
              { label: t('domains.configuredHost'), value: info?.configured || '-' },
              { label: t('domains.acmeEmail'), value: info?.acmeEmail || '-' },
              {
                label: t('domains.timer'),
                value: (
                  <Space wrap>
                    {timer.data?.installed ? (
                      <Tag color="green">{t('domains.timerInstalled')}</Tag>
                    ) : (
                      <Tag>{t('domains.timerMissing')}</Tag>
                    )}
                    {timer.data?.next && (
                      <span className="muted">{t('domains.next', { time: timer.data.next })}</span>
                    )}
                    <Button
                      size="mini"
                      onClick={() => action('/domains/timer', { action: 'install' }, t('domains.timerInstalledMsg'))}
                    >
                      {t('domains.install')}
                    </Button>
                    <Button
                      size="mini"
                      onClick={() => action('/domains/timer', { action: 'remove' }, t('domains.timerRemovedMsg'))}
                    >
                      {t('domains.remove')}
                    </Button>
                  </Space>
                ),
              },
            ]}
          />
        </Card>

        <Card className="panel-card" bordered={false} title={t('domains.issueTitle')}>
          <Form form={form} layout="vertical" requiredSymbol={false} onSubmit={issue} style={{ maxWidth: 480 }}>
            <Form.Item
              field="domain"
              label={t('domains.domain')}
              rules={[{ required: true, message: t('domains.domainRequired') }]}
            >
              <Input placeholder="node.example.com" />
            </Form.Item>
            <Form.Item
              field="email"
              label={t('domains.email')}
              rules={[{ required: true, type: 'email', message: t('domains.emailRequired') }]}
            >
              <Input placeholder="admin@example.com" />
            </Form.Item>
            <Button type="primary" htmlType="submit" loading={busy} icon={<IconSafe />}>
              {t('domains.issue')}
            </Button>
          </Form>
          {steps && (
            <pre className="log-view" style={{ marginTop: 16 }}>
              {steps.length ? steps.join('\n') : t('domains.noStep')}
            </pre>
          )}
          <Typography.Paragraph type="secondary" style={{ marginTop: 12, marginBottom: 0 }}>
            {t('domains.issueNote')}
          </Typography.Paragraph>
        </Card>
      </Space>
    </div>
  )
}
