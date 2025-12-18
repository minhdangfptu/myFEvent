import * as userService from "../services/userService.js";
import * as eventService from "../services/eventService.js";
import User from "../models/user.js";
import Event from "../models/event.js";
export const getPaginatedUsers = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const search = req.query.search || '';
        const status = req.query.status || 'all';
        const users = await userService.getPaginatedUsers(page, limit, search,status);
        return res.status(200).json(users);
    } catch (err) {
        return res.status(500).json({ message: 'Fail to fetch users', error: err.message });
    }
};

export const banUser = async (req, res) => {
    try {
        const userId = req.params.userId;
        const user = await userService.getUserById(userId);
        const { banReason } = req.body;
        if (!user) {
            console.error('User not found');
            return res.status(404).json({ message: 'User not found' });
        }
        if (user.status === 'banned') {
            console.error('User is already banned');
            return res.status(400).json({ message: 'User is already banned' });
        }
        if (!banReason) {
            console.error('Ban reason is required');
            return res.status(400).json({ message: 'Ban reason is required' });
        }
        await userService.updateUser(userId, { status: 'banned', banReason }, { new: true });
        return res.status(200).json(user);
    } catch (err) {
        console.error('Ban user error:', err.message);
        return res.status(500).json({ message: 'Fail to ban user', error: err.message });
    }
};

export const unbanUser = async (req, res) => {
    try {
        const userId = req.params.userId;
        const user = await userService.getUserById(userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        if (user.status !== 'banned') {
            return res.status(400).json({ message: 'User is not banned' });
        }
        await userService.updateUser(userId, { status: 'active', banReason: '' }, { new: true });
        return res.status(200).json(user);
    } catch (err) {
        return res.status(500).json({ message: 'Fail to unban user', error: err.message });
    }
};

export const getUserProfileWithEvents = async (req, res) => {
    try {
        const userId = req.params.userId;
        if (!userId) {
            return res.status(400).json({ message: 'userId is required' });
        }

        const result = await userService.getUserProfileWithEvents(userId);

        return res.status(200).json({
            message: 'Lấy thông tin thành công',
            data: result
        });
    } catch (err) {
        console.error('Get user profile with events error:', err);
        if (err.message === 'Người dùng không tồn tại') {
            return res.status(404).json({ message: err.message });
        }
        return res.status(500).json({ message: 'Lỗi máy chủ', error: err.message });
    }
};
export const getPaginatedEvents = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const search = req.query.search || '';
        const status = req.query.status || 'all';
        const eventDate = req.query.eventDate || null;
        const events = await eventService.getPaginatedEvents(page, limit, search, status, eventDate);
        return res.status(200).json(events);
    } catch (err) {
        return res.status(500).json({ message: 'Fail to fetch events', error: err.message });
    }
};
export const banEvent = async (req, res) => {
    try {
        const eventId = req.params.eventId;
        const { banReason } = req.body;
        const event = await eventService.getEventById(eventId);
        if (!event) {
            return res.status(404).json({ message: 'Event not found' });
        }
        if (event.banInfo.isBanned) {
            return res.status(400).json({ message: 'Event is already banned' });
        }
        if (event.type === 'private') {
            return res.status(400).json({ message: 'Cannot ban a private event' });
        }
        if (!banReason) {
            return res.status(400).json({ message: 'Ban reason is required' });
        }
        const updatedEvent = await eventService.updateEventByAdmin(
            eventId,
            { banReason },
            "ban"
        );
        return res.status(200).json(updatedEvent);
    } catch (err) {
        console.error('Ban event error:', err.message);
        return res.status(500).json({ message: 'Fail to ban event', error: err.message });
    }
};
export const unbanEvent = async (req, res) => {
    try {
        const eventId = req.params.eventId;
        const event = await eventService.getEventById(eventId);
        if (!event) {
            return res.status(404).json({ message: 'Event not found' });
        }
        if (!event.banInfo.isBanned) {
            return res.status(400).json({ message: 'Event is not banned' });
        }
        const updatedEvent = await eventService.updateEventByAdmin(
            eventId,
            {},
            "unban"
        );
        return res.status(200).json(updatedEvent);
    } catch (err) {
        console.error('Unban event error:', err.message);
        return res.status(500).json({ message: 'Fail to unban event', error: err.message });
    }
};

export const getEventDetail = async (req, res) => {
    try {
        const eventId = req.params.eventId;
        const event = await eventService.getEventByIdForAdmin(eventId);
        return res.status(200).json({
            message: 'Lấy thông tin sự kiện thành công',
            data: event
        });
    } catch (err) {
        if (err.status === 404) {
            return res.status(404).json({ message: err.message || 'Event not found' });
        }
        console.error('Get event detail error:', err);
        return res.status(500).json({ message: 'Fail to get event detail', error: err.message });
    }
};

