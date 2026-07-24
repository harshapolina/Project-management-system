import express from 'express'
import jwt from 'jsonwebtoken'
import { google } from 'googleapis'
import { requireAuth } from '../middleware/auth.js'
import { asyncHandler, AppError } from '../middleware/errorHandler.js'
import { User } from '../models/User.js'
import { WorkspaceSettings } from '../models/WorkspaceSettings.js'

const router = express.Router()

const SCOPES = [
  'https://www.googleapis.com/auth/calendar.readonly',
  'https://www.googleapis.com/auth/calendar.events.readonly',
  'openid',
  'email',
  'profile',
]

async function resolveGoogleClientId() {
  if (process.env.GOOGLE_CLIENT_ID?.trim()) {
    return process.env.GOOGLE_CLIENT_ID.trim()
  }
  const settings = await WorkspaceSettings.findOne({ key: 'default' })
  return (settings?.googleClientId || '').trim()
}

function googleServerOAuthConfigured() {
  return !!(
    process.env.GOOGLE_CLIENT_ID &&
    process.env.GOOGLE_CLIENT_SECRET &&
    process.env.GOOGLE_REDIRECT_URI
  )
}

function getOAuthClient() {
  if (!googleServerOAuthConfigured()) {
    throw new AppError(
      'Google Calendar server OAuth is not fully configured',
      503,
    )
  }
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI,
  )
}

async function getAuthedClientForUser(userId) {
  const user = await User.findById(userId)
  if (!user?.googleCalendar?.connected || !user.googleCalendar.refreshToken) {
    throw new AppError('Google Calendar not connected', 400)
  }

  const client = getOAuthClient()
  client.setCredentials({
    access_token: user.googleCalendar.accessToken,
    refresh_token: user.googleCalendar.refreshToken,
    expiry_date: user.googleCalendar.expiryDate || undefined,
  })

  client.on('tokens', async (tokens) => {
    const updates = {}
    if (tokens.access_token) updates['googleCalendar.accessToken'] = tokens.access_token
    if (tokens.refresh_token) updates['googleCalendar.refreshToken'] = tokens.refresh_token
    if (tokens.expiry_date) updates['googleCalendar.expiryDate'] = tokens.expiry_date
    if (Object.keys(updates).length) {
      await User.findByIdAndUpdate(userId, { $set: updates })
    }
  })

  return { client, user }
}

/* Status — is Google connected? */
router.get(
  '/calendar/google/status',
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = await User.findById(req.user._id)
    const clientId = await resolveGoogleClientId()
    res.json({
      success: true,
      // Public Client ID — safe to send to browser (not a secret).
      configured: !!clientId,
      clientId,
      connected: !!user?.googleCalendar?.connected,
      email: user?.googleCalendar?.email || '',
      connectedAt: user?.googleCalendar?.connectedAt || null,
    })
  }),
)

/* Save workspace Google Client ID once (admin/setup) — users never see this again */
router.put(
  '/calendar/google/client-id',
  requireAuth,
  asyncHandler(async (req, res) => {
    const clientId = String(req.body.clientId || '').trim()
    if (!clientId || !clientId.includes('.apps.googleusercontent.com')) {
      throw new AppError(
        'Paste a valid Google OAuth Client ID (ends with .apps.googleusercontent.com)',
        400,
      )
    }
    const settings = await WorkspaceSettings.findOneAndUpdate(
      { key: 'default' },
      { $set: { googleClientId: clientId } },
      { upsert: true, new: true },
    )
    res.json({
      success: true,
      clientId: settings.googleClientId,
      configured: true,
    })
  }),
)

/* Start OAuth — returns Google consent URL (optional redirect flow) */
router.get(
  '/calendar/google/auth',
  requireAuth,
  asyncHandler(async (req, res) => {
    if (!googleServerOAuthConfigured()) {
      throw new AppError(
        'Popup Connect is preferred. Server redirect needs GOOGLE_CLIENT_SECRET.',
        503,
      )
    }
    const client = getOAuthClient()
    const state = jwt.sign(
      { sub: req.user._id.toString(), purpose: 'gcal' },
      process.env.JWT_ACCESS_SECRET,
      { expiresIn: '15m' },
    )

    const url = client.generateAuthUrl({
      access_type: 'offline',
      prompt: 'consent',
      include_granted_scopes: true,
      scope: SCOPES,
      state,
    })

    res.json({ success: true, url })
  }),
)

