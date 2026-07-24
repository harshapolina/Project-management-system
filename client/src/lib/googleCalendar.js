/**
 * Google Calendar — ClickUp-style connect.
 * Users only sign in with Google + grant permission.
 * The app uses ONE public Client ID (workspace-level), never per-user secrets.
 */

const GIS_SRC = 'https://accounts.google.com/gsi/client'
const SCOPES = [
  'https://www.googleapis.com/auth/calendar.readonly',
  'https://www.googleapis.com/auth/calendar.events.readonly',
].join(' ')

const SESSION_KEY = 'cubic-gcal-session'

let gisLoading = null

export function loadGoogleIdentity() {
  if (typeof window === 'undefined') return Promise.reject(new Error('No window'))
  if (window.google?.accounts?.oauth2) return Promise.resolve(window.google)
  if (gisLoading) return gisLoading

  gisLoading = new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${GIS_SRC}"]`)
    if (existing) {
      existing.addEventListener('load', () => resolve(window.google))
      existing.addEventListener('error', () =>
        reject(new Error('Failed to load Google Sign-In')),
      )
      return
    }
    const script = document.createElement('script')
    script.src = GIS_SRC
    script.async = true
    script.onload = () => resolve(window.google)
    script.onerror = () => reject(new Error('Failed to load Google Sign-In'))
    document.head.appendChild(script)
  })
  return gisLoading
}

export function getGcalSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY)
    if (!raw) return null
    const data = JSON.parse(raw)
    if (!data?.accessToken) return null
    // Treat as expired 60s early
    if (data.expiresAt && Date.now() > data.expiresAt - 60_000) {
      localStorage.removeItem(SESSION_KEY)
      return null
    }
    return data
  } catch {
    return null
  }
}

export function saveGcalSession(session) {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session))
}

export function clearGcalSession() {
  localStorage.removeItem(SESSION_KEY)
}

/**
 * Opens Google's permission popup (same UX as ClickUp).
 * Resolves with { accessToken, expiresAt }.
 */
export async function requestGoogleCalendarAccess(clientId) {
  if (!clientId) {
    throw new Error('Google Calendar is not enabled for this workspace yet.')
  }

  const google = await loadGoogleIdentity()

  return new Promise((resolve, reject) => {
    try {
      const client = google.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: SCOPES,
        prompt: 'consent',
        callback: (response) => {
          if (response.error) {
            reject(new Error(response.error_description || response.error))
            return
          }
          if (!response.access_token) {
            reject(new Error('No access token returned from Google'))
            return
          }
          const expiresIn = Number(response.expires_in || 3600) * 1000
          resolve({
            accessToken: response.access_token,
            expiresAt: Date.now() + expiresIn,
          })
        },
        error_callback: (err) => {
          reject(
            new Error(
              err?.message ||
                err?.type ||
                'Google permission popup was closed or blocked',
            ),
          )
        },
      })
      client.requestAccessToken()
    } catch (e) {
      reject(e)
    }
  })
}

async function googleFetch(path, accessToken) {
  const res = await fetch(`https://www.googleapis.com/calendar/v3${path}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(data?.error?.message || `Google Calendar error (${res.status})`)
  }
  return data
}

/** Fetch profile email for the connected account */
export async function fetchGoogleEmail(accessToken) {
  try {
    const res = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    if (!res.ok) return ''
    const data = await res.json()
    return data.email || ''
  } catch {
    return ''
  }
}

/**
 * Fetch upcoming events from ALL calendars the user can access.
 */
export async function fetchAllGoogleEvents(accessToken, days = 30) {
  const timeMin = new Date()
  timeMin.setHours(0, 0, 0, 0)
  const timeMax = new Date(timeMin)
  timeMax.setDate(timeMax.getDate() + days)

  const calList = await googleFetch('/users/me/calendarList?maxResults=50', accessToken)
  const calendars = calList.items || []
  const events = []

  for (const cal of calendars) {
    if (cal.accessRole === 'freeBusyReader') continue
    try {
      const params = new URLSearchParams({
        timeMin: timeMin.toISOString(),
        timeMax: timeMax.toISOString(),
        singleEvents: 'true',
        orderBy: 'startTime',
        maxResults: '100',
      })
      const result = await googleFetch(
        `/calendars/${encodeURIComponent(cal.id)}/events?${params}`,
        accessToken,
      )
      for (const ev of result.items || []) {
        if (ev.status === 'cancelled') continue
        const start = ev.start?.dateTime || ev.start?.date
        const end = ev.end?.dateTime || ev.end?.date
        events.push({
          id: ev.id,
          calendarId: cal.id,
          calendarName: cal.summary || 'Calendar',
          calendarColor: cal.backgroundColor || '#7B68EE',
          title: ev.summary || '(No title)',
          description: ev.description || '',
          location: ev.location || '',
          htmlLink: ev.htmlLink || '',
          start,
          end,
          allDay: !ev.start?.dateTime,
          hangoutLink:
            ev.hangoutLink ||
            ev.conferenceData?.entryPoints?.[0]?.uri ||
            '',
        })
      }
    } catch {
      // skip calendars we can't read
    }
  }

  events.sort((a, b) => new Date(a.start) - new Date(b.start))
  return { events, calendars }
}
