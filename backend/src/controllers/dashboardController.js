import mongoose from 'mongoose';
import { findEventById } from '../services/eventService.js';
import EventMember from '../models/eventMember.js';
import Department from '../models/department.js';
import Milestone from '../models/milestone.js';
import Calendar from '../models/calendar.js';

const CACHE_TTL_MS = Number(process.env.DASHBOARD_CACHE_TTL_MS || 60_000);
const dashboardCache = new Map();
const inflightBuilds = new Map();

const COMPLETED_STATUSES = [
  'completed',
  'done',
  'hoàn thành',
  'đã hoàn thành',
  'hoan_thanh'
];

const toLowerStatuses = COMPLETED_STATUSES.map((s) => s.toLowerCase());

const coalesceExpr = (fields, fallback = 0) =>
  fields.reduceRight((acc, field) => ({ $ifNull: [field, acc] }), fallback);

const firstNumberExpr = (fields, fallback = 0) =>
  fields.reduceRight(
    (acc, field) => ({
      $cond: [{ $isNumber: field }, field, acc]
    }),
    fallback
  );

const getCacheKey = (eventId) => `dashboard:${eventId}`;

const getCachedDashboard = (eventId) => {
  const cached = dashboardCache.get(getCacheKey(eventId));
  if (!cached) return null;
  if (cached.expiresAt < Date.now()) {
    dashboardCache.delete(getCacheKey(eventId));
    return null;
  }
  return cached.data;
};

const setCachedDashboard = (eventId, data) => {
  dashboardCache.set(getCacheKey(eventId), {
    expiresAt: Date.now() + CACHE_TTL_MS,
    data
  });
};

const buildMemberStats = async (eventObjectId) => {
  const grouped = await EventMember.aggregate([
    { $match: { eventId: eventObjectId, status: { $ne: 'deactive' } } },
    { $group: { _id: '$role', count: { $sum: 1 } } }
  ]);

  const statsMap = grouped.reduce((acc, item) => {
    acc[item._id || 'member'] = item.count;
    return acc;
  }, {});

  const total = grouped.reduce((sum, item) => sum + item.count, 0);

  return {
    total,
    hooc: statsMap.HoOC || 0,
    hod: statsMap.HoD || 0,
    member: statsMap.Member || 0
  };
};

const buildDepartmentStats = async (eventObjectId) => {
  const pipeline = [
    { $match: { eventId: eventObjectId } },
    {
      $project: {
        name: 1,
        allocatedValue: coalesceExpr([
          '$budget',
          '$allocatedBudget',
          '$totalBudget',
          '$planBudget'
        ]),
        spentValue: coalesceExpr([
          '$spent',
          '$budgetSpent',
          '$actualBudget',
          '$actualSpending',
          '$actualCost',
          '$spending'
        ]),
        rawProgress: firstNumberExpr([
          '$progress',
          '$progressPercent',
          '$progressPercentage',
          '$completionRate',
          '$performance.progress'
        ])
      }
    },
    {
      $facet: {
        totals: [
          {
            $group: {
              _id: null,
              total: { $sum: 1 },
              allocated: { $sum: '$allocatedValue' },
              spent: { $sum: '$spentValue' }
            }
          }
        ],
        topDepartments: [
          { $sort: { rawProgress: -1 } },
          { $limit: 3 },
          {
            $project: {
              _id: 1,
              name: { $ifNull: ['$name', 'Ban chưa đặt tên'] },
              progress: {
                $round: [
                  {
                    $min: [
                      100,
                      { $max: [0, { $ifNull: ['$rawProgress', 0] }] }
                    ]
                  },
                  0
                ]
              }
            }
          }
        ],
        departmentIds: [
          { $project: { _id: 1 } },
          {
            $group: {
              _id: null,
              ids: { $push: '$_id' }
            }
          }
        ]
      }
    }
  ];

  const [result] = await Department.aggregate(pipeline);
  const totals = result?.totals?.[0] ?? {};
  const departmentIds = result?.departmentIds?.[0]?.ids ?? [];

  return {
    total: totals.total || 0,
    allocated: totals.allocated || 0,
    spent: totals.spent || 0,
    topDepartments: result?.topDepartments ?? [],
    departmentIds
  };
};

const buildMilestoneStats = async (eventObjectId, now) => {
  const pipeline = [
    { $match: { eventId: eventObjectId, isDeleted: { $ne: true } } },
    {
      $addFields: {
        normalizedStatus: {
          $toLower: { $ifNull: ['$status', ''] }
        },
        target: { $ifNull: ['$targetDate', '$dueDate'] }
      }
    },
    {
      $facet: {
        counts: [
          {
            $group: {
              _id: null,
              total: { $sum: 1 },
              completed: {
                $sum: {
                  $cond: [
                    { $in: ['$normalizedStatus', toLowerStatuses] },
                    1,
                    0
                  ]
                }
              }
            }
          }
        ],
        upcoming: [
          { $match: { target: { $ne: null } } },
          { $match: { target: { $gte: now } } },
          {
            $project: {
              _id: 1,
              name: { $ifNull: ['$name', 'Cột mốc'] },
              status: '$status',
              targetDate: '$target'
            }
          },
          { $sort: { targetDate: 1 } },
          { $limit: 5 }
        ]
      }
    }
  ];

  const [result] = await Milestone.aggregate(pipeline);
  const counts = result?.counts?.[0] ?? {};

  return {
    total: counts.total || 0,
    completed: counts.completed || 0,
    upcoming: result?.upcoming ?? []
  };
};

