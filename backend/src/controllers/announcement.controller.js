/**
 * Announcements & notices. HR creates company-wide or department-scoped notices;
 * employees read them and the unread count drives the notification badge.
 */
const Announcement = require('../models/Announcement');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const { ok, created } = require('../utils/ApiResponse');
const { getPagination, buildMeta } = require('../utils/pagination');
const { ROLES } = require('../config/roles');
const audit = require('../services/audit.service');

/** Visibility filter: company-wide notices + ones for the user's department. */
function visibilityFilter(req) {
  const filter = { company: req.user.company, isActive: true };
  if ([ROLES.SUPER_ADMIN, ROLES.HR].includes(req.user.role)) return filter;
  const dept = req.user.employeeDoc?.department;
  filter.$or = [{ audience: 'company' }, ...(dept ? [{ audience: 'department', department: dept }] : [])];
  return filter;
}

/** GET /announcements */
const list = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPagination(req.query);
  const filter = visibilityFilter(req);
  const [items, total] = await Promise.all([
    Announcement.find(filter).populate('createdBy', 'name').populate('department', 'name').sort('-createdAt').skip(skip).limit(limit),
    Announcement.countDocuments(filter),
  ]);
  const data = items.map((a) => ({
    ...a.toObject(),
    isRead: a.readBy.some((u) => String(u) === String(req.user.id)),
  }));
  return ok(res, { data, meta: buildMeta({ page, limit, total }) });
});

/** GET /announcements/unread-count */
const unreadCount = asyncHandler(async (req, res) => {
  const filter = { ...visibilityFilter(req), readBy: { $ne: req.user.id } };
  const count = await Announcement.countDocuments(filter);
  return ok(res, { data: { count } });
});

/** POST /announcements (HR) */
const create = asyncHandler(async (req, res) => {
  const announcement = await Announcement.create({
    ...req.body,
    company: req.user.company,
    createdBy: req.user.id,
  });
  await audit.record(req, { action: 'announcement.create', entity: 'Announcement', entityId: announcement._id });
  return created(res, { message: 'Announcement published', data: announcement });
});

/** PATCH /announcements/:id/read */
const markRead = asyncHandler(async (req, res) => {
  await Announcement.updateOne({ _id: req.params.id }, { $addToSet: { readBy: req.user.id } });
  return ok(res, { message: 'Marked as read' });
});

/** DELETE /announcements/:id (HR) */
const remove = asyncHandler(async (req, res) => {
  const filter = { _id: req.params.id };
  if (req.user.role !== ROLES.SUPER_ADMIN) filter.company = req.user.company;
  const deleted = await Announcement.findOneAndDelete(filter);
  if (!deleted) throw ApiError.notFound('Announcement not found');
  await audit.record(req, { action: 'announcement.delete', entity: 'Announcement', entityId: deleted._id });
  return ok(res, { message: 'Announcement deleted' });
});

module.exports = { list, unreadCount, create, markRead, remove };
