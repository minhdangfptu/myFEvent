import express from 'express';
import { listPublicEvents, getPublicEventDetail } from '../controllers/eventController.js';

const router = express.Router();

// Public events
router.get('/public', listPublicEvents);
router.get('/:id', getPublicEventDetail);

export default router;


