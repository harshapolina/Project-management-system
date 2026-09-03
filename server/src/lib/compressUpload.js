import sharp from 'sharp'

/**
 * Compress images (and leave other MIME types alone) before GridFS storage.
 * Client already shrinks photos; this is the safety net for mobile / direct API uploads.
 */
const MAX_EDGE = 1920
const JPEG_QUALITY = 78
const PNG_QUALITY = 80

const SKIP = new Set(['image/gif', 'image/svg+xml', 'image/x-icon'])

export async function compressUploadBuffer(file) {
  if (!file?.buffer) return file
  const mime = String(file.mimetype || '').toLowerCase()
  if (!mime.startsWith('image/') || SKIP.has(mime)) return file

  try {
    let pipeline = sharp(file.buffer, { failOn: 'none' }).rotate()
    const meta = await pipeline.metadata()
    const w = meta.width || 0
    const h = meta.height || 0
    const longEdge = Math.max(w, h)
    if (longEdge > MAX_EDGE) {
      pipeline = pipeline.resize({
        width: w >= h ? MAX_EDGE : undefined,
        height: h > w ? MAX_EDGE : undefined,
        fit: 'inside',
        withoutEnlargement: true,
      })
    }

    // Prefer JPEG for photos; keep PNG only when the source needs alpha.
    const wantsAlpha = Boolean(meta.hasAlpha) && mime === 'image/png'
    let out
    let outMime
    let outName = file.originalname || 'image'

    if (wantsAlpha) {
      out = await pipeline.png({ quality: PNG_QUALITY, compressionLevel: 9 }).toBuffer()
      outMime = 'image/png'
    } else {
      out = await pipeline
        .jpeg({ quality: JPEG_QUALITY, mozjpeg: true })
        .toBuffer()
      outMime = 'image/jpeg'
      outName = String(outName).replace(/\.[^.]+$/, '') + '.jpg'
    }

    if (!out?.length || out.length >= file.buffer.length) return file

    return {
      ...file,
      buffer: out,
      size: out.length,
      mimetype: outMime,
      originalname: outName,
    }
  } catch {
    return file
  }
}
