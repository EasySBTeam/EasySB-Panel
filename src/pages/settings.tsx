import { useState } from 'react'
import {
  KeyRound,
  Lock,
  RefreshCw,
  Save,
  Server,
  ShieldCheck,
} from 'lucide-react'
import { toast } from 'sonner'
import {
  useChangePassword,
  useFirewallAction,
  usePanel,
  usePanelAction,
  usePanelConfig,
  useSecurity,
  useSecurityTLS,
} from '@/lib/queries'
import { PageHeader, Section } from '@/components/shared/page'
import { StatCard } from '@/components/shared/stat-card'
import { EnabledBadge, RunningBadge, StatusBadge } from '@/components/shared/status-badge'
import { CopyField } from '@/components/shared/copy'
import { ErrorState, LoadingState } from '@/components/shared/states'
import { KeyValueList } from '@/components/shared/key-value'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

/** Panel settings: transport, self-service, TLS, firewall and the admin password. */
export function SettingsPage() {
  const panel = usePanel()
  const security = useSecurity()
  const config = usePanelConfig()
  const action = usePanelAction()
  const tls = useSecurityTLS()
  const firewall = useFirewallAction()
  const password = useChangePassword()

  const [listen, setListen] = useState('')
  const [port, setPort] = useState('')
  const [entry, setEntry] = useState('')
  const [initialised, setInitialised] = useState(false)
  const [tlsEnabled, setTlsEnabled] = useState(false)
  const [tlsDomain, setTlsDomain] = useState('')
  const [certFile, setCertFile] = useState('')
  const [keyFile, setKeyFile] = useState('')
  const [tlsInitialised, setTlsInitialised] = useState(false)

  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')

  const panelData = panel.data
  const securityData = security.data

  if (panelData && !initialised) {
    setInitialised(true)
    setListen(panelData.listen)
    setPort(String(panelData.port))
    setEntry(panelData.security)
  }
  if (securityData && !tlsInitialised) {
    setTlsInitialised(true)
    setTlsEnabled(securityData.tls.enabled)
    setCertFile(securityData.tls.certFile)
    setKeyFile(securityData.tls.keyFile)
  }

  return (
    <>
      <PageHeader
        title="设置"
        description="面板自身的访问方式、安全与账号密码"
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              void panel.refetch()
              void security.refetch()
            }}
          >
            <RefreshCw />
            刷新
          </Button>
        }
      />

      {panel.isLoading ? (
        <LoadingState />
      ) : panel.isError || !panelData ? (
        <ErrorState error={panel.error} onRetry={() => panel.refetch()} />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard
              label="面板服务"
              value={panelData.active ? '运行中' : '已停止'}
              tone={panelData.active ? 'success' : 'warning'}
              icon={<Server />}
            />
            <StatCard label="版本" value={`v${panelData.version}`} hint={`API ${panelData.apiVersion}`} />
            <StatCard label="监听地址" value={`${panelData.listen}:${panelData.port}`} />
            <StatCard
              label="TLS"
              value={panelData.tls ? '已启用' : '未启用'}
              tone={panelData.tls ? 'success' : 'default'}
              icon={<Lock />}
            />
          </div>

          <Section
            title="访问地址"
            description="当前面板的完整访问入口"
            actions={
              <div className="flex items-center gap-2">
                <RunningBadge active={panelData.active} />
                <EnabledBadge enabled={panelData.enabled} />
              </div>
            }
          >
            <div className="space-y-3">
              <CopyField label="访问地址" value={panelData.accessUrl} />
              <CopyField label="安全入口前缀" value={panelData.entryPrefix || '/'} />
            </div>
          </Section>

          <div className="grid gap-6 lg:grid-cols-2">
            <Section title="面板配置" description="修改监听地址、端口与安全入口">
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="panel-listen">监听地址</Label>
                    <Input
                      id="panel-listen"
                      value={listen}
                      placeholder="0.0.0.0"
                      onChange={(event) => setListen(event.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="panel-port">端口</Label>
                    <Input
                      id="panel-port"
                      type="number"
                      min={1}
                      max={65535}
                      value={port}
                      onChange={(event) => setPort(event.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="panel-entry">安全入口</Label>
                  <Input
                    id="panel-entry"
                    value={entry}
                    placeholder="例如 /manage"
                    onChange={(event) => setEntry(event.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    留空表示直接由根路径访问；修改端口会重启面板。
                  </p>
                </div>
                <Button
                  disabled={config.isPending}
                  onClick={async () => {
                    const portNumber = Number(port)
                    try {
                      const res = await config.mutateAsync({
                        listen,
                        port: Number.isFinite(portNumber) ? portNumber : undefined,
                        securityEntry: entry,
                      })
                      toast.success(
                        res.restartRequired
                          ? '已保存，面板正在重启以应用更改'
                          : '配置已保存',
                      )
                    } catch (error) {
                      toast.error(error instanceof Error ? error.message : '保存失败')
                    }
                  }}
                >
                  <Save />
                  保存配置
                </Button>
              </div>
            </Section>

            <Section title="面板服务" description="安装为系统服务或控制进程">
              <div className="flex flex-wrap gap-2">
                <Button
                  variant={panelData.installed ? 'ghost' : 'outline'}
                  size="sm"
                  disabled={action.isPending}
                  onClick={async () => {
                    try {
                      await action.mutateAsync(panelData.installed ? 'uninstall' : 'install')
                      toast.success(panelData.installed ? '服务已卸载' : '服务已安装')
                    } catch (error) {
                      toast.error(error instanceof Error ? error.message : '操作失败')
                    }
                  }}
                >
                  {panelData.installed ? '卸载服务' : '安装服务'}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={action.isPending}
                  onClick={async () => {
                    try {
                      await action.mutateAsync('restart')
                      toast.success('面板服务重启中')
                    } catch (error) {
                      toast.error(error instanceof Error ? error.message : '操作失败')
                    }
                  }}
                >
                  重启服务
                </Button>
              </div>
              <div className="mt-4">
                <KeyValueList
                  columns={1}
                  items={[
                    { label: '服务名称', value: panelData.serviceName, mono: true },
                    { label: '服务单元', value: panelData.unitPath, mono: true },
                    { label: '配置文件', value: panelData.configPath, mono: true },
                    { label: '静态资源目录', value: panelData.webDir, mono: true },
                  ]}
                />
              </div>
            </Section>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Section title="TLS 证书" description="为面板自身启用 HTTPS">
              {security.isLoading ? (
                <LoadingState />
              ) : security.isError || !securityData ? (
                <ErrorState error={security.error} onRetry={() => security.refetch()} />
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between rounded-lg border p-3">
                    <div className="space-y-0.5">
                      <Label htmlFor="tls-enabled">启用 TLS</Label>
                      <p className="text-xs text-muted-foreground">重启面板后生效</p>
                    </div>
                    <Switch id="tls-enabled" checked={tlsEnabled} onCheckedChange={setTlsEnabled} />
                  </div>

                  {securityData.domains.length > 0 ? (
                    <div className="space-y-1.5">
                      <Label>使用已签发证书</Label>
                      <Select
                        value={tlsDomain || 'none'}
                        onValueChange={(value) => {
                          const domain = value === 'none' ? '' : value
                          setTlsDomain(domain)
                          const found = securityData.domains.find((item) => item.domain === domain)
                          if (found) {
                            setCertFile(found.certFile)
                            setKeyFile(found.keyFile)
                          }
                        }}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="手动填写证书路径" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">手动填写</SelectItem>
                          {securityData.domains.map((item) => (
                            <SelectItem key={item.domain} value={item.domain}>
                              {item.domain}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ) : null}

                  <div className="space-y-1.5">
                    <Label htmlFor="tls-cert">证书文件</Label>
                    <Input
                      id="tls-cert"
                      value={certFile}
                      placeholder="/etc/ssl/certs/panel.crt"
                      onChange={(event) => setCertFile(event.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="tls-key">私钥文件</Label>
                    <Input
                      id="tls-key"
                      value={keyFile}
                      placeholder="/etc/ssl/private/panel.key"
                      onChange={(event) => setKeyFile(event.target.value)}
                    />
                  </div>
                  <Button
                    disabled={tls.isPending}
                    onClick={async () => {
                      try {
                        await tls.mutateAsync({
                          enabled: tlsEnabled,
                          certFile,
                          keyFile,
                          domain: tlsDomain || undefined,
                        })
                        toast.success('TLS 设置已保存，重启面板后生效')
                      } catch (error) {
                        toast.error(error instanceof Error ? error.message : '保存失败')
                      }
                    }}
                  >
                    <ShieldCheck />
                    保存 TLS 设置
                  </Button>
                </div>
              )}
            </Section>

            <Section title="防火墙" description="为已启用节点放行端口">
              {security.isLoading ? (
                <LoadingState />
              ) : security.isError || !securityData ? (
                <ErrorState error={security.error} onRetry={() => security.refetch()} />
              ) : (
                <div className="space-y-4">
                  <KeyValueList
                    items={[
                      { label: '防火墙后端', value: securityData.firewall.backend || '未检测到' },
                      { label: '管理单元', value: securityData.firewall.unit, mono: true },
                    ]}
                  />
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground">需放行的端口</p>
                    {securityData.firewall.ports.length === 0 ? (
                      <p className="text-sm text-muted-foreground">没有已启用的节点端口</p>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {securityData.firewall.ports.map((port) => (
                          <StatusBadge
                            key={`${port.protocol}-${port.port}`}
                            tone="muted"
                          >
                            {port.port}/{port.network}
                            {port.hop ? ` (+${port.hop})` : ''}
                          </StatusBadge>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      disabled={firewall.isPending}
                      onClick={async () => {
                        try {
                          await firewall.mutateAsync('apply')
                          toast.success('防火墙规则已应用')
                        } catch (error) {
                          toast.error(error instanceof Error ? error.message : '应用失败')
                        }
                      }}
                    >
                      应用规则
                    </Button>
                    <Button
                      variant="outline"
                      disabled={firewall.isPending}
                      onClick={async () => {
                        try {
                          await firewall.mutateAsync('remove')
                          toast.success('防火墙规则已移除')
                        } catch (error) {
                          toast.error(error instanceof Error ? error.message : '移除失败')
                        }
                      }}
                    >
                      移除规则
                    </Button>
                  </div>
                </div>
              )}
            </Section>
          </div>

          <Section title="管理员密码" description="修改后所有登录会话将被注销">
            <div className="grid gap-3 sm:max-w-md sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="pw-current">当前密码</Label>
                <Input
                  id="pw-current"
                  type="password"
                  autoComplete="current-password"
                  value={current}
                  onChange={(event) => setCurrent(event.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="pw-next">新密码</Label>
                <Input
                  id="pw-next"
                  type="password"
                  autoComplete="new-password"
                  value={next}
                  onChange={(event) => setNext(event.target.value)}
                />
              </div>
            </div>
            <Button
              className="mt-4"
              disabled={password.isPending || current === '' || next === ''}
              onClick={async () => {
                try {
                  const res = await password.mutateAsync({ current, next })
                  toast.success(
                    res.sessionsRevoked ? '密码已更新，请重新登录' : '密码已更新',
                  )
                  setCurrent('')
                  setNext('')
                } catch (error) {
                  toast.error(error instanceof Error ? error.message : '修改失败')
                }
              }}
            >
              <KeyRound />
              修改密码
            </Button>
          </Section>
        </>
      )}
    </>
  )
}
