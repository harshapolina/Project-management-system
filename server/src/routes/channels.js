import express from 'express'
import { requireAuth } from '../middleware/auth.js'
import { asyncHandler, AppError } from '../middleware/errorHandler.js'
import { tenantFilter, withTenant, assertTenantDoc } from '../middleware/tenant.js'
import { Channel, ChannelMessage } from '../models/Channel.js'
import { User } from '../models/User.js'
import { parseMentionsFromBody } from '../lib/mentions.js'
import { notifyUser, actorSummary } from '../lib/notify.js'

const router = express.Router()

function isChannelMember(channel, userId) {
  return (channel.members || []).some((m) => String(m) === String(userId))
}

async function ensureGeneral(userId, tenantId) {
  let general = await Channel.findOne({ name: 'general', tenantId })
  if (!general) {
    const users = await User.find({
      isActive: true,
      tenantId,
      isPlatformAdmin: { $ne: true },
    }).select('_id')
    general = await Channel.create({
      name: 'general',
      tenantId,
      description: 'Company-wide chat',
      createdBy: userId,
      members: users.map((u) => u._id),
    })
  } else if (!isChannelMember(general, userId)) {
    general.members.push(userId)
    await general.save()
  }
  return general
}

router.get(
  '/channels',
  requireAuth,
  asyncHandler(async (req, res) => {
    await ensureGeneral(req.user._id, req.tenantId)
    const channels = await Channel.find(
      tenantFilter(req, {
        $or: [{ isPrivate: false }, { members: req.user._id }],
      }),
    )
      .sort({ name: 1 })
      .lean()
    res.json({ success: true, channels })
  }),
)

router.post(
  '/channels',
  requireAuth,
  asyncHandler(async (req, res) => {
    let name = String(req.body.name || '')
      .trim()
      .toLowerCase()
      .replace(/^#/, '')
      .replace(/\s+/g, '-')
    if (!name) throw new AppError('Channel name is required', 400)
    if (!/^[a-z0-9-_]+$/.test(name)) {
      throw new AppError('Use letters, numbers, - or _ only', 400)
    }

    const exists = await Channel.findOne(tenantFilter(req, { name }))
    if (exists) throw new AppError('Channel already exists', 400)

    const users = await User.find(
      tenantFilter(req, { isActive: true, isPlatformAdmin: { $ne: true } }),
    ).select('_id')
    const channel = await Channel.create(
      withTenant(req, {
        name,
        description: req.body.description || '',
        isPrivate: !!req.body.isPrivate,
        createdBy: req.user._id,
        members: req.body.isPrivate
          ? [req.user._id]
          : users.map((u) => u._id),
      }),
    )

    res.status(201).json({ success: true, channel })
  }),
)

router.get(
  '/channels/:id/messages',
  requireAuth,
  asyncHandler(async (req, res) => {
    const channel = await Channel.findById(req.params.id)
    assertTenantDoc(channel, req, 'Channel')

    if (channel.isPrivate && !isChannelMember(channel, req.user._id)) {
      throw new AppError('You are not a member of this channel', 403)
    }

    // Public channels: auto-join so membership stays current
    if (!channel.isPrivate && !isChannelMember(channel, req.user._id)) {
      channel.members.push(req.user._id)
      await channel.save()
    }

    const messages = await ChannelMessage.find(
      tenantFilter(req, { channelId: channel._id }),
    )
      .populate('author', 'name avatar email')
      .populate('mentions', 'name avatar')
      .sort({ createdAt: 1 })
      .limit(200)

    res.json({ success: true, messages, channel })
  }),
)

router.post(
  '/channels/:id/messages',
  requireAuth,
  asyncHandler(async (req, res) => {
    const channel = await Channel.findById(req.params.id)
    assertTenantDoc(channel, req, 'Channel')
    const body = String(req.body.body || '').trim()
    if (!body) throw new AppError('Message required', 400)

    if (channel.isPrivate && !isChannelMember(channel, req.user._id)) {
      throw new AppError('You are not a member of this channel', 403)
    }

    if (!isChannelMember(channel, req.user._id)) {
      channel.members.push(req.user._id)
      await channel.save()
    }

    const directory = await User.find(
      tenantFilter(req, { isActive: true, isPlatformAdmin: { $ne: true } }),
    ).select('name')
    const explicit = Array.isArray(req.body.mentions) ? req.body.mentions : []
    const parsed = parseMentionsFromBody(body, directory)
    const mentionIds = [
      ...new Set([...explicit.map(String), ...parsed.map(String)]),
    ].filter((id) => id && id !== String(req.user._id))

    const message = await ChannelMessage.create(
      withTenant(req, {
        channelId: channel._id,
        author: req.user._id,
        body,
        mentions: mentionIds,
      }),
    )
    await message.populate('author', 'name avatar email')
    await message.populate('mentions', 'name avatar')

    const io = req.app.get('io')
    if (io) {
      io.to(`channel:${channel._id}`).emit('channel:message', {
        channelId: String(channel._id),
        message,
      })
    }

    // Notify mentioned teammates (persist + live popup)
    for (const uid of mentionIds) {
      await notifyUser(req, {
        userId: uid,
        type: 'mention',
        title: `${req.user.name} mentioned you in #${channel.name}`,
        body: body.slice(0, 200),
        link: `/channels/${channel._id}`,
        meta: {
          channelId: String(channel._id),
          channelName: channel.name,
          commentBody: body.slice(0, 280),
          actor: actorSummary(req.user),
        },
      })
    }

    res.status(201).json({ success: true, message })
  }),
)

export default router
