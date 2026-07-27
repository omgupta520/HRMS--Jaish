/**
 * Employee document management. Files are uploaded via Multer (see upload
 * middleware) and stored on disk; metadata is persisted here. Access is gated:
 * employees see only their own documents; HR sees the whole company.
 */
const path = require('path');
const fs = require('fs');

const Document = require('../models/Document');
const Employee = require('../models/Employee');

const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const { ok, created } = require('../utils/ApiResponse');
const { UPLOAD_ROOT } = require('../middleware/upload');
const { ROLES } = require('../config/roles');
const audit = require('../services/audit.service');

/** GET /documents?employee= */
const list = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.user.role !== ROLES.SUPER_ADMIN) filter.company = req.user.company;
  if (req.user.role === ROLES.EMPLOYEE) filter.employee = req.user.employee;
  else if (req.query.employee) filter.employee = req.query.employee;

  const docs = await Document.find(filter).populate('uploadedBy', 'name').sort('-createdAt');
  return ok(res, { data: docs });
});

/** POST /documents (multipart) — upload a document for an employee. */
const upload = asyncHandler(async (req, res) => {
  if (!req.file) throw ApiError.badRequest('No file uploaded');
  const employeeId = req.body.employee || req.user.employee;
  const employee = await Employee.findById(employeeId);
  if (!employee) throw ApiError.notFound('Employee not found');
  if (req.user.role !== ROLES.SUPER_ADMIN && String(employee.company) !== String(req.user.company)) {
    throw ApiError.forbidden();
  }

  const relPath = path.relative(UPLOAD_ROOT, req.file.path);
  const doc = await Document.create({
    company: employee.company,
    employee: employee._id,
    title: req.body.title || req.file.originalname,
    category: req.body.category || 'other',
    fileName: req.file.originalname,
    filePath: relPath,
    mimeType: req.file.mimetype,
    size: req.file.size,
    uploadedBy: req.user.id,
  });
  await audit.record(req, { action: 'document.upload', entity: 'Document', entityId: doc._id });
  return created(res, { message: 'Document uploaded', data: doc });
});

/** GET /documents/:id/download */
const download = asyncHandler(async (req, res) => {
  const doc = await Document.findById(req.params.id);
  if (!doc) throw ApiError.notFound('Document not found');
  // Permission: owner employee, or HR/super-admin of the same company.
  const isOwner = String(doc.employee) === String(req.user.employee);
  const sameCompany = String(doc.company) === String(req.user.company);
  const privileged = [ROLES.SUPER_ADMIN, ROLES.HR].includes(req.user.role) && (sameCompany || req.user.role === ROLES.SUPER_ADMIN);
  if (!isOwner && !privileged) throw ApiError.forbidden();

  const absolute = path.join(UPLOAD_ROOT, doc.filePath);
  if (!fs.existsSync(absolute)) throw ApiError.notFound('File no longer exists on server');
  return res.download(absolute, doc.fileName);
});

/** DELETE /documents/:id */
const remove = asyncHandler(async (req, res) => {
  const doc = await Document.findById(req.params.id);
  if (!doc) throw ApiError.notFound('Document not found');
  const sameCompany = String(doc.company) === String(req.user.company);
  const privileged = [ROLES.SUPER_ADMIN, ROLES.HR].includes(req.user.role) && (sameCompany || req.user.role === ROLES.SUPER_ADMIN);
  if (!privileged) throw ApiError.forbidden('Only HR can delete documents');

  const absolute = path.join(UPLOAD_ROOT, doc.filePath);
  if (fs.existsSync(absolute)) fs.unlinkSync(absolute);
  await doc.deleteOne();
  await audit.record(req, { action: 'document.delete', entity: 'Document', entityId: doc._id });
  return ok(res, { message: 'Document deleted' });
});

module.exports = { list, upload, download, remove };
