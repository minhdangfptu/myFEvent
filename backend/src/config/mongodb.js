import mongoose from 'mongoose'
import { config } from './environment.js'

export async function connectDB() {
  try {
    await mongoose.connect(config.MONGODB_URI, {
      autoIndex: true
    })
    console.log('MongoDB connected')
  } catch (err) {
    console.error('MongoDB connection error:', err)
    process.exit(1)
  }
}

/**
 * Updated by MinhDang on FA25
 * "A bit of fragrance clings to the hand that gives flowers!"
*/
