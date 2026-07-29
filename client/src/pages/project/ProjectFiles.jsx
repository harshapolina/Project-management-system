import { useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useParams } from 'react-router-dom'
import { FolderOpen, Upload as UploadIcon } from 'lucide-react'
import { api, assetUrl, useAuthStore } from '../../lib/api'
import { capabilitiesForUser } from '../../lib/roles'
import {
  Button,
  EmptyState,
  FileThumbnail,
  StatusChip,
  toast,
} from '../../components/ui'
import { cn } from '../../lib/utils'

const FOLDERS = [
  { value: 'concepts', label: 'Concepts' },
  { value: 'drawings', label: 'Drawings' },
  { value: 'renders', label: '3D Renders' },
  { value: 'approvals', label: 'Approvals' },
  { value: 'site_photos', label: 'Site photos' },
]

export function ProjectFiles() {
  const { id } = useParams()
  const [folder, setFolder] = useState('drawings')
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef(null)
  const qc = useQueryClient()
  const user = useAuthStore((s) => s.user)
  const canManage = capabilitiesForUser(user).manageFiles

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
      if (fail) toast(`${fail} failed`, { type: 'error' })
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
    if (e.target.files?.length) upload.mutate(e.target.files)
    e.target.value = ''
  }
  const folderLabel = FOLDERS.find((f) => f.value === folder)?.label

  return (
    <div className="space-y-4 p-4 md:p-5">
      <input
        ref={inputRef}
        type="file"
        multiple
        className="hidden"
        onChange={onPick}
      />

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-[18px] font-semibold text-[#0f172a]">
            Drawings & files
          </h2>
          <p className="text-[13px] text-[#64748b]">
            Plans, concepts, renders, and site photos
          </p>
        </div>
        {canManage && (
          <Button onClick={openPicker} loading={upload.isPending}>
            <UploadIcon className="h-3.5 w-3.5" />
            Upload
          </Button>
        )}
      </div>

      <div className="flex flex-wrap gap-1.5">
        {FOLDERS.map((f) => (
          <button
            key={f.value}
            type="button"
            onClick={() => setFolder(f.value)}
            className={cn(
              'rounded-full px-3.5 py-1.5 text-[13px] font-semibold transition',
              folder === f.value
                ? 'bg-[#2563eb] text-white shadow-sm'
                : 'bg-white text-[#64748b] ring-1 ring-[#e2e8f0] hover:bg-[#f8fafc]',
            )}
          >
            {f.label}
          </button>
        ))}
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
          if (canManage && e.dataTransfer.files?.length) {
            upload.mutate(e.dataTransfer.files)
          }
        }}
        className={cn(
          'min-h-[280px] rounded-2xl border border-dashed bg-white p-4 shadow-sm transition',
          dragging
            ? 'border-[#2563eb] bg-[#eff6ff]'
            : 'border-[#d6e4f5]',
        )}
      >
        {isLoading ? (
          <div className="h-40 animate-pulse rounded-xl bg-[#f1f5f9]" />
        ) : files.length === 0 ? (
          <EmptyState
            icon={FolderOpen}
            title={`No files in ${folderLabel}`}
            description={
              canManage
                ? 'Drag files here or click Upload — keep drawings versioned by folder.'
                : 'No files have been shared in this folder.'
            }
            actionLabel={canManage ? 'Upload files' : undefined}
            onAction={canManage ? openPicker : undefined}
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {files.map((f) => {
              const latest = f.versions?.[f.versions.length - 1]
              return (
                <div
                  key={f._id}
                  className="overflow-hidden rounded-xl border border-[#e8eef4] bg-[#f8fafc]"
                >
                  <FileThumbnail
                    name={f.name}
                    mime={f.mime}
                    url={latest?.url}
                    version={`v${f.currentVersion || f.versions?.length || 1}`}
                    status={f.status}
                    onClick={() => {
                      if (latest?.url)
                        window.open(assetUrl(latest.url), '_blank')
                    }}
                  />
                  <div className="flex flex-wrap gap-1.5 p-3">
                    {canManage && ['draft', 'sent', 'approved', 'rejected'].map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() =>
                          updateStatus.mutate({ fileId: f._id, status: s })
                        }
                        className={cn(
                          'rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize',
                          f.status === s
                            ? 'bg-[#2563eb] text-white'
                            : 'bg-white text-[#64748b] ring-1 ring-[#e2e8f0]',
                        )}
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
        <p className="text-center text-[12px] font-medium text-[#2563eb]">
          Drop to upload into {folderLabel}
        </p>
      )}
    </div>
  )
}
