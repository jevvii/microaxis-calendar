import { Paperclip } from '@phosphor-icons/react'
import { useRef, useState } from 'react'
import { validateAttachmentFile } from '../../lib/attachments'
import { Button } from '../ui/Button'

export function AttachmentUploader({
  onUpload,
  uploading = false,
  disabled = false,
}: {
  onUpload: (file: File) => void
  uploading?: boolean
  disabled?: boolean
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [error, setError] = useState<string | null>(null)

  function selectFile(file: File | undefined) {
    if (!file) return
    const validationError = validateAttachmentFile(file)
    if (validationError) {
      setError(validationError)
      return
    }
    setError(null)
    onUpload(file)
  }

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        className="sr-only"
        accept="image/jpeg,image/png,image/webp,image/gif,application/pdf,.docx,.xlsx,.txt,.csv"
        aria-label="Choose attachment"
        onChange={(event) => {
          selectFile(event.target.files?.[0])
          event.target.value = ''
        }}
      />
      <Button
        variant="secondary"
        size="sm"
        loading={uploading}
        leadingIcon={<Paperclip size={14} aria-hidden />}
        disabled={disabled}
        onClick={() => inputRef.current?.click()}
      >
        Attach file
      </Button>
      <p className="mt-1 font-mono text-[9px] text-ink-3">Images, PDF, DOCX, XLSX, TXT · 10 MB max</p>
      {error ? (
        <p role="alert" className="mt-1 text-xs text-danger">
          {error}
        </p>
      ) : null}
    </div>
  )
}
