import crypto from 'crypto';
import Event from '../models/event.js';
import EventMember from '../models/eventMember.js';

// GET /api/events/public
export const listPublicEvents = async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page || '1', 10), 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit || '12', 10), 1), 100);
    const skip = (page - 1) * limit;
    const search = (req.query.search || '').trim();
    const status = (req.query.status || '').trim();

    const filter = { type: 'public' };
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }
    if (status) {
      filter.status = status;
    }

    const [items, total] = await Promise.all([
      Event.find(filter)
        .sort({ eventDate: 1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .select('name type description eventDate location image status createdAt updatedAt')
        .lean(),
      Event.countDocuments(filter)
    ]);

    return res.status(200).json({
      data: items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('listPublicEvents error:', error);
    return res.status(500).json({ message: 'Failed to load events' });
  }
};

// GET /api/events/:id (public only)
export const getPublicEventDetail = async (req, res) => {
  try {
    const { id } = req.params;
    const event = await Event.findOne({ _id: id, type: 'public' })
      .select('name type description eventDate location image status organizerName createdAt updatedAt')
      .populate({ path: 'organizerName', select: 'fullName email avatarUrl' })
      .lean();
    if (!event) return res.status(404).json({ message: 'Event not found' });

    return res.status(200).json({ data: event });
  } catch (error) {
    console.error('getPublicEventDetail error:', error);
    return res.status(500).json({ message: 'Failed to get event detail' });
  }
};

// POST /api/events/  (create by HoOC)
export const createEvent = async (req, res) => {
  try {
    const { name, description, eventDate, location, type = 'private' } = req.body;
    if (!name) return res.status(400).json({ message: 'Name is required' });
    const date = eventDate ? new Date(eventDate) : new Date();

    // Generate unique join code (try a few times)
    let joinCode;
    for (let i = 0; i < 5; i++) {
      const candidate = crypto.randomBytes(3).toString('hex'); // 6 hex chars
      const exists = await Event.findOne({ joinCode: candidate }).lean();
      if (!exists) { joinCode = candidate; break; }
    }
    if (!joinCode) return res.status(500).json({ message: 'Failed to generate join code' });

    const event = await Event.create({
      name,
      description: description || '',
      eventDate: date,
      location: location || '',
      type,
      organizerName: req.user.id,
      joinCode,
    });

    // Creator becomes HoOC
    await EventMember.create({ eventId: event._id, userId: req.user.id, role: 'HoOC' });

    return res.status(201).json({ message: 'Event created', data: { id: event._id, joinCode } });
  } catch (error) {
    console.error('createEvent error:', error);
    return res.status(500).json({ message: 'Failed to create event' });
  }
};

// POST /api/events/join  (join by code)
export const joinEventByCode = async (req, res) => {
  try {
    const { code } = req.body;
    if (!code) return res.status(400).json({ message: 'Code is required' });

    const event = await Event.findOne({ joinCode: code }).lean();
    if (!event) return res.status(404).json({ message: 'Invalid code' });

    const exists = await EventMember.findOne({ eventId: event._id, userId: req.user.id }).lean();
    if (!exists) {
      await EventMember.create({ eventId: event._id, userId: req.user.id, role: 'staff' });
    }

    return res.status(200).json({ message: 'Joined event', data: { eventId: event._id } });
  } catch (error) {
    console.error('joinEventByCode error:', error);
    return res.status(500).json({ message: 'Failed to join event' });
  }
};

// GET /api/events/:id/summary  (event info with members)
export const getEventSummary = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id).lean();
    if (!event) return res.status(404).json({ message: 'Event not found' });

    const members = await EventMember.find({ eventId: event._id }).populate('userId', 'fullName email').lean();
    return res.status(200).json({ data: { event, members } });
  } catch (error) {
    console.error('getEventSummary error:', error);
    return res.status(500).json({ message: 'Failed to get event' });
  }
};

// GET /api/events/me/list  (events joined by current user)
export const listMyEvents = async (req, res) => {
  try {
    const memberships = await EventMember.find({ userId: req.user.id })
      .sort({ createdAt: -1 })
      .lean();

    const eventIds = memberships.map(m => m.eventId);
    const events = await Event.find({ _id: { $in: eventIds } })
      .select('name status eventDate joinCode')
      .lean();

    return res.status(200).json({ data: events });
  } catch (error) {
    console.error('listMyEvents error:', error);
    return res.status(500).json({ message: 'Failed to list events' });
  }
};


