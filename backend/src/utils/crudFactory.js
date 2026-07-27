/**
 * Factory that builds standard company-scoped CRUD handlers for a Mongoose model.
 * Used by the "master data" modules (departments, designations, branches, shifts,
 * holidays, leave types) which share identical list/create/update/delete logic.
 *
 * All handlers enforce multi-tenancy via req.companyScope (set by scopeToCompany).
 */
const asyncHandler = require('./asyncHandler');
const ApiError = require('./ApiError');
const { ok, created } = require('./ApiResponse');
const { getPagination, buildMeta } = require('./pagination');
const audit = require('../services/audit.service');

function crudFactory(Model, { name, searchFields = [], populate = [] }) {
  const companyFilter = (req) => {
    // Super admin without a chosen company sees everything; others are scoped.
    if (!req.companyScope) return {};
    return { company: req.companyScope };
  };

  const list = asyncHandler(async (req, res) => {
    const { page, limit, skip } = getPagination(req.query);
    const filter = { ...companyFilter(req) };

    if (req.query.search && searchFields.length) {
      filter.$or = searchFields.map((f) => ({ [f]: { $regex: req.query.search, $options: 'i' } }));
    }
    if (req.query.isActive !== undefined) filter.isActive = req.query.isActive === 'true';

    const [items, total] = await Promise.all([
      Model.find(filter).populate(populate).sort('-createdAt').skip(skip).limit(limit),
      Model.countDocuments(filter),
    ]);

    return ok(res, { data: items, meta: buildMeta({ page, limit, total }) });
  });

  const getOne = asyncHandler(async (req, res) => {
    const item = await Model.findOne({ _id: req.params.id, ...companyFilter(req) }).populate(populate);
    if (!item) throw ApiError.notFound(`${name} not found`);
    return ok(res, { data: item });
  });

  const create = asyncHandler(async (req, res) => {
    const company = req.companyScope || req.body.company;
    if (!company) throw ApiError.badRequest('Company is required');
    const item = await Model.create({ ...req.body, company });
    await audit.record(req, { action: `${name.toLowerCase()}.create`, entity: name, entityId: item._id });
    return created(res, { message: `${name} created`, data: item });
  });

  const update = asyncHandler(async (req, res) => {
    const payload = { ...req.body };
    delete payload.company; // tenant cannot be reassigned
    const item = await Model.findOneAndUpdate(
      { _id: req.params.id, ...companyFilter(req) },
      payload,
      { new: true, runValidators: true }
    ).populate(populate);
    if (!item) throw ApiError.notFound(`${name} not found`);
    await audit.record(req, { action: `${name.toLowerCase()}.update`, entity: name, entityId: item._id });
    return ok(res, { message: `${name} updated`, data: item });
  });

  const remove = asyncHandler(async (req, res) => {
    const item = await Model.findOneAndDelete({ _id: req.params.id, ...companyFilter(req) });
    if (!item) throw ApiError.notFound(`${name} not found`);
    await audit.record(req, { action: `${name.toLowerCase()}.delete`, entity: name, entityId: item._id });
    return ok(res, { message: `${name} deleted` });
  });

  return { list, getOne, create, update, remove };
}

module.exports = crudFactory;
