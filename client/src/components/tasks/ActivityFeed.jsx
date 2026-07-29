import { format, formatDistanceToNow, isToday, isYesterday } from 'date-fns'
import { Flag } from 'lucide-react'
import { Avatar } from '../ui'
import { getTaskPriority } from '../../lib/taskStatus'
import { StatusInline } from './StatusBadge'

function actorLabel(actor, currentUser) {
  if (!actor) return 'Someone'
  const id = actor._id || actor.id
  const me = currentUser?.id || currentUser?._id
  if (me && String(id) === String(me)) return 'You'
  return actor.name || 'Someone'
}

function timeLabel(at) {
  if (!at) return ''
  const d = new Date(at)
  if (isToday(d) || isYesterday(d)) {
    return formatDistanceToNow(d, { addSuffix: false })
      .replace('about ', '')
      .replace(' minutes', ' mins')
      .replace(' minute', ' min')
      .replace(' hours', ' hrs')
      .replace(' hour', ' hr')
      .replace('less than a minute', 'now')
  }
  return format(d, 'MMM d, yyyy') + ' at ' + format(d, 'h:mm a')
}

function StatusPhrase({ fromValue, toValue, fromLabel, toLabel }) {
  const from = fromValue || guessStatusValue(fromLabel)
  const to = toValue || guessStatusValue(toLabel)
  return (
    <span className="inline-flex flex-wrap items-center gap-x-1 gap-y-0.5">
      <StatusInline status={from} />
      <span className="text-[#94a3b8]">to</span>
      <StatusInline status={to} />
    </span>
  )
}

function guessStatusValue(label) {
  const s = String(label || '').toLowerCase().replace(/\s+/g, '_')
  if (s.includes('progress')) return 'in_progress'
  if (s.includes('review')) return 'review'
  if (s.includes('done') || s.includes('complete')) return 'done'
  return 'todo'
}

/** ClickUp-style activity row */
export function ActivityItem({ item, currentUser }) {
  const who = actorLabel(item.actor, currentUser)
  const when = timeLabel(item.at)
  const field = item.field
  const meta = item.meta || {}

  let body = null

  if (item.kind === 'comment') {
    body = (
      <>
        <span className="font-medium text-[#0f172a]">{who}</span>
        {': '}
        <span className="text-[#475569]">{item.text}</span>
      </>
    )
  } else if (item.type === 'task_created' || field === 'created') {
    body = (
      <>
        <span className="text-[#475569]">{who} created this task</span>
        {item.title ? (
          <>
            <span className="text-[#94a3b8]">: </span>
            <span className="font-medium text-[#0f172a]">{item.title}</span>
          </>
        ) : null}
      </>
    )
  } else if (field === 'status') {
    body = (
      <>
        <span className="text-[#475569]">{who} changed status from </span>
        <StatusPhrase
          fromValue={meta.fromValue}
          toValue={meta.toValue}
          fromLabel={meta.from}
          toLabel={meta.to}
        />
      </>
    )
  } else if (field === 'assignee') {
    const toName = meta.to === 'Unassigned' ? 'Empty' : meta.to
    const isYou =
      currentUser?.name &&
      toName &&
      String(toName).toLowerCase() === String(currentUser.name).toLowerCase()
    body = (
      <>
        <span className="text-[#475569]">{who} assigned to: </span>
        {toName && toName !== 'Empty' ? (
          <span className="inline-flex items-center gap-1">
            <Avatar
              src={item.assigneeAvatar}
              name={toName}
              size="xs"
            />
            <span className="font-medium text-[#0f172a]">
              {isYou ? 'You' : toName}
            </span>
          </span>
        ) : (
          <span className="text-[#64748b]">Empty</span>
        )}
      </>
    )
  } else if (field === 'priority') {
    const p = getTaskPriority(
      meta.toValue ||
        ['urgent', 'high', 'medium', 'low'].find(
          (k) => getTaskPriority(k).label === meta.to,
        ) ||
        'medium',
    )
    body = (
      <>
        <span className="text-[#475569]">{who} set priority to </span>
        <span className="inline-flex items-center gap-1" style={{ color: p.color }}>
          <Flag className="h-3 w-3" fill={p.color} />
          <span className="font-medium">{p.label}</span>
        </span>
      </>
    )
  } else if (field === 'title') {
    body = (
      <>
        <span className="text-[#475569]">{who} changed the task name from </span>
        <span className="text-[#64748b]">{meta.from || 'Empty'}</span>
        <span className="text-[#94a3b8]"> → </span>
        <span className="font-medium text-[#0f172a]">{meta.to || 'Empty'}</span>
      </>
    )
  } else if (
    field === 'timeTracking' ||
    field === 'timeSpent' ||
    field === 'timeEstimate' ||
    field === 'startDate' ||
    field === 'dueDate' ||
    field === 'tags' ||
    field === 'checklist' ||
    field === 'description' ||
    (typeof field === 'string' && field.startsWith('customFields.'))
  ) {
    const label =
      meta.label ||
      (field?.startsWith('customFields.')
        ? field.replace('customFields.', '')
        : field === 'timeTracking'
          ? 'Track time'
          : field === 'timeSpent'
            ? 'Tracked time'
            : field === 'timeEstimate'
              ? 'Time estimate'
              : field === 'startDate'
                ? 'Start date'
                : field === 'dueDate'
                  ? 'Due date'
                  : field === 'tags'
                    ? 'Tags'
                    : field === 'checklist'
                      ? 'Checklist'
                      : field === 'description'
                        ? 'Description'
                        : 'Field')
    body = (
      <>
        <span className="text-[#475569]">
          {who} changed {label} from{' '}
        </span>
        <span className="text-[#64748b]">{meta.from || 'Empty'}</span>
        <span className="text-[#94a3b8]"> to </span>
        <span className="font-medium text-[#0f172a]">{meta.to || 'Empty'}</span>
      </>
    )
  } else {
    // Fallback: rewrite "X changed Y from A to B" → "You ..." when actor is you
    let text = item.text || ''
    if (who === 'You' && item.actor?.name) {
      text = text.replace(item.actor.name, 'You')
    }
    // Inject status dots if message mentions statuses
    body = <span className="text-[#475569]">{text}</span>
  }

  return (
    <div className="group flex gap-2 px-1 py-1.5 text-[12.5px] leading-snug">
      <span className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-[#cbd5e1]" />
      <div className="min-w-0 flex-1">
        <div className="flex items-start gap-2">
          <p className="min-w-0 flex-1 text-[#475569]">{body}</p>
          <span className="shrink-0 pt-0.5 text-[11px] text-[#94a3b8]">{when}</span>
        </div>
      </div>
    </div>
  )
}

export function mapActivityToFeed(activity, comments, task) {
  const items = [
    ...activity
      .filter((a) => a.type !== 'comment')
      .map((a) => ({
        id: a._id,
        text: a.message,
        at: a.createdAt,
        kind: 'activity',
        type: a.type,
        actor: a.actor,
        field: a.meta?.field || (a.type === 'task_created' ? 'created' : null),
        meta: a.meta || {},
        title: a.meta?.title || task?.title,
        statusTo:
          a.meta?.field === 'status' ? a.meta?.toValue || a.meta?.to : null,
      })),
    ...comments.map((c) => ({
      id: c._id,
      text: c.body,
      at: c.createdAt,
      kind: 'comment',
      type: 'comment',
      actor: c.author,
      field: null,
      meta: {},
    })),
  ]
  return items.sort((a, b) => new Date(b.at) - new Date(a.at))
}
