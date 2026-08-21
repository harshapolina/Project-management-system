/**
 * Resolve @mentions in free text against a list of users.
 * Matches @Full Name, @FirstLast, and @First.
 */
export function parseMentionsFromBody(body, users = []) {
  const text = String(body || '')
  if (!text || !users.length) return []

  const found = []
  const seen = new Set()

  for (const u of users) {
    const id = String(u._id || u.id)
    if (!id || seen.has(id)) continue
    const name = String(u.name || '').trim()
    if (!name) continue

    const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const first = name.split(/\s+/)[0]
    const compact = name.replace(/\s+/g, '')
    const patterns = [
      new RegExp(`@${escape(name)}\\b`, 'i'),
      new RegExp(`@${escape(compact)}\\b`, 'i'),
      first && first.length > 1 ? new RegExp(`@${escape(first)}\\b`, 'i') : null,
    ].filter(Boolean)

    if (patterns.some((re) => re.test(text))) {
      seen.add(id)
      found.push(u._id || u.id)
    }
  }

  return found
}
