import { useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useParams } from 'react-router-dom'
import {
  Eye,
  EyeOff,
  FolderOpen,
  Pencil,
  Trash2,
  Upload as UploadIcon,
} from 'lucide-react'
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
import {
  PILL_ACTIVE,
  PILL_IDLE,
  PILL_TRACK,
} from '../../components/layout/PageToolbar'

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
  const [editing, setEditing] = useState(null)
  const qc = useQueryClient()
  const user = useAuthStore((s) => s.user)
  const tenant = useAuthStore((s) => s.tenant)
  const canManage = capabilitiesForUser(user, tenant).manageFiles

  const { data, isLoading } = useQuery({
    queryKey: ['files', id, folder],
    queryFn: () => api(`/files?projectId=${id}&folder=${folder}`),
  })

/**
 * Serverless functions cap the request body at 4.5 MB, so a larger file fails
 * at the platform before any of our code runs — the person just sees a generic
 * failure. Catch it here and say so plainly.
 */
const MAX_UPLOAD_BYTES = 4 * 1024 * 1024
const mb = (bytes) => (bytes / (1024 * 1024)).toFixed(1)

  const upload = useMutation({
    mutationFn: async (fileList) => {
      const files = Array.from(fileList || [])
      if (!files.length) return { ok: 0, fail: 0 }
      let ok = 0
      // Keep why each file failed — "1 failed" with no reason leaves the person
      // holding a rejected drawing with nothing to act on.
      const failures = []
      for (const file of files) {
        if (file.size > MAX_UPLOAD_BYTES) {
          failures.push({
            name: file.name,
            reason: `${mb(file.size)} MB — too large. The hosting limit is ${mb(MAX_UPLOAD_BYTES)} MB per file.`,
          })
          continue
        }
        try {
          const fd = new FormData()
          fd.append('file', file)
          fd.append('projectId', id)
          fd.append('folder', folder)
          fd.append('name', file.name)
          await api('/files', { method: 'POST', body: fd })
          ok += 1
        } catch (err) {
          failures.push({
            name: file.name,
            reason: err?.message || 'Upload failed',
          })
        }
      }
      return { ok, failures }
    },
    onSuccess: ({ ok, failures }) => {
      qc.invalidateQueries({ queryKey: ['files', id] })
      if (ok) toast(`${ok} file${ok > 1 ? 's' : ''} uploaded`, { type: 'success' })
      for (const f of failures) {
        toast(`${f.name} — ${f.reason}`, { type: 'error' })
      }
    },
    onError: (e) => toast(e.message, { type: 'error' }),
  })

  const renameFile = useMutation({
    mutationFn: ({ fileId, ...body }) =>
      api(`/files/${fileId}`, { method: 'PATCH', body: JSON.stringify(body) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['files', id] })
      setEditing(null)
      toast('File updated', { type: 'success' })
    },
    onError: (e) => toast(e.message, { type: 'error' }),
  })

  const removeFile = useMutation({
    mutationFn: (fileId) => api(`/files/${fileId}`, { method: 'DELETE' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['files', id] })
      toast('File deleted', { type: 'success' })
    },
    onError: (e) => toast(e.message, { type: 'error' }),
  })

  const files = data?.files || []
  const openPicker = () => inputRef.current?.click()
  const onPick = (e) => {
    if (e.target.files?.length) upload.mutate(e.target.files)
    e.target.value = ''
  }
  const folderLabel = FOLDERS.find((f) => f.value === folder)?.label

  return (
    <div className="space-y-4 min-h-full bg-[var(--bg-canvas)] p-4 md:p-5 lg:p-6">
      <input
        ref={inputRef}
        type="file"
        multiple
        className="hidden"
        onChange={onPick}
      />

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-[18px] font-semibold text-primary">
            Drawings & files
          </h2>
          <p className="text-[13px] text-secondary">
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

      <div className={PILL_TRACK}>
        {FOLDERS.map((f) => (
          <button
            key={f.value}
            type="button"
            onClick={() => setFolder(f.value)}
            className={cn(
              'rounded-full px-3.5 py-1.5 text-[13px] font-semibold transition',
              folder === f.value ? PILL_ACTIVE : PILL_IDLE,
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
          'min-h-[280px] rounded-2xl border border-dashed bg-surface p-4 shadow-sm transition',
          dragging
            ? 'border-[#3ecf8e] bg-[#ecfdf5]'
            : 'border-border',
        )}
      >
        {isLoading ? (
          <div className="h-40 animate-pulse rounded-xl bg-surface-raised" />
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
                  className="overflow-hidden rounded-xl border border-border bg-surface-raised"
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
                  <div className="flex items-center gap-1.5 p-3">
                    {editing === f._id ? (
                      <form
                        className="flex w-full items-center gap-1.5"
                        onSubmit={(e) => {
                          e.preventDefault()
                          const name = new FormData(e.currentTarget)
                            .get('name')
                            ?.toString()
                            .trim()
                          if (!name) return
                          renameFile.mutate({ fileId: f._id, name })
                        }}
                      >
                        <input
                          name="name"
                          defaultValue={f.name}
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Escape') setEditing(null)
                          }}
                          className="min-w-0 flex-1 rounded-lg border border-[#c7dbfb] bg-surface px-2 py-1 text-[12px] text-primary outline-none"
                        />
                        <button
                          type="submit"
                          disabled={renameFile.isPending}
                          className="rounded-lg bg-[#3ecf8e] px-2.5 py-1 text-[11px] font-semibold text-white disabled:opacity-50"
                        >
                          Save
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditing(null)}
                          className="rounded-lg px-2 py-1 text-[11px] font-semibold text-secondary"
                        >
                          Cancel
                        </button>
                      </form>
                    ) : (
                      <>
                        {f.clientVisible && (
                          <StatusChip status="completed" label="Client visible" />
                        )}
                        {canManage && (
                          <div className="ml-auto flex items-center gap-0.5">
                            <button
                              type="button"
                              title="Rename"
                              onClick={() => setEditing(f._id)}
                              className="rounded-md p-1.5 text-secondary transition hover:bg-surface hover:text-primary"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              title={
                                f.clientVisible
                                  ? 'Hide from the client portal'
                                  : 'Show in the client portal'
                              }
                              onClick={() =>
                                renameFile.mutate({
                                  fileId: f._id,
                                  clientVisible: !f.clientVisible,
                                })
                              }
                              className="rounded-md p-1.5 text-secondary transition hover:bg-surface hover:text-primary"
                            >
                              {f.clientVisible ? (
                                <Eye className="h-3.5 w-3.5" />
                              ) : (
                                <EyeOff className="h-3.5 w-3.5" />
                              )}
                            </button>
                            <button
                              type="button"
                              title="Delete"
                              disabled={removeFile.isPending}
                              onClick={() => {
                                if (
                                  !window.confirm(
                                    `Delete ${f.name}?

All ${f.versions?.length || 1} version(s) go with it. This cannot be undone.`,
                                  )
                                )
                                  return
                                removeFile.mutate(f._id)
                              }}
                              className="rounded-md p-1.5 text-secondary transition hover:bg-red-50 hover:text-red-600 disabled:opacity-40"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {dragging && (
        <p className="text-center text-[12px] font-medium text-[#3ecf8e]">
          Drop to upload into {folderLabel}
        </p>
      )}
    </div>
  )
}
