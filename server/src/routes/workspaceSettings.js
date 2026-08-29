import express from 'express'
import { requireAuth } from '../middleware/auth.js'
import { asyncHandler, AppError } from '../middleware/errorHandler.js'
import {
  isCompanyAdminRole,
} from '../middleware/tenant.js'
import {
  MailSettings,
  NOTIFICATION_EVENTS,
  getDefaultEventPrefs,
  sanitizeMailSettings,
} from '../models/MailSettings.js'
import {
  clearMailerCache,
  getMailSettings,
  verifySmtp,
} from '../lib/mailer.js'

const router = express.Router()

function requireMailAdmin(req, _res, next) {
  if (req.user?.isPlatformAdmin || isCompanyAdminRole(req.user?.role)) {
    return next()
  }
  next(new AppError('Only owners and admins can manage email settings', 403))
}

router.get(
  '/mail',
  requireAuth,
  asyncHandler(async (req, res) => {
    if (!req.tenantId) {
      throw new AppError('Workspace not resolved — refresh and try again', 400)
    }
    const doc = await getMailSettings(req.tenantId)
    const canEdit =
      req.user?.isPlatformAdmin || isCompanyAdminRole(req.user?.role)
    res.json({
      success: true,
      settings: sanitizeMailSettings(doc),
      events: NOTIFICATION_EVENTS,
      canEdit,
    })
  }),
)

router.put(
  '/mail',
  requireAuth,
  requireMailAdmin,
  asyncHandler(async (req, res) => {
    const doc = await getMailSettings(req.tenantId)
    const body = req.body || {}

    if (body.enabled !== undefined) doc.enabled = !!body.enabled
    if (body.host !== undefined) doc.host = String(body.host || '').trim()
    if (body.port !== undefined) {
      const port = Number(body.port)
      if (!Number.isFinite(port) || port < 1 || port > 65535) {
        throw new AppError('Invalid SMTP port', 400)
      }
      doc.port = port
    }
    if (body.secure !== undefined) doc.secure = !!body.secure
    if (body.user !== undefined) doc.user = String(body.user || '').trim()
    if (body.fromName !== undefined) {
      doc.fromName = String(body.fromName || '').trim() || 'Cubic'
    }
    if (body.fromEmail !== undefined) {
      doc.fromEmail = String(body.fromEmail || '').trim()
    }
    // Only update password when a new non-empty value is sent
    if (body.pass !== undefined && String(body.pass).trim() !== '') {
      doc.pass = String(body.pass).trim()
    }
    if (body.clearPassword) doc.pass = ''

    if (body.events && typeof body.events === 'object') {
      const defaults = getDefaultEventPrefs()
      const next = { ...defaults, ...(doc.events || {}) }
      for (const [key, val] of Object.entries(body.events)) {
        if (!defaults[key] || !val || typeof val !== 'object') continue
        next[key] = {
          ...defaults[key],
          ...next[key],
          popup: val.popup !== undefined ? !!val.popup : next[key].popup,
          email: val.email !== undefined ? !!val.email : next[key].email,
          notifyTarget:
            val.notifyTarget !== undefined
              ? !!val.notifyTarget
              : next[key].notifyTarget,
          notifyActor:
            val.notifyActor !== undefined
              ? !!val.notifyActor
              : next[key].notifyActor,
          notifyAdmins:
            val.notifyAdmins !== undefined
              ? !!val.notifyAdmins
              : next[key].notifyAdmins,
          daysBefore:
            val.daysBefore !== undefined
              ? Math.min(30, Math.max(0, Number(val.daysBefore) || 0))
              : next[key].daysBefore,
        }
      }
      doc.events = next
      doc.markModified('events')
    }

    doc.updatedBy = req.user._id
    await doc.save()
    clearMailerCache(req.tenantId)

    res.json({ success: true, settings: sanitizeMailSettings(doc) })
  }),
)

router.post(
  '/mail/test',
  requireAuth,
  requireMailAdmin,
  asyncHandler(async (req, res) => {
    const doc = await getMailSettings(req.tenantId)
    const pass =
      req.body?.pass && String(req.body.pass).trim()
        ? String(req.body.pass).trim()
        : doc.pass
    const host = req.body?.host || doc.host
    const port = Number(req.body?.port ?? doc.port) || 587
    const user = req.body?.user || doc.user
    const secure =
      req.body?.secure !== undefined ? !!req.body.secure : doc.secure
    const fromName = req.body?.fromName || doc.fromName || 'Cubic'
    const fromEmail = req.body?.fromEmail || doc.fromEmail || user

    if (!user || !pass) {
      throw new AppError('SMTP username and app password are required', 400)
    }

    await verifySmtp({ host, port, user, pass, secure })

    const to = req.body?.to || req.user.email
    if (!to) throw new AppError('No recipient email for test', 400)

    const nodemailer = (await import('nodemailer')).default
    const transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: { user, pass },
    })
    await transporter.sendMail({
      from: `"${fromName}" <${fromEmail}>`,
      to,
      subject: 'Cubic — SMTP test',
      text: `Your SMTP settings work. Sent to ${to} at ${new Date().toISOString()}`,
      html: `<p>Your SMTP settings work.</p><p>Sent to <strong>${to}</strong>.</p>`,
    })

    res.json({ success: true, sentTo: to })
  }),
)

/**
 * Compose-and-send from the Gmail-style popup. Any signed-in teammate can use
 * the workspace SMTP once an admin has enabled it.
 */
router.post(
  '/mail/compose',
  requireAuth,
  asyncHandler(async (req, res) => {
    if (!req.tenantId) {
      throw new AppError('Workspace not resolved — refresh and try again', 400)
    }

    const to = String(req.body?.to || '')
      .split(/[,;]/)
      .map((s) => s.trim())
      .filter(Boolean)
    const subject = String(req.body?.subject || '').trim()
    const text = String(req.body?.body || req.body?.text || '').trim()
    const html = req.body?.html
      ? String(req.body.html)
      : text
        ? `<div style="font-family:Segoe UI,Arial,sans-serif;white-space:pre-wrap;font-size:14px;line-height:1.5">${escapeHtml(text)}</div>`
        : ''

    if (!to.length) throw new AppError('Add at least one recipient', 400)
    if (!subject) throw new AppError('Subject is required', 400)
    if (!text && !html) throw new AppError('Message body is required', 400)

    const settings = await getMailSettings(req.tenantId)
    if (!settings?.enabled || !settings.user || !settings.pass) {
      throw new AppError(
        'Email is not set up yet. Open Settings → Email & alerts, add SMTP, enable it, then try again.',
        400,
      )
    }

    const { sendTenantMail } = await import('../lib/mailer.js')
    await sendTenantMail(req.tenantId, {
      to: to.join(', '),
      subject,
      text: text || undefined,
      html: html || undefined,
    })

    res.json({
      success: true,
      sentTo: to,
      from: settings.fromEmail || settings.user,
    })
  }),
)

function escapeHtml(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export default router
