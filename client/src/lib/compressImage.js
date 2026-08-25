/**
 * Long edge, in pixels, that an uploaded photo is capped at.
 *
 * A phone camera shot is ~4000px and 3–8MB. Nothing in the app renders an image
 * wider than a tablet, and 2560px still lets someone zoom into a site photo to
 * read a label. Past that we'd be storing detail nobody sees, in a GridFS bucket
 * that shares the Atlas free tier with every other collection.
 */
const MAX_EDGE = 2560

/** Visually indistinguishable from the source at any size the app renders. */
const QUALITY = 0.85

/**
 * Left alone on purpose: re-encoding a GIF drops its animation, and an SVG is
 * vector data that rasterising would make both blurrier and usually larger.
 */
const SKIP_TYPES = new Set(['image/gif', 'image/svg+xml'])

function isCompressibleImage(file) {
  const type = String(file?.type || '').toLowerCase()
  return type.startsWith('image/') && !SKIP_TYPES.has(type)
}

/** `plan.png` → `plan.jpg`, since the bytes we upload are now JPEG. */
function jpegName(name) {
  return String(name || 'image').replace(/\.[^.]+$/, '') + '.jpg'
}

function canvasToBlob(canvas, quality) {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), 'image/jpeg', quality)
  })
}

/**
 * Shrink an image in the browser before it goes up the wire.
 *
 * Doing this client-side means a slow connection uploads the small file rather
 * than the large one — the transfer is the slow part, not the encode.
 *
 * Best-effort by design: anything unreadable, unsupported, or that decodes to
 * nothing returns the original File. Failing to shrink a file must never mean
 * failing to upload it.
 */
export async function compressImageFile(file) {
  if (typeof window === 'undefined') return file
  if (!(file instanceof File) && !(file instanceof Blob)) return file
  if (!isCompressibleImage(file)) return file
  if (typeof createImageBitmap !== 'function') return file

  let bitmap
  try {
    bitmap = await createImageBitmap(file)

    const longEdge = Math.max(bitmap.width, bitmap.height)
    // Only ever scale down — enlarging adds bytes rather than saving them.
    const scale = longEdge > MAX_EDGE ? MAX_EDGE / longEdge : 1
    const width = Math.round(bitmap.width * scale)
    const height = Math.round(bitmap.height * scale)
    if (!width || !height) return file

    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height

    const ctx = canvas.getContext('2d')
    if (!ctx) return file
    // JPEG has no alpha; without this, transparent PNG areas turn black.
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, width, height)
    ctx.drawImage(bitmap, 0, 0, width, height)

    const blob = await canvasToBlob(canvas, QUALITY)
    // An already-optimised file can grow when re-encoded; keep the smaller one.
    if (!blob || blob.size >= file.size) return file

    return new File([blob], jpegName(file.name), {
      type: 'image/jpeg',
      lastModified: Date.now(),
    })
  } catch {
    return file
  } finally {
    bitmap?.close?.()
  }
}

/**
 * Rebuild a FormData with every image entry compressed.
 *
 * Returns the original instance when nothing changed, so non-image uploads
 * (drawings, BOQ spreadsheets, PDFs) are passed through byte-for-byte rather
 * than round-tripped through a copy.
 */
export async function compressFormDataImages(formData) {
  if (typeof FormData === 'undefined' || !(formData instanceof FormData)) {
    return formData
  }

  const entries = [...formData.entries()]
  if (!entries.some(([, value]) => value instanceof File && isCompressibleImage(value))) {
    return formData
  }

  const next = new FormData()
  for (const [key, value] of entries) {
    next.append(key, value instanceof File ? await compressImageFile(value) : value)
  }
  return next
}
