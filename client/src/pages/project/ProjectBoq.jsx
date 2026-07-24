import { useEffect, useMemo, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useOutletContext, useParams } from 'react-router-dom'
import {
  Check,
  Copy,
  FileSpreadsheet,
  Plus,
  Printer,
  Save,
  Send,
  Trash2,
  Unlock,
} from 'lucide-react'
import { api } from '../../lib/api'
import { formatInr } from '../../lib/format'
import { Button, StatusChip, toast } from '../../components/ui'
import { cn } from '../../lib/utils'

const UNITS = ['nos', 'sft', 'rft', 'sqm', 'rmt', 'set', 'kg', 'ls']
const ROOM_SUGGESTIONS = [
  'General',
  'Living',
  'Bedroom',
  'Kitchen',
  'Bathroom',
  'Dining',
  'Lobby',
  'Balcony',
  'Office',
  'Corridor',
]

function blankLine(room = 'General') {
  return {
    _key: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    description: '',
    unit: 'nos',
    qty: 1,
    rate: 0,
    amount: 0,
    room,
  }
}

function normalizeItems(items = []) {
  return items.map((it, i) => ({
    _key: it._id || it._key || `row-${i}`,
    description: it.description || '',
    unit: it.unit || 'nos',
    qty: Number(it.qty) || 0,
    rate: Number(it.rate) || 0,
    amount: Number(it.amount) || (Number(it.qty) || 0) * (Number(it.rate) || 0),
    room: it.room || 'General',
  }))
}

function lineAmount(it) {
  return (Number(it.qty) || 0) * (Number(it.rate) || 0)
}

