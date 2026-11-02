import { DownloadSimple, Warning } from '@phosphor-icons/react'
import { useState } from 'react'
import type { Workspace } from '../../types/domain'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'

export function DangerZone({
  workspace,
  onExport,
  onDelete,
  saving = false,
}: {
  workspace: Workspace
  onExport: () => void
  onDelete: (confirmationName: string) => void
  saving?: boolean
}) {
  const [confirmation, setConfirmation] = useState('')
  const [confirming, setConfirming] = useState(false)

  return (
    <div className="grid gap-5">
      <div>
        <h3 className="text-sm font-semibold">Export workspace</h3>
        <p className="mt-1 text-sm leading-6 text-ink-3">
          Download workspace settings, teams, calendars, categories, members, and events as JSON.
          Google tokens are never included.
        </p>
        <Button
          variant="secondary"
          size="sm"
          className="mt-3"
          leadingIcon={<DownloadSimple size={14} aria-hidden />}
          onClick={onExport}
        >
          Export workspace JSON
        </Button>
      </div>

      <div className="rounded-panel border border-danger/25 bg-danger-wash p-4">
        <div className="flex items-start gap-2.5">
          <Warning size={16} className="mt-0.5 shrink-0 text-danger" aria-hidden />
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-semibold text-danger">Delete this workspace</h3>
            <p className="mt-1 text-xs leading-5 text-danger/85">
              The workspace is hidden immediately and purged after 30 days. Export anything you
              need first.
            </p>
            {confirming ? (
              <div className="mt-3 grid gap-2 sm:max-w-sm">
                <label htmlFor="workspace-delete-confirmation" className="text-xs font-medium text-danger">
                  Type “{workspace.name}” to confirm
                </label>
                <Input
                  id="workspace-delete-confirmation"
                  value={confirmation}
                  onChange={(event) => setConfirmation(event.target.value)}
                  placeholder={workspace.name}
                />
                <div className="flex gap-2">
                  <Button
                    variant="danger"
                    size="sm"
                    loading={saving}
                    disabled={confirmation !== workspace.name}
                    onClick={() => onDelete(confirmation)}
                  >
                    Delete workspace
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setConfirming(false)}>
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <Button
                variant="danger"
                size="sm"
                className="mt-3"
                onClick={() => setConfirming(true)}
              >
                Delete workspace
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
