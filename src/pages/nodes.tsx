import { useMemo, useState } from 'react'
import {
  Braces,
  Boxes,
  MoreHorizontal,
  Pencil,
  Plus,
  Power,
  PowerOff,
  Trash2,
} from 'lucide-react'
import { toast } from 'sonner'
import {
  useCreateNode,
  useDeleteNode,
  useNodeConfig,
  useNodes,
  useSetNodeEnabled,
  useUpdateNode,
} from '@/lib/queries'
import { protocolLabel } from '@/lib/labels'
import { formatDate } from '@/lib/format'
import type { NodeRequest, NodeView, ProtocolInfo, ProtocolKey } from '@/lib/types'
import { PageHeader, Section } from '@/components/shared/page'
import { StatCard } from '@/components/shared/stat-card'
import { EnabledBadge } from '@/components/shared/status-badge'
import { ErrorState, EmptyState } from '@/components/shared/states'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { CodeBlock } from '@/components/shared/code-block'
import {
  DataTable,
  Pagination,
  TableSearch,
  sortRows,
  type Column,
  type Sort,
} from '@/components/shared/data-table'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

const PAGE_SIZE = 10

/** Node management: list, create, edit, toggle, inspect the rendered inbound and delete. */
export function NodesPage() {
  const nodes = useNodes()
  const create = useCreateNode()
  const update = useUpdateNode()
  const remove = useDeleteNode()
  const setEnabled = useSetNodeEnabled()

  const [query, setQuery] = useState('')
  const [sort, setSort] = useState<Sort | null>(null)
  const [page, setPage] = useState(1)
  const [editing, setEditing] = useState<NodeView | null>(null)
  const [creating, setCreating] = useState(false)
  const [inspecting, setInspecting] = useState<NodeView | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<NodeView | null>(null)

  const protocols = nodes.data?.protocols ?? []
  const allNodes = nodes.data?.nodes ?? []

  const columns = useMemo(
    () =>
      buildNodeColumns({
        onEdit: (node) => setEditing(node),
        onInspect: (node) => setInspecting(node),
        onToggle: async (node) => {
          try {
            await setEnabled.mutateAsync({ id: node.id, enabled: !node.enabled })
            toast.success(node.enabled ? '节点已停用' : '节点已启用')
          } catch (error) {
            toast.error(error instanceof Error ? error.message : '操作失败')
          }
        },
        onDelete: (node) => setDeleteTarget(node),
      }),
    // The handlers only close over stable mutation objects and state setters.
    [setEnabled],
  )

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase()
    if (!needle) {
      return allNodes
    }
    return allNodes.filter(
      (node) =>
        node.name.toLowerCase().includes(needle) ||
        node.protocol.toLowerCase().includes(needle) ||
        String(node.port).includes(needle),
    )
  }, [allNodes, query])

  const sorted = useMemo(
    () =>
      sortRows(filtered, columns, sort ?? { key: 'created_at', direction: 'desc' }),
    [filtered, columns, sort],
  )
  const rows = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const enabledCount = allNodes.filter((node) => node.enabled).length

  const saveNode = async (body: NodeRequest) => {
    try {
      if (editing) {
        await update.mutateAsync({ id: editing.id, body })
        toast.success('节点已更新')
      } else {
        await create.mutateAsync(body)
        toast.success('节点已创建')
      }
      setEditing(null)
      setCreating(false)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '保存失败')
    }
  }

  return (
    <>
      <PageHeader
        title="节点管理"
        description="管理本机承载的协议入站节点"
        actions={
          <Button size="sm" onClick={() => setCreating(true)} disabled={protocols.length === 0}>
            <Plus />
            新建节点
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <StatCard label="节点总数" value={allNodes.length} icon={<Boxes />} />
        <StatCard label="已启用" value={enabledCount} tone="success" />
        <StatCard label="已停用" value={allNodes.length - enabledCount} tone="warning" />
      </div>

      <Section
        title="节点列表"
        description="点击行可编辑；使用账号数决定删除时的影响"
        contentClassName="space-y-4 pt-0"
      >
        <div className="flex items-center justify-between gap-3">
          <TableSearch value={query} onChange={(value) => { setQuery(value); setPage(1) }} placeholder="搜索名称、协议或端口" />
        </div>

        {nodes.isError ? (
          <ErrorState error={nodes.error} onRetry={() => nodes.refetch()} />
        ) : (
          <>
            <DataTable
              columns={columns}
              rows={rows}
              sort={sort}
              onSortChange={setSort}
              getRowKey={(node) => node.id}
              loading={nodes.isLoading}
              onRowClick={(node) => setEditing(node)}
              empty={
                <EmptyState
                  title="尚无节点"
                  description="创建第一个节点后，客户端才能连接"
                  icon={<Boxes />}
                />
              }
            />
            <Pagination page={page} pageSize={PAGE_SIZE} total={sorted.length} onPageChange={setPage} />
          </>
        )}
      </Section>

      {inspecting ? <NodeConfigDialog node={inspecting} onClose={() => setInspecting(null)} /> : null}

      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(next) => { if (!next) setDeleteTarget(null) }}
        title={`删除节点 ${deleteTarget?.name ?? ''}`}
        description={
          deleteTarget && deleteTarget.usedBy > 0
            ? `${deleteTarget.usedBy} 个账号已勾选该节点，删除后将一并取消选择。`
            : '该操作不可撤销。'
        }
        confirmLabel="删除"
        pending={remove.isPending}
        onConfirm={async () => {
          if (!deleteTarget) return
          try {
            await remove.mutateAsync(deleteTarget.id)
            toast.success('节点已删除')
            setDeleteTarget(null)
          } catch (error) {
            toast.error(error instanceof Error ? error.message : '删除失败')
          }
        }}
      />

      <NodeFormDialog
        open={creating || editing !== null}
        node={editing}
        protocols={protocols}
        pending={create.isPending || update.isPending}
        onClose={() => {
          setCreating(false)
          setEditing(null)
        }}
        onSubmit={saveNode}
      />
    </>
  )
}

