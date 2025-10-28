import crypto from 'crypto';
import Event from '../models/event.js';
import EventMember from '../models/eventMember.js';
import ensureEventRole from '../utils/ensureEventRole.js';

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

// GET /api/events/private/:id (private events for authenticated users) - TẠM THỜI BỎ PHÂN QUYỀN
export const getPrivateEventDetail = async (req, res) => {
  try {
    const { id } = req.params;
    
    // TẠM THỜI BỎ PHÂN QUYỀN - Cho phép tất cả user đã login
    // const membership = await EventMember.findOne({ eventId: id, userId: req.user.id }).lean();
    // if (!membership) {
    //   return res.status(403).json({ message: 'Access denied. You are not a member of this event.' });
    // }

    const event = await Event.findById(id)
      .select('name type description eventDate location image status organizerName joinCode createdAt updatedAt')
      .lean();
    
    if (!event) return res.status(404).json({ message: 'Event not found' });

    return res.status(200).json({ data: event });
  } catch (error) {
    console.error('getPrivateEventDetail error:', error);
    return res.status(500).json({ message: 'Failed to get event detail' });
  }
};

// POST /api/events/  (create by HoOC)
export const createEvent = async (req, res) => {
  try {
    const { name, description, eventDate, location, type = 'private', images, organizerName } = req.body;
    
    if (!name) return res.status(400).json({ message: 'Name is required' });
    if (!organizerName) return res.status(400).json({ message: 'Organizer name is required' });
    const date = eventDate ? new Date(eventDate) : new Date();

    // Generate unique join code (try a few times)
    let joinCode;
    for (let i = 0; i < 5; i++) {
      const candidate = crypto.randomBytes(3).toString('hex'); // 6 hex chars
      const exists = await Event.findOne({ joinCode: candidate }).lean();
      if (!exists) { joinCode = candidate; break; }
    }
    if (!joinCode) return res.status(500).json({ message: 'Failed to generate join code' });

    // Process images - support both URLs and base64 uploads
    let processedImages = [];
    if (images && Array.isArray(images)) {
      // console.log('createEvent - Processing images:', images);
      processedImages = images.filter(img => {
        // Accept URLs or base64 data
        if (typeof img === 'string') {
          // Check if it's a URL
          if (img.startsWith('http://') || img.startsWith('https://')) {
            // console.log('createEvent - Valid URL:', img);
            return true;
          }
          // Check if it's base64 data
          if (img.startsWith('data:image/')) {
            // console.log('createEvent - Valid base64 image');
            return true;
          }
        }
        // console.log('createEvent - Invalid image format:', img);
        return false;
      });
    }
    // console.log('createEvent - Processed images:', processedImages);

    const event = await Event.create({
      name,
      description: description || '',
      eventDate: date,
      location: location || '',
      type,
      organizerName,
      joinCode,
      image: processedImages
    });

    console.log('createEvent - Created event:', event);

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
      await EventMember.create({ eventId: event._id, userId: req.user.id, role: 'Member' });
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
    .populate('userId', 'fullName')
      .sort({ createdAt: -1 })
      .lean();

    const eventIds = memberships.map(m => m.eventId);
    const events = await Event.find({ _id: { $in: eventIds } })
      .select('name status eventDate joinCode image type description location organizerName')
      .lean();

    // Map events with membership info
    const eventsWithMembership = events.map(event => {
      const membership = memberships.find(m => m.eventId.toString() === event._id.toString());
      // console.log('listMyEvents - Event data:', event);
      // console.log('listMyEvents - Event images:', event.image);
      return {
        ...event,
        eventMember: membership 
      ? {
          role: membership.role,
          userId: membership.userId,
          _id: membership._id,
        }
      : null,
      };
    });

    // console.log('listMyEvents - Final events with membership:', eventsWithMembership);

    return res.status(200).json({ data: eventsWithMembership });
  } catch (error) {
    console.error('listMyEvents error:', error);
    return res.status(500).json({ message: 'Failed to list events' });
  }
};

// PATCH /api/events/:id (update event)
export const updateEvent = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, organizerName, eventDate, location, type } = req.body;
    
    const membership = await ensureEventRole(req.user.id, id, ['HoOC']);
    if (!membership) return res.status(403).json({ message: 'Insufficient permissions' });

    const updateData = {};
    if (name) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (organizerName) updateData.organizerName = organizerName;
    if (eventDate) updateData.eventDate = new Date(eventDate);
    if (location !== undefined) updateData.location = location;
    if (type) updateData.type = type;

    const event = await Event.findByIdAndUpdate(id, updateData, { new: true });
    if (!event) return res.status(404).json({ message: 'Event not found' });

    return res.status(200).json({ message: 'Event updated', data: event });
  } catch (error) {
    console.error('updateEvent error:', error);
    return res.status(500).json({ message: 'Failed to update event' });
  }
};

