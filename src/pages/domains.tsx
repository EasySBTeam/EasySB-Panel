import { useState } from 'react'
import { BadgeCheck, CalendarClock, Globe, RefreshCw, ShieldCheck, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import {
  useActivateDomain,
  useDomainTimer,
  useDomains,
  useIssueDomain,
  useRemoveDomain,
  useRenewDomains,
} from '@/lib/queries'
import { PageHeader, Section } from '@/components/shared/page'
import { StatCard } from '@/components/shared/stat-card'
import { StatusBadge } from '@/components/shared/status-badge'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { ErrorState, LoadingState } from '@/components/shared/states'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

/** Certificate manager: issue, activate, renew and remove ACME certificates. */
export function DomainsPage() {
  const domains = useDomains()
  const issue = useIssueDomain()
  const renew = useRenewDomains()
  const remove = useRemoveDomain()
  const activate = useActivateDomain()
  const timer = useDomainTimer()

  const [issuing, setIssuing] = useState(false)
  const [removeTarget, setRemoveTarget] = useState<string | null>(null)
  const [steps, setSteps] = useState<string[] | null>(null)

  const data = domains.data

  return (
    <>
      <PageHeader
        title="域名与证书"
        description="为面板本身申请并续期 TLS 证书"
        actions={
          <>
            <Button variant="outline" size="sm" onClick={() => domains.refetch()}>
              <RefreshCw />
              刷新
            </Button>
            <Button size="sm" onClick={() => setIssuing(true)}>
              <Globe />
              申请证书
            </Button>
          </>
        }
      />

      {domains.isLoading ? (
        <LoadingState />
      ) : domains.isError || !data ? (
        <ErrorState error={domains.error} onRetry={() => domains.refetch()} />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard label="已签发证书" value={data.domains.length} icon={<ShieldCheck />} />
            <StatCard
              label="当前域名"
              value={data.active || '未设置'}
              hint={data.configured ? `解析到 ${data.configured}` : undefined}
            />
            <StatCard label="ACME 邮箱" value={data.acmeEmail || '未注册'} tone={data.registered ? 'success' : 'warning'} />
            <StatCard
              label="续期定时器"
              value={data.timerInstalled ? (data.timerNext || '已安装') : '未安装'}
              icon={<CalendarClock />}
              tone={data.timerInstalled ? 'success' : 'warning'}
            />
          </div>

          {data.staging ? (
            <p className="rounded-lg border border-warning/30 bg-warning/5 px-3 py-2 text-sm text-warning">
              当前使用 ACME 测试环境签发的证书，不会被浏览器信任。
            </p>
          ) : null}

          <Section
            title="证书列表"
            description="签发后可在此切换面板使用的证书"
            actions={
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={renew.isPending}
                  onClick={async () => {
                    try {
                      const res = await renew.mutateAsync()
                      toast.success(
                        res.renewed.length > 0
                          ? `已续期 ${res.renewed.length} 个证书`
                          : '所有证书均无需续期',
                      )
                    } catch (error) {
                      toast.error(error instanceof Error ? error.message : '续期失败')
                    }
                  }}
                >
                  立即续期
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={timer.isPending}
                  onClick={async () => {
                    try {
                      await timer.mutateAsync(data.timerInstalled ? 'remove' : 'install')
                      toast.success(data.timerInstalled ? '续期定时器已移除' : '续期定时器已安装')
                    } catch (error) {
                      toast.error(error instanceof Error ? error.message : '操作失败')
                    }
                  }}
                >
                  {data.timerInstalled ? '移除定时器' : '安装定时器'}
                </Button>
              </div>
            }
          >
            {data.domains.length === 0 ? (
              <p className="text-sm text-muted-foreground">尚未签发任何证书</p>
            ) : (
              <div className="divide-y rounded-lg border">
                {data.domains.map((domain) => {
                  const active = domain === data.active
                  return (
                    <div key={domain} className="flex flex-wrap items-center gap-3 px-3 py-2.5">
                      <Globe className="size-4 text-muted-foreground" />
                      <span className="font-medium">{domain}</span>
                      {active ? <StatusBadge tone="success">使用中</StatusBadge> : null}
                      <div className="ms-auto flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={active || activate.isPending}
                          onClick={async () => {
                            try {
                              await activate.mutateAsync(domain)
                              toast.success(`已切换到 ${domain}`)
                            } catch (error) {
                              toast.error(error instanceof Error ? error.message : '切换失败')
                            }
                          }}
                        >
                          <BadgeCheck />
                          设为当前
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label="删除证书"
                          onClick={() => setRemoveTarget(domain)}
                        >
                          <Trash2 className="text-destructive" />
                        </Button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </Section>
        </>
      )}

      <IssueDialog
        open={issuing}
        defaultEmail={data?.acmeEmail ?? ''}
        pending={issue.isPending}
        onClose={() => setIssuing(false)}
        onSubmit={async (domain, email) => {
          try {
            const res = await issue.mutateAsync({ domain, email })
            setSteps(res.steps)
            toast.success('证书申请流程已完成')
            setIssuing(false)
          } catch (error) {
            toast.error(error instanceof Error ? error.message : '申请失败')
          }
        }}
      />

      <Dialog open={steps !== null} onOpenChange={(next) => { if (!next) setSteps(null) }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>申请过程</DialogTitle>
            <DialogDescription>每一步的执行记录</DialogDescription>
          </DialogHeader>
          <pre className="scrollbar-thin max-h-72 overflow-auto rounded-lg border bg-muted/30 p-3 font-mono text-xs leading-relaxed">
            {(steps ?? []).join('\n') || '无输出'}
          </pre>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={removeTarget !== null}
        onOpenChange={(next) => { if (!next) setRemoveTarget(null) }}
        title={`删除证书 ${removeTarget ?? ''}`}
        description="删除后该域名不再可用；若为当前证书，面板将回退到无 TLS 状态。"
        confirmLabel="删除"
        pending={remove.isPending}
        onConfirm={async () => {
          if (!removeTarget) return
          try {
            await remove.mutateAsync(removeTarget)
            toast.success('证书已删除')
            setRemoveTarget(null)
          } catch (error) {
            toast.error(error instanceof Error ? error.message : '删除失败')
          }
        }}
      />
    </>
  )
}

function IssueDialog({
  open,
  defaultEmail,
  pending,
  onClose,
  onSubmit,
}: {
  open: boolean
  defaultEmail: string
  pending: boolean
  onClose: () => void
  onSubmit: (domain: string, email: string) => void
}) {
  const [domain, setDomain] = useState('')
  const [email, setEmail] = useState(defaultEmail)

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) onClose() }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>申请 TLS 证书</DialogTitle>
          <DialogDescription>
            域名须已解析到本机；申请期间会短暂停止节点服务以占用 80 端口
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="domain-name">域名</Label>
            <Input
              id="domain-name"
              value={domain}
              placeholder="panel.example.com"
              onChange={(event) => setDomain(event.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="domain-email">ACME 邮箱</Label>
            <Input
              id="domain-email"
              type="email"
              value={email}
              placeholder="you@example.com"
              onChange={(event) => setEmail(event.target.value)}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose} disabled={pending}>
              取消
            </Button>
            <Button
              disabled={pending || domain.trim() === '' || email.trim() === ''}
              onClick={() => onSubmit(domain.trim(), email.trim())}
            >
              开始申请
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
