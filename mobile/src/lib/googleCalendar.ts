import AsyncStorage from '@react-native-async-storage/async-storage'
import * as AuthSession from 'expo-auth-session'
import * as WebBrowser from 'expo-web-browser'
import { calendarApi } from '../api/calendar'
import type { GoogleCalendarEvent } from '../types/ops'

WebBrowser.maybeCompleteAuthSession()

const SESSION_KEY = 'cubic-gcal-session'

const GOOGLE_DISCOVERY: AuthSession.DiscoveryDocument = {
  authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
  tokenEndpoint: 'https://oauth2.googleapis.com/token',
  revocationEndpoint: 'https://oauth2.googleapis.com/revoke',
}

const SCOPES = [
  'https://www.googleapis.com/auth/calendar.readonly',
  'https://www.googleapis.com/auth/calendar.events.readonly',
  'openid',
  'email',
  'profile',
]

export interface GcalSession {
  accessToken: string
  expiresAt: number
  email?: string
}

export async function getGcalSession(): Promise<GcalSession | null> {
  try {
    const raw = await AsyncStorage.getItem(SESSION_KEY)
    if (!raw) return null
    const data = JSON.parse(raw) as GcalSession
    if (!data?.accessToken) return null
    if (data.expiresAt && Date.now() > data.expiresAt - 60_000) {
      await AsyncStorage.removeItem(SESSION_KEY)
      return null
    }
    return data
  } catch {
    return null
  }
}

export async function saveGcalSession(session: GcalSession): Promise<void> {
  await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(session))
}

export async function clearGcalSession(): Promise<void> {
  await AsyncStorage.removeItem(SESSION_KEY)
}

export async function resolveGoogleClientId(): Promise<string> {
  const status = await calendarApi.status()
  if (!status.configured || !status.clientId) {
    throw new Error('Google Calendar is not enabled for this workspace yet.')
  }
  return status.clientId
}

export async function fetchGoogleEmail(accessToken: string): Promise<string> {
  try {
    const res = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    if (!res.ok) return ''
    const data = (await res.json()) as { email?: string }
    return data.email || ''
  } catch {
    return ''
  }
}

/**
 * Opens Google's consent screen via expo-auth-session and stores a local
 * session (same model as the web app's popup connect).
 */
export async function connectGoogleCalendar(clientId?: string): Promise<GcalSession> {
  const id = clientId || (await resolveGoogleClientId())
  const redirectUri = AuthSession.makeRedirectUri({ scheme: 'cubic' })

  const request = new AuthSession.AuthRequest({
    clientId: id,
    scopes: SCOPES,
    redirectUri,
    responseType: AuthSession.ResponseType.Token,
    usePKCE: false,
    extraParams: { prompt: 'consent' },
  })

  const result = await request.promptAsync(GOOGLE_DISCOVERY)
  if (result.type !== 'success') {
    throw new Error(result.type === 'cancel' ? 'Google sign-in was cancelled' : 'Could not connect Google Calendar')
  }

  const accessToken = result.params.access_token
  if (!accessToken) throw new Error('No access token returned from Google')

  const expiresIn = Number(result.params.expires_in || 3600) * 1000
  const email = await fetchGoogleEmail(accessToken)
  const session: GcalSession = {
    accessToken,
    expiresAt: Date.now() + expiresIn,
    email,
  }
  await saveGcalSession(session)
  return session
}

async function googleFetch(path: string, accessToken: string) {
  const res = await fetch(`https://www.googleapis.com/calendar/v3${path}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error((data as { error?: { message?: string } })?.error?.message || `Google Calendar error (${res.status})`)
  }
  return data as { items?: Record<string, unknown>[] }
}

/** Prefer server-stored tokens; fall back to the local expo-auth-session. */
export async function fetchGoogleCalendarEvents(days = 30): Promise<GoogleCalendarEvent[]> {
  const status = await calendarApi.status()
  if (status.connected) {
    const timeMin = new Date().toISOString()
    const timeMax = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString()
    return calendarApi.events({ timeMin, timeMax, maxResults: 100 })
  }

  const session = await getGcalSession()
  if (!session?.accessToken) {
    throw new Error('Google Calendar not connected')
  }

  const timeMin = new Date()
  timeMin.setHours(0, 0, 0, 0)
  const timeMax = new Date(timeMin)
  timeMax.setDate(timeMax.getDate() + days)

  const calList = await googleFetch('/users/me/calendarList?maxResults=50', session.accessToken)
  const events: GoogleCalendarEvent[] = []

  for (const cal of calList.items || []) {
    const calId = String(cal.id || '')
    if (!calId || cal.accessRole === 'freeBusyReader') continue
    try {
      const params = new URLSearchParams({
        timeMin: timeMin.toISOString(),
        timeMax: timeMax.toISOString(),
        singleEvents: 'true',
        orderBy: 'startTime',
        maxResults: '100',
      })
      const result = await googleFetch(
        `/calendars/${encodeURIComponent(calId)}/events?${params}`,
        session.accessToken,
      )
      for (const ev of result.items || []) {
        if (ev.status === 'cancelled') continue
        const startObj = ev.start as { dateTime?: string; date?: string } | undefined
        const endObj = ev.end as { dateTime?: string; date?: string } | undefined
        events.push({
          id: String(ev.id || ''),
          summary: String(ev.summary || '(No title)'),
          start: startObj?.dateTime || startObj?.date,
          end: endObj?.dateTime || endObj?.date,
          htmlLink: String(ev.htmlLink || ''),
          location: String(ev.location || ''),
        })
      }
    } catch {
      // skip unreadable calendars
    }
  }

  events.sort((a, b) => new Date(a.start || 0).getTime() - new Date(b.start || 0).getTime())
  return events
}

export async function disconnectGoogleCalendar(): Promise<void> {
  await clearGcalSession()
  try {
    await calendarApi.disconnect()
  } catch {
    // local session cleared even if server was not connected
  }
}

export async function getGoogleCalendarStatus() {
  const [status, session] = await Promise.all([calendarApi.status(), getGcalSession()])
  return {
    ...status,
    localConnected: !!session?.accessToken,
    localEmail: session?.email || '',
  }
}

export async function saveWorkspaceGoogleClientId(clientId: string) {
  return calendarApi.setClientId(clientId)
}
