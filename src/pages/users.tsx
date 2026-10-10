import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Gauge,
  MoreHorizontal,
  Pencil,
  Plus,
  Power,
  PowerOff,
  RotateCcw,
  Trash2,
  UserRound,
  Users,
} from 'lucide-react'
import { toast } from 'sonner'
import {
  useCreateUser,
  useDeleteUser,
  useNodes,
  useResetUser,
  useSetUserEnabled,
  useUpdateUser,
  useUsers,
} from '@/lib/queries'
import { formatBytes, formatDate } from '@/lib/format'
import type { User, UserRequest } from '@/lib/types'
import { PageHeader, Section } from '@/components/shared/page'
import { StatCard } from '@/components/shared/stat-card'
import { UserStatusBadge } from '@/components/shared/status-badge'
import { EmptyState, ErrorState } from '@/components/shared/states'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { UserFormDialog } from '@/components/shared/user-form'
import {
  DataTable,
  Pagination,
  TableSearch,
  sortRows,
  type Column,
  type Sort,
} from '@/components/shared/data-table'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

const PAGE_SIZE = 10

/** Account management: list, create, edit, reset, toggle and delete. */
export function UsersPage() {
  const users = useUsers()
  const nodes = useNodes()
  const create = useCreateUser()
  const update = useUpdateUser()
  const remove = useDeleteUser()
  const setEnabled = useSetUserEnabled()
  const reset = useResetUser()
  const navigate = useNavigate()

  const [query, setQuery] = useState('')
  const [sort, setSort] = useState<Sort | null>(null)
  const [page, setPage] = useState(1)
  const [editing, setEditing] = useState<User | null>(null)
  const [creating, setCreating] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null)
  const [resetTarget, setResetTarget] = useState<User | null>(null)

  const nodeList = nodes.data?.nodes ?? []
  const allUsers = users.data?.users ?? []

  const columns = useMemo<Column<User>[]>(
    () => [
      {
        key: 'name',
        header: '名称',
        sortValue: (user) => user.name,
        cell: (user) => (
          <Link
            to={`/users/${encodeURIComponent(user.name)}`}
            className="font-medium hover:underline"
            onClick={(event) => event.stopPropagation()}
          >
            {user.name}
          </Link>
        ),
      },
      {
        key: 'remark',
        header: '备注',
        sortValue: (user) => user.remark ?? '',
        cell: (user) => (
          <span className="text-sm text-muted-foreground">{user.remark || '—'}</span>
        ),
      },
      {
        key: 'status',
        header: '状态',
        cell: (user) => <UserStatusBadge status={user.status} />,
      },
      {
        key: 'usage',
        header: '已用流量',
        sortValue: (user) => user.usedBytes,
        cell: (user) => (
          <div className="w-40 space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="tabular">{formatBytes(user.usedBytes)}</span>
              <span className="text-muted-foreground">
                {user.unlimited ? '不限' : formatBytes(user.quotaBytes)}
              </span>
            </div>
            {user.unlimited ? null : <Progress value={Math.min(100, user.percent)} />}
          </div>
        ),
      },
      {
        key: 'nodes',
        header: '节点',
        align: 'right',
        sortValue: (user) => user.nodes.length,
        cell: (user) => <span className="tabular">{user.nodes.length}</span>,
      },
      {
        key: 'expireAt',
        header: '到期',
        sortValue: (user) => user.expireAt,
        cell: (user) => (
          <span className="text-sm text-muted-foreground">
            {user.expireAt ? formatDate(user.expireAt) : '永久'}
          </span>
        ),
      },
      {
        key: 'actions',
        header: '',
        align: 'right',
        cell: (user) => (
          <div onClick={(event) => event.stopPropagation()}>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon-sm" aria-label="更多操作">
                  <MoreHorizontal />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => navigate(`/users/${encodeURIComponent(user.name)}`)}>
                  <UserRound />
                  查看详情
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setEditing(user)}>
                  <Pencil />
                  编辑
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setResetTarget(user)}>
                  <RotateCcw />
                  重置流量
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={async () => {
                    try {
                      await setEnabled.mutateAsync({ name: user.name, enabled: !user.enabled })
                      toast.success(user.enabled ? '账号已停用' : '账号已启用')
                    } catch (error) {
                      toast.error(error instanceof Error ? error.message : '操作失败')
                    }
                  }}
                >
                  {user.enabled ? <PowerOff /> : <Power />}
                  {user.enabled ? '停用' : '启用'}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem variant="destructive" onClick={() => setDeleteTarget(user)}>
                  <Trash2 />
                  删除
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [setEnabled, navigate],
  )

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase()
    if (!needle) return allUsers
    return allUsers.filter(
      (user) =>
        user.name.toLowerCase().includes(needle) ||
        (user.remark ?? '').toLowerCase().includes(needle),
    )
  }, [allUsers, query])

  const sorted = useMemo(
    () => sortRows(filtered, columns, sort ?? { key: 'name', direction: 'asc' }),
    [filtered, columns, sort],
  )
  const rows = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const activeCount = allUsers.filter((user) => user.status === 'active').length
  const totalTraffic = allUsers.reduce((sum, user) => sum + user.usedBytes, 0)

  const saveUser = async (body: UserRequest) => {
    try {
      if (editing) {
        await update.mutateAsync({ name: editing.name, body })
        toast.success('账号已更新')
      } else {
        await create.mutateAsync(body)
        toast.success('账号已创建')
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
        title="账号管理"
        description="创建账号、设置流量限额与有效期"
        actions={
          <Button size="sm" onClick={() => setCreating(true)}>
            <Plus />
            新建账号
          </Button>
        }
      />

      <div className="grid grid-cols-3 gap-3">
        <StatCard label="账号总数" value={allUsers.length} icon={<Users />} />
        <StatCard label="正常" value={activeCount} tone="success" />
        <StatCard label="已用流量合计" value={formatBytes(totalTraffic)} icon={<Gauge />} />
      </div>

      <Section
        title="账号列表"
        description="点击行查看详情与订阅"
        contentClassName="space-y-4 pt-0"
      >
        <TableSearch
          value={query}
          onChange={(value) => { setQuery(value); setPage(1) }}
          placeholder="搜索名称或备注"
        />
        {users.isError ? (
          <ErrorState error={users.error} onRetry={() => users.refetch()} />
        ) : (
          <>
            <DataTable
              columns={columns}
              rows={rows}
              sort={sort}
              onSortChange={setSort}
              getRowKey={(user) => user.name}
              loading={users.isLoading}
              onRowClick={(user) => navigate(`/users/${encodeURIComponent(user.name)}`)}
              empty={
                <EmptyState
                  title="尚无账号"
                  description="创建一个账号后，客户端才能连接"
                  icon={<Users />}
                />
              }
            />
            <Pagination page={page} pageSize={PAGE_SIZE} total={sorted.length} onPageChange={setPage} />
          </>
        )}
      </Section>

      <UserFormDialog
        open={creating || editing !== null}
        user={editing}
        nodes={nodeList}
        pending={create.isPending || update.isPending}
        onClose={() => {
          setCreating(false)
          setEditing(null)
        }}
        onSubmit={saveUser}
      />

      <ConfirmDialog
        open={resetTarget !== null}
        onOpenChange={(next) => { if (!next) setResetTarget(null) }}
        title={`重置账号 ${resetTarget?.name ?? ''} 的已用流量`}
        description="清零该账号的上传、下载与已用流量计数。"
        confirmLabel="重置"
        destructive={false}
        pending={reset.isPending}
        onConfirm={async () => {
          if (!resetTarget) return
          try {
            await reset.mutateAsync(resetTarget.name)
            toast.success('流量已重置')
            setResetTarget(null)
          } catch (error) {
            toast.error(error instanceof Error ? error.message : '重置失败')
          }
        }}
      />

      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(next) => { if (!next) setDeleteTarget(null) }}
        title={`删除账号 ${deleteTarget?.name ?? ''}`}
        description="删除后该账号的订阅链接立即失效，已建立的连接会被断开。"
        confirmLabel="删除"
        pending={remove.isPending}
        onConfirm={async () => {
          if (!deleteTarget) return
          try {
            await remove.mutateAsync(deleteTarget.name)
            toast.success('账号已删除')
            setDeleteTarget(null)
          } catch (error) {
            toast.error(error instanceof Error ? error.message : '删除失败')
          }
        }}
      />
    </>
  )
}
