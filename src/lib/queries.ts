/*
 * The React Query layer: one key per resource and the hooks the pages use.
 *
 * Reads are plain queries; every mutation invalidates the keys its change can
 * affect, so a node edit refreshes the dashboard counts as well as the node list
 * without each page wiring that up itself.
 */

import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationOptions,
} from '@tanstack/react-query'
import { apiText, http } from './api'
import type {
  BBRMaybeResponse,
  BBRResponse,
  CheckResponse,
  CoreConfigResponse,
  CoreResponse,
  CoreStatusResponse,
  DashboardResponse,
  DomainIssueResponse,
  DomainsResponse,
  FirewallActionResponse,
  HistoryResponse,
  LoginResponse,
  LogsResponse,
  NetworkResponse,
  Node,
  NodeConfigResponse,
  NodeRequest,
  NodesResponse,
  PanelConfigRequest,
  PanelConfigResponse,
  PanelResponse,
  RuntimeResponse,
  SecurityResponse,
  ServiceActionResponse,
  SessionResponse,
  SubscribeClient,
  SubscriptionsResponse,
  SystemResponse,
  ToolboxResponse,
  ToolboxResult,
  User,
  UserRequest,
  UserSubscriptionsResponse,
  UsersResponse,
} from './types'

export const keys = {
  session: ['session'] as const,
  dashboard: ['dashboard'] as const,
  nodes: ['nodes'] as const,
  node: (id: string) => ['nodes', id] as const,
  users: ['users'] as const,
  user: (name: string) => ['users', name] as const,
  userSubscriptions: (name: string) => ['users', name, 'subscriptions'] as const,
  subscriptions: ['subscriptions'] as const,
  domains: ['domains'] as const,
  domainTimer: ['domains', 'timer'] as const,
  core: ['core'] as const,
  coreConfig: ['core', 'config'] as const,
  system: ['system'] as const,
  network: ['system', 'network'] as const,
  runtime: ['system', 'runtime'] as const,
  history: ['system', 'history'] as const,
  logs: (service: string, lines: number) => ['logs', service, lines] as const,
  panel: ['panel'] as const,
  security: ['security'] as const,
  bbr: ['bbr'] as const,
  toolbox: ['toolbox'] as const,
  toolboxBoard: ['toolbox', 'board'] as const,
}

// --- reads ------------------------------------------------------------------

export function useSession() {
  return useQuery({
    queryKey: keys.session,
    queryFn: () => http.get<SessionResponse>('/auth/session'),
    retry: false,
    staleTime: 60_000,
  })
}

export function useDashboard(pollMs = 0) {
  return useQuery({
    queryKey: keys.dashboard,
    queryFn: () => http.get<DashboardResponse>('/dashboard'),
    refetchInterval: pollMs || false,
  })
}

export function useNodes() {
  return useQuery({
    queryKey: keys.nodes,
    queryFn: () => http.get<NodesResponse>('/nodes'),
  })
}

export function useNodeConfig(id: string, enabled = true) {
  return useQuery({
    queryKey: [...keys.node(id), 'config'] as const,
    queryFn: () => http.get<NodeConfigResponse>(`/nodes/${id}/config`),
    enabled: enabled && id !== '',
  })
}

export function useUsers() {
  return useQuery({
    queryKey: keys.users,
    queryFn: () => http.get<UsersResponse>('/users'),
  })
}

export function useUser(name: string) {
  return useQuery({
    queryKey: keys.user(name),
    queryFn: () => http.get<User>(`/users/${encodeURIComponent(name)}`),
    enabled: name !== '',
  })
}

export function useUserSubscriptions(name: string) {
  return useQuery({
    queryKey: keys.userSubscriptions(name),
    queryFn: () =>
      http.get<UserSubscriptionsResponse>(`/users/${encodeURIComponent(name)}/subscriptions`),
    enabled: name !== '',
  })
}

/** The rendered subscription document for one client format. */
export function useUserDocument(name: string, client: SubscribeClient, enabled = true) {
  return useQuery({
    queryKey: [...keys.user(name), 'document', client] as const,
    queryFn: () =>
      apiText(`/users/${encodeURIComponent(name)}/document?client=${client}`),
    enabled: enabled && name !== '',
  })
}

export function useSubscriptions() {
  return useQuery({
    queryKey: keys.subscriptions,
    queryFn: () => http.get<SubscriptionsResponse>('/subscriptions'),
  })
}

