import * as userService from "../services/userService.js";

import * as eventService from "../services/eventService.js";
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
        const userId = req.params.userId || req.user.id;

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