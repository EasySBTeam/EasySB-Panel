import { useState } from 'react'
import { formatDate } from '@/lib/format'
import type { NodeView, User, UserRequest } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'

/** A GB value from a byte count, rounded to one decimal. */
function bytesToGb(bytes: number): number {
  return Math.round((bytes / 1024 ** 3) * 10) / 10
}

function gbToBytes(gb: number): number {
  return Math.round(gb * 1024 ** 3)
}

/** The create/edit form for an account, shared by the list and the detail page. */
export function UserFormDialog({
  open,
  user,
  nodes,
  pending,
  onClose,
  onSubmit,
}: {
  open: boolean
  user: User | null
  nodes: NodeView[]
  pending: boolean
  onClose: () => void
  onSubmit: (body: UserRequest) => void
}) {
  const [name, setName] = useState('')
  const [remark, setRemark] = useState('')
  const [quotaGb, setQuotaGb] = useState(0)
  const [expireAt, setExpireAt] = useState('')
  const [enabled, setEnabled] = useState(true)
  const [selected, setSelected] = useState<string[]>([])

  const [initialisedFor, setInitialisedFor] = useState<string | null>(null)
  const key = user ? user.name : 'new'
  if (open && initialisedFor !== key) {
    setInitialisedFor(key)
    if (user) {
      setName(user.name)
      setRemark(user.remark ?? '')
      setQuotaGb(user.unlimited ? 0 : bytesToGb(user.quotaBytes))
      setExpireAt(user.expireAt ? formatDate(user.expireAt) : '')
      setEnabled(user.enabled)
      setSelected(user.nodes)
    } else {
      setName('')
      setRemark('')
      setQuotaGb(0)
      setExpireAt('')
      setEnabled(true)
      setSelected([])
    }
  }
  if (!open && initialisedFor !== null) {
    setInitialisedFor(null)
  }

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) onClose() }}>
      <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{user ? '编辑账号' : '新建账号'}</DialogTitle>
          <DialogDescription>流量限额留空或 0 表示不限；到期留空表示永久有效</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="user-name">账号名称</Label>
              <Input
                id="user-name"
                value={name}
                disabled={user !== null}
                onChange={(event) => setName(event.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="user-quota">流量限额 (GB)</Label>
              <Input
                id="user-quota"
                type="number"
                min={0}
                step={0.1}
                value={quotaGb || ''}
                placeholder="0 = 不限"
                onChange={(event) => setQuotaGb(Number(event.target.value))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="user-expire">到期日</Label>
              <Input
                id="user-expire"
                type="date"
                value={expireAt}
                onChange={(event) => setExpireAt(event.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="user-enabled">状态</Label>
              <div className="flex h-8 items-center gap-2">
                <Switch id="user-enabled" checked={enabled} onCheckedChange={setEnabled} />
                <span className="text-sm text-muted-foreground">{enabled ? '启用' : '停用'}</span>
              </div>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="user-remark">备注</Label>
            <Textarea
              id="user-remark"
              value={remark}
              rows={2}
              placeholder="便于对账的说明"
              onChange={(event) => setRemark(event.target.value)}
            />
          </div>

          <div className="space-y-2 rounded-lg border p-3">
            <div className="flex items-center justify-between">
              <Label>可用节点</Label>
              <span className="text-xs text-muted-foreground">
                {selected.length === 0 ? '默认选择全部已启用节点' : `已选 ${selected.length} 个`}
              </span>
            </div>
            <div className="max-h-44 space-y-1 overflow-y-auto">
              {nodes.length === 0 ? (
                <p className="text-sm text-muted-foreground">尚无节点</p>
              ) : (
                nodes.map((node) => {
                  const checked = selected.includes(node.id)
                  return (
                    <label
                      key={node.id}
                      className="flex cursor-pointer items-center gap-2 rounded-md px-1.5 py-1 hover:bg-muted"
                    >
                      <Checkbox
                        checked={checked}
                        onCheckedChange={(value) =>
                          setSelected((current) =>
                            value ? [...current, node.id] : current.filter((id) => id !== node.id),
                          )
                        }
                      />
                      <span className="text-sm">{node.name}</span>
                      <span className="font-mono text-xs text-muted-foreground">{node.port}</span>
                    </label>
                  )
                })
              )}
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose} disabled={pending}>
              取消
            </Button>
            <Button
              disabled={pending || name.trim() === ''}
              onClick={() =>
                onSubmit({
                  name: name.trim(),
                  remark,
                  quotaBytes: gbToBytes(quotaGb),
                  expireAt,
                  enabled,
                  nodes: selected,
                })
              }
            >
              保存
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
