import { useState } from 'react'
import {
  Alert,
  Button,
  Card,
  Empty,
  Message,
  Radio,
  Spin,
  Table,
  Tag,
} from '@arco-design/web-react'
import type { ColumnProps } from '@arco-design/web-react/es/Table'
import { IconRefresh, IconThunderbolt } from '@arco-design/web-react/icon'
import { api, ApiError } from '../api/client'
import type { ToolResult, ToolboxView } from '../api/types'
import { useLoad } from '../hooks'
import { useI18n, type DictKey } from '../i18n'
import { formatDate } from '../format'

type Report = { id: string; when: string; result: ToolResult; error?: string }

// The toolbox page reads the registry the Go side publishes and runs one tool at a
// time. A run can take minutes, so the page disables the button and shows the run
// that is in flight; the result replaces the board entry once it lands.
export default function Toolbox() {
  const { t } = useI18n()
  const { data, loading, error, reload } = useLoad(() => api.get<ToolboxView>('/toolbox'))
  const [group, setGroup] = useState('all')
  const [running, setRunning] = useState('')
  const [report, setReport] = useState<Report | null>(null)

  const name = (id: string) => t(`toolbox.name.${id}` as DictKey)
  const desc = (id: string) => t(`toolbox.desc.${id}` as DictKey)
  const groupName = (id: string) => t(`toolbox.group.${id}` as DictKey)

  const groups = data?.groups ?? []
  const tools = (data?.tools ?? []).filter((tool) => group === 'all' || tool.group === group)
  const board = data?.board ?? {}

  const run = async (id: string) => {
    setRunning(id)
    setReport(null)
    try {
      const result = await api.post<ToolResult>(`/toolbox/${id}/run`)
      setReport({ id, when: new Date().toISOString(), result })
      reload()
    } catch (err) {
      const message = err instanceof ApiError ? err.message : t('toolbox.failed')
      setReport({ id, when: new Date().toISOString(), result: { notes: [message] }, error: message })
      reload()
      Message.error(message)
    } finally {
      setRunning('')
    }
  }

  const show = (id: string) => {
    const record = board[id]
    if (record) {
      setReport({ id, when: record.when, result: record.result, error: record.error })
    } else {
      setReport(null)
    }
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h2>{t('toolbox.title')}</h2>
          <span className="muted">{t('toolbox.subtitle')}</span>
        </div>
        <Button icon={<IconRefresh />} onClick={reload} loading={loading}>
          {t('common.refresh')}
        </Button>
      </div>

      {error && <Alert type="error" content={t('toolbox.cannotLoad')} style={{ marginBottom: 16 }} />}

      {loading && !data ? (
        <div className="center-block">
          <Spin />
        </div>
      ) : data ? (
        <>
          <Radio.Group
            className="toolbox-groups"
            type="button"
            value={group}
            onChange={(value) => {
              setGroup(String(value))
              setReport(null)
            }}
          >
            <Radio value="all">{t('toolbox.board')}</Radio>
            {groups.map((id) => (
              <Radio key={id} value={id}>
                {groupName(id)}
              </Radio>
            ))}
          </Radio.Group>

          <div className="toolbox-grid">
            {tools.map((tool) => {
              const record = board[tool.id]
              return (
                <Card key={tool.id} className="panel-card toolbox-card" bordered={false}>
                  <div className="toolbox-card-head">
                    <div>
                      <div className="toolbox-card-name">{name(tool.id)}</div>
                      <div className="muted">{desc(tool.id)}</div>
                    </div>
                    <div className="toolbox-card-actions">
                      {record && (
                        <Button size="mini" onClick={() => show(tool.id)}>
                          {t('toolbox.board')}
                        </Button>
                      )}
                      <Button
                        size="mini"
                        type="primary"
                        icon={<IconThunderbolt />}
                        loading={running === tool.id}
                        onClick={() => run(tool.id)}
                      >
                        {record ? t('toolbox.rerun') : t('toolbox.run')}
                      </Button>
                    </div>
                  </div>
                  <div className="toolbox-card-board">
                    {record ? (
                      <>
                        <Tag color={record.error ? 'red' : 'green'}>
                          {record.error ? t('toolbox.failed') : record.result.board || record.result.summary || t('toolbox.rows', { n: record.result.rows?.length ?? 0 })}
                        </Tag>
                        <span className="muted">
                          {t('toolbox.lastRun')} · {formatDate(record.when)}
                        </span>
                      </>
                    ) : (
                      <span className="muted">{t('toolbox.never')}</span>
                    )}
                  </div>
                </Card>
              )
            })}
          </div>

          <ToolReport report={report} name={name} />
        </>
      ) : null}
    </div>
  )
}

// ToolReport draws one run: the summary line, the table (or a label/value list when the
// tool reports one value per row) and the notes that explain what a number means.
function ToolReport({
  report,
  name,
}: {
  report: Report | null
  name: (id: string) => string
}) {
  const { t } = useI18n()
  if (!report) {
    return (
      <Card className="panel-card toolbox-report" bordered={false}>
        <Empty description={t('toolbox.empty')} />
      </Card>
    )
  }

  const { result } = report
  const headers = result.headers ?? []
  const rows = result.rows ?? []
  const columns: ColumnProps[] = headers.length
    ? headers.map((header, index) => ({ title: header, dataIndex: String(index) }))
    : [
        { title: t('toolbox.summary'), dataIndex: 'label' },
        { title: '', dataIndex: 'value' },
      ]
  const tableData = headers.length
    ? rows.map((cells) => Object.fromEntries(cells.map((cell, index) => [String(index), cell])))
    : rows.map((cells) => ({ label: cells[0], value: cells[1] }))

  return (
    <Card
      className="panel-card toolbox-report"
      bordered={false}
      title={`${name(report.id)} · ${formatDate(report.when)}`}
    >
      {report.error && <Alert type="error" content={report.error} style={{ marginBottom: 12 }} />}
      {result.summary && <div className="toolbox-summary">{result.summary}</div>}
      {rows.length > 0 && (
        <Table
          className="table-card"
          columns={columns}
          data={tableData}
          pagination={false}
          size="small"
          border={{ wrapper: true, cell: true }}
          scroll={{ y: 420 }}
        />
      )}
      {result.notes && result.notes.length > 0 && (
        <div className="toolbox-notes">
          <div className="toolbox-notes-title">{t('toolbox.notes')}</div>
          <ul>
            {result.notes.map((note, index) => (
              <li key={index}>{note}</li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  )
}