function NodeActions({
  node,
  onEdit,
  onInspect,
  onToggle,
  onDelete,
}: {
  node: NodeView
  onEdit: () => void
  onInspect: () => void
  onToggle: () => void
  onDelete: () => void
}) {
  return (
    <div onClick={(event) => event.stopPropagation()}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon-sm" aria-label="更多操作">
            <MoreHorizontal />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={onEdit}>
            <Pencil />
            编辑
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onInspect}>
            <Braces />
            查看配置
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onToggle}>
            {node.enabled ? <PowerOff /> : <Power />}
            {node.enabled ? '停用' : '启用'}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onClick={onDelete}>
            <Trash2 />
            删除
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}

interface NodeHandlers {
  onEdit: (node: NodeView) => void
  onInspect: (node: NodeView) => void
  onToggle: (node: NodeView) => void
  onDelete: (node: NodeView) => void
}

function buildNodeColumns(handlers: NodeHandlers): Column<NodeView>[] {
  return [
    {
      key: 'name',
      header: '名称',
      sortValue: (node) => node.name,
      cell: (node) => <span className="font-medium">{node.name}</span>,
    },
    {
      key: 'protocol',
      header: '协议',
      sortValue: (node) => node.protocol,
      cell: (node) => (
        <span className="text-sm">{protocolLabel[node.protocol] ?? node.protocol}</span>
      ),
    },
    {
      key: 'port',
      header: '监听端口',
      align: 'right',
      sortValue: (node) => node.port,
      cell: (node) => <span className="font-mono text-xs tabular">{node.port}</span>,
    },
    {
      key: 'usedBy',
      header: '使用账号',
      align: 'right',
      sortValue: (node) => node.usedBy,
      cell: (node) => <span className="tabular">{node.usedBy}</span>,
    },
    {
      key: 'enabled',
      header: '状态',
      cell: (node) => <EnabledBadge enabled={node.enabled} />,
    },
    {
      key: 'created_at',
      header: '创建时间',
      sortValue: (node) => node.created_at,
      cell: (node) => (
        <span className="text-sm text-muted-foreground">{formatDate(node.created_at)}</span>
      ),
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      cell: (node) => (
        <NodeActions
          node={node}
          onEdit={() => handlers.onEdit(node)}
          onInspect={() => handlers.onInspect(node)}
          onToggle={() => handlers.onToggle(node)}
          onDelete={() => handlers.onDelete(node)}
        />
      ),
    },
  ]
}