export function useDomains() {
  return useQuery({
    queryKey: keys.domains,
    queryFn: () => http.get<DomainsResponse>('/domains'),
  })
}

export function useCore() {
  return useQuery({
    queryKey: keys.core,
    queryFn: () => http.get<CoreResponse>('/core'),
  })
}

export function useCoreConfig() {
  return useQuery({
    queryKey: keys.coreConfig,
    queryFn: () => http.get<CoreConfigResponse>('/core/config'),
  })
}

export function useSystem() {
  return useQuery({
    queryKey: keys.system,
    queryFn: () => http.get<SystemResponse>('/system'),
  })
}

export function useNetwork(pollMs = 0) {
  return useQuery({
    queryKey: keys.network,
    queryFn: () => http.get<NetworkResponse>('/system/network'),
    refetchInterval: pollMs || false,
  })
}

export function useRuntime(pollMs = 0) {
  return useQuery({
    queryKey: keys.runtime,
    queryFn: () => http.get<RuntimeResponse>('/system/runtime'),
    refetchInterval: pollMs || false,
  })
}

export function useHistory(pollMs = 0) {
  return useQuery({
    queryKey: keys.history,
    queryFn: () => http.get<HistoryResponse>('/system/history'),
    refetchInterval: pollMs || false,
  })
}

export function useLogs(service: string, lines: number, enabled = true) {
  return useQuery({
    queryKey: keys.logs(service, lines),
    queryFn: () => http.get<LogsResponse>(`/logs?service=${service}&lines=${lines}`),
    enabled,
  })
}

export function usePanel() {
  return useQuery({
    queryKey: keys.panel,
    queryFn: () => http.get<PanelResponse>('/panel'),
  })
}

export function useSecurity() {
  return useQuery({
    queryKey: keys.security,
    queryFn: () => http.get<SecurityResponse>('/security'),
  })
}

export function useBBR() {
  return useQuery({
    queryKey: keys.bbr,
    queryFn: () => http.get<BBRResponse>('/bbr'),
  })
}

export function useToolbox() {
  return useQuery({
    queryKey: keys.toolbox,
    queryFn: () => http.get<ToolboxResponse>('/toolbox'),
  })
}

// --- writes -----------------------------------------------------------------

/** The keys a change to the deployment can affect, invalidated after a mutation. */
function useDeploymentInvalidation() {
  const qc = useQueryClient()
  return () => {
    for (const key of [
      keys.dashboard,
      keys.nodes,
      keys.users,
      keys.core,
      keys.coreConfig,
      keys.system,
      keys.subscriptions,
      keys.domains,
      keys.security,
    ]) {
      void qc.invalidateQueries({ queryKey: key })
    }
  }
}

type MutationExtras<TData, TVariables> = Omit<
  UseMutationOptions<TData, Error, TVariables>,
  'mutationFn'
>

export function useCreateNode(options?: MutationExtras<unknown, NodeRequest>) {
  const invalidate = useDeploymentInvalidation()
  return useMutation({
    mutationFn: (body: NodeRequest) => http.post('/nodes', body),
    onSuccess: (...args) => {
      invalidate()
      options?.onSuccess?.(...args)
    },
  })
}

export function useUpdateNode(options?: MutationExtras<unknown, { id: string; body: NodeRequest }>) {
  const invalidate = useDeploymentInvalidation()
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: NodeRequest }) =>
      http.put(`/nodes/${id}`, body),
    onSuccess: (...args) => {
      invalidate()
      options?.onSuccess?.(...args)
    },
  })
}

export function useDeleteNode(options?: MutationExtras<unknown, string>) {
  const invalidate = useDeploymentInvalidation()
  return useMutation({
    mutationFn: (id: string) => http.del(`/nodes/${id}`),
    onSuccess: (...args) => {
      invalidate()
      options?.onSuccess?.(...args)
    },
  })
}

export function useSetNodeEnabled(options?: MutationExtras<unknown, { id: string; enabled: boolean }>) {
  const invalidate = useDeploymentInvalidation()
  return useMutation({
    mutationFn: ({ id, enabled }: { id: string; enabled: boolean }) =>
      http.post(`/nodes/${id}/${enabled ? 'enable' : 'disable'}`),
    onSuccess: (...args) => {
      invalidate()
      options?.onSuccess?.(...args)
    },
  })
}