const buildMeetingSummary = (meetings) => {
  return meetings.map((meeting) => ({
    id: meeting._id,
    name: meeting.name,
    startAt: meeting.startAt,
    endAt: meeting.endAt,
    location: meeting.location,
    locationType: meeting.locationType,
    scope: meeting.type,
    departmentId: meeting.departmentId || null
  }));
};

const buildDashboardData = async (event, eventObjectId) => {
  const now = new Date();

  const [memberStats, departmentStats, milestoneStats] = await Promise.all([
    buildMemberStats(eventObjectId),
    buildDepartmentStats(eventObjectId),
    buildMilestoneStats(eventObjectId, now)
  ]);

  const meetingProjection =
    'name startAt endAt location locationType departmentId type';
  const eventMeetingQuery = {
    eventId: eventObjectId,
    startAt: { $gte: now }
  };

  const [eventMeetings, eventMeetingCount] = await Promise.all([
    Calendar.find(eventMeetingQuery)
      .select(meetingProjection)
      .sort({ startAt: 1 })
      .limit(5)
      .lean(),
    Calendar.countDocuments(eventMeetingQuery)
  ]);

  let departmentMeetings = [];
  let departmentMeetingCount = 0;
  if (departmentStats.departmentIds.length > 0) {
    const departmentMeetingQuery = {
      departmentId: { $in: departmentStats.departmentIds },
      startAt: { $gte: now }
    };

    [departmentMeetings, departmentMeetingCount] = await Promise.all([
      Calendar.find(departmentMeetingQuery)
        .select(meetingProjection)
        .sort({ startAt: 1 })
        .limit(5)
        .lean(),
      Calendar.countDocuments(departmentMeetingQuery)
    ]);
  }

  const mergedMeetings = [...eventMeetings, ...departmentMeetings]
    .sort(
      (a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime()
    )
    .slice(0, 5);

  const payload = {
    event: {
      id: event._id,
      name: event.name,
      status: event.status,
      type: event.type,
      organizerName: event.organizerName,
      startDate: event.eventStartDate,
      endDate: event.eventEndDate,
      location: event.location
    },
    stats: {
      members: memberStats,
      departments: {
        total: departmentStats.total
      },
      milestones: {
        total: milestoneStats.total,
        completed: milestoneStats.completed,
        upcoming: milestoneStats.upcoming.length
      },
      meetings: {
        upcoming: eventMeetingCount + departmentMeetingCount
      },
      budget: {
        allocated: departmentStats.allocated,
        spent: departmentStats.spent
      }
    },
    highlights: {
      topDepartments: departmentStats.topDepartments.map((dept) => ({
        id: dept._id,
        name: dept.name,
        progress: dept.progress
      })),
      nextMilestones: milestoneStats.upcoming,
      upcomingMeetings: buildMeetingSummary(mergedMeetings)
    },
    updatedAt: new Date().toISOString()
  };

  return payload;
};

export const getDashboardOverview = async (req, res) => {
  try {
    const { eventId } = req.params;
    const userId = req.user?.id;

    if (!mongoose.Types.ObjectId.isValid(eventId)) {
      return res.status(400).json({ message: 'Invalid event ID' });
    }

    const eventObjectId = new mongoose.Types.ObjectId(eventId);

    const membership = await EventMember.findOne({
      eventId: eventObjectId,
      userId,
      status: { $ne: 'deactive' }
    })
      .select('_id role')
      .lean();

    if (!membership) {
      return res.status(403).json({ message: 'Bạn không thuộc sự kiện này' });
    }

    const cached = getCachedDashboard(eventId);
    if (cached) {
      return res.status(200).json({
        data: cached,
        meta: { cached: true, ttl: CACHE_TTL_MS }
      });
    }

    let inflight = inflightBuilds.get(eventId);
    if (!inflight) {
      inflight = (async () => {
        const event = await findEventById(eventId);
        if (!event) {
          const err = new Error('Event not found');
          err.status = 404;
          throw err;
        }

        const start = Date.now();
        const payload = await buildDashboardData(event, eventObjectId);
        const duration = Date.now() - start;
        if (duration > 1500) {
          console.warn(
            `[Dashboard] Built overview for event ${eventId} in ${duration}ms`
          );
        }

        setCachedDashboard(eventId, payload);
        return payload;
      })();

      inflight.finally(() => inflightBuilds.delete(eventId));
      inflightBuilds.set(eventId, inflight);
    }

    const payload = await inflight;

    return res.status(200).json({
      data: payload,
      meta: { cached: false, ttl: CACHE_TTL_MS }
    });
  } catch (error) {
    inflightBuilds.delete(req.params?.eventId);
    if (error.status === 404) {
      return res.status(404).json({ message: 'Event not found' });
    }
    console.error('getDashboardOverview error:', error);
    return res.status(500).json({ message: 'Failed to load dashboard overview' });
  }
};

