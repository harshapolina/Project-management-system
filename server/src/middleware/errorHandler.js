export class AppError extends Error {
  constructor(message, statusCode = 400) {
    super(message)
    this.statusCode = statusCode
    this.isOperational = true
  }
}

export function errorHandler(err, _req, res, _next) {
  let status = err.statusCode || 500
  let message = err.message || 'Internal server error'

  // Zod validation
  if (err?.name === 'ZodError' || Array.isArray(err?.issues)) {
    status = 400
    message =
      err.issues?.map((i) => i.message).filter(Boolean).join('; ') ||
      'Validation failed'
  }

  // Mongoose validation / cast
  if (err?.name === 'ValidationError') {
    status = 400
    message =
      Object.values(err.errors || {})
        .map((e) => e.message)
        .filter(Boolean)
        .join('; ') || 'Validation failed'
  }
  if (err?.name === 'CastError') {
    status = 400
    message = `Invalid ${err.path || 'value'}`
  }

  // Duplicate key
  if (err?.code === 11000) {
    status = 409
    message = 'Already exists'
  }

  if (process.env.NODE_ENV !== 'production') {
    console.error(err)
  }

  res.status(status).json({
    success: false,
    message,
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack }),
  })
}

export function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next)
}

