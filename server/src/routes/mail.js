import express from 'express'
import { requireAuth } from '../middleware/auth.js'
import { asyncHandler, AppError } from '../middleware/errorHandler.js'
import { Message } from '../models/Message.js'
import { User } from '../models/User.js'
import { Notification } from '../models/Activity.js'

const router = express.Router()

/** Company directory — everyone you can mail */
router.get(
  '/mail/directory',
  requireAuth,
  asyncHandler(async (req, res) => {
    const users = await User.find({
      isActive: true,
      _id: { $ne: req.user._id },
    })
      .select('name email avatar role title company')
      .sort({ name: 1 })

    res.json({ success: true, users })
  }),
)

/** Inbox threads — people you've messaged or who messaged you */
router.get(
  '/mail/threads',
  requireAuth,
  asyncHandler(async (req, res) => {
    const me = req.user._id
    const messages = await Message.find({
      $or: [{ from: me }, { to: me }],
      clearedBy: { $ne: me },
    })
      .populate('from', 'name avatar email role title')
      .populate('to', 'name avatar email role title')
      .sort({ createdAt: -1 })
      .limit(500)

    const threadMap = new Map()
    for (const m of messages) {
      const otherId =
        String(m.from._id) === String(me) ? String(m.to._id) : String(m.from._id)
      const other = String(m.from._id) === String(me) ? m.to : m.from
      if (!threadMap.has(otherId)) {
        const unread =
          String(m.to._id) === String(me) && !m.readAt ? 1 : 0
        threadMap.set(otherId, {
          user: other,
          lastMessage: m,
          unread,
        })
      } else if (String(m.to._id) === String(me) && !m.readAt) {
        threadMap.get(otherId).unread += 1
      }
    }

    const threads = Array.from(threadMap.values())
    res.json({ success: true, threads })
  }),
)

/** Conversation with one person */
router.get(
  '/mail/with/:userId',
  requireAuth,
  asyncHandler(async (req, res) => {
    const me = req.user._id
    const otherId = req.params.userId

    const other = await User.findById(otherId).select(
      'name email avatar role title company',
    )
    if (!other) throw new AppError('User not found', 404)

    const messages = await Message.find({
      $or: [
        { from: me, to: otherId },
        { from: otherId, to: me },
      ],
      clearedBy: { $ne: me },
    })
      .populate('from', 'name avatar')
      .populate('to', 'name avatar')
      .sort({ createdAt: 1 })

    // Mark incoming as read
    await Message.updateMany(
      { from: otherId, to: me, readAt: null },
      { readAt: new Date() },
    )

    res.json({ success: true, other, messages })
  }),
)

/** Send company mail */
router.post(
  '/mail',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { to, body, subject } = req.body
    if (!to || !body?.trim()) throw new AppError('Recipient and message required')

    const recipient = await User.findById(to)
    if (!recipient) throw new AppError('Recipient not found', 404)

    const message = await Message.create({
      from: req.user._id,
      to,
      subject: subject || '',
      body: body.trim(),
    })

    await message.populate('from', 'name avatar email')
    await message.populate('to', 'name avatar email')

    await Notification.create({
      userId: to,
      type: 'mail',
      title: `Mail from ${req.user.name}`,
      body: body.trim().slice(0, 120),
      link: `/inbox?tab=mail&with=${req.user._id}`,
    })

    const io = req.app.get('io')
    if (io) {
      io.to(`user:${to}`).emit('mail:new', {
        message,
        from: req.user.toSafeJSON?.() || { name: req.user.name },
      })
    }

    res.status(201).json({ success: true, message })
  }),
)

/** Mark later / clear */
router.patch(
  '/mail/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    const message = await Message.findById(req.params.id)
    if (!message) throw new AppError('Message not found', 404)

    const me = req.user._id
    if (
      String(message.from) !== String(me) &&
      String(message.to) !== String(me)
    ) {
      throw new AppError('Forbidden', 403)
    }

    if (req.body.later) {
      if (!message.laterBy.some((id) => String(id) === String(me))) {
        message.laterBy.push(me)
      }
    }
    if (req.body.clear) {
      if (!message.clearedBy.some((id) => String(id) === String(me))) {
        message.clearedBy.push(me)
      }
    }
    if (req.body.read) {
      if (String(message.to) === String(me)) message.readAt = new Date()
    }

    await message.save()
    res.json({ success: true, message })
  }),
)

export default router
