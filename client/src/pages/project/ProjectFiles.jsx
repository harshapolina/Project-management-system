import { useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useParams } from 'react-router-dom'
import { FolderOpen, Upload as UploadIcon } from 'lucide-react'
import { api, assetUrl } from '../../lib/api'
import {
  Button,
  EmptyState,
  FileThumbnail,
  StatusChip,
  Tabs,
  toast,
} from '../../components/ui'
import { cn } from '../../lib/utils'

const FOLDERS = [
  { value: 'concepts', label: 'Concepts' },
  { value: 'drawings', label: 'Drawings' },
  { value: 'renders', label: '3D Renders' },
  { value: 'approvals', label: 'Approvals' },
  { value: 'site_photos', label: 'Site Photos' },
]

export function ProjectFiles() {
  const { id } = useParams()
  const [folder, setFolder] = useState('concepts')
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef(null)
  const qc = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['files', id, folder],
    queryFn: () => api(`/files?projectId=${id}&folder=${folder}`),
  })

  const upload = useMutation({
    mutationFn: async (fileList) => {
      const files = Array.from(fileList || [])
      if (!files.length) return { ok: 0, fail: 0 }

      let ok = 0
      let fail = 0
      for (const file of files) {
        try {
          const fd = new FormData()
          fd.append('file', file)
          fd.append('projectId', id)
          fd.append('folder', folder)
          fd.append('name', file.name)
          await api('/files', { method: 'POST', body: fd })
          ok += 1
        } catch {
          fail += 1
        }
      }
      return { ok, fail }
    },
    onSuccess: ({ ok, fail }) => {
      qc.invalidateQueries({ queryKey: ['files', id] })
      if (ok) toast(`${ok} file${ok > 1 ? 's' : ''} uploaded`, { type: 'success' })
      if (fail) toast(`${fail} file${fail > 1 ? 's' : ''} failed`, { type: 'error' })
    },
    onError: (e) => toast(e.message, { type: 'error' }),
  })

  const updateStatus = useMutation({
    mutationFn: ({ fileId, status }) =>
      api(`/files/${fileId}`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['files', id] }),
  })

  const files = data?.files || []
  const openPicker = () => inputRef.current?.click()

  const onPick = (e) => {
    const list = e.target.files
    if (list?.length) upload.mutate(list)
    e.target.value = ''
  }

  return (
    <div className="space-y-4">
      <input
        ref={inputRef}
        type="file"
        multiple
        className="hidden"
        onChange={onPick}
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Tabs
          value={folder}
          onChange={setFolder}
          tabs={FOLDERS.map((f) => ({ value: f.value, label: f.label }))}
        />
        <Button size="sm" onClick={openPicker} loading={upload.isPending}>
          <UploadIcon className="h-3.5 w-3.5" />
          Upload file
        </Button>
      </div>

      <div
        onDragEnter={(e) => {
          e.preventDefault()
          setDragging(true)
        }}
        onDragOver={(e) => {
          e.preventDefault()
          setDragging(true)
        }}
        onDragLeave={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget)) setDragging(false)
        }}
        onDrop={(e) => {
          e.preventDefault()
          setDragging(false)
          if (e.dataTransfer.files?.length) upload.mutate(e.dataTransfer.files)
        }}
        className={cn(
          'rounded-xl border border-dashed transition-colors',
          dragging
            ? 'border-accent bg-accent/5'
            : 'border-transparent',
        )}
      >
        {isLoading ? (
          <div className="h-40 animate-pulse rounded-xl bg-[#1c1c1e]" />
        ) : files.length === 0 ? (
          <EmptyState
            icon={FolderOpen}
            title="This folder is empty"
            description="Upload concepts, drawings, or site photos from your computer to start the version trail."
            actionLabel="Upload"
            onAction={openPicker}
          />
        ) : (
          <div className="grid gap-4 p-1 sm:grid-cols-2 xl:grid-cols-3">
            {files.map((f) => {
              const latest = f.versions?.[f.versions.length - 1]
              return (
                <div key={f._id} className="space-y-2">
                  <FileThumbnail
                    name={f.name}
                    mime={f.mime}
                    url={latest?.url}
                    version={`v${f.currentVersion || f.versions?.length || 1}`}
                    status={f.status}
                    onClick={() => {
                      if (latest?.url) window.open(assetUrl(latest.url), '_blank')
                    }}
                  />
                  <div className="flex flex-wrap gap-1">
                    {['draft', 'sent', 'approved', 'rejected'].map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() =>
                          updateStatus.mutate({ fileId: f._id, status: s })
                        }
                        className="text-[10px] text-secondary hover:text-accent"
                      >
                        {s}
                      </button>
                    ))}
                    {f.clientVisible && (
                      <StatusChip status="completed" label="Client visible" />
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {dragging && (
        <p className="text-center text-[12px] text-accent">
          Drop files to upload into {FOLDERS.find((f) => f.value === folder)?.label}
        </p>
      )}
    </div>
  )
}
