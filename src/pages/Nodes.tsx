import { useMemo, useState } from 'react'
import {
  Alert,
  Button,
  Drawer,
  Form,
  Input,
  InputNumber,
  Message,
  Modal,
  Popconfirm,
  Select,
  Space,
  Spin,
  Switch,
  Table,
  Tag,
  Typography,
} from '@arco-design/web-react'
import { IconDelete, IconEdit, IconPlus, IconRefresh } from '@arco-design/web-react/icon'
import type { ColumnProps } from '@arco-design/web-react/es/Table'
import { api, ApiError } from '../api/client'
import type { Node, NodesResponse, ProtocolInfo } from '../api/types'
import { useLoad } from '../hooks'
import { useI18n } from '../i18n'

interface NodeFormValues {
  name: string
  protocol: string
  port: number
  enabled: boolean
  [param: string]: unknown
}

export default function Nodes() {
  const { t } = useI18n()
  const { data, loading, error, reload } = useLoad(() => api.get<NodesResponse>('/nodes'))
  const [form] = Form.useForm<NodeFormValues>()
  const [editing, setEditing] = useState<Node | null>(null)
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [config, setConfig] = useState<{ node: Node; json: string } | null>(null)
  const protocol = Form.useWatch('protocol', form)

  const protocols = useMemo<ProtocolInfo[]>(() => data?.protocols ?? [], [data])
  const current = protocols.find((item) => item.key === protocol)

  const openCreate = () => {
    setEditing(null)
    const first = protocols[0]
    form.setFieldsValue({
      name: '',
      protocol: first?.key ?? '',
      port: first?.defaultPort ?? 8000,
      enabled: true,
      ...defaultsFor(first),
    })
    setOpen(true)
  }

  const openEdit = (node: Node) => {
    setEditing(node)
    const info = protocols.find((item) => item.key === node.protocol)
    form.setFieldsValue({
      name: node.name,
      protocol: node.protocol,
      port: node.port,
      enabled: node.enabled,
      ...defaultsFor(info),
      ...(node.params ?? {}),
    })
    setOpen(true)
  }

  const submit = async () => {
    const values = await form.validate()
    const params: Record<string, string> = {}
    for (const param of current?.params ?? []) {
      params[param.key] = String(values[param.key] ?? '')
    }
    const payload = {
      name: values.name,
      protocol: values.protocol,
      port: values.port,
      enabled: values.enabled,
      params,
    }
    setSaving(true)
    try {
      if (editing) {
        await api.put(`/nodes/${editing.id}`, payload)
        Message.success(t('nodes.updated'))
      } else {
        await api.post('/nodes', payload)
        Message.success(t('nodes.created'))
      }
      setOpen(false)
      reload()
    } catch (err) {
      Message.error(err instanceof ApiError ? err.message : t('nodes.saveFailed'))
    } finally {
      setSaving(false)
    }
  }

  const toggle = async (node: Node) => {
    try {
      await api.post(`/nodes/${node.id}/${node.enabled ? 'disable' : 'enable'}`)
      Message.success(node.enabled ? t('nodes.disabledMsg') : t('nodes.enabledMsg'))
      reload()
    } catch (err) {
      Message.error(err instanceof ApiError ? err.message : t('nodes.actionFailed'))
    }
  }

  const remove = async (node: Node) => {
    try {
      await api.del(`/nodes/${node.id}`)
      Message.success(t('nodes.deleted'))
      reload()
    } catch (err) {
      Message.error(err instanceof ApiError ? err.message : t('nodes.deleteFailed'))
    }
  }

  const showConfig = async (node: Node) => {
    try {
      const result = await api.get<{ inbound: unknown }>(`/nodes/${node.id}/config`)
      setConfig({ node, json: JSON.stringify(result.inbound, null, 2) })
    } catch (err) {
      Message.error(err instanceof ApiError ? err.message : t('nodes.cannotRender'))
    }
  }

  const columns: ColumnProps<Node>[] = [
    { title: t('nodes.name'), dataIndex: 'name' },
    {
      title: t('nodes.protocol'),
      dataIndex: 'protocol',
      render: (value: string) => protocols.find((item) => item.key === value)?.label ?? value,
    },
    { title: t('nodes.port'), dataIndex: 'port', width: 90 },
    {
      title: t('nodes.state'),
      dataIndex: 'enabled',
      width: 110,
      render: (enabled: boolean) =>
        enabled ? <Tag color="green">{t('common.enabled')}</Tag> : <Tag>{t('common.disabled')}</Tag>,
    },
    {
      title: t('nodes.accounts'),
      dataIndex: 'usedBy',
      width: 100,
      render: (usedBy: number) => (usedBy > 0 ? <Tag color="arcoblue">{usedBy}</Tag> : <span className="muted">0</span>),
    },
    {
      title: t('common.actions'),
      width: 300,
      render: (_, node) => (
        <Space size="mini" wrap>
          <Button size="mini" icon={<IconEdit />} onClick={() => openEdit(node)}>
            {t('common.edit')}
          </Button>
          <Button size="mini" onClick={() => toggle(node)}>
            {node.enabled ? t('nodes.disable') : t('nodes.enable')}
          </Button>
          <Button size="mini" onClick={() => showConfig(node)}>
            {t('nodes.config')}
          </Button>
          <Popconfirm title={`${t('common.delete')} ${node.name}?`} onOk={() => remove(node)}>
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
          <h2>{t('nodes.title')}</h2>
          <span className="muted">{t('nodes.subtitle')}</span>
        </div>
        <Space>
          <Button icon={<IconRefresh />} onClick={reload} loading={loading}>
            {t('common.refresh')}
          </Button>
          <Button type="primary" icon={<IconPlus />} onClick={openCreate} disabled={!protocols.length}>
            {t('nodes.new')}
          </Button>
        </Space>
      </div>

      {error && <Alert type="error" content={error} style={{ marginBottom: 16 }} />}

      <div className="panel-card table-card">
        <Table
          rowKey="id"
          loading={loading}
          columns={columns}
          data={data?.nodes ?? []}
          pagination={false}
          scroll={{ x: 760 }}
        />
      </div>

      <Modal
        title={editing ? `${t('nodes.edit')} · ${editing.name}` : t('nodes.createTitle')}
        visible={open}
        onCancel={() => setOpen(false)}
        onOk={submit}
        confirmLoading={saving}
        okText={t('common.save')}
        cancelText={t('common.cancel')}
        unmountOnExit
      >
        <Form form={form} layout="vertical" requiredSymbol={false}>
          <Form.Item field="name" label={t('nodes.name')} rules={[{ required: true, message: t('nodes.nameRequired') }]}>
            <Input placeholder={t('nodes.namePlaceholder')} />
          </Form.Item>
          <Form.Item field="protocol" label={t('nodes.protocol')} rules={[{ required: true }]}>
            <Select
              disabled={Boolean(editing)}
              options={protocols.map((item) => ({ value: item.key, label: item.label }))}
              onChange={(value) => {
                const info = protocols.find((item) => item.key === value)
                form.setFieldsValue({
                  port: info?.defaultPort ?? (form.getFieldValue('port') as number),
                  ...defaultsFor(info),
                })
              }}
            />
          </Form.Item>
          <Form.Item field="port" label={t('nodes.port')} rules={[{ required: true, message: t('nodes.portRequired') }]}>
            <InputNumber min={1} max={65535} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item field="enabled" label={t('common.enabled')} triggerPropName="checked" style={{ marginBottom: 8 }}>
            <Switch />
          </Form.Item>
          {current?.params?.map((param) => (
            <Form.Item
              key={param.key}
              field={param.key}
              label={param.label}
              extra={`key: ${param.key}`}
            >
              <Input placeholder={param.default} />
            </Form.Item>
          ))}
          <Typography.Text type="secondary">{t('nodes.generatedNote')}</Typography.Text>
        </Form>
      </Modal>

      <Drawer
        title={config ? `${t('nodes.renderedInbound')} · ${config.node.name}` : t('nodes.renderedInbound')}
        visible={Boolean(config)}
        onCancel={() => setConfig(null)}
        width={640}
        placement="right"
        footer={null}
      >
        {config ? <pre className="log-view">{config.json}</pre> : <Spin />}
      </Drawer>
    </div>
  )
}

function defaultsFor(info?: ProtocolInfo): Record<string, string> {
  const out: Record<string, string> = {}
  for (const param of info?.params ?? []) {
    out[param.key] = param.default
  }
  return out
}
