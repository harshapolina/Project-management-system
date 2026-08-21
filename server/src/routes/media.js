import express from 'express'
import { requireAuth } from '../middleware/auth.js'
import { asyncHandler, AppError } from '../middleware/errorHandler.js'
import {
  storeFileBuffer,
  findMediaFile,
  openMediaDownload,
} from '../lib/mediaStore.js'
import { upload } from '../middleware/upload.js'

const router = express.Router()

/**
 * Authenticated upload → MongoDB GridFS → instant /api/media/:id link.
 * Field name: `file`
 */
router.post(
  '/',
  requireAuth,
  upload.single('file'),
  asyncHandler(async (req, res) => {
    if (!req.file) throw new AppError('File is required', 400)

    const imagesOnly = req.query.imagesOnly === '1' || req.query.images === '1'
    if (imagesOnly && !String(req.file.mimetype || '').startsWith('image/')) {
      throw new AppError('Only image files are allowed', 400)
    }

    const saved = await storeFileBuffer(req.file, {
      tenantId: req.tenantId || req.user.tenantId,
      uploadedBy: req.user._id,
      kind: imagesOnly ? 'image' : 'file',
    })

    res.status(201).json({
      success: true,
      ...saved,
      // Alias used by many UI call sites
      fileUrl: saved.url,
      logoUrl: saved.url,
    })
  }),
)

/**
 * Public (obscure ObjectId) — so <img src> / PDF viewers work without Bearer tokens.
 * Cache aggressively; files are immutable once stored.
 */
router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const file = await findMediaFile(req.params.id)
    if (!file) throw new AppError('File not found', 404)

    const mime =
      file.contentType ||
      file.metadata?.mimeType ||
      'application/octet-stream'
    const name = file.filename || file.metadata?.originalName || 'file'

    res.setHeader('Content-Type', mime)
    res.setHeader(
      'Content-Disposition',
      `inline; filename="${encodeURIComponent(name)}"`,
    )
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable')
    if (file.length != null) res.setHeader('Content-Length', String(file.length))

    const stream = openMediaDownload(req.params.id)
    stream.on('error', () => {
      if (!res.headersSent) res.status(404).end()
      else res.end()
    })
    stream.pipe(res)
  }),
)

export default router
