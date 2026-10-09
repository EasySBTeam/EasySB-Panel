import { useMemo, useState } from 'react'
import {
  Alert,
  Button,
  DatePicker,
  Drawer,
  Form,
  Input,
  InputNumber,
  Message,
  Modal,
  Popconfirm,
  Progress,
  Select,
  Space,
  Spin,
  Switch,
  Table,
  Tag,
  Typography,
} from '@arco-design/web-react'
import { IconDelete, IconEdit, IconPlus, IconRefresh, IconSync } from '@arco-design/web-react/icon'
import type { ColumnProps } from '@arco-design/web-react/es/Table'
import { api, ApiError } from '../api/client'
import type { Node, NodesResponse, User, UserSubscriptions, UsersResponse } from '../api/types'
import { useLoad } from '../hooks'
import { formatBytes, formatDate } from '../format'
import { useI18n } from '../i18n'

const GB = 1024 * 1024 * 1024

interface UserFormValues {
  name: string
  remark?: string
  quotaGB: number
  expireAt?: string
  nodes: string[]
  enabled: boolean
}

export default function Users() {
  const { t } = useI18n()
  const { data, loading, error, reload } = useLoad(() => api.get<UsersResponse>('/users'))
  const nodes = useLoad(() => api.get<NodesResponse>('/nodes'))
  const [form] = Form.useForm<UserFormValues>()
  const [editing, setEditing] = useState<User | null>(null)
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [subs, setSubs] = useState<{ user: User; data: UserSubscriptions } | null>(null)
  const [subsLoading, setSubsLoading] = useState(false)

  const nodeOptions = useMemo(
    () => (nodes.data?.nodes ?? []).map((node: Node) => ({ value: node.id, label: `${node.name} · ${node.protocol}` })),
    [nodes.data],
  )

  const openCreate = () => {
    setEditing(null)
    form.setFieldsValue({ name: '', remark: '', quotaGB: 0, expireAt: undefined, nodes: [], enabled: true })
    setOpen(true)
  }

  const openEdit = (user: User) => {
    setEditing(user)
    form.setFieldsValue({
      name: user.name,
      remark: user.remark ?? '',
      quotaGB: user.unlimited ? 0 : Math.round(user.quotaBytes / GB),
      expireAt: user.expireAt && !user.expireAt.startsWith('0001-') ? user.expireAt : undefined,
      nodes: user.nodes ?? [],
      enabled: user.enabled,
    })
    setOpen(true)
  }

  const submit = async () => {
    const values = await form.validate()
    const payload = {
      name: values.name,
      remark: values.remark ?? '',
      quotaBytes: Math.round((values.quotaGB ?? 0) * GB),
      expireAt: values.expireAt ? String(values.expireAt).slice(0, 10) : '',
      nodes: values.nodes ?? [],
      enabled: values.enabled,
    }
    setSaving(true)
    try {
      if (editing) {
        await api.put(`/users/${encodeURIComponent(editing.name)}`, payload)
        Message.success(t('accounts.updated'))
      } else {
        await api.post('/users', payload)
        Message.success(t('accounts.created'))
      }
      setOpen(false)
      reload()
    } catch (err) {
      Message.error(err instanceof ApiError ? err.message : t('accounts.saveFailed'))
    } finally {
      setSaving(false)
    }
  }

  const act = async (path: string, ok: string) => {
    try {
      await api.post(path)
      Message.success(ok)
      reload()
    } catch (err) {
      Message.error(err instanceof ApiError ? err.message : t('accounts.actionFailed'))
    }
  }

  const remove = async (user: User) => {
    try {
      await api.del(`/users/${encodeURIComponent(user.name)}`)
      Message.success(t('accounts.deleted'))
      reload()
    } catch (err) {
      Message.error(err instanceof ApiError ? err.message : t('accounts.deleteFailed'))
    }
  }

  const showSubscriptions = async (user: User) => {
    setSubsLoading(true)
    try {
      const result = await api.get<UserSubscriptions>(`/users/${encodeURIComponent(user.name)}/subscriptions`)
      setSubs({ user, data: result })
    } catch (err) {
      Message.error(err instanceof ApiError ? err.message : t('accounts.cannotBuild'))
    } finally {
      setSubsLoading(false)
    }
  }

  const columns: ColumnProps<User>[] = [
    {
      title: t('accounts.name'),
      render: (_, user) => (
        <Space direction="vertical" size={0}>
          <span>{user.name}</span>
          {user.remark && <span className="muted">{user.remark}</span>}
        </Space>
      ),
    },
    {
      title: t('accounts.status'),
      dataIndex: 'status',
      width: 130,
      render: (status: string, user) =>
        user.enabled ? <Tag color="green">{status}</Tag> : <Tag color="red">{t('common.disabled')}</Tag>,
    },
    {
      title: t('accounts.nodes'),
      dataIndex: 'nodes',
      width: 80,
      render: (list: string[] | null) => list?.length ?? 0,
    },
    {
      title: t('accounts.traffic'),
      width: 210,
      render: (_, user) =>
        user.unlimited ? (
          <span>
            {formatBytes(user.usedBytes)} <Tag>{t('common.unlimited')}</Tag>
          </span>
        ) : (
          <div>
            <span className="muted">
              {formatBytes(user.usedBytes)} / {formatBytes(user.quotaBytes)}
            </span>
            <Progress percent={user.percent} size="small" status={user.percent >= 100 ? 'error' : 'normal'} />
          </div>
        ),
    },
    {
      title: t('accounts.expires'),
      dataIndex: 'expireAt',
      width: 180,
      render: (value: string) =>
        !value || value.startsWith('0001-') ? <span className="muted">{t('common.never')}</span> : formatDate(value),
    },
    {
      title: t('common.actions'),
      width: 340,
      render: (_, user) => (
        <Space size="mini" wrap>
          <Button size="mini" icon={<IconEdit />} onClick={() => openEdit(user)}>
            {t('common.edit')}
          </Button>
          <Button size="mini" onClick={() => showSubscriptions(user)}>
            {t('accounts.links')}
          </Button>
          <Button
            size="mini"
            onClick={() =>
              act(
                `/users/${encodeURIComponent(user.name)}/${user.enabled ? 'disable' : 'enable'}`,
                user.enabled ? t('accounts.disabledMsg') : t('accounts.enabledMsg'),
              )
            }
          >
            {user.enabled ? t('nodes.disable') : t('nodes.enable')}
          </Button>
          <Button
            size="mini"
            icon={<IconSync />}
            onClick={() => act(`/users/${encodeURIComponent(user.name)}/reset`, t('accounts.resetMsg'))}
          >
            {t('accounts.reset')}
          </Button>
          <Popconfirm title={`${t('common.delete')} ${user.name}?`} onOk={() => remove(user)}>
            <Button size="mini" status="danger" icon={<IconDelete />} />
          </Popconfirm>
        </Space>
      ),
    },
  ]

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h2>{t('accounts.title')}</h2>
          <span className="muted">{t('accounts.subtitle')}</span>
        </div>
        <Space>
          <Button icon={<IconRefresh />} onClick={reload} loading={loading}>
            {t('common.refresh')}
          </Button>
          <Button type="primary" icon={<IconPlus />} onClick={openCreate}>
            {t('accounts.new')}
          </Button>
        </Space>
      </div>

      {error && <Alert type="error" content={error} style={{ marginBottom: 16 }} />}

      <div className="panel-card table-card">
        <Table
          rowKey="token"
          loading={loading}
          columns={columns}
          data={data?.users ?? []}
          pagination={false}
          scroll={{ x: 1000 }}
        />
      </div>

      <Modal
        title={editing ? `${t('accounts.editTitle')} · ${editing.name}` : t('accounts.createTitle')}
        visible={open}
        onCancel={() => setOpen(false)}
        onOk={submit}
        confirmLoading={saving}
        okText={t('common.save')}
        cancelText={t('common.cancel')}
        unmountOnExit
      >
        <Form form={form} layout="vertical" requiredSymbol={false}>
          <Form.Item field="name" label={t('accounts.name')} rules={[{ required: true, message: t('accounts.nameRequired') }]}>
            <Input disabled={Boolean(editing)} />
          </Form.Item>
          <Form.Item field="remark" label={t('accounts.remark')}>
            <Input placeholder={t('accounts.remarkPlaceholder')} />
          </Form.Item>
          <Form.Item field="quotaGB" label={t('accounts.quota')}>
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item field="expireAt" label={t('accounts.expires')}>
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item field="nodes" label={t('accounts.nodes')} extra={t('accounts.nodesHint')}>
            <Select mode="multiple" allowClear options={nodeOptions} placeholder={t('accounts.allNodes')} />
          </Form.Item>
          <Form.Item field="enabled" label={t('common.enabled')} triggerPropName="checked" style={{ marginBottom: 0 }}>
            <Switch />
          </Form.Item>
        </Form>
      </Modal>

      <Drawer
        title={subs ? `${t('accounts.subscription')} · ${subs.user.name}` : t('accounts.subscription')}
        visible={Boolean(subs) || subsLoading}
        onCancel={() => setSubs(null)}
        width={560}
        placement="right"
        footer={null}
      >
        {subsLoading && <Spin />}
        {subs && (
          <Space direction="vertical" size="large" style={{ width: '100%' }}>
            <div>
              <Typography.Text type="secondary">{t('accounts.endpoint')}</Typography.Text>
              <div className="mono">{subs.data.endpoint}</div>
            </div>
            <div>
              <Typography.Text type="secondary">{t('accounts.clientLinks')}</Typography.Text>
              {subs.data.clients?.map((client) => (
                <div key={client.client} style={{ marginTop: 8 }}>
                  <strong>{client.client}</strong>
                  <div className="mono">
                    <Typography.Text copyable>{client.url}</Typography.Text>
                  </div>
                </div>
              ))}
            </div>
            <div>
              <Typography.Text type="secondary">{t('accounts.shareLinks')}</Typography.Text>
              {subs.data.shareLinks?.map((link) => (
                <div key={link.key} style={{ marginTop: 8 }}>
                  <strong>{link.name}</strong>
                  <div className="mono">
                    <Typography.Text copyable>{link.uri}</Typography.Text>
                  </div>
                </div>
              ))}
            </div>
          </Space>
        )}
      </Drawer>
    </div>
  )
}
