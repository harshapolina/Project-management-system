import express from 'express'
import { requireAuth } from '../middleware/auth.js'
import { asyncHandler, AppError } from '../middleware/errorHandler.js'
import { Channel, ChannelMessage } from '../models/Channel.js'
import { User } from '../models/User.js'

const router = express.Router()

async function ensureGeneral(userId) {
  let general = await Channel.findOne({ name: 'general' })
  if (!general) {
    const users = await User.find({ isActive: true }).select('_id')
    general = await Channel.create({
      name: 'general',
      description: 'Company-wide chat',
      createdBy: userId,
      members: users.map((u) => u._id),
    })
  } else if (!general.members.some((m) => String(m) === String(userId))) {
    general.members.push(userId)
    await general.save()
  }
  return general
}

router.get(
  '/channels',
  requireAuth,
  asyncHandler(async (req, res) => {
    await ensureGeneral(req.user._id)
    const channels = await Channel.find({
      $or: [{ isPrivate: false }, { members: req.user._id }],
    })
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

    const exists = await Channel.findOne({ name })
    if (exists) throw new AppError('Channel already exists', 400)

    const users = await User.find({ isActive: true }).select('_id')
    const channel = await Channel.create({
      name,
      description: req.body.description || '',
      isPrivate: !!req.body.isPrivate,
      createdBy: req.user._id,
      members: req.body.isPrivate
        ? [req.user._id]
        : users.map((u) => u._id),
    })

    res.status(201).json({ success: true, channel })
  }),
)

router.get(
  '/channels/:id/messages',
  requireAuth,
  asyncHandler(async (req, res) => {
    const channel = await Channel.findById(req.params.id)
    if (!channel) throw new AppError('Channel not found', 404)

    const messages = await ChannelMessage.find({ channelId: channel._id })
      .populate('author', 'name avatar email')
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
    if (!channel) throw new AppError('Channel not found', 404)
    const body = String(req.body.body || '').trim()
    if (!body) throw new AppError('Message required', 400)

    if (!channel.members.some((m) => String(m) === String(req.user._id))) {
      channel.members.push(req.user._id)
      await channel.save()
    }

    const message = await ChannelMessage.create({
      channelId: channel._id,
      author: req.user._id,
      body,
    })
    await message.populate('author', 'name avatar email')

    const io = req.app.get('io')
    if (io) {
      io.to(`channel:${channel._id}`).emit('channel:message', {
        channelId: String(channel._id),
        message,
      })
    }

    res.status(201).json({ success: true, message })
  }),
)

export default router
