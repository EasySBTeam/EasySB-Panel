import { useState } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { Avatar, Button, Dropdown, Layout, Menu, Tooltip } from '@arco-design/web-react'
import {
  IconClose,
  IconCloud,
  IconCommand,
  IconDashboard,
  IconDesktop,
  IconDown,
  IconExport,
  IconInfoCircle,
  IconMenuFold,
  IconMenuUnfold,
  IconPublic,
  IconSettings,
  IconThunderbolt,
  IconTool,
  IconUserGroup,
} from '@arco-design/web-react/icon'
import { useAuth } from '../auth'
import { useI18n } from '../i18n'
import Logo from '../components/Logo'

const { Header, Sider, Content } = Layout

const BANNER_KEY = 'easysb_panel_banner_dismissed'

// The sidebar mirrors 1Panel's: one rounded card per destination. Core and
// System are not destinations of their own; they live as tabs on the dashboard.
const NAV = [
  { key: '/', icon: <IconDashboard />, label: 'nav.dashboard' },
  { key: '/nodes', icon: <IconCloud />, label: 'nav.nodes' },
  { key: '/users', icon: <IconUserGroup />, label: 'nav.accounts' },
  { key: '/domains', icon: <IconPublic />, label: 'nav.domains' },
  { key: '/bbr', icon: <IconThunderbolt />, label: 'nav.bbr' },
  { key: '/terminal', icon: <IconCommand />, label: 'nav.terminal' },
  { key: '/toolbox', icon: <IconTool />, label: 'nav.toolbox' },
  { key: '/panel', icon: <IconSettings />, label: 'nav.panel' },
] as const

const PROJECT_URL = 'https://github.com/EasySBTeam/EasySB'

// The 主节点 control mirrors 1Panel's: it sits at the foot of the sidebar and
// carries the operator identity and the sign-out action. Theme and language
// moved to 面板设置 -> 面板, where 1Panel keeps them.
function NodeMenu({ username }: { username?: string }) {
  const { t } = useI18n()
  const { logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="node-menu">
      <div className="node-menu-head">
        <Avatar shape="square" size={34} style={{ backgroundColor: 'rgb(var(--primary-6))' }}>
          <IconDesktop />
        </Avatar>
        <div className="node-menu-id">
          <div className="node-menu-title">{t('header.node')}</div>
          <div className="node-menu-sub">
            {username ?? 'admin'} · {t('header.administrator')}
          </div>
        </div>
      </div>

      <Button long status="danger" icon={<IconExport />} onClick={handleLogout}>
        {t('header.signOut')}
      </Button>
    </div>
  )
}

export default function AppLayout() {
  const location = useLocation()
  const navigate = useNavigate()
  const { session } = useAuth()
  const { t } = useI18n()
  const [collapsed, setCollapsed] = useState(false)
  // The panel ships plain HTTP by default; warn only when the current page was
  // actually loaded over http, and let the operator dismiss it for the session.
  const [bannerOpen, setBannerOpen] = useState(
    () => window.location.protocol === 'http:' && sessionStorage.getItem(BANNER_KEY) !== '1',
  )

  const activeKey =
    NAV.map((item) => item.key)
      .filter((key) => (key === '/' ? location.pathname === '/' : location.pathname.startsWith(key)))
      .at(-1) ?? '/'

  const current = NAV.find((item) => item.key === activeKey)

  const dismissBanner = () => {
    sessionStorage.setItem(BANNER_KEY, '1')
    setBannerOpen(false)
  }

  return (
    <Layout className="app-shell">
      <Sider
        className={`app-sider${collapsed ? ' app-sider-collapsed' : ''}`}
        width={224}
        collapsedWidth={60}
        collapsed={collapsed}
        trigger={null}
        breakpoint="lg"
        onBreakpoint={setCollapsed}
      >
        <div className="app-logo">
          <Logo size={28} className="app-logo-mark" />
          {!collapsed && <span className="app-logo-text">{t('app.title')}</span>}
          {!collapsed && (
            <Tooltip content={t('header.collapse')} position="right">
              <Button
                className="app-icon-btn app-collapse-btn"
                type="text"
                size="mini"
                aria-label={t('header.collapse')}
                icon={<IconMenuFold />}
                onClick={() => setCollapsed(true)}
              />
            </Tooltip>
          )}
        </div>

        {collapsed && (
          <Tooltip content={t('header.expand')} position="right">
            <Button
              className="app-expand-fab"
              type="text"
              shape="circle"
              size="mini"
              aria-label={t('header.expand')}
              icon={<IconMenuUnfold />}
              onClick={() => setCollapsed(false)}
            />
          </Tooltip>
        )}

        <Menu
          className="app-menu"
          mode="vertical"
          collapse={collapsed}
          selectedKeys={[activeKey]}
          onClickMenuItem={(key) => navigate(key)}
        >
          {NAV.map((item) => (
            <Menu.Item key={item.key}>
              {item.icon}
              <span className="app-menu-label">{t(item.label)}</span>
            </Menu.Item>
          ))}
        </Menu>

        <Dropdown trigger="click" position="tr" droplist={<NodeMenu username={session?.username} />}>
          <span className={`app-node${collapsed ? ' app-node-collapsed' : ''}`} role="button" tabIndex={0}>
            <span className="app-node-icon">
              <IconDesktop />
            </span>
            {!collapsed && (
              <>
                <span className="app-node-text">{t('header.node')}</span>
                <IconDown className="app-node-caret" />
              </>
            )}
          </span>
        </Dropdown>
      </Sider>

      <Layout className="app-body">
        <Header className="app-header">
          <div className="app-header-left">
            <div className="app-page-title">
              {current?.icon}
              <span>{current ? t(current.label) : ''}</span>
            </div>
          </div>
        </Header>

        {bannerOpen && (
          <div className="app-banner" role="status">
            <IconInfoCircle className="app-banner-icon" />
            <span className="app-banner-text">{t('banner.insecure')}</span>
            <Button type="text" size="mini" className="app-banner-action" onClick={() => navigate('/panel')}>
              {t('banner.fix')}
            </Button>
            <Tooltip content={t('banner.close')}>
              <Button
                type="text"
                size="mini"
                className="app-banner-close"
                aria-label={t('banner.close')}
                icon={<IconClose />}
                onClick={dismissBanner}
              />
            </Tooltip>
          </div>
        )}

        <Content className="app-content">
          <Outlet />
        </Content>

        <footer className="app-footer">
          <span className="app-footer-copy">{t('footer.tagline')}</span>
          <div className="app-footer-links">
            <a href={PROJECT_URL} target="_blank" rel="noreferrer">
              {t('footer.project')}
            </a>
            <a href={`${PROJECT_URL}#readme`} target="_blank" rel="noreferrer">
              {t('footer.docs')}
            </a>
            <a href={`${PROJECT_URL}/releases`} target="_blank" rel="noreferrer">
              {t('footer.version')} v{session?.version ?? ''}
            </a>
          </div>
        </footer>
      </Layout>
    </Layout>
  )
}
