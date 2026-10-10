import { useState } from 'react'
import {
  CheckCircle2,
  Cpu,
  Pause,
  Play,
  RefreshCw,
  RotateCw,
  ShieldCheck,
  XCircle,
} from 'lucide-react'
import { toast } from 'sonner'
import {
  useApplyCore,
  useCheckCore,
  useCore,
  useCoreAction,
  useCoreConfig,
} from '@/lib/queries'
import { formatNumber } from '@/lib/format'
import { PageHeader, Section } from '@/components/shared/page'
import { StatCard } from '@/components/shared/stat-card'
import { EnabledBadge, RunningBadge } from '@/components/shared/status-badge'
import { CodeBlock } from '@/components/shared/code-block'
import { ErrorState, LoadingState } from '@/components/shared/states'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { KeyValueList } from '@/components/shared/key-value'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'

/** The sing-box core service: state, actions, config check and rendered config. */
export function CorePage() {
  const core = useCore()
  const action = useCoreAction()
  const apply = useApplyCore()
  const check = useCheckCore()
  const [showConfig, setShowConfig] = useState(false)
  const [checkResult, setCheckResult] = useState<{ ok: boolean; error?: string } | null>(null)

  const run = async (name: string) => {
    try {
      await action.mutateAsync(name)
      toast.success(`已执行 ${name}`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '操作失败')
    }
  }

  const data = core.data

  return (
    <>
      <PageHeader
        title="内核服务"
        description="sing-box 节点进程的运行状态与配置"
        actions={
          <Button variant="outline" size="sm" onClick={() => core.refetch()}>
            <RefreshCw />
            刷新
          </Button>
        }
      />

      {core.isLoading ? (
        <LoadingState />
      ) : core.isError || !data ? (
        <ErrorState error={core.error} onRetry={() => core.refetch()} />
      ) : (
        <>
          {!data.statsCapable ? (
            <Alert>
              <Cpu />
              <AlertTitle>当前内核不含流量统计</AlertTitle>
              <AlertDescription>
                本次构建未启用 v2ray API，节点与账号照常可用，但流量不会计数。
              </AlertDescription>
            </Alert>
          ) : null}

          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard
              label="服务状态"
              value={data.active ? '运行中' : '已停止'}
              tone={data.active ? 'success' : 'warning'}
              icon={<Cpu />}
            />
            <StatCard label="内核版本" value={data.coreVersion || '—'} />
            <StatCard label="节点" value={formatNumber(data.nodeCount)} />
            <StatCard label="账号" value={formatNumber(data.userCount)} />
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Section
              title="服务控制"
              description="启停节点进程与开机自启"
              actions={
                <div className="flex items-center gap-2">
                  <RunningBadge active={data.active} />
                  <EnabledBadge enabled={data.enabled} />
                </div>
              }
            >
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={action.isPending || data.active}
                  onClick={() => run('start')}
                >
                  <Play />
                  启动
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={action.isPending || !data.active}
                  onClick={() => run('stop')}
                >
                  <Pause />
                  停止
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={action.isPending}
                  onClick={() => run('restart')}
                >
                  <RotateCw />
                  重启
                </Button>
                <Button
                  variant={data.enabled ? 'ghost' : 'outline'}
                  size="sm"
                  disabled={action.isPending}
                  onClick={() => run(data.enabled ? 'disable' : 'enable')}
                >
                  {data.enabled ? '禁用自启' : '启用自启'}
                </Button>
              </div>
            </Section>

            <Section title="配置操作" description="渲染、校验并应用最新的节点与账号">
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={check.isPending}
                  onClick={async () => {
                    try {
                      const res = await check.mutateAsync()
                      setCheckResult(res)
                      if (res.ok) {
                        toast.success('配置校验通过')
                      } else {
                        toast.error('配置校验未通过')
                      }
                    } catch (error) {
                      toast.error(error instanceof Error ? error.message : '校验失败')
                    }
                  }}
                >
                  <ShieldCheck />
                  校验配置
                </Button>
                <Button
                  size="sm"
                  disabled={apply.isPending}
                  onClick={async () => {
                    try {
                      await apply.mutateAsync()
                      toast.success('配置已应用并重启节点')
                    } catch (error) {
                      toast.error(error instanceof Error ? error.message : '应用失败')
                    }
                  }}
                >
                  <CheckCircle2 />
                  应用配置
                </Button>
                <Button variant="outline" size="sm" onClick={() => setShowConfig(true)}>
                  查看配置
                </Button>
              </div>

              {checkResult ? (
                <div className="mt-4 flex items-start gap-2 rounded-lg border p-3 text-sm">
                  {checkResult.ok ? (
                    <CheckCircle2 className="mt-0.5 size-4 text-success" />
                  ) : (
                    <XCircle className="mt-0.5 size-4 text-destructive" />
                  )}
                  <span className={checkResult.ok ? 'text-success' : 'text-destructive'}>
                    {checkResult.ok ? '配置有效，可以应用' : checkResult.error}
                  </span>
                </div>
              ) : null}
            </Section>
          </div>

          <Section title="部署信息" description="配置路径与部署状态">
            <KeyValueList
              items={[
                { label: '面板版本', value: data.version || '—' },
                { label: '内核版本', value: data.coreVersion || '—', mono: true },
                { label: '配置文件', value: data.configPath || '—', mono: true },
                { label: '节点部署', value: data.deployed ? '已部署' : '未部署' },
                { label: '流量统计', value: data.statsCapable ? '可用' : '不可用' },
              ]}
            />
          </Section>
        </>
      )}

      {showConfig ? <CoreConfigDialog onClose={() => setShowConfig(false)} /> : null}
    </>
  )
}

function CoreConfigDialog({ onClose }: { onClose: () => void }) {
  const config = useCoreConfig()
  return (
    <Dialog open onOpenChange={(next) => { if (!next) onClose() }}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>渲染后的内核配置</DialogTitle>
          <DialogDescription>
            REALITY 私钥已在服务端脱敏，此处的配置仅供参考
          </DialogDescription>
        </DialogHeader>
        {config.isLoading ? (
          <LoadingState />
        ) : config.isError ? (
          <ErrorState error={config.error} onRetry={() => config.refetch()} />
        ) : (
          <>
            <p className="font-mono text-xs text-muted-foreground">{config.data?.path}</p>
            <CodeBlock value={config.data?.config ?? ''} maxHeight="60svh" />
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
