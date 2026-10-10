import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Globe, RefreshCw, Server } from 'lucide-react'
import { useSubscriptions, useUsers } from '@/lib/queries'
import { subscribeClientLabel } from '@/lib/labels'
import { PageHeader, Section } from '@/components/shared/page'
import { StatCard } from '@/components/shared/stat-card'
import { StatusBadge } from '@/components/shared/status-badge'
import { CopyField } from '@/components/shared/copy'
import { EmptyState, ErrorState, LoadingState } from '@/components/shared/states'
import {
  DataTable,
  Pagination,
  TableSearch,
  type Column,
} from '@/components/shared/data-table'
import { Button } from '@/components/ui/button'
import type { User } from '@/lib/types'

const PAGE_SIZE = 10

/** The shared subscription endpoint, and each account's personal subscribe link. */
export function SubscriptionsPage() {
  const subscriptions = useSubscriptions()
  const users = useUsers()
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(1)

  const allUsers = users.data?.users ?? []
  const filtered = allUsers.filter((user) =>
    user.name.toLowerCase().includes(query.trim().toLowerCase()),
  )
  const rows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const columns: Column<User>[] = [
    {
      key: 'name',
      header: '账号',
      cell: (user) => (
        <Link to={`/users/${encodeURIComponent(user.name)}`} className="font-medium hover:underline">
          {user.name}
        </Link>
      ),
    },
    {
      key: 'url',
      header: '订阅地址',
      cell: (user) =>
        user.subscriptionUrl ? (
          <CopyField value={user.subscriptionUrl} className="max-w-md" />
        ) : (
          <span className="text-sm text-muted-foreground">未配置域名或服务器地址</span>
        ),
    },
  ]

  return (
    <>
      <PageHeader
        title="订阅"
        description="客户端通过订阅地址获取节点与凭据"
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              void subscriptions.refetch()
              void users.refetch()
            }}
          >
            <RefreshCw />
            刷新
          </Button>
        }
      />

      {subscriptions.isLoading ? (
        <LoadingState />
      ) : subscriptions.isError || !subscriptions.data ? (
        <ErrorState error={subscriptions.error} onRetry={() => subscriptions.refetch()} />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <StatCard
              label="订阅服务"
              value={subscriptions.data.active ? '运行中' : '已停止'}
              tone={subscriptions.data.active ? 'success' : 'warning'}
              icon={<Server />}
            />
            <StatCard label="发布域名" value={subscriptions.data.host || '未配置'} icon={<Globe />} />
            <StatCard label="客户端格式" value={subscriptions.data.clients.length} />
          </div>

          <Section title="订阅入口" description="所有账号共用同一域名与路径，凭 token 区分身份">
            <div className="space-y-3">
              <CopyField label="订阅地址" value={subscriptions.data.endpoint} />
              <CopyField label="订阅路径" value={subscriptions.data.path} />
              <div className="flex flex-wrap gap-2">
                {subscriptions.data.clients.map((client) => (
                  <StatusBadge key={client} tone="muted">
                    {subscribeClientLabel[client] ?? client}
                  </StatusBadge>
                ))}
              </div>
            </div>
          </Section>

          <Section
            title="账号订阅地址"
            description="每个账号的专属订阅链接"
            contentClassName="space-y-4 pt-0"
          >
            <TableSearch
              value={query}
              onChange={(value) => {
                setQuery(value)
                setPage(1)
              }}
              placeholder="搜索账号"
            />
            {users.isError ? (
              <ErrorState error={users.error} onRetry={() => users.refetch()} />
            ) : (
              <>
                <DataTable
                  columns={columns}
                  rows={rows}
                  getRowKey={(user) => user.name}
                  loading={users.isLoading}
                  empty={
                    <EmptyState
                      title="尚无账号"
                      description="创建账号后，其订阅地址会显示在这里"
                    />
                  }
                />
                <Pagination page={page} pageSize={PAGE_SIZE} total={filtered.length} onPageChange={setPage} />
              </>
            )}
          </Section>
        </>
      )}
    </>
  )
}
