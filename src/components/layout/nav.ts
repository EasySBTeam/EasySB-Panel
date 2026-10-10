import {
  Activity,
  Boxes,
  Cpu,
  Gauge,
  Globe,
  LayoutDashboard,
  ScrollText,
  Settings,
  SquareTerminal,
  Users,
  Wrench,
  type LucideIcon,
} from 'lucide-react'

export interface NavItem {
  title: string
  path: string
  icon: LucideIcon
  /** The page title shown in the top bar and breadcrumb. */
  crumb: string
}

export interface NavGroup {
  label: string
  items: NavItem[]
}

export const navGroups: NavGroup[] = [
  {
    label: '管理',
    items: [
      { title: '概览', path: '/', icon: LayoutDashboard, crumb: '概览' },
      { title: '节点管理', path: '/nodes', icon: Boxes, crumb: '节点管理' },
      { title: '账号管理', path: '/users', icon: Users, crumb: '账号管理' },
      { title: '订阅', path: '/subscriptions', icon: Globe, crumb: '订阅' },
      { title: '域名与证书', path: '/domains', icon: Globe, crumb: '域名与证书' },
    ],
  },
  {
    label: '运行',
    items: [
      { title: '内核服务', path: '/core', icon: Cpu, crumb: '内核服务' },
      { title: '系统信息', path: '/system', icon: Activity, crumb: '系统信息' },
      { title: '运行日志', path: '/logs', icon: ScrollText, crumb: '运行日志' },
      { title: 'BBR 加速', path: '/bbr', icon: Gauge, crumb: 'BBR 加速' },
    ],
  },
  {
    label: '工具',
    items: [
      { title: '工具箱', path: '/toolbox', icon: Wrench, crumb: '工具箱' },
      { title: '终端', path: '/terminal', icon: SquareTerminal, crumb: '终端' },
    ],
  },
  {
    label: '面板',
    items: [
      { title: '设置', path: '/settings', icon: Settings, crumb: '设置' },
    ],
  },
]

/** A flat lookup of route path to crumb, for the top bar. */
export const crumbByPath = new Map<string, string>([
  ...navGroups.flatMap((group) =>
    group.items.map((item) => [item.path, item.crumb] as [string, string]),
  ),
  ['/settings', '设置'],
  ['/users', '账号管理'],
])
