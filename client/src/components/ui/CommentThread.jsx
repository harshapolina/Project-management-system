import { formatDistanceToNow } from 'date-fns'
import { cn } from '../../lib/utils'
import { Avatar } from './Avatar'
import { Button } from './Button'
import { Input } from './Input'

export function CommentThread({
  comments = [],
  onSubmit,
  currentUser,
  className,
  placeholder = 'Write a comment… use @ to mention',
}) {
  return (
    <div className={cn('flex flex-col gap-4', className)}>
      <div className="flex flex-col gap-4">
        {comments.length === 0 && (
          <p className="text-sm text-secondary">
            No comments yet — start the conversation.
          </p>
        )}
        {comments.map((c) => (
          <div key={c.id || c._id} className="flex gap-3">
            <Avatar
              src={c.author?.avatar}
              name={c.author?.name || 'User'}
              size="sm"
            />
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline gap-2">
                <span className="text-sm font-semibold text-primary">
                  {c.author?.name || 'User'}
                </span>
                {c.createdAt && (
                  <span className="text-[11px] text-secondary">
                    {formatDistanceToNow(new Date(c.createdAt), { addSuffix: true })}
                  </span>
                )}
              </div>
              <p className="mt-0.5 text-sm text-secondary leading-relaxed whitespace-pre-wrap">
                {c.body || c.text}
              </p>
            </div>
          </div>
        ))}
      </div>

      {onSubmit && (
        <form
          className="flex items-start gap-3"
          onSubmit={(e) => {
            e.preventDefault()
            const form = e.currentTarget
            const data = new FormData(form)
            const body = String(data.get('body') || '').trim()
            if (!body) return
            onSubmit(body)
            form.reset()
          }}
        >
          <Avatar
            src={currentUser?.avatar}
            name={currentUser?.name || 'You'}
            size="sm"
          />
          <div className="flex flex-1 gap-2">
            <Input name="body" placeholder={placeholder} className="flex-1" />
            <Button type="submit" size="md">
              Post
            </Button>
          </div>
        </form>
      )}
    </div>
  )
}
