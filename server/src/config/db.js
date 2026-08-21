import mongoose from 'mongoose'
import dotenv from 'dotenv'

dotenv.config()

export async function connectDB() {
  const uri = process.env.MONGODB_URI
  if (!uri) throw new Error('MONGODB_URI is not set')

  // Reuse warm connection on serverless (Vercel) cold/warm cycles
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection
  }

  mongoose.set('strictQuery', true)
  await mongoose.connect(uri, {
    maxPoolSize: process.env.VERCEL === '1' ? 5 : 10,
    serverSelectionTimeoutMS: 10000,
  })
  console.log('MongoDB connected')
  return mongoose.connection
}