// DELETE /api/events/:id (delete event)
export const deleteEvent = async (req, res) => {
  try {
    const { id } = req.params;
    
    const membership = await ensureEventRole(req.user.id, id, ['HoOC']);
    if (!membership) return res.status(403).json({ message: 'Insufficient permissions' });

    await EventMember.deleteMany({ eventId: id });
    await Event.findByIdAndDelete(id);

    return res.status(200).json({ message: 'Event deleted' });
  } catch (error) {
    console.error('deleteEvent error:', error);
    return res.status(500).json({ message: 'Failed to delete event' });
  }
};

export const replaceEventImages = async (req, res) => {
  try {
    const { id } = req.params;
    const { images } = req.body;
    if (!Array.isArray(images)) return res.status(400).json({ message: 'images must be an array of base64 strings' });

    const membership = await ensureEventRole(req.user.id, id, ['HoOC', 'HoD']);
    if (!membership) return res.status(403).json({ message: 'Insufficient permissions' });

    const sanitized = images.filter((s) => typeof s === 'string' && s.length > 0);
    const event = await Event.findByIdAndUpdate(
      id,
      { $set: { image: sanitized } },
      { new: true }
    ).select('image');
    if (!event) return res.status(404).json({ message: 'Event not found' });

    return res.status(200).json({ message: 'Images updated', data: { image: event.image } });
  } catch (error) {
    console.error('replaceEventImages error:', error);
    return res.status(500).json({ message: 'Failed to update images' });
  }
};

export const addEventImages = async (req, res) => {
  try {
    const { id } = req.params;
    const { images } = req.body;
    if (!Array.isArray(images) || images.length === 0) return res.status(400).json({ message: 'images is required' });

    const membership = await ensureEventRole(req.user.id, id, ['HoOC', 'HoD']);
    if (!membership) return res.status(403).json({ message: 'Insufficient permissions' });

    const sanitized = images.filter((s) => typeof s === 'string' && s.length > 0);
    const event = await Event.findByIdAndUpdate(
      id,
      { $push: { image: { $each: sanitized } } },
      { new: true }
    ).select('image');
    if (!event) return res.status(404).json({ message: 'Event not found' });

    return res.status(200).json({ message: 'Images added', data: { image: event.image } });
  } catch (error) {
    console.error('addEventImages error:', error);
    return res.status(500).json({ message: 'Failed to add images' });
  }
};

export const removeEventImages = async (req, res) => {
  try {
    const { id } = req.params;
    const { indexes } = req.body;
    if (!Array.isArray(indexes)) return res.status(400).json({ message: 'indexes must be an array of numbers' });

    const membership = await ensureEventRole(req.user.id, id, ['HoOC', 'HoD']);
    if (!membership) return res.status(403).json({ message: 'Insufficient permissions' });

    const event = await Event.findById(id).select('image');
    if (!event) return res.status(404).json({ message: 'Event not found' });

    const keep = event.image.filter((_, idx) => !indexes.includes(idx));
    event.image = keep;
    await event.save();

    return res.status(200).json({ message: 'Images removed', data: { image: event.image } });
  } catch (error) {
    console.error('removeEventImages error:', error);
    return res.status(500).json({ message: 'Failed to remove images' });
  }
};

// GET /api/events/detail/:id (get all type event detail - public or private with membership check)
export const getAllEventDetail = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get event details
    const event = await Event.findById(id)
      .select('name type description eventDate location image status organizerName joinCode createdAt updatedAt')
      .populate({ path: 'organizerName', select: 'fullName email' })
      .lean();
    
    if (!event) return res.status(404).json({ message: 'Event not found' });

    // Check if event is public
    if (event.type === 'public') {
      return res.status(200).json({ data: { event } });
    }

    // If private, check if user is a member
    const membership = await EventMember.findOne({ eventId: id, userId: req.user.id }).lean();
    
    if (!membership) {
      return res.status(403).json({ message: 'Access denied. You are not a member of this event.' });
    }

    // User is a member, return event details
    return res.status(200).json({ data: { event } });
  } catch (error) {
    console.error('getAllEventDetail error:', error);
    return res.status(500).json({ message: 'Failed to get event detail' });
  }
};