export function useCreateUser(options?: MutationExtras<unknown, UserRequest>) {
  const invalidate = useDeploymentInvalidation()
  return useMutation({
    mutationFn: (body: UserRequest) => http.post('/users', body),
    onSuccess: (...args) => {
      invalidate()
      options?.onSuccess?.(...args)
    },
  })
}

export function useUpdateUser(options?: MutationExtras<unknown, { name: string; body: UserRequest }>) {
  const invalidate = useDeploymentInvalidation()
  return useMutation({
    mutationFn: ({ name, body }: { name: string; body: UserRequest }) =>
      http.put(`/users/${encodeURIComponent(name)}`, body),
    onSuccess: (...args) => {
      invalidate()
      options?.onSuccess?.(...args)
    },
  })
}

export function useDeleteUser(options?: MutationExtras<unknown, string>) {
  const invalidate = useDeploymentInvalidation()
  return useMutation({
    mutationFn: (name: string) => http.del(`/users/${encodeURIComponent(name)}`),
    onSuccess: (...args) => {
      invalidate()
      options?.onSuccess?.(...args)
    },
  })
}

export function useSetUserEnabled(options?: MutationExtras<unknown, { name: string; enabled: boolean }>) {
  const invalidate = useDeploymentInvalidation()
  return useMutation({
    mutationFn: ({ name, enabled }: { name: string; enabled: boolean }) =>
      http.post(`/users/${encodeURIComponent(name)}/${enabled ? 'enable' : 'disable'}`),
    onSuccess: (...args) => {
      invalidate()
      options?.onSuccess?.(...args)
    },
  })
}

export function useResetUser(options?: MutationExtras<unknown, string>) {
  const invalidate = useDeploymentInvalidation()
  return useMutation({
    mutationFn: (name: string) => http.post(`/users/${encodeURIComponent(name)}/reset`),
    onSuccess: (...args) => {
      invalidate()
      options?.onSuccess?.(...args)
    },
  })
}

export function useApplyCore(options?: MutationExtras<unknown, void>) {
  const invalidate = useDeploymentInvalidation()
  return useMutation({
    mutationFn: () => http.post('/core/apply'),
    onSuccess: (...args) => {
      invalidate()
      options?.onSuccess?.(...args)
    },
  })
}

export function useCheckCore(options?: MutationExtras<CheckResponse, void>) {
  return useMutation({
    mutationFn: () => http.post<CheckResponse>('/core/check'),
    ...options,
  })
}

export function useCoreAction(
  options?: MutationExtras<ServiceActionResponse | CoreStatusResponse, string>,
) {
  const invalidate = useDeploymentInvalidation()
  return useMutation({
    mutationFn: (action: string) =>
      http.post<ServiceActionResponse | CoreStatusResponse>(`/core/${action}`),
    onSuccess: (...args) => {
      invalidate()
      options?.onSuccess?.(...args)
    },
  })
}

export function usePanelAction(options?: MutationExtras<unknown, string>) {
  const invalidate = useDeploymentInvalidation()
  return useMutation({
    mutationFn: (action: string) => http.post(`/panel/${action}`),
    onSuccess: (...args) => {
      invalidate()
      options?.onSuccess?.(...args)
    },
  })
}

export function usePanelConfig(options?: MutationExtras<PanelConfigResponse, PanelConfigRequest>) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: PanelConfigRequest) =>
      http.post<PanelConfigResponse>('/panel/config', body),
    onSuccess: (...args) => {
      void qc.invalidateQueries({ queryKey: keys.panel })
      options?.onSuccess?.(...args)
    },
  })
}

export function useSubscriptionServiceAction(options?: MutationExtras<unknown, string>) {
  const invalidate = useDeploymentInvalidation()
  return useMutation({
    mutationFn: (action: string) => http.post(`/system/subscription/${action}`),
    onSuccess: (...args) => {
      invalidate()
      options?.onSuccess?.(...args)
    },
  })
}

export function useIssueDomain(
  options?: MutationExtras<DomainIssueResponse, { domain: string; email: string }>,
) {
  const invalidate = useDeploymentInvalidation()
  return useMutation({
    mutationFn: ({ domain, email }: { domain: string; email: string }) =>
      http.post<DomainIssueResponse>('/domains/issue', { domain, email }),
    onSuccess: (...args) => {
      invalidate()
      options?.onSuccess?.(...args)
    },
  })
}

