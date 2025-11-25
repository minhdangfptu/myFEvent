/* eslint-disable no-unused-vars */
// controllers/eventController.js
import { getUserById } from '../services/userService.js';
import { eventService } from '../services/eventService.js';

const ok = (res, status, body) => res.status(status).json(body);
const handle = async (res, fn) => {
  try {
    const result = await fn();
    // controller functions dưới đây đều return đối tượng đã có {message?, data?, pagination?}
    // nên nếu fn() trả về null/undefined thì mặc định 200 OK rỗng
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

// PUT /api/events/:id/images  (replace)
export const replaceEventImages = (req, res) =>
  handle(res, async () => {
    const userId = req.user?.id;
    const { id } = req.params;
    const { images } = req.body;
    const result = await eventService.replaceEventImages({ userId, id, images });
    return ok(res, 200, result);
  });

// POST /api/events/:id/images  (add)
export const addEventImages = (req, res) =>
  handle(res, async () => {
    const userId = req.user?.id;
    const { id } = req.params;
    const { images } = req.body;
    const result = await eventService.addEventImages({ userId, id, images });
    return ok(res, 200, result);
  });

// DELETE /api/events/:id/images
export const removeEventImages = (req, res) =>
  handle(res, async () => {
    const userId = req.user?.id;
    const { id } = req.params;
    const { indexes } = req.body;
    const result = await eventService.removeEventImages({ userId, id, indexes });
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
export const inviteMemberToEvent = async (req, res) => {
  try {
    const { eventId, userId } = req.params;
    const event = await findEventById(eventId);
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }
    const user = await getUserById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    // Check if the user is already a member of the event
    const existingMember = await EventMember.findOne({ eventId, userId });
    if (existingMember) {
      return res.status(400).json({ message: 'User is already a member of the event' });
    }
    // Create a new EventMember document
    const newMember = await createEventMember(userId, eventId);
    return res.status(201).json({ message: 'User invited successfully', data: newMember });
  }catch (error) {
    console.error('inviteMemberToEvent error:', error);
    return res.status(500).json({ message: 'Failed to invite member' });
  }
}
  