/** The create/edit form, driven by the protocol's settable parameters. */
function NodeFormDialog({
  open,
  node,
  protocols,
  pending,
  onClose,
  onSubmit,
}: {
  open: boolean
  node: NodeView | null
  protocols: ProtocolInfo[]
  pending: boolean
  onClose: () => void
  onSubmit: (body: NodeRequest) => void
}) {
  const [name, setName] = useState('')
  const [protocol, setProtocol] = useState<ProtocolKey>(protocols[0]?.key ?? 'anytls')
  const [port, setPort] = useState(0)
  const [enabled, setEnabled] = useState(true)
  const [params, setParams] = useState<Record<string, string>>({})

  // Reset the form whenever the dialog opens for a different node.
  const [initialisedFor, setInitialisedFor] = useState<string | null>(null)
  const key = node ? node.id : 'new'
  if (open && initialisedFor !== key) {
    setInitialisedFor(key)
    if (node) {
      setName(node.name)
      setProtocol(node.protocol)
      setPort(node.port)
      setEnabled(node.enabled)
      setParams({ ...node.params })
    } else {
      const first = protocols[0]
      setName('')
      setProtocol(first?.key ?? 'anytls')
      setPort(first?.defaultPort ?? 0)
      setEnabled(true)
      setParams({})
    }
  }
  if (!open && initialisedFor !== null) {
    setInitialisedFor(null)
  }

  const info = protocols.find((item) => item.key === protocol)

  const onProtocolChange = (value: ProtocolKey) => {
    setProtocol(value)
    const next = protocols.find((item) => item.key === value)
    if (next) {
      setPort(next.defaultPort)
      setParams({})
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) onClose() }}>
      <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{node ? '编辑节点' : '新建节点'}</DialogTitle>
          <DialogDescription>
            {node ? '修改后会自动应用到运行中的服务' : '创建一个协议入站节点'}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="node-name">节点名称</Label>
            <Input
              id="node-name"
              value={name}
              placeholder="例如 东京 Reality"
              onChange={(event) => setName(event.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>协议</Label>
              <Select value={protocol} onValueChange={(value) => onProtocolChange(value as ProtocolKey)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {protocols.map((item) => (
                    <SelectItem key={item.key} value={item.key}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="node-port">监听端口</Label>
              <Input
                id="node-port"
                type="number"
                min={1}
                max={65535}
                value={port || ''}
                onChange={(event) => setPort(Number(event.target.value))}
              />
            </div>
          </div>

          {info && info.params.length > 0 ? (
            <div className="space-y-3 rounded-lg border bg-muted/30 p-3">
              {info.params.map((param) => (
                <div key={param.key} className="space-y-1.5">
                  <Label htmlFor={`param-${param.key}`}>{param.label}</Label>
                  <Input
                    id={`param-${param.key}`}
                    value={params[param.key] ?? ''}
                    placeholder={param.default}
                    onChange={(event) =>
                      setParams((current) => ({ ...current, [param.key]: event.target.value }))
                    }
                  />
                </div>
              ))}
            </div>
          ) : null}

          <div className="flex items-center justify-between rounded-lg border p-3">
            <div className="space-y-0.5">
              <Label htmlFor="node-enabled">启用节点</Label>
              <p className="text-xs text-muted-foreground">停用的节点不会出现在订阅中</p>
            </div>
            <Switch id="node-enabled" checked={enabled} onCheckedChange={setEnabled} />
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose} disabled={pending}>
              取消
            </Button>
            <Button
              disabled={pending || name.trim() === '' || port <= 0}
              onClick={() =>
                onSubmit({ name: name.trim(), protocol, port, enabled, params })
              }
            >
              保存
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

/** A read-only view of the inbound the core would render for one node. */
function NodeConfigDialog({ node, onClose }: { node: NodeView; onClose: () => void }) {
  const config = useNodeConfig(node.id)
  const text = config.data ? JSON.stringify(config.data.inbound, null, 2) : ''
  return (
    <Dialog open onOpenChange={(next) => { if (!next) onClose() }}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{node.name} · 渲染配置</DialogTitle>
          <DialogDescription>该节点在当前内核配置中的入站定义</DialogDescription>
        </DialogHeader>
        {config.isLoading ? (
          <p className="text-sm text-muted-foreground">加载中…</p>
        ) : config.isError ? (
          <ErrorState error={config.error} />
        ) : (
          <CodeBlock value={text} />
        )}
      </DialogContent>
    </Dialog>
  )
}
