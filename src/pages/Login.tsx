import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Alert, Button, Checkbox, Dropdown, Form, Input, Menu, Modal } from '@arco-design/web-react'
import {
  IconCloud,
  IconLanguage,
  IconLock,
  IconPublic,
  IconThunderbolt,
  IconUser,
} from '@arco-design/web-react/icon'
import { useAuth } from '../auth'
import { useI18n, type Lang } from '../i18n'
import { ApiError } from '../api/client'
import Logo from '../components/Logo'

interface LoginValues {
  username: string
  password: string
}

export default function Login() {
  const { login } = useAuth()
  const { t, lang, setLang } = useI18n()
  const navigate = useNavigate()
  const [form] = Form.useForm<LoginValues>()
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [agreed, setAgreed] = useState(true)
  const [licenseOpen, setLicenseOpen] = useState(false)

  const onFinish = async (values: LoginValues) => {
    if (!agreed) {
      setError(t('login.licenseRequired'))
      return
    }
    setBusy(true)
    setError('')
    try {
      await login(values.username, values.password)
      navigate('/', { replace: true })
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('login.failed'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <aside className="login-brand">
          <div className="login-brand-art" aria-hidden>
            <span className="ring-a" />
            <span className="ring-b" />
            <span className="blob blob-a" />
            <span className="blob blob-b" />
            <span className="grid-dots" />
          </div>

          <div className="login-brand-head">
            <span className="login-brand-mark">
              <Logo size={26} />
            </span>
            <span>{t('app.title')}</span>
          </div>

          <div className="login-brand-body">
            <h1>{t('login.brandTitle')}</h1>
            <p>{t('login.brandDesc')}</p>
            <ul className="login-brand-list">
              <li>
                <IconThunderbolt /> {t('login.brand1')}
              </li>
              <li>
                <IconCloud /> {t('login.brand2')}
              </li>
              <li>
                <IconPublic /> {t('login.brand3')}
              </li>
            </ul>
          </div>
        </aside>

        <section className="login-form">
          <div className="login-form-head">
            <h3>{t('login.title')}</h3>
            <Dropdown
              trigger="click"
              position="br"
              droplist={
                <Menu selectedKeys={[lang]} onClickMenuItem={(key) => setLang(key as Lang)}>
                  <Menu.Item key="zh">简体中文</Menu.Item>
                  <Menu.Item key="en">English</Menu.Item>
                </Menu>
              }
            >
              <Button type="text" size="small" icon={<IconLanguage />}>
                {lang === 'zh' ? '简体中文' : 'English'}
              </Button>
            </Dropdown>
          </div>

          <p className="login-form-sub">{t('login.subtitle')}</p>

          {error && <Alert type="error" content={error} style={{ marginBottom: 16 }} />}

          <Form
            form={form}
            layout="vertical"
            size="large"
            requiredSymbol={false}
            initialValues={{ username: 'admin' }}
            onSubmit={onFinish}
          >
            <Form.Item
              field="username"
              label={t('login.username')}
              rules={[{ required: true, message: t('login.usernameRequired') }]}
            >
              <Input prefix={<IconUser />} placeholder={t('login.usernamePlaceholder')} autoComplete="username" />
            </Form.Item>
            <Form.Item
              field="password"
              label={t('login.password')}
              rules={[{ required: true, message: t('login.passwordRequired') }]}
            >
              <Input.Password
                prefix={<IconLock />}
                placeholder={t('login.passwordPlaceholder')}
                autoComplete="current-password"
              />
            </Form.Item>
            <Button className="login-submit" type="primary" htmlType="submit" long loading={busy}>
              {t('login.signIn')}
            </Button>
          </Form>

          <div className="login-license">
            <Checkbox checked={agreed} onChange={setAgreed} />
            <span>
              {t('login.license')}{' '}
              <a
                onClick={(event) => {
                  event.preventDefault()
                  setLicenseOpen(true)
                }}
                href="#license"
              >
                {t('login.licenseLink')}
              </a>
            </span>
          </div>
        </section>
      </div>

      <Modal
        title={t('login.licenseTitle')}
        visible={licenseOpen}
        onCancel={() => setLicenseOpen(false)}
        footer={<Button onClick={() => setLicenseOpen(false)}>{t('common.save')}</Button>}
        autoFocus={false}
        style={{ width: 520 }}
      >
        <p className="license-body">
          {t('login.licenseBody')}{' '}
          <a href="https://www.gnu.org/licenses/gpl-3.0.html" target="_blank" rel="noreferrer">
            {t('login.licenseMore')}
          </a>
        </p>
      </Modal>
    </div>
  )
}
