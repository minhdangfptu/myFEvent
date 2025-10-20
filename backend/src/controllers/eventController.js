import Event from '../models/event.js';

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


