import express from 'express';
import authRoute from './authRoute.js';
import eventRoute from './eventRoute.js';
import userRoute from './userRoute.js';
import taskRoute from './taskRoute.js';
import feedbackRoute from './feedbackRoute.js';
import notificationRoute from './notificationRoute.js';


const router = express.Router();

router.use('/auth', authRoute);
router.use('/events', eventRoute);
router.use('/user', userRoute)
router.use('/tasks', taskRoute);
router.use('/feedback', feedbackRoute);
router.use('/notifications', notificationRoute);
export default router;