export function useRenewDomains(options?: MutationExtras<{ renewed: string[] }, void>) {
  const invalidate = useDeploymentInvalidation()
  return useMutation({
    mutationFn: () => http.post<{ renewed: string[] }>('/domains/renew'),
    onSuccess: (...args) => {
      invalidate()
      options?.onSuccess?.(...args)
    },
  })
}

export function useRemoveDomain(options?: MutationExtras<unknown, string>) {
  const invalidate = useDeploymentInvalidation()
  return useMutation({
    mutationFn: (domain: string) => http.post('/domains/remove', { domain }),
    onSuccess: (...args) => {
      invalidate()
      options?.onSuccess?.(...args)
    },
  })
}

export function useActivateDomain(options?: MutationExtras<unknown, string>) {
  const invalidate = useDeploymentInvalidation()
  return useMutation({
    mutationFn: (domain: string) => http.post('/domains/activate', { domain }),
    onSuccess: (...args) => {
      invalidate()
      options?.onSuccess?.(...args)
    },
  })
}

export function useDomainTimer(
  options?: MutationExtras<{ ok: boolean; installed: boolean }, 'install' | 'remove'>,
) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (action: 'install' | 'remove') =>
      http.post<{ ok: boolean; installed: boolean }>('/domains/timer', { action }),
    onSuccess: (...args) => {
      void qc.invalidateQueries({ queryKey: keys.domains })
      options?.onSuccess?.(...args)
    },
  })
}

export function useSecurityTLS(
  options?: MutationExtras<
    { ok: boolean; accessUrl: string; note: string },
    { enabled: boolean; certFile?: string; keyFile?: string; domain?: string }
  >,
) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: {
      enabled: boolean
      certFile?: string
      keyFile?: string
      domain?: string
    }) => http.post<{ ok: boolean; accessUrl: string; note: string }>('/security/tls', body),
    onSuccess: (...args) => {
      void qc.invalidateQueries({ queryKey: keys.security })
      options?.onSuccess?.(...args)
    },
  })
}

export function useFirewallAction(
  options?: MutationExtras<FirewallActionResponse, 'apply' | 'remove'>,
) {
  const invalidate = useDeploymentInvalidation()
  return useMutation({
    mutationFn: (action: 'apply' | 'remove') =>
      http.post<FirewallActionResponse>(`/security/firewall/${action}`),
    onSuccess: (...args) => {
      invalidate()
      options?.onSuccess?.(...args)
    },
  })
}

export function useBBREnable(options?: MutationExtras<BBRMaybeResponse, string>) {
  const invalidate = useDeploymentInvalidation()
  return useMutation({
    mutationFn: (qdisc: string) => http.post<BBRMaybeResponse>('/bbr/enable', { qdisc }),
    onSuccess: (...args) => {
      invalidate()
      options?.onSuccess?.(...args)
    },
  })
}

export function useBBRClear(options?: MutationExtras<BBRMaybeResponse, void>) {
  const invalidate = useDeploymentInvalidation()
  return useMutation({
    mutationFn: () => http.post<BBRMaybeResponse>('/bbr/clear'),
    onSuccess: (...args) => {
      invalidate()
      options?.onSuccess?.(...args)
    },
  })
}

export function useRunTool(
  options?: MutationExtras<ToolboxResult, string>,
) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => http.post<ToolboxResult>(`/toolbox/${id}/run`),
    onSuccess: (...args) => {
      void qc.invalidateQueries({ queryKey: keys.toolboxBoard })
      options?.onSuccess?.(...args)
    },
  })
}

export function useLogin(
  options?: MutationExtras<LoginResponse, { username: string; password: string }>,
) {
  return useMutation({
    mutationFn: (body: { username: string; password: string }) =>
      http.post<LoginResponse>('/auth/login', body),
    ...options,
  })
}

export function useLogout(options?: MutationExtras<unknown, void>) {
  return useMutation({
    mutationFn: () => http.post('/auth/logout'),
    ...options,
  })
}

export function useChangePassword(
  options?: MutationExtras<{ ok: boolean; sessionsRevoked: boolean }, { current: string; next: string }>,
) {
  return useMutation({
    mutationFn: (body: { current: string; next: string }) =>
      http.post<{ ok: boolean; sessionsRevoked: boolean }>('/auth/password', body),
    ...options,
  })
}

export type { Node }