/* OAuth callback — Google redirects here (no Bearer; uses state JWT) */
router.get(
  '/calendar/google/callback',
  asyncHandler(async (req, res) => {
    const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173'
    const fail = (msg) =>
      res.redirect(
        `${clientUrl}/?view=all&gcal=error&message=${encodeURIComponent(msg)}`,
      )

    try {
      const { code, state, error } = req.query
      if (error) return fail(String(error))
      if (!code || !state) return fail('Missing authorization code')

      let payload
      try {
        payload = jwt.verify(state, process.env.JWT_ACCESS_SECRET)
      } catch {
        return fail('Session expired — try Connect again')
      }
      if (payload.purpose !== 'gcal' || !payload.sub) {
        return fail('Invalid OAuth state')
      }

      const client = getOAuthClient()
      const { tokens } = await client.getToken(String(code))
      client.setCredentials(tokens)

      let email = ''
      try {
        const oauth2 = google.oauth2({ version: 'v2', auth: client })
        const me = await oauth2.userinfo.get()
        email = me.data.email || ''
      } catch {
        // email optional
      }

      await User.findByIdAndUpdate(payload.sub, {
        $set: {
          'googleCalendar.connected': true,
          'googleCalendar.email': email,
          'googleCalendar.accessToken': tokens.access_token || '',
          'googleCalendar.refreshToken': tokens.refresh_token || '',
          'googleCalendar.expiryDate': tokens.expiry_date || null,
          'googleCalendar.connectedAt': new Date(),
        },
      })

      return res.redirect(`${clientUrl}/?view=all&gcal=connected`)
    } catch (err) {
      console.error('Google Calendar callback error:', err)
      return fail(err.message || 'Failed to connect Google Calendar')
    }
  }),
)

/* Fetch events from primary + all calendars */
router.get(
  '/calendar/google/events',
  requireAuth,
  asyncHandler(async (req, res) => {
    const days = Math.min(Number(req.query.days) || 30, 90)
    const { client } = await getAuthedClientForUser(req.user._id)
    const calendar = google.calendar({ version: 'v3', auth: client })

    const timeMin = new Date()
    timeMin.setHours(0, 0, 0, 0)
    const timeMax = new Date(timeMin)
    timeMax.setDate(timeMax.getDate() + days)

    // List all calendars the user can see
    const calList = await calendar.calendarList.list({ maxResults: 50 })
    const calendars = calList.data.items || []

    const events = []
    for (const cal of calendars) {
      if (cal.accessRole === 'freeBusyReader') continue
      try {
        const result = await calendar.events.list({
          calendarId: cal.id,
          timeMin: timeMin.toISOString(),
          timeMax: timeMax.toISOString(),
          singleEvents: true,
          orderBy: 'startTime',
          maxResults: 100,
        })
        for (const ev of result.data.items || []) {
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
            status: ev.status,
            hangoutLink: ev.hangoutLink || ev.conferenceData?.entryPoints?.[0]?.uri || '',
          })
        }
      } catch (err) {
        console.warn(`Skip calendar ${cal.id}:`, err.message)
      }
    }

    events.sort((a, b) => new Date(a.start) - new Date(b.start))

    res.json({
      success: true,
      events,
      range: { timeMin, timeMax },
      calendars: calendars.map((c) => ({
        id: c.id,
        name: c.summary,
        primary: !!c.primary,
        color: c.backgroundColor,
      })),
    })
  }),
)

/* Disconnect */
router.delete(
  '/calendar/google',
  requireAuth,
  asyncHandler(async (req, res) => {
    try {
      const user = await User.findById(req.user._id)
      if (user?.googleCalendar?.accessToken && googleConfigured()) {
        const client = getOAuthClient()
        client.setCredentials({
          access_token: user.googleCalendar.accessToken,
          refresh_token: user.googleCalendar.refreshToken,
        })
        try {
          await client.revokeCredentials()
        } catch {
          // revoke may fail if already expired — still clear local
        }
      }
    } catch {
      // still disconnect locally
    }

    await User.findByIdAndUpdate(req.user._id, {
      $set: {
        'googleCalendar.connected': false,
        'googleCalendar.email': '',
        'googleCalendar.accessToken': '',
        'googleCalendar.refreshToken': '',
        'googleCalendar.expiryDate': null,
        'googleCalendar.connectedAt': null,
      },
    })

    res.json({ success: true })
  }),
)

export default router
