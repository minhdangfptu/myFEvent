import express from 'express'
import authRoutes from './authRoute.js'

const router = express.Router()

router.use('/auth', authRoutes)

export default router
/**
 * Updated by MinhDang on FA25
 * "A bit of fragrance clings to the hand that gives flowers!"
*/
