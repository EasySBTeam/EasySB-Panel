import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  Link2,
  Pencil,
  Power,
  PowerOff,
  RotateCcw,
  Trash2,
} from 'lucide-react'
import { toast } from 'sonner'
import {
  useDeleteUser,
  useNodes,
  useResetUser,
  useSetUserEnabled,
  useUpdateUser,
  useUser,
  useUserDocument,
  useUserSubscriptions,
} from '@/lib/queries'
import { formatBytes, formatDateTime } from '@/lib/format'
import { subscribeClientLabel } from '@/lib/labels'
import type { SubscribeClient, UserRequest } from '@/lib/types'
import { PageHeader, Section } from '@/components/shared/page'
import { StatCard } from '@/components/shared/stat-card'
import { UserStatusBadge } from '@/components/shared/status-badge'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { CopyField } from '@/components/shared/copy'
import { CodeBlock } from '@/components/shared/code-block'
import { UserFormDialog } from '@/components/shared/user-form'
import { ErrorState, LoadingState } from '@/components/shared/states'
import { KeyValueList } from '@/components/shared/key-value'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'

const CLIENTS: SubscribeClient[] = ['singbox', 'mihomo', 'v2ray']

/** One account: usage, credentials, subscribe links and rendered documents. */
export function UserDetailPage() {
  const { name = '' } = useParams()
  const user = useUser(name)
  const nodes = useNodes()
  const subscriptions = useUserSubscriptions(name)
  const update = useUpdateUser()
  const remove = useDeleteUser()
  const setEnabled = useSetUserEnabled()
  const reset = useResetUser()
  const navigate = useNavigate()

  const [editing, setEditing] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [confirmReset, setConfirmReset] = useState(false)

  const data = user.data

  if (user.isLoading) {
    return (
      <>
        <PageHeader title="账号详情" />
        <LoadingState />
      </>
    )
  }

  if (user.isError || !data) {
    return (
      <>
        <PageHeader title="账号详情" />
        <ErrorState error={user.error} onRetry={() => user.refetch()} />
      </>
    )
  }

  const saveUser = async (body: UserRequest) => {
    try {
      await update.mutateAsync({ name, body })
      toast.success('账号已更新')
      setEditing(false)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '保存失败')
    }
  }

  return (
    <>
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Button variant="ghost" size="sm" asChild>
          <Link to="/users">
            <ArrowLeft />
            返回账号列表
          </Link>
        </Button>
      </div>

      <PageHeader
        title={data.name}
        description={data.remark || '未填写备注'}
        actions={
          <>
            <UserStatusBadge status={data.status} />
            <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
              <Pencil />
              编辑
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={setEnabled.isPending}
              onClick={async () => {
                try {
                  await setEnabled.mutateAsync({ name, enabled: !data.enabled })
                  toast.success(data.enabled ? '账号已停用' : '账号已启用')
                } catch (error) {
                  toast.error(error instanceof Error ? error.message : '操作失败')
                }
              }}
            >
              {data.enabled ? <PowerOff /> : <Power />}
              {data.enabled ? '停用' : '启用'}
            </Button>
            <Button variant="outline" size="sm" onClick={() => setConfirmReset(true)}>
              <RotateCcw />
              重置流量
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="删除账号"
              onClick={() => setConfirmDelete(true)}
            >
              <Trash2 className="text-destructive" />
            </Button>
          </>
        }
      />

      {!data.credentialsReady ? (
        <Alert>
          <Link2 />
          <AlertTitle>凭据尚未就绪</AlertTitle>
          <AlertDescription>
            该账号的节点凭据尚未生成，应用配置后客户端才能连接。
          </AlertDescription>
        </Alert>
      ) : null}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="已用流量"
          value={formatBytes(data.usedBytes)}
          hint={data.unlimited ? '不限流量' : `限额 ${formatBytes(data.quotaBytes)}`}
        />
        <StatCard label="下行" value={formatBytes(data.downloadBytes)} />
        <StatCard label="上行" value={formatBytes(data.uploadBytes)} />
        <StatCard
          label="剩余流量"
          value={data.unlimited ? '不限' : formatBytes(data.remaining)}
        />
      </div>

      {!data.unlimited ? (
        <Section title="用量" description={`已使用 ${data.percent}%`}>
          <Progress value={Math.min(100, data.percent)} />
        </Section>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
        <Section title="账号信息" description="凭据、有效期与节点选择">
          <KeyValueList
            items={[
              { label: '订阅 Token', value: data.token, mono: true },
              { label: '创建时间', value: formatDateTime(data.createdAt) },
              { label: '到期时间', value: data.expireAt ? formatDateTime(data.expireAt) : '永久' },
              { label: '上次重置', value: data.lastReset ? formatDateTime(data.lastReset) : '—' },
              { label: '凭据状态', value: data.credentialsReady ? '就绪' : '未就绪' },
              { label: '可用节点', value: `${data.nodes.length} 个` },
            ]}
          />
        </Section>

        <Section title="订阅与分享" description="客户端订阅地址与单节点分享链接">
          {subscriptions.isLoading ? (
            <LoadingState />
          ) : subscriptions.isError || !subscriptions.data ? (
            <ErrorState error={subscriptions.error} onRetry={() => subscriptions.refetch()} />
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">订阅地址</p>
                <CopyField value={subscriptions.data.endpoint} />
              </div>
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">通用订阅链接</p>
                {subscriptions.data.clients.map((client) => (
                  <CopyField
                    key={client.client}
                    label={subscribeClientLabel[client.client] ?? client.client}
                    value={client.url}
                  />
                ))}
              </div>
              {subscriptions.data.shareLinks.length > 0 ? (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">单节点分享链接</p>
                  {subscriptions.data.shareLinks.map((link) => (
                    <CopyField key={link.key} label={link.name} value={link.uri} />
                  ))}
                </div>
              ) : null}
            </div>
          )}
        </Section>
      </div>

      <Section title="订阅内容" description="各客户端格式的渲染结果">
        <Tabs defaultValue="singbox">
          <TabsList>
            {CLIENTS.map((client) => (
              <TabsTrigger key={client} value={client}>
                {subscribeClientLabel[client] ?? client}
              </TabsTrigger>
            ))}
          </TabsList>
          {CLIENTS.map((client) => (
            <TabsContent key={client} value={client}>
              <DocumentView name={name} client={client} />
            </TabsContent>
          ))}
        </Tabs>
      </Section>

      <UserFormDialog
        open={editing}
        user={data}
        nodes={nodes.data?.nodes ?? []}
        pending={update.isPending}
        onClose={() => setEditing(false)}
        onSubmit={saveUser}
      />

      <ConfirmDialog
        open={confirmReset}
        onOpenChange={setConfirmReset}
        title={`重置账号 ${name} 的已用流量`}
        description="清零该账号的上传、下载与已用流量计数。"
        confirmLabel="重置"
        destructive={false}
        pending={reset.isPending}
        onConfirm={async () => {
          try {
            await reset.mutateAsync(name)
            toast.success('流量已重置')
            setConfirmReset(false)
          } catch (error) {
            toast.error(error instanceof Error ? error.message : '重置失败')
          }
        }}
      />

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title={`删除账号 ${name}`}
        description="删除后该账号的订阅链接立即失效，已建立的连接会被断开。"
        confirmLabel="删除"
        pending={remove.isPending}
        onConfirm={async () => {
          try {
            await remove.mutateAsync(name)
            toast.success('账号已删除')
            navigate('/users')
          } catch (error) {
            toast.error(error instanceof Error ? error.message : '删除失败')
          }
        }}
      />
    </>
  )
}

function DocumentView({ name, client }: { name: string; client: SubscribeClient }) {
  const document = useUserDocument(name, client)
  if (document.isLoading) {
    return <LoadingState />
  }
  if (document.isError || document.data === undefined) {
    return <ErrorState error={document.error} onRetry={() => document.refetch()} />
  }
  return <CodeBlock value={document.data} />
}
