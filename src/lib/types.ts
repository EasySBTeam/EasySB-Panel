/*
 * The JSON model of the panel API (docs/panel-api.md), written to match the Go
 * structs field for field. Request and response types live here so a page never
 * has to guess a shape or repeat a literal.
 */

/** A node as the store holds it. */
export interface Node {
  id: string
  name: string
  protocol: ProtocolKey
  port: number
  enabled: boolean
  params: Record<string, string>
  created_at: string
}

/** A node plus how many accounts select it, as the list endpoint returns it. */
export interface NodeView extends Node {
  usedBy: number
}

export type ProtocolKey =
  | 'anytls'
  | 'hysteria2'
  | 'tuic'
  | 'vless-reality'
  | 'vmess-ws-tls'

/** A protocol parameter a node form may set. */
export interface ParamInfo {
  key: string
  label: string
  default: string
}

/** A protocol and the parameters the build lets a client set. */
export interface ProtocolInfo {
  key: ProtocolKey
  label: string
  defaultPort: number
  /** Null when the protocol exposes no parameter: the API sends `null` for an empty set. */
  params: ParamInfo[] | null
}

export interface NodesResponse {
  nodes: NodeView[]
  protocols: ProtocolInfo[]
}

export interface NodeRequest {
  name: string
  protocol: ProtocolKey
  port: number
  enabled: boolean
  params?: Record<string, string>
}

/** One rendered inbound for a node, as /nodes/{id}/config returns it. */
export interface NodeConfigResponse {
  inbound: Record<string, unknown>
}

export type UserStatus = 'active' | 'disabled' | 'expired' | 'over-quota'

/** One account as the panel lists it. */
export interface User {
  name: string
  remark?: string
  token: string
  enabled: boolean
  status: UserStatus
  /** Null when the account selects no node: the API sends `null` for an empty set. */
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
  users: User[]
}

export interface UserRequest {
  name?: string
  remark?: string
  quotaBytes?: number
  /** A YYYY-MM-DD day or an RFC3339 instant; empty clears the expiry. */
  expireAt?: string
  nodes?: string[]
  enabled?: boolean
}

/** One account's subscription endpoints and share links. */
export interface UserSubscriptionsResponse {
  name: string
  token: string
  endpoint: string
  clients: { client: SubscribeClient; url: string; link: string }[]
  shareLinks: { key: string; name: string; uri: string }[]
}

export type SubscribeClient = 'singbox' | 'mihomo' | 'v2ray'

/** The shared subscription endpoint overview. */
export interface SubscriptionsResponse {
  host: string
  endpoint: string
  path: string
  clients: SubscribeClient[]
  active: boolean
}

export interface DomainsResponse {
  domains: string[]
  active: string
  configured: string
  acmeEmail: string
  timerInstalled: boolean
  timerNext: string
  staging: boolean
  registered: boolean
}

export interface DomainIssueResponse {
  steps: string[]
  error?: string
}

export interface TimerStatusResponse {
  installed: boolean
  next: string
}

export interface CoreResponse {
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

export interface CoreConfigResponse {
  path: string
  config: string
}

export interface CheckResponse {
  ok: boolean
  error?: string
}

export interface ServiceActionResponse {
  ok: boolean
  active: boolean
  enabled: boolean
}

export interface CoreStatusResponse {
  active: boolean
  enabled: boolean
  output: string
  enabledOutput: string
}

/** The host snapshot. The Go struct carries no JSON tags, so keys are PascalCase. */
export interface HostStatus {
  ScriptVersion: string
  CoreVersion: string
  StatsCapable: boolean
  Service: string
  Autostart: string
  Domain: string
  SubPort: number
  SubSyncSecs: number
  Hop: string
  Ports: { Protocol: string; Port: string; Enabled: boolean }[] | null
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

export interface DashboardResponse {
  version: string
  apiVersion: string
  host: HostStatus
  counts: {
    nodes: number
    nodesEnabled: number
    users: number
    usersActive: number
  }
  core: { active: boolean; enabled: boolean }
  panel: { installed: boolean; active: boolean }
}

export interface ServiceUnit {
  name: string
  active: boolean
  enabled: boolean
  installed?: boolean
  unit?: string
}

export interface SystemResponse {
  host: HostStatus
  services: {
    core: ServiceUnit
    subscription: ServiceUnit
    panel: ServiceUnit
  }
}

export interface NetworkResponse {
  rxBytes: number
  txBytes: number
  readBytes: number
  writeBytes: number
}

export interface RuntimeResponse {
  uptimeSecs: number
  connections: number
  goroutines: number
  gcCount: number
  rssBytes: number
  mem: {
    allocBytes: number
    heapBytes: number
    heapSysBytes: number
    sysBytes: number
    totalAllocBytes: number
  }
}

export interface LogsResponse {
  service: string
  path: string
  lines: string[]
  note?: string
}

export interface PanelResponse {
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

export interface PanelConfigRequest {
  listen?: string
  port?: number
  securityEntry?: string
}

export interface PanelConfigResponse {
  ok: boolean
  restartRequired: boolean
  listen: string
  port: number
  securityEntry: string
  accessUrl: string
}

export interface SecurityResponse {
  tls: { enabled: boolean; certFile: string; keyFile: string }
  domains: { domain: string; certFile: string; keyFile: string; usable: boolean }[]
  firewall: {
    backend: string
    unit: string
    ports: { protocol: string; port: number; network: string; hop?: string }[]
  }
}

export interface FirewallActionResponse {
  ok: boolean
  backend: string
  ports: SecurityResponse['firewall']['ports']
}

export interface BBRResponse {
  enabled: boolean
  congestion: string
  /** Space-separated list from `net.ipv4.tcp_available_congestion_control`, e.g. "reno cubic bbr". */
  available: string
  qdisc: string
  running: string
  arch: string
  supported: boolean
  kernels: string[] | null
  customKernel: string
  needsReboot: boolean
  qdiscs: string[]
}

export interface BBRMaybeResponse {
  ok: boolean
  cleared?: string[]
  enabled: boolean
  congestion: string
  qdisc: string
}

/** One toolbox entry, keyed by its stable id. */
export interface ToolboxEntry {
  id: string
  group: ToolboxGroup
}

export type ToolboxGroup = 'unlock' | 'network' | 'ip' | 'hardware'

export interface ToolboxResult {
  headers?: string[]
  rows?: string[][]
  notes?: string[]
  summary?: string
  board?: string
}

export interface ToolboxRecord {
  id: string
  when: string
  result: ToolboxResult
  error?: string
}

export type ToolboxBoard = Record<string, ToolboxRecord>

export interface ToolboxResponse {
  groups: ToolboxGroup[]
  tools: ToolboxEntry[]
  board: ToolboxBoard
}

export interface LoginResponse {
  username: string
  expiresAt: string
  token: string
  version: string
  apiVersion: string
}

export interface SessionResponse {
  username: string
  version: string
  apiVersion: string
}
