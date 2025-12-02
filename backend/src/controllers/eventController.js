/* eslint-disable no-unused-vars */
// controllers/eventController.js
import { eventService, findEventById } from '../services/eventService.js';

const ok = (res, status, body) => res.status(status).json(body);
const handle = async (res, fn) => {
  try {
    const result = await fn();
    return;
  } catch (err) {
    const status = err.status || 500;
    const payload = { message: err.message || 'Internal Server Error' };
    if (err.missingFields) payload.missingFields = err.missingFields;
    console.error('EventController error:', err?.message, err?.stack);
    return ok(res, status, payload);
  }
};

// GET /api/events/public
export const listPublicEvents = (req, res) =>
  handle(res, async () => {
    const { page, limit, search, status } = req.query;
    const result = await eventService.listPublicEvents({ page, limit, search, status });
    return ok(res, 200, result);
  });

// GET /api/events/:id (public only)
export const getPublicEventDetail = (req, res) =>
  handle(res, async () => {
    const { id } = req.params;
    const result = await eventService.getPublicEventDetail({ id });
    return ok(res, 200, result);
  });

// GET /api/events/private/:id
export const getPrivateEventDetail = (req, res) =>
  handle(res, async () => {
    const { id } = req.params;
    const result = await eventService.getPrivateEventDetail({ id });
    return ok(res, 200, result);
  });

// POST /api/events
export const createEvent = (req, res) =>
  handle(res, async () => {
    const userId = req.user?.id;
    const result = await eventService.createEvent({ userId, body: req.body });
    return ok(res, 201, result);
  });

// POST /api/events/join
export const joinEventByCode = (req, res) =>
  handle(res, async () => {
    const userId = req.user?.id;
    const { code } = req.body;
    const result = await eventService.joinEventByCode({ userId, code });
    return ok(res, 200, result);
  });

// GET /api/events/:id/summary
export const getEventSummary = (req, res) =>
  handle(res, async () => {
    const { id } = req.params;
    const result = await eventService.getEventSummary({ id });
    return ok(res, 200, result);
  });

// GET /api/events/me/list
export const listMyEvents = (req, res) =>
  handle(res, async () => {
    const userId = req.user?.id;
    const { page, limit, search } = req.query;
    const result = await eventService.listMyEvents({ userId, page, limit, search });
    return ok(res, 200, result);
  });

// PATCH /api/events/:id
export const updateEvent = (req, res) =>
  handle(res, async () => {
    const userId = req.user?.id;
    const { id } = req.params;
    const result = await eventService.updateEvent({ userId, id, body: req.body });
    return ok(res, 200, result);
  });

// DELETE /api/events/:id
export const deleteEvent = (req, res) =>
  handle(res, async () => {
    const userId = req.user?.id;
    const { id } = req.params;
    const result = await eventService.deleteEvent({ userId, id });
    return ok(res, 200, result);
  });

// PATCH /api/events/:id/image
export const updateEventImage = (req, res) =>
  handle(res, async () => {
    const userId = req.user?.id;
    const { id } = req.params;
    const { image } = req.body;
    const result = await eventService.updateEventImage({ userId, id, image });
    return ok(res, 200, result);
  });

// GET /api/events/detail/:id
export const getAllEventDetail = (req, res) =>
  handle(res, async () => {
    const userId = req.user?.id;
    const { id } = req.params;
    const result = await eventService.getAllEventDetail({ userId, id });
    return ok(res, 200, result);
  });