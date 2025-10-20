import express from 'express';
import authRoute from './authRoute.js';
import eventRoute from './eventRoute.js';

const router = express.Router();

router.use('/auth', authRoute);
router.use('/events', eventRoute);

export default router;
