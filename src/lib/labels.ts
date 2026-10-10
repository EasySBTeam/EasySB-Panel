/*
 * The Chinese wording for the enum values the API returns.
 *
 * The vocabulary mirrors the TUI's own table (internal/i18n/table.go) so the two
 * interfaces describe the same state with the same words.
 */

import type { ProtocolKey, UserStatus } from './types'

export const userStatusLabel: Record<UserStatus, string> = {
  active: '正常',
  disabled: '已停用',
  expired: '已过期',
  'over-quota': '流量已用尽',
}

export const userStatusTone: Record<UserStatus, 'success' | 'muted' | 'warning' | 'destructive'> = {
  active: 'success',
  disabled: 'muted',
  expired: 'warning',
  'over-quota': 'destructive',
}

export const protocolLabel: Record<ProtocolKey, string> = {
  anytls: 'AnyTLS',
  hysteria2: 'Hysteria2',
  tuic: 'TUIC v5',
  'vless-reality': 'VLESS-Vision-Reality',
  'vmess-ws-tls': 'VMess-WebSocket-TLS',
}

export const subscribeClientLabel: Record<string, string> = {
  singbox: 'sing-box',
  mihomo: 'mihomo / Clash Meta',
  v2ray: 'v2rayN / passwall',
}

/** Toolbox group ids to their menu titles and one-line descriptions. */
export const toolboxGroupLabel: Record<string, { title: string; description: string }> = {
  unlock: { title: '解锁检测', description: '流媒体、AI 与区域解锁情况' },
  network: { title: '网络检测', description: '三网回程、就近测速与三网测速' },
  ip: { title: 'IP 与端口', description: 'IP 质量、黑名单与邮件端口' },
  hardware: { title: '硬件与性能', description: '系统信息、硬盘、CPU、内存与磁盘' },
}

/** Toolbox entry ids to their titles and descriptions. */
export const toolboxToolLabel: Record<string, { title: string; description: string }> = {
  'unlock-media': { title: '流媒体解锁', description: 'Netflix、Disney+、YouTube 等 9 项' },
  'unlock-ai': { title: 'AI 解锁', description: 'ChatGPT、Gemini、Claude' },
  'unlock-region': { title: '区域解锁', description: 'Steam、Bilibili 三个区域、巴哈姆特動畫瘋' },
  backtrace: { title: '三网回程', description: '到电信/联通/移动的路径与回程线路判定' },
  'speed-near': { title: '就近测速', description: 'speedtest.net 就近节点，下行/上行/延迟' },
  'speed-cn': { title: '三网测速', description: '只测中国大陆电信/联通/移动节点' },
  ipquality: { title: 'IP 质量', description: '多家数据库、IP 类型与 DNS 黑名单' },
  portcheck: { title: '邮件端口', description: '25/465/587 等端口与 PTR，判断能否搭邮局' },
  'bench-disks': { title: '多盘 IO', description: '在每个已挂载的块设备上各跑一轮小负载' },
  'hw-info': { title: '系统信息', description: 'CPU、内存、虚拟化、负载与时区' },
  'hw-disk': { title: '硬盘信息', description: '块设备、容量、型号与通电时长' },
  'bench-cpu': { title: 'CPU 跑分', description: '单核与多核负载得分（面板自研，非 geekbench）' },
  'bench-mem': { title: '内存测试', description: '顺序读、写、拷贝带宽' },
  'bench-disk': { title: '磁盘 IO', description: '顺序写与顺序读（带 fsync），再加 4K 随机读写' },
}

/** The verdict tokens the unlock tools return, worded for the table. */
export const toolboxVerdict: Record<string, string> = {
  unlocked: '解锁',
  blocked: '不解锁',
  unknown: '未知',
}
