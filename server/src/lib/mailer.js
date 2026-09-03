import nodemailer from 'nodemailer'
import { MailSettings, sanitizeMailSettings, getDefaultEventPrefs } from '../models/MailSettings.js'
import { User } from '../models/User.js'

const transporterCache = new Map()

export async function getMailSettings(tenantId) {
  if (!tenantId) return null
  let doc = await MailSettings.findOne({ tenantId })
  if (!doc) {
    doc = await MailSettings.create({
      tenantId,
      events: getDefaultEventPrefs(),
    })
  }
  return doc
}

export function eventPref(settings, eventKey) {
  const defaults = getDefaultEventPrefs()
  const base = defaults[eventKey] || {
    popup: true,
    email: true,
    notifyTarget: true,
    notifyActor: false,
    notifyAdmins: false,
    daysBefore: 1,
  }
  return { ...base, ...(settings?.events?.[eventKey] || {}) }
}

function cacheKey(settings) {
  return [
    String(settings.tenantId),
    settings.host,
    settings.port,
    settings.user,
    settings.pass ? '1' : '0',
    settings.secure ? '1' : '0',
  ].join('|')
}

function getTransporter(settings) {
  const key = cacheKey(settings)
  if (transporterCache.has(key)) return transporterCache.get(key)

  const transporter = nodemailer.createTransport({
    host: settings.host || 'smtp.gmail.com',
    port: Number(settings.port) || 587,
    secure: Boolean(settings.secure),
    auth: {
      user: settings.user,
      pass: settings.pass,
    },
  })
  transporterCache.set(key, transporter)
  return transporter
}

export function clearMailerCache(tenantId) {
  for (const key of transporterCache.keys()) {
    if (key.startsWith(String(tenantId))) transporterCache.delete(key)
  }
}

/**
 * Send one outbound email using the workspace SMTP config.
 * No-ops (returns null) when mail is disabled or incomplete.
 */
export async function sendTenantMail(tenantId, { to, subject, text, html }) {
  if (!tenantId || !to) return null
  const settings = await getMailSettings(tenantId)
  if (!settings?.enabled || !settings.user || !settings.pass) return null

  const fromEmail = settings.fromEmail || settings.user
  const fromName = settings.fromName || 'Cubic'
  const transporter = getTransporter(settings)

  const info = await transporter.sendMail({
    from: `"${fromName}" <${fromEmail}>`,
    to,
    subject,
    text: text || stripHtml(html || ''),
    html: html || undefined,
  })
  return info
}

function stripHtml(html) {
  return String(html || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function buildNotificationEmail({ title, body, link, workspaceName }) {
  const appUrl = process.env.CLIENT_URL || 'http://localhost:5173'
  const href = link
    ? link.startsWith('http')
      ? link
      : `${appUrl.replace(/\/$/, '')}${link.startsWith('/') ? '' : '/'}${link}`
    : appUrl

  const text = [
    title,
    body,
    '',
    href ? `Open: ${href}` : '',
    '',
    workspaceName ? `— ${workspaceName}` : '— Cubic',
  ]
    .filter(Boolean)
    .join('\n')

  const html = `
    <div style="font-family:Segoe UI,Arial,sans-serif;max-width:560px;margin:0 auto;color:#171717">
      <h2 style="font-size:18px;margin:0 0 8px">${escapeHtml(title)}</h2>
      <p style="font-size:14px;line-height:1.5;color:#52525b;margin:0 0 16px">${escapeHtml(body || '')}</p>
      ${
        href
          ? `<a href="${href}" style="display:inline-block;background:#3ecf8e;color:#171717;text-decoration:none;font-weight:600;font-size:13px;padding:10px 16px;border-radius:8px">Open in Cubic</a>`
          : ''
      }
      <p style="font-size:11px;color:#a1a1aa;margin-top:24px">${escapeHtml(workspaceName || 'Cubic')}</p>
    </div>
  `

  return { subject: title, text, html }
}

function escapeHtml(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/** Resolve admin/owner user ids for a tenant. */
export async function listAdminUserIds(tenantId) {
  const admins = await User.find({
    tenantId,
    role: { $in: ['owner', 'admin'] },
    isActive: { $ne: false },
    isPlatformAdmin: { $ne: true },
  })
    .select('_id email name')
    .lean()
  return admins
}

export async function verifySmtp(settingsLike) {
  const transporter = nodemailer.createTransport({
    host: settingsLike.host || 'smtp.gmail.com',
    port: Number(settingsLike.port) || 587,
    secure: Boolean(settingsLike.secure),
    auth: {
      user: settingsLike.user,
      pass: settingsLike.pass,
    },
  })
  await transporter.verify()
  return true
}

export { sanitizeMailSettings }
