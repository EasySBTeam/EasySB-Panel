// The shapes the Go panel returns. They mirror internal/panel's response maps
// and its exported view structs, so a change on either side is a compile error
// here rather than a runtime surprise.

export interface Session {
  username: string
  version: string
  apiVersion: string
}

export interface LoginResult extends Session {
  token: string
  expiresAt: string
}

// sysinfo.Status is encoded with its Go field names, so the keys are
// PascalCase. Uptime is a Go duration in nanoseconds.
export interface PortInfo {
  Protocol: string
  Port: string
  Enabled: boolean
}

export interface HostInfo {
  ScriptVersion: string
  CoreVersion: string
  StatsCapable: boolean
  Service: string
  Autostart: string
  Domain: string
  SubPort: number
  SubSyncSecs: number
  Hop: string
  Ports: PortInfo[] | null
  Deployed: boolean
  StateFound: boolean
  Hostname: string
  OS: string
  Kernel: string
  Timezone: string
  LocalIPv4: string
  LocalIPv6: string
  CPUCores: number
  LoadAvg: string
  MemTotal: number
  MemAvail: number
  SwapTotal: number
  SwapFree: number
  DiskTotal: number
  DiskFree: number
  Uptime: number
  NetRxBytes: number
  NetTxBytes: number
  DiskReadBytes: number
  DiskWriteBytes: number
}

export interface ServiceState {
  name: string
  active: boolean
  enabled: boolean
  installed?: boolean
  unit?: string
}

export interface Dashboard {
  version: string
  apiVersion: string
  host: HostInfo
  counts: { nodes: number; nodesEnabled: number; users: number; usersActive: number }
  core: { active: boolean; enabled: boolean }
  panel: { installed: boolean; active: boolean }
}

export interface NodeParam {
  key: string
  label: string
  default: string
}

export interface ProtocolInfo {
  key: string
  label: string
  defaultPort: number
  params: NodeParam[] | null
}

export interface Node {
  id: string
  name: string
  protocol: string
  port: number
  enabled: boolean
  params: Record<string, string> | null
  createdAt: string
  usedBy: number
}

export interface NodesResponse {
  nodes: Node[] | null
  protocols: ProtocolInfo[] | null
}

export interface User {
  name: string
  remark?: string
  token: string
  enabled: boolean
  status: string
  nodes: string[] | null
  quotaBytes: number
  usedBytes: number
  uploadBytes: number
  downloadBytes: number
  remaining: number
  percent: number
  unlimited: boolean
  credentialsReady: boolean
  createdAt: string
  expireAt: string
  lastReset: string
  subscriptionUrl?: string
}

export interface UsersResponse {
  users: User[] | null
}

export interface SubscriptionLink {
  client: string
  url: string
  link: string
}

export interface ShareLink {
  key: string
  name: string
  uri: string
}

export interface UserSubscriptions {
  name: string
  token: string
  endpoint: string
  clients: SubscriptionLink[] | null
  shareLinks: ShareLink[] | null
}

export interface SubscriptionsOverview {
  host: string
  endpoint: string
  path: string
  clients: string[] | null
  active: boolean
}

export interface DomainsResponse {
  domains: string[] | null
  active: string
  configured: string
  acmeEmail: string
  timerInstalled: boolean
  timerNext: string
  staging: boolean
  registered: boolean
}

export interface IssueResult {
  steps: string[] | null
  error?: string
}

export interface TimerState {
  installed: boolean
  next: string
}

export interface CoreInfo {
  version: string
  coreVersion: string
  statsCapable: boolean
  active: boolean
  enabled: boolean
  deployed: boolean
  configPath: string
  nodeCount: number
  userCount: number
}

export interface CheckResult {
  ok: boolean
  error?: string
}

export interface SystemInfo {
  host: HostInfo
  services: {
    core: ServiceState
    subscription: ServiceState
    panel: ServiceState
  }
}

export interface LogResult {
  service: string
  path: string
  lines: string[] | null
  note?: string
}

export interface PanelInfo {
  version: string
  apiVersion: string
  listen: string
  port: number
  username: string
  security: string
  entryPrefix: string
  tls: boolean
  accessUrl: string
  configPath: string
  webDir: string
  unitPath: string
  installed: boolean
  active: boolean
  enabled: boolean
  serviceName: string
}

export interface PanelConfigResult {
  ok: boolean
  restartRequired: boolean
  listen: string
  port: number
  securityEntry: string
  accessUrl: string
}

export interface PanelActionResult {
  ok: boolean
  installed: boolean
  active: boolean
  enabled: boolean
}

// The toolbox. The registry reports stable ids only; the browser words them, so
// these are the same tokens internal/toolbox/tools defines.
export interface ToolboxEntry {
  id: string
  group: string
}

export interface ToolResult {
  headers?: string[] | null
  rows?: string[][] | null
  notes?: string[] | null
  summary?: string
  board?: string
}

export interface ToolboxRecord {
  id: string
  when: string
  result: ToolResult
  error?: string
}

export interface ToolboxView {
  groups: string[] | null
  tools: ToolboxEntry[] | null
  board: Record<string, ToolboxRecord> | null
}

// The monitor sample: cumulative counters since boot. A rate is the difference
// between two samples, taken by the dashboard's polling hook.
export interface MonitorSample {
  rxBytes: number
  txBytes: number
  readBytes: number
  writeBytes: number
}

export interface BBRStatus {
  enabled: boolean
  congestion: string
  available: string
  qdisc: string
  running: string
  arch: string
  supported: boolean
  kernels: string[] | null
  customKernel: string
  needsReboot: boolean
  qdiscs: string[] | null
}

export interface BBRActionResult {
  ok: boolean
  enabled: boolean
  congestion: string
  qdisc: string
  cleared?: boolean
}

export interface CertificateOption {
  domain: string
  certFile: string
  keyFile: string
  usable: boolean
}

export interface FirewallPort {
  protocol: string
  port: number
  network: string
  hop?: string
}

export interface SecurityView {
  tls: { enabled: boolean; certFile: string; keyFile: string }
  domains: CertificateOption[] | null
  firewall: { backend: string; unit: string; ports: FirewallPort[] | null }
}

export interface TLSSaveResult {
  ok: boolean
  enabled: boolean
  certFile: string
  keyFile: string
  accessUrl: string
  note: string
}
