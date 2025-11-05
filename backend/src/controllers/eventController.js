import crypto from 'crypto';
import Event from '../models/event.js';
import EventMember from '../models/eventMember.js';
import ensureEventRole from '../utils/ensureEventRole.js';
import {
  calculateEventStatus,
  ensureAutoStatusForDoc,
  ensureAutoStatusForDocs
} from '../utils/autoUpdateStatus.js';

// Helper: kiểm tra dữ liệu đủ để public
const validateEventDataForPublic = (event) => {
  const missingFields = [];
  if (!event.name || !event.name.trim()) missingFields.push('Tên sự kiện');
  if (!event.description || !event.description.trim()) missingFields.push('Mô tả');
  if (!event.organizerName || !event.organizerName.trim()) missingFields.push('Người tổ chức');
  if (!event.eventStartDate) missingFields.push('Ngày bắt đầu');
  if (!event.eventEndDate) missingFields.push('Ngày kết thúc');
  if (!event.location || !event.location.trim()) missingFields.push('Địa điểm');
  if (!event.image || !Array.isArray(event.image) || event.image.length === 0) missingFields.push('Hình ảnh sự kiện');

  return { isValid: missingFields.length === 0, missingFields };
};

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
    if (status) filter.status = status;

    const [items, total] = await Promise.all([
      Event.find(filter)
        .sort({ eventDate: 1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .select('name type description eventEndDate location image status createdAt updatedAt eventStartDate organizerName')
        .lean(),
      Event.countDocuments(filter)
    ]);

    const data = await ensureAutoStatusForDocs(items);

    return res.status(200).json({
      data,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
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
      .select('name type description eventStartDate eventEndDate location image status organizerName createdAt updatedAt')
      .populate({ path: 'organizerName', select: 'fullName email avatarUrl' })
      .lean();

    if (!event) return res.status(404).json({ message: 'Event not found' });

    const data = await ensureAutoStatusForDoc(event);
    return res.status(200).json({ data });
  } catch (error) {
    console.error('getPublicEventDetail error:', error);
    return res.status(500).json({ message: 'Failed to get event detail' });
  }
};

// GET /api/events/private/:id  (tạm bỏ phân quyền đọc)
export const getPrivateEventDetail = async (req, res) => {
  try {
    const { id } = req.params;
    const event = await Event.findById(id)
      .select('name type description eventStartDate eventEndDate location image status organizerName joinCode createdAt updatedAt')
      .lean();

    if (!event) return res.status(404).json({ message: 'Event not found' });

    const data = await ensureAutoStatusForDoc(event);
    return res.status(200).json({ data });
  } catch (error) {
    console.error('getPrivateEventDetail error:', error);
    return res.status(500).json({ message: 'Failed to get event detail' });
  }
};

// POST /api/events/ (create by HoOC)
export const createEvent = async (req, res) => {
  try {
    const { name, description, eventStartDate, eventEndDate, location, type = 'private', images, organizerName } = req.body;

    if (!name) return res.status(400).json({ message: 'Name is required' });
    if (!organizerName) return res.status(400).json({ message: 'Organizer name is required' });

    const startdate = eventStartDate ? new Date(eventStartDate) : new Date();
    const endDate = eventEndDate ? new Date(eventEndDate) : new Date();
    if (endDate < startdate) return res.status(400).json({ message: 'End date must be after start date' });

    const nowDate = new Date();
    if (startdate < nowDate || endDate < nowDate) {
      return res.status(400).json({ message: 'Start date and end date must be in the future' });
    }

    // Tạo join code
    let joinCode;
    for (let i = 0; i < 5; i++) {
      const candidate = crypto.randomBytes(3).toString('hex'); // 6 hex
      const exists = await Event.findOne({ joinCode: candidate }).lean();
      if (!exists) { joinCode = candidate; break; }
    }
    if (!joinCode) return res.status(500).json({ message: 'Failed to generate join code' });

    // Lọc hình hợp lệ (URL hoặc base64)
    let processedImages = [];
    if (images && Array.isArray(images)) {
      processedImages = images.filter(img =>
        typeof img === 'string' &&
        (img.startsWith('http://') || img.startsWith('https://') || img.startsWith('data:image/'))
      );
    }

    const autoStatus = calculateEventStatus(startdate, endDate);

    const event = await Event.create({
      name,
      description: description || '',
      eventStartDate: startdate,
      eventEndDate: endDate,
      location: location || '',
      type,
      organizerName,
      joinCode,
      image: processedImages,
      status: autoStatus // enum: scheduled/ongoing/completed (cancelled chỉ khi explicit)
    });

    // Creator -> HoOC
    await EventMember.create({ eventId: event._id, userId: req.user.id, role: 'HoOC' });

    return res.status(201).json({ message: 'Event created', data: { id: event._id, joinCode } });
  } catch (error) {
    console.error('createEvent error:', error);
    return res.status(500).json({ message: 'Failed to create event' });
  }
};

// POST /api/events/join
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

// GET /api/events/:id/summary
export const getEventSummary = async (req, res) => {
  try {
    const eventRaw = await Event.findById(req.params.id).lean();
    if (!eventRaw) return res.status(404).json({ message: 'Event not found' });

    const [event, members] = await Promise.all([
      ensureAutoStatusForDoc(eventRaw),
      EventMember.find({ eventId: eventRaw._id }).populate('userId', 'fullName email').lean()
    ]);

    return res.status(200).json({ data: { event, members } });
  } catch (error) {
    console.error('getEventSummary error:', error);
    return res.status(500).json({ message: 'Failed to get event' });
  }
};

// GET /api/events/me/list
export const listMyEvents = async (req, res) => {
  try {
    const memberships = await EventMember.find({ userId: req.user.id })
      .populate('userId', 'fullName')
      .sort({ createdAt: -1 })
      .lean();

    const eventIds = memberships.map(m => m.eventId);
    const events = await Event.find({ _id: { $in: eventIds } })
      .select('name status eventStartDate eventEndDate joinCode image type description location organizerName')
      .lean();

    const eventsFixed = await ensureAutoStatusForDocs(events);

    const eventsWithMembership = eventsFixed.map(event => {
      const membership = memberships.find(m => m.eventId.toString() === event._id.toString());
      return {
        ...event,
        eventMember: membership ? {
          role: membership.role,
          userId: membership.userId,
          _id: membership._id,
        } : null,
      };
    });

    return res.status(200).json({ data: eventsWithMembership });
  } catch (error) {
    console.error('listMyEvents error:', error);
    return res.status(500).json({ message: 'Failed to list events' });
  }
};

// PATCH /api/events/:id
export const updateEvent = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, organizerName, eventStartDate, eventEndDate, location, type } = req.body;

    const membership = await ensureEventRole(req.user.id, id, ['HoOC']);
    if (!membership) return res.status(403).json({ message: 'Insufficient permissions' });

    const currentEvent = await Event.findById(id);
    if (!currentEvent) return res.status(404).json({ message: 'Event not found' });

    const updateData = {};
    if (name) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (organizerName) updateData.organizerName = organizerName;

    // Dates
    const newStartDate = eventStartDate ? new Date(eventStartDate) : currentEvent.eventStartDate;
    const newEndDate = eventEndDate ? new Date(eventEndDate) : currentEvent.eventEndDate;
    if (eventStartDate) updateData.eventStartDate = newStartDate;
    if (eventEndDate) updateData.eventEndDate = newEndDate;

    if (newEndDate < newStartDate) {
      return res.status(400).json({ message: 'End date must be after start date' });
    }

    // Status:
    // - nếu client gửi 'cancelled' -> hủy
    // - ngược lại, chỉ auto-tính nếu hiện tại không phải 'cancelled'
    if (req.body.status === 'cancelled') {
      updateData.status = 'cancelled';
      updateData.type = 'private'; // optional: tự về private khi hủy
    } else if (currentEvent.status !== 'cancelled') {
      updateData.status = calculateEventStatus(newStartDate, newEndDate);
    }

    if (location !== undefined) updateData.location = location;

    // Kiểm tra khi chuyển sang public
    // (chỉ áp khi kết quả cuối cùng là public)
    const nextType = (req.body.status === 'cancelled')
      ? 'private'
      : (type ?? currentEvent.type);

    if (nextType === 'public' && currentEvent.type !== 'public') {
      const eventToValidate = { ...currentEvent.toObject(), ...updateData, type: 'public' };
      const validation = validateEventDataForPublic(eventToValidate);
      if (!validation.isValid) {
        return res.status(400).json({
          message: 'Không thể công khai sự kiện. Vui lòng cập nhật đầy đủ thông tin.',
          missingFields: validation.missingFields
        });
      }
    }

    if (type && req.body.status !== 'cancelled') {
      updateData.type = type;
    }

    const event = await Event.findByIdAndUpdate(id, updateData, { new: true }).lean();
    if (!event) return res.status(404).json({ message: 'Event not found' });

    // đảm bảo status trả ra đúng thời gian thực (và tôn trọng cancelled)
    const data = await ensureAutoStatusForDoc(event);
    return res.status(200).json({ message: 'Event updated', data });
  } catch (error) {
    console.error('updateEvent error:', error);
    return res.status(500).json({ message: 'Failed to update event' });
  }
};

// DELETE /api/events/:id
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

// GET /api/events/detail/:id
export const getAllEventDetail = async (req, res) => {
  try {
    const { id } = req.params;

    const eventRaw = await Event.findById(id)
      .select('name type description eventStartDate eventEndDate location image status organizerName joinCode createdAt updatedAt')
      .populate({ path: 'organizerName', select: 'fullName email' })
      .lean();

    if (!eventRaw) return res.status(404).json({ message: 'Event not found' });

    const event = await ensureAutoStatusForDoc(eventRaw);

    if (event.type === 'public') {
      return res.status(200).json({ data: { event } });
    }
    const membership = await EventMember.findOne({ eventId: id, userId: req.user.id }).lean();
    if (!membership) {
      return res.status(403).json({ message: 'Access denied. You are not a member of this event.' });
    }

    return res.status(200).json({ data: { event } });
  } catch (error) {
    console.error('getAllEventDetail error:', error);
    return res.status(500).json({ message: 'Failed to get event detail' });
  }
};