export function ProjectBoq() {
  const { id } = useParams()
  const { project } = useOutletContext() || {}
  const qc = useQueryClient()
  const tableRef = useRef(null)

  const { data, isLoading } = useQuery({
    queryKey: ['quotations', id],
    queryFn: () => api(`/quotations?projectId=${id}`),
  })

  const quotation = data?.quotations?.[0]
  const [title, setTitle] = useState('Project BOQ')
  const [versionLabel, setVersionLabel] = useState('Standard')
  const [items, setItems] = useState([blankLine()])
  const [discount, setDiscount] = useState(0)
  const [gst, setGst] = useState(18)
  const [dirty, setDirty] = useState(false)
  const [focusIdx, setFocusIdx] = useState(null)
  const hydrated = useRef(false)

  useEffect(() => {
    hydrated.current = false
  }, [id, quotation?._id])

  useEffect(() => {
    if (hydrated.current) return
    if (quotation) {
      setTitle(quotation.title || 'Project BOQ')
      setVersionLabel(quotation.versionLabel || 'Standard')
      setItems(
        quotation.items?.length
          ? normalizeItems(quotation.items)
          : [blankLine()],
      )
      setDiscount(quotation.discount || 0)
      setGst(quotation.gstPercent ?? 18)
      setDirty(false)
      hydrated.current = true
    } else if (data && !quotation) {
      setTitle(`${project?.name || 'Project'} — BOQ`)
      setVersionLabel('Standard')
      setItems([blankLine(), blankLine(), blankLine()])
      setDiscount(0)
      setGst(18)
      setDirty(false)
      hydrated.current = true
    }
  }, [data, quotation, project?.name])

  const locked = quotation?.status === 'approved'

  const subtotal = useMemo(
    () => items.reduce((s, i) => s + lineAmount(i), 0),
    [items],
  )
  const gstAmount = (subtotal * (Number(gst) || 0)) / 100
  const grand = Math.max(0, subtotal + gstAmount - (Number(discount) || 0))

  const byRoom = useMemo(() => {
    const map = {}
    for (const it of items) {
      const room = it.room?.trim() || 'General'
      map[room] = (map[room] || 0) + lineAmount(it)
    }
    return Object.entries(map).sort((a, b) => b[1] - a[1])
  }, [items])

  const markDirty = () => {
    if (!locked) setDirty(true)
  }

  const updateItem = (idx, key, value) => {
    if (locked) return
    markDirty()
    setItems((prev) =>
      prev.map((it, i) => {
        if (i !== idx) return it
        const next = { ...it, [key]: value }
        next.amount = lineAmount(next)
        return next
      }),
    )
  }

  const addLine = (afterIdx, room) => {
    if (locked) return
    markDirty()
    setItems((prev) => {
      const next = [...prev]
      const insertAt = afterIdx == null ? next.length : afterIdx + 1
      const r = room || next[afterIdx]?.room || 'General'
      next.splice(insertAt, 0, blankLine(r))
      return next
    })
    setFocusIdx(afterIdx == null ? items.length : afterIdx + 1)
  }

  const removeLine = (idx) => {
    if (locked) return
    markDirty()
    setItems((prev) => {
      if (prev.length <= 1) return [blankLine()]
      return prev.filter((_, i) => i !== idx)
    })
  }

  const duplicateLine = (idx) => {
    if (locked) return
    markDirty()
    setItems((prev) => {
      const copy = {
        ...prev[idx],
        _key: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      }
      const next = [...prev]
      next.splice(idx + 1, 0, copy)
      return next
    })
  }

  const payload = (extra = {}) => ({
    title: title.trim() || 'Project BOQ',
    versionLabel: versionLabel.trim() || 'Standard',
    items: items.map(({ _key, ...i }) => ({
      ...i,
      qty: Number(i.qty) || 0,
      rate: Number(i.rate) || 0,
      amount: lineAmount(i),
      room: i.room?.trim() || 'General',
      description: i.description?.trim() || '',
      unit: i.unit || 'nos',
    })),
    gstPercent: Number(gst) || 0,
    discount: Number(discount) || 0,
    subtotal,
    grandTotal: grand,
    ...extra,
  })

  const save = useMutation({
    mutationFn: (body) => {
      if (quotation?._id) {
        return api(`/quotations/${quotation._id}`, {
          method: 'PATCH',
          body: JSON.stringify(body),
        })
      }
      return api('/quotations', {
        method: 'POST',
        body: JSON.stringify({ ...body, projectId: id }),
      })
    },
    onSuccess: (res, vars) => {
      hydrated.current = false
      qc.invalidateQueries({ queryKey: ['quotations', id] })
      qc.invalidateQueries({ queryKey: ['project', id] })
      setDirty(false)
      const status = vars?.status
      if (status === 'sent') toast('BOQ marked as sent', { type: 'success' })
      else if (status === 'approved')
        toast('BOQ approved — project budget updated', { type: 'success' })
      else if (status === 'draft') toast('BOQ reopened as draft', { type: 'success' })
      else toast('BOQ saved', { type: 'success' })
    },
    onError: (e) => toast(e.message, { type: 'error' }),
  })

  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {
        e.preventDefault()
        if (!locked && !save.isPending) save.mutate(payload())
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- save latest form snapshot on hotkey
  }, [locked, save.isPending, title, versionLabel, items, gst, discount, subtotal, grand, quotation?._id])

  useEffect(() => {
    if (focusIdx == null) return
    const row = tableRef.current?.querySelector(`[data-row="${focusIdx}"]`)
    const input = row?.querySelector('input[data-field="description"]')
    input?.focus()
    setFocusIdx(null)
  }, [focusIdx, items.length])

  if (isLoading) {
    return <div className="m-4 h-64 animate-pulse rounded-xl bg-[#1c1c1e]" />
  }

  const status = quotation?.status || 'draft'

  return (
    <div className="flex h-full min-h-0 flex-col gap-4 p-4 lg:flex-row">
      {/* Spreadsheet document */}
      <div className="min-w-0 flex-1 overflow-hidden rounded-xl border border-[#2e2e32] bg-[#f7f7f5] text-[#111]">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-zinc-200 px-4 py-3">
          <div className="min-w-0 flex-1 space-y-1">
            <input
              value={title}
              disabled={locked}
              onChange={(e) => {
                markDirty()
                setTitle(e.target.value)
              }}
              className="w-full bg-transparent text-[18px] font-semibold outline-none placeholder:text-zinc-400 disabled:opacity-70"
              placeholder="BOQ title"
            />
            <div className="flex flex-wrap items-center gap-2 text-[12px] text-zinc-500">
              <span>{project?.name || 'Project'}</span>
              <span>·</span>
              <input
                value={versionLabel}
                disabled={locked}
                onChange={(e) => {
                  markDirty()
                  setVersionLabel(e.target.value)
                }}
                className="w-28 rounded-md border border-zinc-200 bg-white px-1.5 py-0.5 text-[12px] outline-none disabled:opacity-70"
                placeholder="Version"
              />
              <StatusChip status={status} />
              {dirty && !locked && (
                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-800">
                  Unsaved changes
                </span>
              )}
              {locked && (
                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-medium text-emerald-800">
                  Locked — approved
                </span>
              )}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              disabled={locked}
              onClick={() => addLine()}
              className="inline-flex h-8 items-center gap-1 rounded-lg border border-zinc-200 bg-white px-2.5 text-[12px] font-medium hover:bg-zinc-50 disabled:opacity-40"
            >
              <Plus className="h-3.5 w-3.5" />
              Add line
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex h-8 items-center gap-1 rounded-lg border border-zinc-200 bg-white px-2.5 text-[12px] font-medium hover:bg-zinc-50"
            >
              <Printer className="h-3.5 w-3.5" />
              Print
            </button>
          </div>
        </div>

        <div className="max-h-[calc(100vh-220px)] overflow-auto" ref={tableRef}>
          <table className="w-full min-w-[760px] border-collapse text-[13px]">
            <thead className="sticky top-0 z-10 bg-[#ecece8] text-[11px] uppercase tracking-wide text-zinc-500">
              <tr>
                <th className="w-10 px-2 py-2 text-left font-medium">#</th>
                <th className="w-28 px-2 py-2 text-left font-medium">Room</th>
                <th className="px-2 py-2 text-left font-medium">Description</th>
                <th className="w-20 px-2 py-2 text-left font-medium">Unit</th>
                <th className="w-24 px-2 py-2 text-right font-medium">Qty</th>
                <th className="w-28 px-2 py-2 text-right font-medium">Rate (₹)</th>
                <th className="w-28 px-2 py-2 text-right font-medium">Amount</th>
                <th className="w-20 px-2 py-2" />
              </tr>
            </thead>
            <tbody>
              {items.map((it, idx) => (
                <tr
                  key={it._key}
                  data-row={idx}
                  className="border-b border-zinc-200/80 hover:bg-white/70"
                >
                  <td className="px-2 py-1.5 text-zinc-400 tabular-nums">
                    {idx + 1}
                  </td>
                  <td className="px-2 py-1.5">
                    <input
                      list="boq-rooms"
                      disabled={locked}
                      value={it.room || ''}
                      onChange={(e) => updateItem(idx, 'room', e.target.value)}
                      className="w-full rounded-md border border-zinc-200 bg-white px-2 py-1.5 outline-none focus:border-zinc-400 disabled:bg-zinc-50"
                    />
                  </td>
                  <td className="px-2 py-1.5">
                    <input
                      data-field="description"
                      disabled={locked}
                      value={it.description || ''}
                      placeholder="Item / work description"
                      onChange={(e) =>
                        updateItem(idx, 'description', e.target.value)
                      }
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          addLine(idx)
                        }
                      }}
                      className="w-full rounded-md border border-zinc-200 bg-white px-2 py-1.5 outline-none focus:border-zinc-400 disabled:bg-zinc-50"
                    />
                  </td>
                  <td className="px-2 py-1.5">
                    <select
                      disabled={locked}
                      value={it.unit || 'nos'}
                      onChange={(e) => updateItem(idx, 'unit', e.target.value)}
                      className="w-full rounded-md border border-zinc-200 bg-white px-1.5 py-1.5 outline-none disabled:bg-zinc-50"
                    >
                      {UNITS.map((u) => (
                        <option key={u} value={u}>
                          {u}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-2 py-1.5">
                    <input
                      type="number"
                      min="0"
                      step="any"
                      disabled={locked}
                      value={it.qty}
                      onChange={(e) => updateItem(idx, 'qty', e.target.value)}
                      className="w-full rounded-md border border-zinc-200 bg-white px-2 py-1.5 text-right tabular-nums outline-none focus:border-zinc-400 disabled:bg-zinc-50"
                    />
                  </td>
                  <td className="px-2 py-1.5">
                    <input
                      type="number"
                      min="0"
                      step="any"
                      disabled={locked}
                      value={it.rate}
                      onChange={(e) => updateItem(idx, 'rate', e.target.value)}
                      className="w-full rounded-md border border-zinc-200 bg-white px-2 py-1.5 text-right tabular-nums outline-none focus:border-zinc-400 disabled:bg-zinc-50"
                    />
                  </td>
                  <td className="px-2 py-1.5 text-right font-medium tabular-nums">
                    {formatInr(lineAmount(it))}
                  </td>
                  <td className="px-1 py-1.5">
                    <div className="flex justify-end gap-0.5 opacity-60 hover:opacity-100">
                      <button
                        type="button"
                        title="Duplicate"
                        disabled={locked}
                        onClick={() => duplicateLine(idx)}
                        className="rounded p-1 text-zinc-500 hover:bg-zinc-200 disabled:opacity-30"
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        title="Delete line"
                        disabled={locked}
                        onClick={() => removeLine(idx)}
                        className="rounded p-1 text-zinc-500 hover:bg-red-50 hover:text-red-600 disabled:opacity-30"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <datalist id="boq-rooms">
            {ROOM_SUGGESTIONS.map((r) => (
              <option key={r} value={r} />
            ))}
          </datalist>

          {!locked && (
            <button
              type="button"
              onClick={() => addLine()}
              className="flex w-full items-center gap-2 px-4 py-3 text-left text-[13px] text-zinc-500 hover:bg-white hover:text-zinc-800"
            >
              <Plus className="h-4 w-4" />
              Add another line · press Enter in description to add quickly
            </button>
          )}
        </div>
      </div>

      {/* Totals + workflow */}
      <aside className="flex w-full shrink-0 flex-col gap-3 lg:w-[300px]">
        <div className="rounded-xl border border-[#2e2e32] bg-[#1c1c1e] p-4">
          <div className="mb-3 flex items-center gap-2">
            <FileSpreadsheet className="h-4 w-4 text-accent" />
            <h3 className="text-[13px] font-semibold text-white">Totals</h3>
          </div>

          <div className="space-y-2 text-[13px]">
            <Row label="Subtotal" value={formatInr(subtotal)} />
            <div className="flex items-center justify-between gap-3">
              <label className="text-[#8b8b90]">GST %</label>
              <input
                type="number"
                min="0"
                disabled={locked}
                value={gst}
                onChange={(e) => {
                  markDirty()
                  setGst(Number(e.target.value))
                }}
                className="h-8 w-20 rounded-md border border-[#2e2e32] bg-[#121214] px-2 text-right tabular-nums outline-none disabled:opacity-50"
              />
            </div>
            <Row label="GST amount" value={formatInr(gstAmount)} muted />
            <div className="flex items-center justify-between gap-3">
              <label className="text-[#8b8b90]">Discount (₹)</label>
              <input
                type="number"
                min="0"
                disabled={locked}
                value={discount}
                onChange={(e) => {
                  markDirty()
                  setDiscount(Number(e.target.value))
                }}
                className="h-8 w-28 rounded-md border border-[#2e2e32] bg-[#121214] px-2 text-right tabular-nums outline-none disabled:opacity-50"
              />
            </div>
            <div className="mt-2 flex items-center justify-between border-t border-[#2e2e32] pt-3">
              <span className="font-semibold text-white">Grand total</span>
              <span className="text-[18px] font-semibold tabular-nums text-accent">
                {formatInr(grand)}
              </span>
            </div>
          </div>

          <Button
            className="mt-4 w-full"
            loading={save.isPending}
            disabled={locked}
            onClick={() => save.mutate(payload())}
          >
            <Save className="h-3.5 w-3.5" />
            {quotation ? 'Save BOQ' : 'Create BOQ'}
          </Button>
          <p className="mt-1.5 text-center text-[10px] text-[#6b6b70]">
            Ctrl / ⌘ + S to save
          </p>

          <div className="mt-3 grid grid-cols-2 gap-2">
            {!locked && (
              <>
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={save.isPending}
                  onClick={() => save.mutate(payload({ status: 'sent' }))}
                >
                  <Send className="h-3.5 w-3.5" />
                  Mark sent
                </Button>
                <Button
                  size="sm"
                  disabled={save.isPending}
                  onClick={() => {
                    if (
                      !window.confirm(
                        'Approve this BOQ? Project budget will update to the grand total.',
                      )
                    )
                      return
                    save.mutate(payload({ status: 'approved' }))
                  }}
                >
                  <Check className="h-3.5 w-3.5" />
                  Approve
                </Button>
              </>
            )}
            {locked && (
              <Button
                variant="secondary"
                size="sm"
                className="col-span-2"
                disabled={save.isPending}
                onClick={() => save.mutate(payload({ status: 'draft' }))}
              >
                <Unlock className="h-3.5 w-3.5" />
                Reopen as draft
              </Button>
            )}
          </div>
        </div>

        {byRoom.length > 0 && (
          <div className="rounded-xl border border-[#2e2e32] bg-[#1c1c1e] p-4">
            <h3 className="mb-2 text-[12px] font-semibold text-white">
              By room
            </h3>
            <div className="space-y-1.5">
              {byRoom.map(([room, amount]) => (
                <div
                  key={room}
                  className="flex items-center justify-between text-[12px]"
                >
                  <span className="truncate text-[#8b8b90]">{room}</span>
                  <span className="tabular-nums text-white">
                    {formatInr(amount)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="rounded-xl border border-[#2e2e32] bg-[#1c1c1e] p-4 text-[11px] leading-relaxed text-[#8b8b90]">
          <p className="font-medium text-[#c5c5c8]">How this works</p>
          <ol className="mt-1.5 list-decimal space-y-1 pl-4">
            <li>Add lines by room with qty × rate.</li>
            <li>Save, then mark sent to the client.</li>
            <li>Approve locks the BOQ and sets project budget.</li>
          </ol>
        </div>
      </aside>
    </div>
  )
}

function Row({ label, value, muted }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-[#8b8b90]">{label}</span>
      <span
        className={cn(
          'tabular-nums',
          muted ? 'text-[#8b8b90]' : 'text-white',
        )}
      >
        {value}
      </span>
    </div>
  )
}
