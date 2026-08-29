import mongoose from 'mongoose'
import { Readable } from 'stream'
import { compressUploadBuffer } from './compressUpload.js'

const BUCKET = 'media'

function bucket() {
  const db = mongoose.connection.db
  if (!db) throw new Error('MongoDB is not connected')
  return new mongoose.mongo.GridFSBucket(db, { bucketName: BUCKET })
}

/**
 * Store a multer file buffer in MongoDB GridFS (same Atlas DB — free tier OK).
 * Returns a stable site link: /api/media/:id
 */
export async function storeFileBuffer(
  file,
  { tenantId = null, uploadedBy = null, kind = 'file' } = {},
) {
  if (!file?.buffer) throw new Error('No file buffer to store')

  const compressed = await compressUploadBuffer(file)

  const filename = String(compressed.originalname || 'file').replace(
    /[^a-zA-Z0-9._-]/g,
    '_',
  )
  const metadata = {
    tenantId: tenantId ? String(tenantId) : null,
    uploadedBy: uploadedBy ? String(uploadedBy) : null,
    kind,
    originalName: compressed.originalname || filename,
    mimeType: compressed.mimetype || 'application/octet-stream',
    size: compressed.size || compressed.buffer.length,
  }

  const id = await new Promise((resolve, reject) => {
    const uploadStream = bucket().openUploadStream(filename, {
      contentType: metadata.mimeType,
      metadata,
    })
    uploadStream.on('error', reject)
    uploadStream.on('finish', () => resolve(uploadStream.id))
    Readable.from(compressed.buffer).pipe(uploadStream)
  })

  const url = `/api/media/${id}`
  return {
    id: String(id),
    url,
    name: metadata.originalName,
    mime: metadata.mimeType,
    size: metadata.size,
  }
}

export async function findMediaFile(id) {
  if (!id || !mongoose.isValidObjectId(id)) return null
  const files = await bucket().find({ _id: new mongoose.Types.ObjectId(id) }).toArray()
  return files[0] || null
}

export function openMediaDownload(id) {
  return bucket().openDownloadStream(new mongoose.Types.ObjectId(id))
}

export async function deleteMediaFile(id) {
  if (!id || !mongoose.isValidObjectId(id)) return false
  try {
    await bucket().delete(new mongoose.Types.ObjectId(id))
    return true
  } catch {
    return false
  }
}

/** Extract GridFS id from /api/media/:id or legacy paths. */
export function mediaIdFromUrl(url) {
  if (!url) return null
  const m = String(url).match(/\/api\/media\/([a-f0-9]{24})/i)
  return m?.[1] || null
}