// Dashboard APIs
export const getDashboardStats = async (req, res) => {
    try {
        const now = new Date();
        const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

        // Tổng số sự kiện (đếm tất cả events, bao gồm cả public và private)
        const totalEvents = await Event.countDocuments({});
        const eventsThisWeek = await Event.countDocuments({
            createdAt: { $gte: oneWeekAgo }
        });

        // Sự kiện bị cấm (không filter type vì banned events đã chuyển thành private)
        const bannedEvents = await Event.countDocuments({
            'banInfo.isBanned': true
        });
        const bannedEventsThisWeek = await Event.countDocuments({
            'banInfo.isBanned': true,
            'banInfo.bannedAt': { $gte: oneWeekAgo }
        });

        // Tổng số người dùng
        const totalUsers = await User.countDocuments({ role: 'user' });
        const usersThisWeek = await User.countDocuments({
            role: 'user',
            createdAt: { $gte: oneWeekAgo }
        });

        // Người dùng bị cấm
        const bannedUsers = await User.countDocuments({
            role: 'user',
            status: 'banned'
        });
        const bannedUsersThisWeek = await User.countDocuments({
            role: 'user',
            status: 'banned',
            updatedAt: { $gte: oneWeekAgo }
        });

        return res.status(200).json({
            totalEvents: {
                value: totalEvents,
                changeThisWeek: eventsThisWeek
            },
            bannedEvents: {
                value: bannedEvents,
                changeThisWeek: bannedEventsThisWeek
            },
            totalUsers: {
                value: totalUsers,
                changeThisWeek: usersThisWeek
            },
            bannedUsers: {
                value: bannedUsers,
                changeThisWeek: bannedUsersThisWeek
            }
        });
    } catch (err) {
        console.error('Get dashboard stats error:', err.message);
        return res.status(500).json({ message: 'Fail to get dashboard stats', error: err.message });
    }
};

export const getRecentBannedEvents = async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 10;
        const bannedEvents = await Event.find({
            'banInfo.isBanned': true
        })
            .select('name organizerName banInfo.bannedAt')
            .sort({ 'banInfo.bannedAt': -1 })
            .limit(limit)
            .lean();

        const formattedEvents = bannedEvents.map(event => ({
            name: event.name,
            organizer: event.organizerName,
            date: event.banInfo?.bannedAt 
                ? new Date(event.banInfo.bannedAt).toLocaleDateString('vi-VN')
                : 'N/A'
        }));

        return res.status(200).json(formattedEvents);
    } catch (err) {
        console.error('Get recent banned events error:', err.message);
        return res.status(500).json({ message: 'Fail to get recent banned events', error: err.message });
    }
};

export const getWeeklyActivity = async (req, res) => {
    try {
        const now = new Date();
        const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

        // Sự kiện tạo mới trong tuần (đếm tất cả events)
        const newEventsThisWeek = await Event.countDocuments({
            createdAt: { $gte: oneWeekAgo }
        });

        // Sự kiện bị cấm trong tuần (không filter type vì banned events đã chuyển thành private)
        const bannedEventsThisWeek = await Event.countDocuments({
            'banInfo.isBanned': true,
            'banInfo.bannedAt': { $gte: oneWeekAgo }
        });

        // Người dùng mới trong tuần
        const newUsersThisWeek = await User.countDocuments({
            role: 'user',
            createdAt: { $gte: oneWeekAgo }
        });

        // Người dùng bị cấm trong tuần
        const bannedUsersThisWeek = await User.countDocuments({
            role: 'user',
            status: 'banned',
            updatedAt: { $gte: oneWeekAgo }
        });

        return res.status(200).json([
            { activity: 'Sự kiện tạo mới', count: newEventsThisWeek },
            { activity: 'Sự kiện bị cấm', count: bannedEventsThisWeek },
            { activity: 'Người dùng mới', count: newUsersThisWeek },
            { activity: 'Người dùng bị cấm', count: bannedUsersThisWeek }
        ]);
    } catch (err) {
        console.error('Get weekly activity error:', err.message);
        return res.status(500).json({ message: 'Fail to get weekly activity', error: err.message });
    }
};

export const getRecentEvents = async (req, res) => {
    try {
        const type = req.query.type || 'new'; // 'new' or 'upcoming'
        const limit = parseInt(req.query.limit) || 10;

        let query = { type: 'public' };
        let sort = {};

        if (type === 'new') {
            // Sự kiện mới tạo
            sort = { createdAt: -1 };
        } else if (type === 'upcoming') {
            // Sự kiện sắp diễn ra
            query.eventStartDate = { $gte: new Date() };
            sort = { eventStartDate: 1 };
        }

        const events = await Event.find(query)
            .select('name organizerName eventStartDate createdAt')
            .sort(sort)
            .limit(limit)
            .lean();

        const formattedEvents = events.map(event => ({
            title: event.name,
            organizer: event.organizerName,
            date: type === 'new' 
                ? (event.createdAt ? new Date(event.createdAt).toLocaleDateString('vi-VN') : 'N/A')
                : (event.eventStartDate ? new Date(event.eventStartDate).toLocaleDateString('vi-VN') : 'N/A')
        }));

        return res.status(200).json(formattedEvents);
    } catch (err) {
        console.error('Get recent events error:', err.message);
        return res.status(500).json({ message: 'Fail to get recent events', error: err.message });
    }
};